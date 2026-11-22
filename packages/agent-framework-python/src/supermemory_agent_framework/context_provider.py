"""Supermemory context provider for Microsoft Agent Framework.

Provides a BaseContextProvider subclass that automatically injects relevant
memories before LLM invocation and stores conversations after.

This is the idiomatic way to integrate persistent memory in Agent Framework,
following the same pattern as the built-in Mem0 integration.
"""

import asyncio
from typing import Any, Awaitable, Callable, Literal, Optional

from agent_framework import ChatMiddleware

try:
    from agent_framework import BaseContextProvider  # type: ignore[attr-defined]
except ImportError:
    from agent_framework import ContextProvider as BaseContextProvider

from .connection import AgentSupermemory
from .middleware import _has_tool_call, _on_final_reply, _save_memory
from .utils import (
    create_logger,
    recall_turn,
    replace_text_block,
    strip_memory_injection,
    turn_key,
)

_PROFILE_STATE_KEY = "profile_block"


class _FinalReplySaver(ChatMiddleware):
    """Run-scoped chat middleware that hands each model call's reply to a callback."""

    def __init__(self, on_final: Callable[[Any], None], logger: Any) -> None:
        self._on_final = on_final
        self._logger = logger

    async def process(
        self, context: Any, call_next: Callable[[], Awaitable[None]]
    ) -> None:
        """Call the model, then report its reply once it is complete."""
        await call_next()
        result = getattr(context, "result", None)
        if result is not None:
            _on_final_reply(result, self._report, self._logger)

    def _report(self, reply: Any) -> None:
        """Pass on a finished reply unless it only asks for tool calls."""
        if not _has_tool_call(reply):
            self._on_final(reply)


class SupermemoryContextProvider(BaseContextProvider):
    """Context provider that integrates Supermemory into the agent pipeline.

    Before each run it adds the user's profile, fetched once per session, to the
    agent instructions, and appends search results for the run's user message to
    that message. Both stay byte-identical on later runs, so provider prompt
    caches keep hitting. It optionally stores conversations after each run.

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
        self._background_tasks: set[asyncio.Task[None]] = set()

    async def before_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        """Add memories to this run before the model is invoked.

        The profile is fetched once per session, stored in this provider's
        session state, and added to the agent instructions (the system prompt)
        on every run with identical bytes. Search results for the run's user
        message are appended to that message, which the session history stores,
        so later runs replay it unchanged. Recall that fails or exceeds the
        3-second budget is skipped for this run; a missing profile is fetched
        again on the next run.

        Args:
            agent: The agent being run.
            session: The agent session, if any.
            context: The framework ``SessionContext`` for this run.
            state: This provider's scoped, persisted session state.
        """
        input_messages = getattr(context, "input_messages", None) or []
        index = next(
            (
                i
                for i in range(len(input_messages) - 1, -1, -1)
                if getattr(input_messages[i], "role", None) == "user"
            ),
            None,
        )
        profile_block = state.get(_PROFILE_STATE_KEY)
        if index is not None and hasattr(input_messages[index], "contents"):
            user_message = input_messages[index]
            query_text = turn_key(user_message.text)
            self._logger.info(
                "Searching Supermemory for memories",
                {
                    "container_tag": self._container_tag,
                    "mode": self._mode,
                    "query_preview": query_text[:100],
                },
            )
            search_block, fresh_profile = await recall_turn(
                self._connection,
                mode=self._mode,
                query_text=query_text,
                profile_block=profile_block,
                logger=self._logger,
                context_prompt=self._context_prompt,
            )
            if fresh_profile is not None:
                state[_PROFILE_STATE_KEY] = fresh_profile
                profile_block = fresh_profile
            if search_block:
                input_messages[index] = replace_text_block(user_message, search_block)
        else:
            self._logger.debug("No user message found, skipping memory search")

        if profile_block:
            context.extend_instructions(self.source_id, profile_block)

        if self._store_conversations and isinstance(
            getattr(context, "metadata", None), dict
        ):
            extend_middleware = getattr(context, "extend_middleware", None)
            if extend_middleware is not None:
                extend_middleware(
                    self.source_id,
                    _FinalReplySaver(
                        lambda reply: self._save_run(context, reply), self._logger
                    ),
                )

    async def after_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        """Save the finished run to Supermemory in the background.

        Runs only with ``store_conversations=True``. The run's user input and final
        response are saved without system messages or memory blocks. The save
        never delays the agent's response; use ``wait_for_background_tasks()`` to
        wait for pending saves, for example before shutdown.

        Args:
            agent: The agent being run.
            session: The agent session, if any.
            context: The framework ``SessionContext`` for this run.
            state: This provider's scoped, persisted session state.
        """
        if self._store_conversations:
            self._save_run(context, getattr(context, "response", None))

    # Streaming callers can stop at the final chunk, which skips after_run, so the run-scoped saver may already have saved this run.
    def _save_run(self, context: Any, response: Any) -> None:
        """Save the run's input and final reply once."""
        metadata = getattr(context, "metadata", None)
        saved_key = f"{self.source_id}:saved"
        if isinstance(metadata, dict):
            if metadata.get(saved_key):
                return
            metadata[saved_key] = True
        conversation_text = self._extract_conversation_from_context(context, response)
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
        task = asyncio.create_task(
            _save_memory(
                self._client,
                self._container_tag,
                conversation_text,
                self._connection.custom_id,
                self._logger,
            )
        )
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        task.add_done_callback(self._log_save_failure)

    def _log_save_failure(self, task: "asyncio.Task[None]") -> None:
        """Log a failed background save instead of raising it."""
        if not task.cancelled() and task.exception() is not None:
            self._logger.error(
                "Failed to store conversation", {"error": str(task.exception())}
            )

    async def wait_for_background_tasks(self, timeout: Optional[float] = 10.0) -> None:
        """Wait for pending background conversation saves.

        Args:
            timeout: Seconds to wait; ``None`` waits indefinitely.

        Raises:
            asyncio.TimeoutError: If the saves do not finish in time; unfinished
                saves are cancelled.
        """
        if not self._background_tasks:
            return
        pending = asyncio.gather(*self._background_tasks, return_exceptions=True)
        try:
            await asyncio.wait_for(pending, timeout=timeout)
        except asyncio.TimeoutError:
            for task in self._background_tasks:
                task.cancel()
            raise

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

    def _extract_conversation_from_context(
        self, context: Any, response: Any = None
    ) -> str:
        """Extract conversation text from context for storage."""
        messages: list[Any] = []

        if hasattr(context, "input_messages"):
            messages.extend(context.input_messages or [])
        elif hasattr(context, "messages"):
            messages.extend(context.messages or [])

        resp = response if response is not None else getattr(context, "response", None)
        if resp:
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

            if role not in ("user", "assistant"):
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
