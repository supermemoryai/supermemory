"""OpenAI client wrapper with Supermemory integration."""

import asyncio
from typing import Any, Dict, List, Optional, Union, overload
from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionMessageParam
import supermemory

from .memory_client import MemoryClient
from .utils import (
    get_last_user_message,
    get_conversation_content,
    inject_memories_into_messages,
    format_search_results,
)


class WithSupermemoryOptions:
    """Configuration options for withSupermemory wrapper."""

    def __init__(
        self,
        conversation_id: Optional[str] = None,
        verbose: bool = False,
        mode: str = "profile",
        add_memory: str = "never",
    ):
        """Initialize options.

        Args:
            conversation_id: Optional conversation ID for grouping messages
            verbose: Enable detailed logging
            mode: Memory search mode ("profile", "query", or "full")
            add_memory: Memory addition mode ("always" or "never")

        Raises:
            ValueError: If mode or add_memory values are invalid
        """
        if mode not in ("profile", "query", "full"):
            raise ValueError(f"Invalid mode: {mode}. Must be 'profile', 'query', or 'full'")
        if add_memory not in ("always", "never"):
            raise ValueError(f"Invalid add_memory: {add_memory}. Must be 'always' or 'never'")

        self.conversation_id = conversation_id
        self.verbose = verbose
        self.mode = mode
        self.add_memory = add_memory


class SupermemoryOpenAIWrapper:
    """Wrapper for OpenAI client with Supermemory integration."""

    def __init__(
        self,
        client: Union[OpenAI, AsyncOpenAI],
        container_tag: str,
        options: Optional[WithSupermemoryOptions] = None,
    ):
        """Initialize the wrapper.

        Args:
            client: OpenAI client instance
            container_tag: Container tag for memory operations
            options: Configuration options

        Raises:
            ValueError: If container_tag is empty or None
        """
        if not container_tag or not container_tag.strip():
            raise ValueError("container_tag cannot be empty or None")

        self.client = client
        self.container_tag = container_tag
        self.options = options or WithSupermemoryOptions()

        # Initialize memory client
        self.memory_client = MemoryClient(verbose=self.options.verbose)

        # Initialize Supermemory client for adding memories
        api_key = self.memory_client.api_key
        self.supermemory_client = supermemory.Supermemory(api_key=api_key)

    def _log(self, message: str, data: Optional[Dict] = None) -> None:
        """Log message if verbose mode is enabled."""
        if self.options.verbose:
            if data:
                print(f"[supermemory] {message}: {data}")
            else:
                print(f"[supermemory] {message}")

    async def _add_memory_if_needed(self, messages: List[ChatCompletionMessageParam]) -> None:
        """Add conversation to memory if configured to do so."""
        if self.options.add_memory != "always":
            return

        user_message = get_last_user_message(messages)
        if not user_message or not user_message.strip():
            return

        try:
            if self.options.conversation_id:
                # Store entire conversation
                content = get_conversation_content(messages)
                custom_id = f"conversation:{self.options.conversation_id}"
            else:
                # Store just the user message
                content = user_message
                custom_id = None

            add_params = {
                "content": content,
                "container_tags": [self.container_tag],
            }
            if custom_id:
                add_params["custom_id"] = custom_id

            await self.supermemory_client.memories.add(**add_params)

            self._log("Memory saved successfully", {
                "containerTag": self.container_tag,
                "customId": custom_id,
                "contentLength": len(content),
            })

        except Exception as error:
            self._log("Error saving memory", {"error": str(error)})

    async def _inject_memories(self, messages: List[ChatCompletionMessageParam]) -> List[ChatCompletionMessageParam]:
        """Inject relevant memories into the messages."""
        try:
            # Determine query text based on mode
            query_text = None
            if self.options.mode != "profile":
                query_text = get_last_user_message(messages)
                if not query_text:
                    self._log("No user message found, skipping memory search")
                    return messages

            self._log("Starting memory search", {
                "containerTag": self.container_tag,
                "conversationId": self.options.conversation_id,
                "mode": self.options.mode,
            })

            # Search for memories
            profile_data = await self.memory_client.profile_search(
                container_tag=self.container_tag,
                query_text=query_text,
            )

            # Format memories based on mode
            memories = format_search_results(profile_data, self.options.mode)

            if memories:
                self._log("Memory content preview", {
                    "content": memories[:500] + "..." if len(memories) > 500 else memories,
                    "fullLength": len(memories),
                })

                # Inject memories into messages
                return inject_memories_into_messages(messages, memories)
            else:
                self._log("No memories found")
                return messages

        except Exception as error:
            self._log("Error during memory search", {"error": str(error)})
            # Return original messages if memory search fails
            return messages

    async def _process_chat_completion(self, **kwargs) -> ChatCompletion:
        """Process chat completion with memory integration."""
        messages = kwargs.get("messages", [])

        # Add memory if configured
        await self._add_memory_if_needed(messages)

        # Inject memories into conversation
        updated_messages = await self._inject_memories(messages)

        # Update kwargs with modified messages
        kwargs["messages"] = updated_messages

        # Call the original client
        if isinstance(self.client, AsyncOpenAI):
            return await self.client.chat.completions.create(**kwargs)
        else:
            # For sync client, we need to run in thread pool
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(self.client.chat.completions.create, **kwargs)
                return future.result()

    def __getattr__(self, name: str) -> Any:
        """Forward all other attributes to the original client."""
        return getattr(self.client, name)


class SupermemoryAsyncChatCompletions:
    """Async chat completions wrapper with memory integration."""

    def __init__(self, wrapper: SupermemoryOpenAIWrapper):
        self.wrapper = wrapper
        self.original = wrapper.client.chat.completions

    async def create(self, **kwargs) -> ChatCompletion:
        """Create chat completion with memory integration."""
        return await self.wrapper._process_chat_completion(**kwargs)

    def __getattr__(self, name: str) -> Any:
        """Forward all other attributes to the original completions."""
        return getattr(self.original, name)


class SupermemorySyncChatCompletions:
    """Sync chat completions wrapper with memory integration."""

    def __init__(self, wrapper: SupermemoryOpenAIWrapper):
        self.wrapper = wrapper
        self.original = wrapper.client.chat.completions

    def create(self, **kwargs) -> ChatCompletion:
        """Create chat completion with memory integration."""
        # Use asyncio.run for safer event loop management
        try:
            # Check if we're already in an event loop
            asyncio.get_running_loop()
            # If we reach here, we're in an async context - not supported
            raise RuntimeError(
                "Cannot use sync client from within an async context. "
                "Use AsyncOpenAI with with_supermemory instead."
            )
        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(self.wrapper._process_chat_completion(**kwargs))

    def __getattr__(self, name: str) -> Any:
        """Forward all other attributes to the original completions."""
        return getattr(self.original, name)


class SupermemoryChatWrapper:
    """Chat wrapper that provides memory-enhanced completions."""

    def __init__(self, wrapper: SupermemoryOpenAIWrapper):
        self.wrapper = wrapper
        self.original = wrapper.client.chat

        # Replace completions with memory-enhanced version
        if isinstance(wrapper.client, AsyncOpenAI):
            self.completions = SupermemoryAsyncChatCompletions(wrapper)
        else:
            self.completions = SupermemorySyncChatCompletions(wrapper)

    def __getattr__(self, name: str) -> Any:
        """Forward all other attributes to the original chat."""
        return getattr(self.original, name)


class SupermemoryOpenAIClient:
    """Main client wrapper that exposes the enhanced chat interface."""

    def __init__(self, wrapper: SupermemoryOpenAIWrapper):
        self.wrapper = wrapper
        self.chat = SupermemoryChatWrapper(wrapper)

    def __getattr__(self, name: str) -> Any:
        """Forward all other attributes to the original client."""
        return getattr(self.wrapper.client, name)


@overload
def with_supermemory(
    client: AsyncOpenAI,
    container_tag: str,
    options: Optional[WithSupermemoryOptions] = None,
) -> AsyncOpenAI:
    ...


@overload
def with_supermemory(
    client: OpenAI,
    container_tag: str,
    options: Optional[WithSupermemoryOptions] = None,
) -> OpenAI:
    ...


def with_supermemory(
    client: Union[OpenAI, AsyncOpenAI],
    container_tag: str,
    options: Optional[WithSupermemoryOptions] = None,
) -> Union[OpenAI, AsyncOpenAI]:
    """Wrap an OpenAI client with Supermemory integration.

    This function wraps an OpenAI client to automatically inject relevant memories
    into chat completions based on the user's message content and conversation context.

    Args:
        client: OpenAI or AsyncOpenAI client instance
        container_tag: Container tag/identifier for memory search (e.g., user ID, project ID)
        options: Optional configuration options

    Returns:
        Enhanced OpenAI client with memory integration

    Example:
        ```python
        import openai
        from supermemory_openai import with_supermemory, WithSupermemoryOptions

        client = openai.AsyncOpenAI(api_key="your-openai-key")
        enhanced_client = with_supermemory(
            client,
            "user-123",
            WithSupermemoryOptions(
                conversation_id="chat-456",
                mode="full",
                add_memory="always",
                verbose=True
            )
        )

        response = await enhanced_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "What's my favorite programming language?"}]
        )
        ```

    Raises:
        ValueError: When SUPERMEMORY_API_KEY environment variable is not set
        Exception: When supermemory API request fails
    """
    wrapper = SupermemoryOpenAIWrapper(client, container_tag, options)
    return SupermemoryOpenAIClient(wrapper)  # type: ignore