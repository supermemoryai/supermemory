"""Supermemory context provider for Microsoft Agent Framework.

Provides a BaseContextProvider subclass that automatically injects relevant
memories before LLM invocation and stores conversations after.

This is the idiomatic way to integrate persistent memory in Agent Framework,
following the same pattern as the built-in Mem0 integration.
"""

from typing import Any, Literal, Optional

from agent_framework import BaseContextProvider

from .connection import AgentSupermemory
from .utils import (
    convert_profile_to_markdown,
    create_logger,
    deduplicate_memories,
    wrap_memory_injection,
)


class SupermemoryContextProvider(BaseContextProvider):
    """Context provider that integrates Supermemory into the agent pipeline.

    Automatically searches for relevant memories before the model is invoked
    and optionally stores conversations after the model responds.

    This follows the same pattern as the built-in Mem0 context provider,
    making it the most idiomatic way to add persistent memory to agents.

    Example:
        ```python
        from agent_framework import Agent, AgentSession
        from agent_framework.openai import OpenAIResponsesClient
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

        agent = OpenAIResponsesClient().as_agent(
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
    ) -> None:
        """Initialize the Supermemory context provider.

        Args:
            connection: Shared AgentSupermemory connection.
            mode: Memory retrieval mode - "profile", "query", or "full".
            store_conversations: Whether to store conversations after each run.
            context_prompt: Header text prepended to memory content.
            verbose: Enable detailed logging.
            source_id: Unique identifier for this provider instance.
        """
        super().__init__(source_id=source_id)

        self._connection = connection
        self._container_tag = connection.container_tag
        self._mode = mode
        self._store_conversations = store_conversations
        self._context_prompt = context_prompt
        self._logger = create_logger(verbose)
        self._client = connection.client

    async def before_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        """Search Supermemory for relevant memories and inject into context."""
        # Extract query text from input messages
        query_text = ""
        if self._mode != "profile":
            query_text = self._extract_query_from_context(context)
            if not query_text and self._mode == "query":
                self._logger.debug("No user message found, skipping memory search")
                return

        self._logger.info(
            "Searching Supermemory for memories",
            {
                "container_tag": self._container_tag,
                "mode": self._mode,
                "query_preview": query_text[:100] if query_text else "",
            },
        )

        try:
            memories_text = await self._fetch_memories(query_text)
        except Exception as e:
            self._logger.error(
                "Failed to fetch memories, proceeding without",
                {"error": str(e)},
            )
            return

        if not memories_text:
            self._logger.debug("No memories found")
            return

        # Prepend entity context if available
        if self._connection.entity_context:
            memories_text = f"{self._connection.entity_context}\n\n{memories_text}"

        # Inject memories into the session context
        full_text = wrap_memory_injection(memories_text, self._context_prompt)

        self._logger.debug(
            "Injecting memories into context",
            {"length": len(memories_text)},
        )

        # Use extend_instructions to add memory context
        if hasattr(context, "extend_instructions"):
            context.extend_instructions(full_text, source=self.source_id)
        elif hasattr(context, "extend_messages"):
            # Fallback: add as a system message
            context.extend_messages(
                [{"role": "system", "content": full_text}],
                source=self.source_id,
            )

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

            add_params: dict[str, Any] = {
                "content": conversation_text,
                "container_tag": self._container_tag,
                "custom_id": self._connection.custom_id,
            }

            await self._client.add(**add_params)

            self._logger.info("Conversation stored successfully")

        except Exception as e:
            self._logger.error(
                "Failed to store conversation",
                {"error": str(e)},
            )

    async def _fetch_memories(self, query_text: str = "") -> str:
        """Fetch and format memories from Supermemory."""
        kwargs: dict[str, Any] = {"container_tag": self._container_tag}
        if query_text:
            kwargs["q"] = query_text

        response = await self._client.profile(**kwargs)

        profile = response.profile if response.profile else None
        static = list(profile.static) if profile and profile.static else []
        dynamic = list(profile.dynamic) if profile and profile.dynamic else []
        search_results_raw = (
            list(response.search_results.results)
            if response.search_results and response.search_results.results
            else []
        )

        deduplicated = deduplicate_memories(
            static=static,
            dynamic=dynamic,
            search_results=search_results_raw,
        )

        # Build formatted text based on mode
        profile_text = ""
        if self._mode != "query":
            profile_text = convert_profile_to_markdown(
                {
                    "profile": {
                        "static": deduplicated.static,
                        "dynamic": deduplicated.dynamic,
                    },
                    "searchResults": {"results": []},
                }
            )

        search_text = ""
        if self._mode != "profile" and deduplicated.search_results:
            search_text = "Search results for user's recent message:\n" + "\n".join(
                f"- {memory}" for memory in deduplicated.search_results
            )

        return f"{profile_text}\n{search_text}".strip()

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

        # Gather input messages
        if hasattr(context, "input_messages"):
            messages.extend(context.input_messages or [])
        elif hasattr(context, "messages"):
            messages.extend(context.messages or [])

        # Gather response messages
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

            if isinstance(content, str) and content.strip():
                display = {
                    "user": "User",
                    "assistant": "Assistant",
                    "system": "System",
                }.get(role, str(role))
                parts.append(f"{display}: {content}")

        return "\n\n".join(parts)
