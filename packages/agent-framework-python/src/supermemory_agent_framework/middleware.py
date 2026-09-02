"""Supermemory middleware for Microsoft Agent Framework.

Provides ChatMiddleware that automatically injects relevant memories into
the system prompt before LLM calls, and optionally saves conversations.
"""

import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Literal, Optional

import supermemory
from agent_framework import ChatMiddleware, Content, Message

from .connection import AgentSupermemory
from .exceptions import (
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
)
from .utils import (
    Logger,
    convert_profile_to_markdown,
    create_logger,
    deduplicate_memories,
    replace_memory_injection,
    strip_memory_injection,
    wrap_memory_injection,
)


@dataclass
class SupermemoryMiddlewareOptions:
    """Configuration options for Supermemory middleware."""

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
    kwargs: dict[str, Any] = {"container_tag": container_tag}
    if query_text:
        kwargs["q"] = query_text

    memories_response = await client.profile(**kwargs)

    profile = memories_response.profile if memories_response.profile else None
    static = list(profile.static) if profile and profile.static else []
    dynamic = list(profile.dynamic) if profile and profile.dynamic else []
    search_results_raw = (
        list(memories_response.search_results.results)
        if memories_response.search_results and memories_response.search_results.results
        else []
    )

    logger.info(
        "Memory search completed",
        {
            "container_tag": container_tag,
            "memory_count_static": len(static),
            "memory_count_dynamic": len(dynamic),
            "query_text": (
                query_text[:100] + ("..." if len(query_text) > 100 else "")
            ),
            "mode": mode,
        },
    )

    deduplicated = deduplicate_memories(
        static=static if mode != "query" else [],
        dynamic=dynamic if mode != "query" else [],
        search_results=search_results_raw,
    )

    profile_data = ""
    if mode != "query":
        profile_data = convert_profile_to_markdown(
            {
                "profile": {
                    "static": deduplicated.static,
                    "dynamic": deduplicated.dynamic,
                },
                "searchResults": {"results": []},
            }
        )

    search_results_memories = ""
    if mode != "profile" and deduplicated.search_results:
        search_results_memories = (
            "Search results for user's recent message: \n"
            + "\n".join(f"- {memory}" for memory in deduplicated.search_results)
        )

    return f"{profile_data}\n{search_results_memories}".strip()


async def _save_memory(
    client: supermemory.AsyncSupermemory,
    container_tag: str,
    content: str,
    custom_id: str,
    logger: Logger,
) -> None:
    """Save a memory to Supermemory."""
    try:
        add_params: dict[str, Any] = {
            "content": content,
            "container_tag": container_tag,
            "custom_id": custom_id,
        }

        response = await client.add(**add_params)

        logger.info(
            "Memory saved successfully",
            {
                "container_tag": container_tag,
                "custom_id": custom_id,
                "content_length": len(content),
                "memory_id": getattr(response, "id", None),
            },
        )
    except (OSError, ConnectionError) as network_error:
        logger.error(
            "Network error while saving memory", {"error": str(network_error)}
        )
        raise SupermemoryNetworkError(
            "Failed to save memory due to network error", network_error
        )
    except Exception as error:
        logger.error("Error saving memory", {"error": str(error)})
        raise SupermemoryMemoryOperationError("Failed to save memory", error)


class SupermemoryChatMiddleware(ChatMiddleware):
    """Chat middleware that injects Supermemory memories into the system prompt.

    This middleware intercepts chat requests before they reach the LLM,
    fetches relevant memories from Supermemory, and injects them into
    the system prompt. It can also save conversations as memories.

    Example:
        ```python
        from agent_framework.openai import OpenAIResponsesClient
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

        agent = OpenAIResponsesClient().as_agent(
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

    async def process(
        self,
        context: Any,
        call_next: Callable[[], Awaitable[None]],
    ) -> None:
        """Process the chat request by injecting memories and optionally saving conversations."""
        # Remove stale SDK-owned context before every lifecycle path. A failed,
        # empty, or skipped lookup must never leak memories from a prior run.
        _inject_memories(context, "")
        messages = context.messages

        # Save conversation memory in background if configured
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

        # Determine query text based on mode
        query_text = ""
        if self._options.mode != "profile":
            user_message = _get_last_user_message(messages)
            if not user_message:
                self._logger.debug("No user message found, skipping memory search")
                await call_next()
                return
            query_text = user_message

        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._connection.conversation_id,
                "mode": self._options.mode,
            },
        )

        # Fetch and build memories text
        try:
            memories = await _build_memories_text(
                self._container_tag,
                self._logger,
                self._options.mode,
                self._supermemory_client,
                query_text,
            )
        except Exception as e:
            self._logger.error(
                "Failed to fetch memories, proceeding without",
                {"error": str(e)},
            )
            await call_next()
            return

        if memories:
            # Prepend entity context if available
            if self._connection.entity_context:
                memories = f"{self._connection.entity_context}\n\n{memories}"

            self._logger.debug(
                "Memory content preview",
                {"content": memories[:200], "full_length": len(memories)},
            )

            # Inject memories into messages
            _inject_memories(context, memories)

        await call_next()

    async def wait_for_background_tasks(
        self, timeout: Optional[float] = 10.0
    ) -> None:
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


def _update_structured_content(
    content: Any,
    memories: str,
    *,
    inject: bool,
) -> tuple[Any, bool, bool]:
    """Clear owned blocks from string/dict content and optionally inject one."""
    if isinstance(content, str):
        updated = (
            replace_memory_injection(content, memories)
            if inject
            else strip_memory_injection(content)
        )
        return updated, inject, updated != content

    if isinstance(content, (list, tuple)):
        updated_parts: list[Any] = []
        removed_owned_block = False
        for part in content:
            if isinstance(part, str):
                cleaned = strip_memory_injection(part)
                removed_owned_block = removed_owned_block or cleaned != part
                if cleaned or cleaned == part:
                    updated_parts.append(cleaned)
                continue

            if isinstance(part, dict) and isinstance(part.get("text"), str):
                original_text = part["text"]
                cleaned_text = strip_memory_injection(original_text)
                removed_owned_block = (
                    removed_owned_block or cleaned_text != original_text
                )
                if cleaned_text or cleaned_text == original_text:
                    if cleaned_text == original_text:
                        updated_parts.append(part)
                    else:
                        updated_parts.append({**part, "text": cleaned_text})
                continue

            updated_parts.append(part)

        if inject:
            updated_parts.append(
                {"type": "text", "text": wrap_memory_injection(memories)}
            )

        if isinstance(content, tuple):
            return tuple(updated_parts), inject, removed_owned_block
        return updated_parts, inject, removed_owned_block

    if content is None and inject:
        return wrap_memory_injection(memories), True, False

    return content, False, False


def _update_framework_message(
    msg: Any,
    memories: str,
    *,
    inject: bool,
) -> tuple[bool, bool]:
    """Update real Agent Framework Message contents without assigning .text."""
    try:
        contents = list(msg.contents or [])
    except (AttributeError, TypeError):
        return False, False

    updated_contents = []
    removed_owned_block = False
    for content in contents:
        text = getattr(content, "text", None)
        if getattr(content, "type", None) == "text" and isinstance(text, str):
            cleaned = strip_memory_injection(text)
            removed_owned_block = removed_owned_block or cleaned != text
            if cleaned or cleaned == text:
                if cleaned != text:
                    content.text = cleaned
                updated_contents.append(content)
            continue

        updated_contents.append(content)

    if inject:
        updated_contents.append(Content.from_text(wrap_memory_injection(memories)))

    try:
        msg.contents = updated_contents
    except (AttributeError, TypeError):
        try:
            msg.contents[:] = updated_contents
        except (AttributeError, TypeError):
            return False, False

    return inject, removed_owned_block and not updated_contents


def _is_empty_content(content: Any) -> bool:
    """Return whether stripping an owned block left no message content."""
    return (
        content is None
        or content == ""
        or (isinstance(content, (list, tuple)) and not content)
    )


def _inject_memories(context: Any, memories: str) -> None:
    """Inject memories into the chat context messages.

    Handles both object-based and dict-based message formats used by
    different Agent Framework providers.
    """
    messages = context.messages
    should_inject = bool(memories.strip())
    memory_text = wrap_memory_injection(memories) if should_inject else ""

    # Replace prior SDK blocks in every system message and inject once.
    injected = False
    messages_to_remove: list[Any] = []
    for msg in list(messages):
        role = None
        if hasattr(msg, "role"):
            role = msg.role
        elif isinstance(msg, dict):
            role = msg.get("role")

        if role == "system":
            inject_here = should_inject and not injected
            injected_here = False
            remove_here = False

            if hasattr(msg, "contents"):
                injected_here, remove_here = _update_framework_message(
                    msg,
                    memories,
                    inject=inject_here,
                )
            elif isinstance(msg, dict):
                content_key = "content" if "content" in msg else "text"
                updated, injected_here, removed_owned_block = (
                    _update_structured_content(
                        msg.get(content_key),
                        memories,
                        inject=inject_here,
                    )
                )
                msg[content_key] = updated
                remove_here = (
                    not inject_here
                    and removed_owned_block
                    and _is_empty_content(updated)
                )
            elif hasattr(msg, "content"):
                updated, injected_here, removed_owned_block = (
                    _update_structured_content(
                        msg.content,
                        memories,
                        inject=inject_here,
                    )
                )
                try:
                    msg.content = updated
                except (AttributeError, TypeError):
                    injected_here = False
                else:
                    remove_here = (
                        not inject_here
                        and removed_owned_block
                        and _is_empty_content(updated)
                    )
            elif hasattr(msg, "text"):
                updated, injected_here, removed_owned_block = (
                    _update_structured_content(
                        msg.text,
                        memories,
                        inject=inject_here,
                    )
                )
                try:
                    msg.text = updated
                except (AttributeError, TypeError):
                    injected_here = False
                else:
                    remove_here = (
                        not inject_here
                        and removed_owned_block
                        and _is_empty_content(updated)
                    )

            injected = injected or injected_here
            if remove_here:
                messages_to_remove.append(msg)

    if messages_to_remove:
        retained_messages = [
            msg
            for msg in messages
            if not any(msg is removed for removed in messages_to_remove)
        ]
        try:
            messages[:] = retained_messages
        except (AttributeError, TypeError):
            try:
                context.messages = retained_messages
                messages = context.messages
            except (AttributeError, TypeError):
                pass

    if injected or not should_inject:
        return

    # No system message found - prepend one
    new_message: Any
    if any(isinstance(msg, dict) for msg in messages):
        new_message = {"role": "system", "content": memory_text}
    else:
        new_message = Message("system", [memory_text])

    try:
        messages.insert(0, new_message)
    except (AttributeError, TypeError):
        try:
            context.messages = [new_message, *list(messages)]
        except (AttributeError, TypeError):
            pass
