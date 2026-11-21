"""Supermemory middleware for Microsoft Agent Framework.

Provides ChatMiddleware that appends relevant memories to the current user
message once per user turn, and optionally saves conversations.
"""

import asyncio
import hashlib
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Literal, Optional

import supermemory
from agent_framework import ChatMiddleware, Message

from .connection import AgentSupermemory
from .exceptions import (
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
    SupermemoryTimeoutError,
)
from .utils import (
    DEFAULT_RECALL_TIMEOUT,
    Logger,
    append_memory_block,
    build_memories_text,
    create_logger,
    memory_blocks,
    recall_turn_memories,
    strip_memory_injection,
)

_MAX_CACHED_TURNS = 256


@dataclass
class SupermemoryMiddlewareOptions:
    """Configuration options for Supermemory middleware."""

    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "never"
    recall_timeout: float = DEFAULT_RECALL_TIMEOUT


def _get_last_user_message(messages: Any) -> str:
    """Extract the last user message from the messages sequence."""
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
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                    elif isinstance(part, str):
                        text_parts.append(part)
                return " ".join(text_parts)
    return ""


def _get_conversation_content(messages: Any) -> str:
    """Convert messages into a formatted conversation string."""
    conversation_parts = []

    for msg in messages:
        role = None
        content = None

        if hasattr(msg, "role"):
            role = msg.role
        elif isinstance(msg, dict):
            role = msg.get("role")

        if hasattr(msg, "text"):
            content = msg.text
        elif hasattr(msg, "content"):
            content = msg.content
        elif isinstance(msg, dict):
            content = msg.get("content", "") or msg.get("text", "")

        if role and content:
            role_display = {
                "user": "User",
                "assistant": "Assistant",
                "system": "System",
            }.get(role, role.capitalize() if isinstance(role, str) else str(role))

            if isinstance(content, str):
                content_text = content
            elif isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                    elif isinstance(part, str):
                        text_parts.append(part)
                content_text = " ".join(text_parts)
            else:
                content_text = str(content)

            content_text = strip_memory_injection(content_text).strip()
            if content_text:
                conversation_parts.append(f"{role_display}: {content_text}")

    return "\n\n".join(conversation_parts)


async def _build_memories_text(
    container_tag: str,
    logger: Logger,
    mode: Literal["profile", "query", "full"],
    client: supermemory.AsyncSupermemory,
    query_text: str = "",
) -> str:
    """Build formatted memories text from Supermemory API."""
    memories = await build_memories_text(client, container_tag, mode, query_text)
    logger.info(
        "Memory search completed",
        {"container_tag": container_tag, "mode": mode, "length": len(memories)},
    )
    return memories


def _message_role(message: Any) -> Any:
    """Read a message role from framework objects or dict messages."""
    if isinstance(message, dict):
        return message.get("role")
    return getattr(message, "role", None)


def _message_text(message: Any) -> str:
    """Read message text from framework objects or dict messages."""
    return _get_last_user_message([message]) if _message_role(message) == "user" else ""


def _with_memory_block(message: Any, block: str) -> Any:
    """Return a copy of a user message with the memory block appended."""
    if isinstance(message, dict):
        key = "content" if "content" in message else "text"
        content = message.get(key)
        if isinstance(content, list):
            return {**message, key: [*content, {"type": "text", "text": block}]}
        return {**message, key: f"{content or ''}\n\n{block}".lstrip()}
    if not hasattr(message, "contents"):
        return message
    return append_memory_block(message, block)


async def _save_memory(
    client: supermemory.AsyncSupermemory,
    container_tag: str,
    content: str,
    custom_id: str,
    logger: Logger,
) -> None:
    """Save a memory to Supermemory."""
    try:
        response = await client.add(container_tag, content=content, id=custom_id)

        logger.info(
            "Memory saved successfully",
            {
                "container_tag": container_tag,
                "custom_id": custom_id,
                "content_length": len(content),
                "memory_id": getattr(response, "id", None),
            },
        )
    except supermemory.APITimeoutError as timeout_error:
        logger.error("Timeout while saving memory", {"error": str(timeout_error)})
        raise SupermemoryTimeoutError("Timed out saving memory", timeout_error)
    except (supermemory.APIConnectionError, OSError, ConnectionError) as network_error:
        logger.error("Network error while saving memory", {"error": str(network_error)})
        raise SupermemoryNetworkError(
            "Failed to save memory due to network error", network_error
        )
    except Exception as error:
        logger.error("Error saving memory", {"error": str(error)})
        raise SupermemoryMemoryOperationError("Failed to save memory", error)


class SupermemoryChatMiddleware(ChatMiddleware):
    """Chat middleware that appends Supermemory memories to the user message.

    Memories are recalled once per user turn and appended to that turn's user
    message. Every later model call re-applies the same text to the same turn,
    so earlier turns stay byte-identical and prompt caches keep hitting. The
    system prompt is never modified. It can also save conversations as memories.

    Example:
        ```python
        from agent_framework.openai import OpenAIChatClient
        from supermemory_agent_framework import (
            AgentSupermemory,
            SupermemoryChatMiddleware,
            SupermemoryMiddlewareOptions,
        )

        conn = AgentSupermemory(api_key="your-key", container_tag="user-123")

        middleware = SupermemoryChatMiddleware(
            conn,
            options=SupermemoryMiddlewareOptions(
                mode="full",
                verbose=True,
                add_memory="always",
            ),
        )

        agent = OpenAIChatClient(model="gpt-5").as_agent(
            name="MemoryAgent",
            instructions="You are a helpful assistant with memory.",
            middleware=[middleware],
        )

        response = await agent.run("What's my favorite language?")
        ```
    """

    def __init__(
        self,
        connection: AgentSupermemory,
        options: Optional[SupermemoryMiddlewareOptions] = None,
    ) -> None:
        self._connection = connection
        self._container_tag = connection.container_tag
        self._options = options or SupermemoryMiddlewareOptions()
        self._logger = create_logger(self._options.verbose)
        self._supermemory_client = connection.client
        self._background_tasks: set[asyncio.Task[None]] = set()
        self._turns: OrderedDict[str, str] = OrderedDict()

    async def process(
        self,
        context: Any,
        call_next: Callable[[], Awaitable[None]],
    ) -> None:
        """Process the chat request by injecting memories and optionally saving conversations."""
        messages = context.messages

        if self._options.add_memory == "always":
            user_message = _get_last_user_message(messages)
            if user_message and user_message.strip():
                content = _get_conversation_content(messages)

                task = asyncio.create_task(
                    _save_memory(
                        self._supermemory_client,
                        self._container_tag,
                        content,
                        self._connection.custom_id,
                        self._logger,
                    )
                )
                self._background_tasks.add(task)
                task.add_done_callback(self._background_tasks.discard)

                def _handle_task_exception(task_obj: asyncio.Task[None]) -> None:
                    try:
                        exc = task_obj.exception()
                        if exc is not None:
                            self._logger.warn(
                                "Background memory storage failed",
                                {"error": str(exc), "type": type(exc).__name__},
                            )
                    except asyncio.CancelledError:
                        self._logger.debug("Memory storage task was cancelled")

                task.add_done_callback(_handle_task_exception)

        await self._apply_turn_memories(context)
        await call_next()

    # Turn N's block is keyed by the user texts up to N so every later call replays identical bytes.
    async def _apply_turn_memories(self, context: Any) -> None:
        messages = context.messages
        user_indexes = [
            i for i, message in enumerate(messages) if _message_role(message) == "user"
        ]
        if not user_indexes:
            self._logger.debug("No user message found, skipping memory search")
            return

        digest = hashlib.sha256(self._container_tag.encode())
        prior_blocks: list[str] = []
        for index in user_indexes:
            text = _message_text(messages[index])
            existing = memory_blocks([text])
            digest.update(b"\0" + strip_memory_injection(text).encode())
            if existing:
                prior_blocks.extend(existing)
                continue

            key = digest.hexdigest()
            block = self._turns.get(key)
            if block is not None:
                self._turns.move_to_end(key)
            elif index == user_indexes[-1]:
                block = await self._recall(text, prior_blocks)
                self._turns[key] = block
                while len(self._turns) > _MAX_CACHED_TURNS:
                    self._turns.popitem(last=False)
            if not block:
                continue

            original = messages[index]
            updated = _with_memory_block(original, block)
            messages[index] = updated
            record = getattr(context, "record_message_replacement", None)
            if record and isinstance(original, Message) and updated is not original:
                try:
                    record(updated, original)
                except (TypeError, ValueError):
                    pass
            prior_blocks.append(block)

    async def _recall(self, user_text: str, prior_blocks: list[str]) -> str:
        """Recall this turn's memories within the budget; failures yield ''."""
        if self._options.mode != "profile" and not user_text.strip():
            return ""
        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._connection.conversation_id,
                "mode": self._options.mode,
            },
        )
        return await recall_turn_memories(
            self._connection,
            mode=self._options.mode,
            query_text=user_text,
            prior_blocks=prior_blocks,
            timeout=self._options.recall_timeout,
            logger=self._logger,
        )

    async def wait_for_background_tasks(self, timeout: Optional[float] = 10.0) -> None:
        """Wait for all background memory storage tasks to complete."""
        if not self._background_tasks:
            return

        self._logger.debug(
            f"Waiting for {len(self._background_tasks)} background tasks"
        )

        try:
            if timeout is not None:
                await asyncio.wait_for(
                    asyncio.gather(*self._background_tasks, return_exceptions=True),
                    timeout=timeout,
                )
            else:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)
            self._logger.debug("All background tasks completed")
        except asyncio.TimeoutError:
            self._logger.warn(
                f"Background tasks did not complete within {timeout}s timeout"
            )
            for task in self._background_tasks:
                if not task.done():
                    task.cancel()
            raise
