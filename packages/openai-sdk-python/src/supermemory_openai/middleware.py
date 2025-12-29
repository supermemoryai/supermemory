"""Supermemory middleware for OpenAI clients."""

from dataclasses import dataclass
from typing import Optional, Union, Any, Literal, cast
import asyncio
import os

from openai import OpenAI, AsyncOpenAI
from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
)
import supermemory

from .utils import (
    Logger,
    create_logger,
    get_last_user_message,
    get_conversation_content,
    convert_profile_to_markdown,
    deduplicate_memories,
)
from .exceptions import (
    SupermemoryConfigurationError,
    SupermemoryAPIError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
)


@dataclass
class OpenAIMiddlewareOptions:
    """Configuration options for OpenAI middleware."""

    conversation_id: Optional[str] = None
    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "never"


class SupermemoryProfileSearch:
    """Type for Supermemory profile search response."""

    def __init__(self, data: dict[str, Any]):
        self.profile: dict[str, Any] = data.get("profile", {})
        self.search_results: dict[str, Any] = data.get("searchResults", {})


async def supermemory_profile_search(
    container_tag: str,
    query_text: str,
    api_key: str,
) -> SupermemoryProfileSearch:
    """Search for memories using the SuperMemory profile API."""
    payload = {
        "containerTag": container_tag,
    }
    if query_text:
        payload["q"] = query_text

    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.supermemory.ai/v4/profile",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
            ) as response:
                if not response.ok:
                    error_text = await response.text()
                    raise SupermemoryAPIError(
                        "Supermemory profile search failed",
                        status_code=response.status,
                        response_text=error_text
                    )

                data = await response.json()
                return SupermemoryProfileSearch(data)

    except ImportError:
        # Fallback to requests if aiohttp not available
        import requests

        response = requests.post(
            "https://api.supermemory.ai/v4/profile",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
        )

        if not response.ok:
            raise SupermemoryAPIError(
                "Supermemory profile search failed",
                status_code=response.status_code,
                response_text=response.text
            )

        return SupermemoryProfileSearch(response.json())


async def add_system_prompt(
    messages: list[ChatCompletionMessageParam],
    container_tag: str,
    logger: Logger,
    mode: Literal["profile", "query", "full"],
    api_key: str,
) -> list[ChatCompletionMessageParam]:
    """Add memory-enhanced system prompts to chat completion messages."""
    system_prompt_exists = any(msg.get("role") == "system" for msg in messages)

    query_text = get_last_user_message(messages) if mode != "profile" else ""

    memories_response = await supermemory_profile_search(
        container_tag, query_text, api_key
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
        static=profile.get("static", []),
        dynamic=profile.get("dynamic", []),
        search_results=search_results_data.get("results", []),
    )

    logger.debug(
        "Memory deduplication completed",
        {
            "static": {"original": memory_count_static, "deduplicated": len(deduplicated.static)},
            "dynamic": {"original": memory_count_dynamic, "deduplicated": len(deduplicated.dynamic)},
            "search_results": {"original": memory_count_search, "deduplicated": len(deduplicated.search_results)},
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

    if system_prompt_exists:
        logger.debug("Added memories to existing system prompt")
        return [
            {**msg, "content": f"{msg.get('content', '')} \n {memories}"}
            if msg.get("role") == "system"
            else msg
            for msg in messages
        ]

    logger.debug("System prompt does not exist, created system prompt with memories")
    system_message: ChatCompletionSystemMessageParam = {
        "role": "system",
        "content": memories,
    }
    return [system_message] + messages


async def add_memory_tool(
    client: supermemory.Supermemory,
    container_tag: str,
    content: str,
    custom_id: Optional[str],
    logger: Logger,
) -> None:
    """Add a new memory to the SuperMemory system."""
    try:
        add_params = {
            "content": content,
            "container_tags": [container_tag],
        }
        if custom_id is not None:
            add_params["custom_id"] = custom_id

        # Handle both sync and async supermemory clients
        try:
            response = await client.memories.add(**add_params)
        except TypeError:
            # If it's not awaitable, call it synchronously
            response = client.memories.add(**add_params)

        logger.info(
            "Memory saved successfully",
            {
                "container_tag": container_tag,
                "custom_id": custom_id,
                "content_length": len(content),
                "memory_id": response.id,
            },
        )
    except (OSError, ConnectionError) as network_error:
        logger.error(
            "Network error while saving memory",
            {"error": str(network_error)},
        )
        raise SupermemoryNetworkError(
            "Failed to save memory due to network error",
            network_error
        )
    except Exception as error:
        logger.error(
            "Error saving memory",
            {"error": str(error)},
        )
        raise SupermemoryMemoryOperationError(
            "Failed to save memory",
            error
        )


class SupermemoryOpenAIWrapper:
    """Wrapper for OpenAI client with Supermemory middleware."""

    def __init__(
        self,
        openai_client: Union[OpenAI, AsyncOpenAI],
        container_tag: str,
        options: Optional[OpenAIMiddlewareOptions] = None,
    ):
        self._client: Union[OpenAI, AsyncOpenAI] = openai_client
        self._container_tag: str = container_tag
        self._options: OpenAIMiddlewareOptions = options or OpenAIMiddlewareOptions()
        self._logger: Logger = create_logger(self._options.verbose)

        # Track background tasks to ensure they complete
        self._background_tasks: set[asyncio.Task] = set()

        if not hasattr(supermemory, "Supermemory"):
            raise SupermemoryConfigurationError(
                "supermemory package is required but not found",
                ImportError("supermemory package not installed")
            )

        api_key = self._get_api_key()
        try:
            self._supermemory_client: supermemory.Supermemory = supermemory.Supermemory(api_key=api_key)
        except Exception as e:
            raise SupermemoryConfigurationError(
                f"Failed to initialize Supermemory client: {e}",
                e
            )

        # Wrap the chat completions create method
        self._wrap_chat_completions()

    def _get_api_key(self) -> str:
        """Get Supermemory API key from environment."""
        import os

        api_key = os.getenv("SUPERMEMORY_API_KEY")
        if not api_key:
            raise SupermemoryConfigurationError(
                "SUPERMEMORY_API_KEY environment variable is required but not set"
            )
        return api_key

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
        messages = kwargs.get("messages", [])

        if self._options.add_memory == "always":
            user_message = get_last_user_message(messages)
            if user_message and user_message.strip():
                content = (
                    get_conversation_content(messages)
                    if self._options.conversation_id
                    else user_message
                )
                custom_id = (
                    f"conversation:{self._options.conversation_id}"
                    if self._options.conversation_id
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
                            if isinstance(exception, (SupermemoryNetworkError, SupermemoryAPIError)):
                                self._logger.warn(
                                    "Background memory storage failed",
                                    {"error": str(exception), "type": type(exception).__name__}
                                )
                            else:
                                self._logger.error(
                                    "Unexpected error in background memory storage",
                                    {"error": str(exception), "type": type(exception).__name__}
                                )
                    except asyncio.CancelledError:
                        self._logger.debug("Memory storage task was cancelled")

                task.add_done_callback(handle_task_exception)

        if self._options.mode != "profile":
            user_message = get_last_user_message(messages)
            if not user_message:
                self._logger.debug("No user message found, skipping memory search")
                return await original_create(**kwargs)

        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._options.conversation_id,
                "mode": self._options.mode,
            },
        )

        enhanced_messages = await add_system_prompt(
            messages,
            self._container_tag,
            self._logger,
            self._options.mode,
            self._get_api_key(),
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
        messages = kwargs.get("messages", [])

        # Handle memory addition synchronously if needed
        if self._options.add_memory == "always":
            user_message = get_last_user_message(messages)
            if user_message and user_message.strip():
                content = (
                    get_conversation_content(messages)
                    if self._options.conversation_id
                    else user_message
                )
                custom_id = (
                    f"conversation:{self._options.conversation_id}"
                    if self._options.conversation_id
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
                            {"error": str(e)}
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
                        {"error": str(e), "type": type(e).__name__}
                    )

        # Handle memory search and injection
        if self._options.mode != "profile":
            user_message = get_last_user_message(messages)
            if not user_message:
                self._logger.debug("No user message found, skipping memory search")
                return original_create(**kwargs)

        self._logger.info("Starting memory search", {
            "container_tag": self._container_tag,
            "conversation_id": self._options.conversation_id,
            "mode": self._options.mode,
        })

        # Use asyncio.run() for memory search and injection
        try:
            enhanced_messages = asyncio.run(
                add_system_prompt(
                    messages,
                    self._container_tag,
                    self._logger,
                    self._options.mode,
                    self._get_api_key(),
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
                            self._get_api_key(),
                        )
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

        self._logger.debug(f"Waiting for {len(self._background_tasks)} background tasks to complete")

        try:
            if timeout is not None:
                await asyncio.wait_for(
                    asyncio.gather(*self._background_tasks, return_exceptions=True),
                    timeout=timeout
                )
            else:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)

            self._logger.debug("All background tasks completed")
        except asyncio.TimeoutError:
            self._logger.warn(f"Background tasks did not complete within {timeout}s timeout")
            # Cancel remaining tasks
            for task in self._background_tasks:
                if not task.done():
                    task.cancel()
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
                self._logger.warn("Some background memory tasks did not complete on exit")
                self.cancel_background_tasks()

    def __getattr__(self, name: str) -> Any:
        """Delegate all other attributes to the wrapped client."""
        return getattr(self._client, name)


def with_supermemory(
    openai_client: Union[OpenAI, AsyncOpenAI],
    container_tag: str,
    options: Optional[OpenAIMiddlewareOptions] = None,
) -> Union[OpenAI, AsyncOpenAI]:
    """
    Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
    into the system prompt based on the user's message content.

    This middleware searches the supermemory API for relevant memories using the container tag
    and user message, then either appends memories to an existing system prompt or creates
    a new system prompt with the memories.

    Args:
        openai_client: The OpenAI client to wrap with SuperMemory middleware
        container_tag: The container tag/identifier for memory search (e.g., user ID, project ID)
        options: Optional configuration options for the middleware

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
            "user-123",
            OpenAIMiddlewareOptions(
                conversation_id="conversation-456",
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
    wrapper = SupermemoryOpenAIWrapper(openai_client, container_tag, options)
    # Return the wrapper, which delegates all attributes to the original client
    return cast(Union[OpenAI, AsyncOpenAI], wrapper)
