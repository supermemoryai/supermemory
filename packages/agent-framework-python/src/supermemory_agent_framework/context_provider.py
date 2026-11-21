"""Supermemory context provider for Microsoft Agent Framework.

Provides a BaseContextProvider subclass that automatically injects relevant
memories before LLM invocation and stores conversations after.

This is the idiomatic way to integrate persistent memory in Agent Framework,
following the same pattern as the built-in Mem0 integration.
"""

from typing import Any, Literal

try:
    from agent_framework import BaseContextProvider  # type: ignore[attr-defined]
except ImportError:
    from agent_framework import ContextProvider as BaseContextProvider

from .connection import AgentSupermemory
from .utils import (
    DEFAULT_RECALL_TIMEOUT,
    append_memory_block,
    create_logger,
    memory_blocks,
    recall_turn_memories,
    strip_memory_injection,
)

_PROFILE_DELIVERED = "profile_delivered"


class SupermemoryContextProvider(BaseContextProvider):
    """Context provider that integrates Supermemory into the agent pipeline.

    Automatically searches for relevant memories before the model is invoked
    and optionally stores conversations after the model responds.

    This follows the same pattern as the built-in Mem0 context provider,
    making it the most idiomatic way to add persistent memory to agents.

    Example:
        ```python
        from agent_framework import Agent, AgentSession
        from agent_framework.openai import OpenAIChatClient
        from supermemory_agent_framework import (
            AgentSupermemory,
            SupermemoryContextProvider,
        )

        conn = AgentSupermemory(api_key="your-key", container_tag="user-123")

        provider = SupermemoryContextProvider(
            conn,
            mode="full",
            store_conversations=True,
        )

        agent = OpenAIChatClient(model="gpt-5").as_agent(
            name="MemoryAgent",
            instructions="You are a helpful assistant with memory.",
            context_providers=[provider],
        )

        session = AgentSession()
        response = await agent.run(
            "What's my favorite programming language?",
            session=session,
        )
        ```
    """

    def __init__(
        self,
        connection: AgentSupermemory,
        *,
        mode: Literal["profile", "query", "full"] = "full",
        store_conversations: bool = False,
        context_prompt: str = "",
        verbose: bool = False,
        source_id: str = "supermemory",
        recall_timeout: float = DEFAULT_RECALL_TIMEOUT,
    ) -> None:
        """Initialize the Supermemory context provider.

        Args:
            connection: Shared AgentSupermemory connection.
            mode: Memory retrieval mode - "profile", "query", or "full".
            store_conversations: Whether to store conversations after each run.
            context_prompt: Header text prepended to memory content.
            verbose: Enable detailed logging.
            source_id: Unique identifier for this provider instance.
            recall_timeout: Seconds recall may take before the turn runs without memories.
        """
        super().__init__(source_id=source_id)

        self._connection = connection
        self._container_tag = connection.container_tag
        self._mode = mode
        self._store_conversations = store_conversations
        self._context_prompt = context_prompt
        self._logger = create_logger(verbose)
        self._client = connection.client
        self._recall_timeout = recall_timeout

    async def before_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        """Append this turn's memories to the turn's user message."""
        input_messages = getattr(context, "input_messages", None) or []
        index = next(
            (
                i
                for i in range(len(input_messages) - 1, -1, -1)
                if getattr(input_messages[i], "role", None) == "user"
            ),
            None,
        )
        if index is None or not hasattr(input_messages[index], "contents"):
            self._logger.debug("No user message found, skipping memory search")
            return
        user_message = input_messages[index]
        if memory_blocks([user_message.text]):
            return

        query_text = self._extract_query_from_context(context)
        if not query_text and self._mode == "query":
            self._logger.debug("No user message found, skipping memory search")
            return

        history = [
            message
            for messages in (getattr(context, "context_messages", None) or {}).values()
            for message in messages
        ]
        prior_blocks = memory_blocks(
            message.text
            for message in [*history, *input_messages[:index]]
            if getattr(message, "role", None) == "user"
        )

        self._logger.info(
            "Searching Supermemory for memories",
            {
                "container_tag": self._container_tag,
                "mode": self._mode,
                "query_preview": query_text[:100] if query_text else "",
            },
        )
        profile_owed = not state.get(_PROFILE_DELIVERED)
        block, recalled = await recall_turn_memories(
            self._connection,
            mode=self._mode,
            query_text=query_text,
            include_profile=profile_owed,
            prior_blocks=prior_blocks,
            timeout=self._recall_timeout,
            logger=self._logger,
            context_prompt=self._context_prompt,
        )
        if recalled and profile_owed:
            state[_PROFILE_DELIVERED] = True
        if not block:
            self._logger.debug("No memories to inject")
            return

        self._logger.debug(
            "Injecting memories into user message", {"length": len(block)}
        )
        input_messages[index] = append_memory_block(user_message, block)

    async def after_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        """Store conversation messages to Supermemory for future retrieval."""
        if not self._store_conversations:
            return

        try:
            conversation_text = self._extract_conversation_from_context(context)
            if not conversation_text:
                self._logger.debug("No conversation content to store")
                return

            self._logger.info(
                "Storing conversation to Supermemory",
                {
                    "container_tag": self._container_tag,
                    "content_length": len(conversation_text),
                },
            )

            await self._client.add(
                self._container_tag,
                content=conversation_text,
                id=self._connection.custom_id,
            )

            self._logger.info("Conversation stored successfully")

        except Exception as e:
            self._logger.error(
                "Failed to store conversation",
                {"error": str(e)},
            )

    def _extract_query_from_context(self, context: Any) -> str:
        """Extract the last user message from the session context."""
        messages = None

        if hasattr(context, "input_messages"):
            messages = context.input_messages
        elif hasattr(context, "messages"):
            messages = context.messages

        if not messages:
            return ""

        for msg in reversed(list(messages)):
            role = None
            content = None

            if hasattr(msg, "role"):
                role = msg.role
            elif isinstance(msg, dict):
                role = msg.get("role")

            if role == "user":
                if hasattr(msg, "text"):
                    content = msg.text
                elif hasattr(msg, "content"):
                    content = msg.content
                elif isinstance(msg, dict):
                    content = msg.get("content", "") or msg.get("text", "")

                if isinstance(content, str):
                    return content
                if isinstance(content, list):
                    parts = []
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            parts.append(part.get("text", ""))
                        elif isinstance(part, str):
                            parts.append(part)
                    return " ".join(parts)
        return ""

    def _extract_conversation_from_context(self, context: Any) -> str:
        """Extract conversation text from context for storage."""
        messages: list[Any] = []

        if hasattr(context, "input_messages"):
            messages.extend(context.input_messages or [])
        elif hasattr(context, "messages"):
            messages.extend(context.messages or [])

        if hasattr(context, "response") and context.response:
            resp = context.response
            if hasattr(resp, "text") and resp.text:
                messages.append({"role": "assistant", "content": resp.text})
            elif hasattr(resp, "messages"):
                messages.extend(resp.messages or [])

        if not messages:
            return ""

        parts = []
        for msg in messages:
            role = None
            content = None

            if hasattr(msg, "role"):
                role = msg.role
            elif isinstance(msg, dict):
                role = msg.get("role")

            if role not in ("user", "assistant", "system"):
                continue

            if hasattr(msg, "text"):
                content = msg.text
            elif hasattr(msg, "content"):
                content = msg.content
            elif isinstance(msg, dict):
                content = msg.get("content", "") or msg.get("text", "")

            if isinstance(content, str):
                content = strip_memory_injection(content).strip()
            if isinstance(content, str) and content:
                display = {
                    "user": "User",
                    "assistant": "Assistant",
                    "system": "System",
                }.get(role, str(role))
                parts.append(f"{display}: {content}")

        return "\n\n".join(parts)
