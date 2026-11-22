"""Supermemory middleware for Microsoft Agent Framework.

Provides ChatMiddleware that adds the user's profile to the system prompt once
per conversation, appends search results to each user turn, and optionally
saves finished turns.
"""

import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Literal, Optional

import supermemory
from agent_framework import ChatMiddleware, ChatResponse, Message

from .connection import AgentSupermemory
from .exceptions import (
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
    SupermemoryTimeoutError,
)
from .utils import (
    Logger,
    build_memories_text,
    create_logger,
    recall_turn,
    replace_text_block,
    strip_memory_injection,
    turn_answers,
    turn_key,
    turn_keys,
)

_MAX_TURNS_PER_CONVERSATION = 500
_MAX_CONVERSATIONS = 100


@dataclass
class SupermemoryMiddlewareOptions:
    """Configuration options for Supermemory middleware.

    Attributes:
        verbose: Log memory search, injection and storage details.
        mode: What to retrieve. ``"profile"`` adds the user profile to the system
            prompt once per conversation. ``"query"`` appends search results for
            each user turn to that turn's message. ``"full"`` does both, and leaves
            search results the profile already contains out of the user blocks.
        add_memory: ``"always"`` saves each finished turn to Supermemory in the
            background; ``"never"`` only retrieves.
    """

    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "never"


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
    """Read the text of a framework object or dict message of any role."""
    if isinstance(message, dict):
        content = message.get("content", message.get("text"))
    else:
        content = getattr(message, "text", None)
        if content is None:
            content = getattr(message, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, (list, tuple)):
        return " ".join(
            part if isinstance(part, str) else str(part.get("text", ""))
            for part in content
            if isinstance(part, str)
            or (isinstance(part, dict) and part.get("type") == "text")
        )
    return ""


def _conversation_id(context: Any) -> Optional[str]:
    """Return the caller's session or conversation id for this request, if any."""
    session_id = getattr(getattr(context, "session", None), "session_id", None)
    if session_id:
        return f"session:{session_id}"
    options = getattr(context, "options", None)
    conversation_id = (
        options.get("conversation_id") if isinstance(options, dict) else None
    )
    return f"conversation:{conversation_id}" if conversation_id else None


def _server_history(context: Any) -> bool:
    """Whether the service, not this request, holds the earlier turns."""
    options = getattr(context, "options", None)
    if not isinstance(options, dict):
        return False
    return bool(options.get("conversation_id")) or options.get("store") is True


def _with_text_block(text: str, block: str) -> str:
    """Replace Supermemory blocks in a string with exactly one block."""
    preserved = strip_memory_injection(text)
    if not block:
        return preserved
    return f"{preserved}\n{block}" if preserved else block


def _with_block(message: Any, block: str) -> Any:
    """Return a copy of a message carrying exactly one Supermemory block."""
    if isinstance(message, dict):
        key = "content" if "content" in message else "text"
        content = message.get(key)
        if isinstance(content, list):
            parts = [
                (
                    {**part, "text": strip_memory_injection(part["text"])}
                    if isinstance(part, dict) and isinstance(part.get("text"), str)
                    else part
                )
                for part in content
            ]
            return {**message, key: [*parts, {"type": "text", "text": block}]}
        return {**message, key: _with_text_block(content or "", block)}
    if not hasattr(message, "contents"):
        return message
    return replace_text_block(message, block)


class _TurnMemory:
    """One conversation's frozen profile and per-turn search blocks."""

    def __init__(self) -> None:
        self.turns: OrderedDict[str, str] = OrderedDict()
        self.answers: dict[str, str] = {}
        self.profile: Optional[str] = None
        self.server_turns = 0

    # A trimmed history can drop the reply that fingerprinted a kept message's key; the reply that answered it, or a unique text match, still finds its block.
    def find(self, key: str, answer: Optional[str] = None) -> Optional[str]:
        """Return a turn's frozen block, matching by text alone if the reply was trimmed."""
        if answer is not None and "\0" not in key:
            answered = [
                k
                for k in self.turns
                if k.split("\0", 1)[0] == key and self.answers.get(k) == answer
            ]
            if len(answered) == 1:
                key = answered[0]
        if key in self.turns:
            self.turns.move_to_end(key)
            return self.turns[key]
        if "\0" in key:
            return None
        matches = [k for k in self.turns if k.split("\0", 1)[0] == key]
        return self.turns[matches[0]] if len(matches) == 1 else None

    def remember(self, key: str, block: str) -> None:
        """Freeze a turn's block, evicting the least recently used turn."""
        self.turns[key] = block
        self.turns.move_to_end(key)
        while len(self.turns) > _MAX_TURNS_PER_CONVERSATION:
            evicted, _ = self.turns.popitem(last=False)
            self.answers.pop(evicted, None)


def _has_tool_call(response: Any) -> bool:
    """Whether a model reply asks for a tool call, so the turn is not finished yet."""
    return any(
        getattr(content, "type", None) == "function_call"
        for reply in getattr(response, "messages", None) or []
        for content in getattr(reply, "contents", None) or []
    )


# Callers often stop iterating at the final chunk and never resume the stream, so the reply is reported on its terminal update, before the caller receives it.
def _on_final_reply(
    result: Any, on_final: Callable[[Any], None], logger: Logger
) -> None:
    """Call ``on_final`` once with a model call's reply, as soon as it is complete."""
    updates: list[Any] = []
    reported = False

    def _report(response: Any) -> None:
        nonlocal reported
        if reported:
            return
        reported = True
        try:
            on_final(response)
        except Exception as error:
            logger.warn("Could not save the reply", {"error": str(error)})

    def _on_update(update: Any) -> Any:
        updates.append(update)
        reason = getattr(update, "finish_reason", None)
        if reason is not None and str(getattr(reason, "value", reason)) != "tool_calls":
            _report(ChatResponse.from_updates(updates))
        return update

    if not hasattr(result, "with_result_hook"):
        _report(result)
        return
    try:
        result.with_result_hook(_report)
        result.with_transform_hook(_on_update)
    except Exception as error:
        logger.warn("Could not observe streamed reply", {"error": str(error)})


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
    """Chat middleware that adds Supermemory memories to every model call.

    The user's profile is fetched once per conversation and appended as a
    delimited block to the system prompt (the agent instructions, else the first
    system message, else a new leading system message). Search results are
    fetched once per user turn and appended to that turn's user message. Every
    later model call of the conversation re-applies the same blocks with
    identical bytes, so provider prompt caches keep hitting; tool-call
    continuation steps reuse their turn's block without searching again.

    Recall has a fixed 3-second budget and never retries; on timeout or error
    the call goes ahead without the missing part, and a missing profile is
    fetched again on the next new user turn. State is kept in process, per
    conversation: up to 500 turns for each of up to 100 conversations, least
    recently used first out. An evicted conversation starts over as new.

    With ``add_memory="always"`` each finished turn (the final assistant reply,
    not a tool call) is saved in the background, without system messages.

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
        """Initialize the middleware.

        Args:
            connection: Shared AgentSupermemory connection.
            options: Retrieval and storage options; defaults to
                ``SupermemoryMiddlewareOptions()``.
        """
        self._connection = connection
        self._container_tag = connection.container_tag
        self._options = options or SupermemoryMiddlewareOptions()
        self._logger = create_logger(self._options.verbose)
        self._supermemory_client = connection.client
        self._background_tasks: set[asyncio.Task[None]] = set()
        self._conversations: OrderedDict[str, _TurnMemory] = OrderedDict()

    async def process(
        self,
        context: Any,
        call_next: Callable[[], Awaitable[None]],
    ) -> None:
        """Add memories to the request, call the model, and save finished turns.

        Args:
            context: The framework ``ChatContext`` for this model call.
            call_next: Continues the middleware pipeline.
        """
        for index, message in enumerate(context.messages):
            content = message.get("content") if isinstance(message, dict) else None
            if content is not None and not isinstance(content, (str, list, dict)):
                context.messages[index] = {**message, "content": list(content)}
        original = list(context.messages)
        has_user = await self._apply_memories(context)
        await call_next()
        if has_user and self._options.add_memory == "always":
            self._save_when_finished(context, original)

    # Keys come from turn_keys so later calls, trimmed history and repeated questions all map to the right frozen block.
    async def _apply_memories(self, context: Any) -> bool:
        """Recall for a new user turn and re-apply the conversation's blocks."""
        messages = context.messages
        keys = turn_keys(messages, lambda m: (_message_role(m), _message_text(m)))
        if not keys:
            self._logger.debug("No user message found, skipping memory search")
            return False

        first, last = min(keys), max(keys)
        conversation = _conversation_id(context) or f"root:{keys[first]}"
        memory = self._memory_for(conversation)
        if _server_history(context):
            if last == len(messages) - 1:
                memory.server_turns += 1
            keys = {i: f"{memory.server_turns}\0{key}" for i, key in keys.items()}

        if memory.find(keys[last]) is None:
            self._logger.info(
                "Starting memory search",
                {
                    "container_tag": self._container_tag,
                    "conversation_id": self._connection.conversation_id,
                    "mode": self._options.mode,
                },
            )
            search_block, fresh_profile = await recall_turn(
                self._connection,
                mode=self._options.mode,
                query_text=turn_key(_message_text(messages[last])),
                profile_block=memory.profile,
                logger=self._logger,
            )
            if memory.profile is None and fresh_profile is not None:
                memory.profile = fresh_profile
            memory.remember(keys[last], search_block)

        answers = turn_answers(messages, lambda m: (_message_role(m), _message_text(m)))
        for index, key in keys.items():
            block = memory.find(key, answers.get(index))
            if block:
                self._replace(context, index, _with_block(messages[index], block))
            if index in answers and key in memory.turns:
                memory.answers.setdefault(key, answers[index])
        if memory.profile:
            self._apply_profile(context, memory.profile)
        return True

    def _memory_for(self, conversation: str) -> _TurnMemory:
        """Return the conversation's memory, evicting the least recently used one."""
        memory = self._conversations.get(conversation)
        if memory is None:
            memory = self._conversations[conversation] = _TurnMemory()
            while len(self._conversations) > _MAX_CONVERSATIONS:
                self._conversations.popitem(last=False)
        self._conversations.move_to_end(conversation)
        return memory

    def _replace(self, context: Any, index: int, updated: Any) -> None:
        """Swap a call-local message and record it for compaction reconciliation."""
        original = context.messages[index]
        if updated is original:
            return
        context.messages[index] = updated
        record = getattr(context, "record_message_replacement", None)
        if record and isinstance(original, Message) and isinstance(updated, Message):
            try:
                record(updated, original)
            except (TypeError, ValueError):
                pass

    # The agent's instructions are the system prompt, so the profile joins them there rather than adding a second system message.
    def _apply_profile(self, context: Any, block: str) -> None:
        """Put the frozen profile block into the request's system prompt."""
        options = getattr(context, "options", None)
        instructions = (
            options.get("instructions") if isinstance(options, dict) else None
        )
        if isinstance(instructions, str) and instructions.strip():
            context.options = {
                **options,
                "instructions": _with_text_block(instructions, block),
            }
            return
        messages = context.messages
        for index, message in enumerate(messages):
            if _message_role(message) in ("system", "developer"):
                self._replace(context, index, _with_block(message, block))
                return
        if any(isinstance(message, dict) for message in messages):
            messages.insert(0, {"role": "system", "content": block})
        else:
            messages.insert(0, Message("system", [block]))

    def _save_when_finished(self, context: Any, messages: list[Any]) -> None:
        """Schedule a background save once the turn's final reply has arrived."""
        result = getattr(context, "result", None)
        if result is not None:
            _on_final_reply(
                result, lambda final: self._save_turn(messages, final), self._logger
            )

    def _save_turn(self, messages: list[Any], response: Any) -> None:
        """Save the conversation with its final reply, skipping tool-call steps."""
        if _has_tool_call(response):
            return
        replies = list(getattr(response, "messages", None) or [])
        conversation = [
            message
            for message in [*messages, *replies]
            if _message_role(message) not in ("system", "developer")
        ]
        content = _get_conversation_content(conversation)
        if not content.strip():
            return
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
