"""Supermemory middleware for OpenAI clients."""

import asyncio
import inspect
import os
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, Literal, Optional, Union, cast

import supermemory
from openai import AsyncOpenAI, OpenAI
from openai.types.chat import (
    ChatCompletionContentPartTextParam,
    ChatCompletionDeveloperMessageParam,
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
)
from typing_extensions import TypeGuard

from .exceptions import (
    SupermemoryAPIError,
    SupermemoryConfigurationError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
)
from .utils import (
    Logger,
    convert_profile_to_markdown,
    create_logger,
    deduplicate_memories,
    get_conversation_content,
    get_last_user_message,
    replace_memory_context,
    strip_memory_context,
    wrap_memory_context,
)

DEFAULT_SUPERMEMORY_BASE_URL = "https://api.supermemory.ai"
PROFILE_REQUEST_TIMEOUT_SECONDS = 30.0


@dataclass
class OpenAIMiddlewareOptions:
    """Configuration options for OpenAI middleware."""

    container_tag: str  # Required: identifies the user/container
    custom_id: str  # Required: groups messages into the same document
    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "always"
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class SupermemoryProfileSearch:
    """Type for Supermemory profile search response."""

    def __init__(self, data: dict[str, Any]):
        self.profile: dict[str, Any] = data.get("profile", {})
        self.search_results: dict[str, Any] = data.get("searchResults", {})


ChatInstructionMessage = Union[
    ChatCompletionDeveloperMessageParam,
    ChatCompletionSystemMessageParam,
]


def _is_chat_instruction_message(
    message: ChatCompletionMessageParam,
) -> TypeGuard[ChatInstructionMessage]:
    """Return whether a chat message can carry model instructions."""
    return message.get("role") in ("developer", "system")


def _update_instruction_message_memory_context(
    message: ChatInstructionMessage,
    memories: Optional[str],
) -> ChatInstructionMessage:
    """Replace or strip owned context without dropping structured instructions."""
    content = message.get("content", "")
    if isinstance(content, str):
        updated_content = (
            replace_memory_context(content, memories)
            if memories is not None
            else strip_memory_context(content)
        )
        return cast(
            ChatInstructionMessage,
            {**message, "content": updated_content},
        )

    if not isinstance(content, Iterable) or isinstance(
        content, (bytes, bytearray, dict)
    ):
        # OpenAI's supported instruction content is a string or an iterable of
        # text parts. Preserve an unexpected value instead of erasing it.
        return message

    injected = False
    updated_parts: list[ChatCompletionContentPartTextParam] = []
    for part in content:
        if not isinstance(part, dict):
            # Defensive compatibility for a malformed/future iterable. The cast
            # keeps the value intact rather than deleting caller-authored data.
            updated_parts.append(cast(ChatCompletionContentPartTextParam, part))
            continue

        text = part.get("text")
        if part.get("type") != "text" or not isinstance(text, str):
            updated_parts.append(part)
            continue

        if memories is not None and not injected:
            updated_text = replace_memory_context(text, memories)
            injected = True
        else:
            updated_text = strip_memory_context(text)

        updated_parts.append(
            cast(
                ChatCompletionContentPartTextParam,
                {**part, "text": updated_text},
            )
        )

    if memories is not None and not injected:
        memory_context = wrap_memory_context(memories)
        if memory_context:
            updated_parts.append({"type": "text", "text": memory_context})

    return cast(
        ChatInstructionMessage,
        {**message, "content": updated_parts},
    )


def _update_chat_memory_contexts(
    messages: list[ChatCompletionMessageParam],
    memories: Optional[str] = None,
) -> list[ChatCompletionMessageParam]:
    """Inject once into developer-first instructions and strip every stale block."""
    developer_index = next(
        (
            index
            for index, message in enumerate(messages)
            if message.get("role") == "developer"
        ),
        -1,
    )
    injection_index = developer_index
    if injection_index < 0:
        injection_index = next(
            (
                index
                for index, message in enumerate(messages)
                if message.get("role") == "system"
            ),
            -1,
        )

    if injection_index < 0:
        if memories is None:
            return messages
        memory_context = wrap_memory_context(memories)
        if not memory_context:
            return messages
        system_message: ChatCompletionSystemMessageParam = {
            "role": "system",
            "content": memory_context,
        }
        return [system_message, *messages]

    enhanced: list[ChatCompletionMessageParam] = []
    for index, message in enumerate(messages):
        if not _is_chat_instruction_message(message):
            enhanced.append(message)
            continue

        selected_memories = (
            memories if memories is not None and index == injection_index else None
        )
        enhanced.append(
            _update_instruction_message_memory_context(message, selected_memories)
        )
    return enhanced


async def supermemory_profile_search(
    container_tag: str,
    query_text: str,
    api_key: str,
    base_url: str,
) -> SupermemoryProfileSearch:
    """Search for memories using the SuperMemory profile API."""
    payload = {
        "containerTag": container_tag,
        "include": ["static", "dynamic"],
    }
    if query_text:
        payload["q"] = query_text
    profile_url = f"{base_url.rstrip('/')}/v4/profile"

    try:
        import aiohttp

        timeout = aiohttp.ClientTimeout(total=PROFILE_REQUEST_TIMEOUT_SECONDS)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                profile_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
                allow_redirects=False,
            ) as response:
                if not 200 <= response.status < 300:
                    error_text = await response.text()
                    raise SupermemoryAPIError(
                        "Supermemory profile search failed",
                        status_code=response.status,
                        response_text=error_text,
                    )

                data = await response.json()
                return SupermemoryProfileSearch(data)

    except ImportError:
        # Fallback to requests if aiohttp not available
        import requests

        response = requests.post(
            profile_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=PROFILE_REQUEST_TIMEOUT_SECONDS,
            allow_redirects=False,
        )

        if not 200 <= response.status_code < 300:
            raise SupermemoryAPIError(
                "Supermemory profile search failed",
                status_code=response.status_code,
                response_text=response.text,
            )

        return SupermemoryProfileSearch(response.json())


async def add_system_prompt(
    messages: list[ChatCompletionMessageParam],
    container_tag: str,
    logger: Logger,
    mode: Literal["profile", "query", "full"],
    api_key: str,
    base_url: str,
) -> list[ChatCompletionMessageParam]:
    """Add memory-enhanced system prompts to chat completion messages."""
    instruction_prompt_exists = any(
        _is_chat_instruction_message(message) for message in messages
    )

    query_text = get_last_user_message(messages) if mode != "profile" else ""

    memories_response = await supermemory_profile_search(
        container_tag,
        query_text,
        api_key,
        base_url,
    )

    profile = memories_response.profile or {}
    search_results_data = memories_response.search_results or {}
    memory_count_static = len(profile.get("static", []))
    memory_count_dynamic = len(profile.get("dynamic", []))
    memory_count_search = len(search_results_data.get("results", []))

    logger.info(
        "Memory search completed",
        {
            "container_tag": container_tag,
            "memory_count_static": memory_count_static,
            "memory_count_dynamic": memory_count_dynamic,
            "query_text": query_text[:100] + ("..." if len(query_text) > 100 else ""),
            "mode": mode,
        },
    )

    deduplicated = deduplicate_memories(
        static=profile.get("static", []) if mode != "query" else [],
        dynamic=profile.get("dynamic", []) if mode != "query" else [],
        search_results=search_results_data.get("results", []),
    )

    logger.debug(
        "Memory deduplication completed",
        {
            "static": {
                "original": memory_count_static,
                "deduplicated": len(deduplicated.static),
            },
            "dynamic": {
                "original": memory_count_dynamic,
                "deduplicated": len(deduplicated.dynamic),
            },
            "search_results": {
                "original": memory_count_search,
                "deduplicated": len(deduplicated.search_results),
            },
        },
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

    memories = f"{profile_data}\n{search_results_memories}".strip()

    if memories:
        logger.debug(
            "Memory content preview",
            {
                "content": memories,
                "full_length": len(memories),
            },
        )

    if instruction_prompt_exists:
        logger.debug("Replaced Supermemory context in existing instruction prompt")
    elif memories:
        logger.debug("Instruction prompt does not exist, created system prompt")

    return _update_chat_memory_contexts(messages, memories)


async def add_memory_tool(
    client: supermemory.Supermemory,
    container_tag: str,
    content: str,
    custom_id: Optional[str],
    logger: Logger,
) -> None:
    """Add a new memory to the SuperMemory system."""
    try:
        kwargs = {"content": content, "container_tag": container_tag}
        if custom_id is not None:
            kwargs["custom_id"] = custom_id

        # The wrapper currently constructs the synchronous Supermemory client for
        # both OpenAI variants. Never execute that network call on an async event
        # loop; mocks or future async clients can still return an awaitable.
        if inspect.iscoroutinefunction(client.add):
            result = client.add(**kwargs)
        else:
            result = await asyncio.to_thread(client.add, **kwargs)
        if inspect.isawaitable(result):
            response = await result
        else:
            response = result

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
            "Network error while saving memory",
            {"error": str(network_error)},
        )
        raise SupermemoryNetworkError(
            "Failed to save memory due to network error", network_error
        )
    except Exception as error:
        logger.error(
            "Error saving memory",
            {"error": str(error)},
        )
        raise SupermemoryMemoryOperationError("Failed to save memory", error)


class SupermemoryOpenAIWrapper:
    """Wrapper for OpenAI client with Supermemory middleware."""

    def __init__(
        self,
        openai_client: Union[OpenAI, AsyncOpenAI],
        options: OpenAIMiddlewareOptions,
    ):
        self._client: Union[OpenAI, AsyncOpenAI] = openai_client
        self._container_tag: str = options.container_tag
        self._options: OpenAIMiddlewareOptions = options
        self._logger: Logger = create_logger(self._options.verbose)
        self._api_key = self._resolve_api_key(options.api_key)
        self._base_url = self._resolve_base_url(options.base_url)

        # Track background tasks to ensure they complete
        self._background_tasks: set[asyncio.Task] = set()

        if not hasattr(supermemory, "Supermemory"):
            raise SupermemoryConfigurationError(
                "supermemory package is required but not found",
                ImportError("supermemory package not installed"),
            )

        try:
            self._supermemory_client: supermemory.Supermemory = supermemory.Supermemory(
                api_key=self._api_key,
                base_url=self._base_url,
            )
        except Exception as e:
            raise SupermemoryConfigurationError(
                f"Failed to initialize Supermemory client: {e}", e
            )

        # Wrap the chat completions create method
        self._wrap_chat_completions()

    @staticmethod
    def _resolve_api_key(configured_api_key: Optional[str]) -> str:
        """Resolve the API key once when the middleware is constructed."""
        api_key = (configured_api_key or "").strip() or (
            os.getenv("SUPERMEMORY_API_KEY") or ""
        ).strip()
        if not api_key:
            raise SupermemoryConfigurationError(
                "A Supermemory API key is required. Pass api_key to "
                "OpenAIMiddlewareOptions or set SUPERMEMORY_API_KEY."
            )
        return api_key.strip()

    @staticmethod
    def _resolve_base_url(configured_base_url: Optional[str]) -> str:
        """Resolve and normalize the API base URL once."""
        base_url = (
            (configured_base_url or "").strip()
            or (os.getenv("SUPERMEMORY_BASE_URL") or "").strip()
            or DEFAULT_SUPERMEMORY_BASE_URL
        )
        return base_url.rstrip("/")

    def _wrap_chat_completions(self) -> None:
        """Wrap the chat completions create method with memory injection."""
        original_create = self._client.chat.completions.create

        if asyncio.iscoroutinefunction(original_create):

            async def create_with_memory(
                **kwargs: Any,
            ) -> Any:
                return await self._create_with_memory_async(original_create, **kwargs)

        else:

            def create_with_memory(
                **kwargs: Any,
            ) -> Any:
                return self._create_with_memory_sync(original_create, **kwargs)

        # Replace the create method with our wrapper
        setattr(self._client.chat.completions, "create", create_with_memory)

    async def _create_with_memory_async(
        self,
        original_create: Any,
        **kwargs: Any,
    ) -> Any:
        """Async version of create with memory injection."""
        # OpenAI accepts any Iterable here. Materialize it once because memory
        # extraction and injection both traverse the messages.
        messages = list(kwargs.get("messages", []))
        kwargs["messages"] = messages

        if self._options.add_memory == "always":
            user_message = get_last_user_message(messages)
            if user_message and user_message.strip():
                content = (
                    get_conversation_content(messages)
                    if self._options.custom_id
                    else user_message
                )
                custom_id = (
                    f"conversation:{self._options.custom_id}"
                    if self._options.custom_id
                    else None
                )

                # Create background task for memory storage
                task = asyncio.create_task(
                    add_memory_tool(
                        self._supermemory_client,
                        self._container_tag,
                        content,
                        custom_id,
                        self._logger,
                    )
                )

                # Track the task and set up cleanup
                self._background_tasks.add(task)
                task.add_done_callback(self._background_tasks.discard)

                # Log any exceptions but don't fail the main request
                def handle_task_exception(task_obj):
                    try:
                        if task_obj.exception() is not None:
                            exception = task_obj.exception()
                            if isinstance(
                                exception,
                                (SupermemoryNetworkError, SupermemoryAPIError),
                            ):
                                self._logger.warn(
                                    "Background memory storage failed",
                                    {
                                        "error": str(exception),
                                        "type": type(exception).__name__,
                                    },
                                )
                            else:
                                self._logger.error(
                                    "Unexpected error in background memory storage",
                                    {
                                        "error": str(exception),
                                        "type": type(exception).__name__,
                                    },
                                )
                    except asyncio.CancelledError:
                        self._logger.debug("Memory storage task was cancelled")

                task.add_done_callback(handle_task_exception)

        if self._options.mode != "profile":
            user_message = get_last_user_message(messages)
            if not user_message:
                self._logger.debug("No user message found, skipping memory search")
                kwargs["messages"] = _update_chat_memory_contexts(messages)
                return await original_create(**kwargs)

        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._options.custom_id,
                "mode": self._options.mode,
            },
        )

        enhanced_messages = await add_system_prompt(
            messages,
            self._container_tag,
            self._logger,
            self._options.mode,
            self._api_key,
            self._base_url,
        )

        kwargs["messages"] = enhanced_messages
        return await original_create(**kwargs)

    def _create_with_memory_sync(
        self,
        original_create: Any,
        **kwargs: Any,
    ) -> Any:
        """Sync version of create with memory injection."""
        # For sync clients, we implement a simplified version without background tasks
        messages = list(kwargs.get("messages", []))
        kwargs["messages"] = messages

        # Handle memory addition synchronously if needed
        if self._options.add_memory == "always":
            user_message = get_last_user_message(messages)
            if user_message and user_message.strip():
                content = (
                    get_conversation_content(messages)
                    if self._options.custom_id
                    else user_message
                )
                custom_id = (
                    f"conversation:{self._options.custom_id}"
                    if self._options.custom_id
                    else None
                )

                # Use asyncio.run() for the memory addition
                try:
                    asyncio.run(
                        add_memory_tool(
                            self._supermemory_client,
                            self._container_tag,
                            content,
                            custom_id,
                            self._logger,
                        )
                    )
                except RuntimeError as e:
                    if "cannot be called from a running event loop" in str(e):
                        # We're in an async context, log warning and skip memory saving
                        self._logger.warn(
                            "Cannot save memory in sync client from async context",
                            {"error": str(e)},
                        )
                    else:
                        raise
                except SupermemoryNetworkError as e:
                    # Network errors are expected, log as warning
                    self._logger.warn("Network error saving memory", {"error": str(e)})
                except (SupermemoryAPIError, SupermemoryMemoryOperationError) as e:
                    # API/memory errors are concerning, log as error
                    self._logger.error("Failed to save memory", {"error": str(e)})
                except Exception as e:
                    # Unexpected errors should be investigated
                    self._logger.error(
                        "Unexpected error saving memory",
                        {"error": str(e), "type": type(e).__name__},
                    )

        # Handle memory search and injection
        if self._options.mode != "profile":
            user_message = get_last_user_message(messages)
            if not user_message:
                self._logger.debug("No user message found, skipping memory search")
                kwargs["messages"] = _update_chat_memory_contexts(messages)
                return original_create(**kwargs)

        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._options.custom_id,
                "mode": self._options.mode,
            },
        )

        # Use asyncio.run() for memory search and injection
        try:
            enhanced_messages = asyncio.run(
                add_system_prompt(
                    messages,
                    self._container_tag,
                    self._logger,
                    self._options.mode,
                    self._api_key,
                    self._base_url,
                )
            )
        except RuntimeError as e:
            if "cannot be called from a running event loop" in str(e):
                # We're in an async context, run in a separate thread
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        asyncio.run,
                        add_system_prompt(
                            messages,
                            self._container_tag,
                            self._logger,
                            self._options.mode,
                            self._api_key,
                            self._base_url,
                        ),
                    )
                    enhanced_messages = future.result()
            else:
                raise

        kwargs["messages"] = enhanced_messages
        return original_create(**kwargs)

    async def wait_for_background_tasks(self, timeout: Optional[float] = 10.0) -> None:
        """
        Wait for all background memory storage tasks to complete.

        Args:
            timeout: Maximum time to wait in seconds. None for no timeout.

        Raises:
            asyncio.TimeoutError: If tasks don't complete within timeout
        """
        if not self._background_tasks:
            return

        self._logger.debug(
            f"Waiting for {len(self._background_tasks)} background tasks to complete"
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
            # Cancel remaining tasks
            tasks_to_cancel = [
                task for task in self._background_tasks if not task.done()
            ]
            for task in tasks_to_cancel:
                task.cancel()

            if tasks_to_cancel:
                await asyncio.gather(*tasks_to_cancel, return_exceptions=True)
            raise

    def cancel_background_tasks(self) -> None:
        """Cancel all pending background tasks."""
        cancelled_count = 0
        for task in self._background_tasks:
            if not task.done():
                task.cancel()
                cancelled_count += 1

        if cancelled_count > 0:
            self._logger.debug(f"Cancelled {cancelled_count} pending background tasks")

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - wait for background tasks."""
        try:
            await self.wait_for_background_tasks(timeout=5.0)
        except asyncio.TimeoutError:
            self._logger.warn("Some background memory tasks did not complete on exit")

    def __enter__(self):
        """Sync context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Sync context manager exit - attempt to wait for background tasks."""
        if self._background_tasks:
            try:
                # Try to wait for background tasks in sync context
                asyncio.run(self.wait_for_background_tasks(timeout=5.0))
            except RuntimeError as e:
                if "cannot be called from a running event loop" in str(e):
                    # In async context, just cancel the tasks
                    self._logger.warn(
                        "Cannot wait for background tasks in sync context from async environment. "
                        "Use async context manager or call wait_for_background_tasks() manually."
                    )
                    self.cancel_background_tasks()
                else:
                    raise
            except asyncio.TimeoutError:
                self._logger.warn(
                    "Some background memory tasks did not complete on exit"
                )
                self.cancel_background_tasks()

    def __getattr__(self, name: str) -> Any:
        """Delegate all other attributes to the wrapped client."""
        return getattr(self._client, name)


def with_supermemory(
    openai_client: Union[OpenAI, AsyncOpenAI],
    options: OpenAIMiddlewareOptions,
) -> Union[OpenAI, AsyncOpenAI]:
    """
    Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
    into the system prompt based on the user's message content.

    This middleware searches the supermemory API for relevant memories using the container tag
    and user message, then either appends memories to an existing system prompt or creates
    a new system prompt with the memories.

    Args:
        openai_client: The OpenAI client to wrap with SuperMemory middleware
        options: Configuration options for the middleware (container_tag and custom_id are required)

    Returns:
        An OpenAI client with SuperMemory middleware injected

    Example:
        ```python
        from supermemory_openai import with_supermemory, OpenAIMiddlewareOptions
        from openai import OpenAI

        # Create OpenAI client with supermemory middleware
        openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        openai_with_supermemory = with_supermemory(
            openai,
            OpenAIMiddlewareOptions(
                container_tag="user-123",
                custom_id="conversation-456",
                mode="full",
                add_memory="always"
            )
        )

        # Use normally - memories will be automatically injected
        response = await openai_with_supermemory.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "user", "content": "What's my favorite programming language?"}
            ]
        )
        ```

    Raises:
        ValueError: When SUPERMEMORY_API_KEY environment variable is not set
        Exception: When supermemory API request fails
    """
    wrapper = SupermemoryOpenAIWrapper(openai_client, options)
    # Return the wrapper, which delegates all attributes to the original client
    return cast(Union[OpenAI, AsyncOpenAI], wrapper)
