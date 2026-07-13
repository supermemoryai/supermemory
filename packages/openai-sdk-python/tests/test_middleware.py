"""Tests for middleware module."""

import os
import pytest
import asyncio
from unittest.mock import AsyncMock, Mock, patch, MagicMock
from typing import Dict, Any

from dotenv import load_dotenv

load_dotenv()

# Import from the installed package or src directly
try:
    from supermemory_openai import (
        with_supermemory,
        OpenAIMiddlewareOptions,
        SupermemoryOpenAIWrapper,
    )
except ImportError:
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "src"))
    from supermemory_openai import (
        with_supermemory,
        OpenAIMiddlewareOptions,
        SupermemoryOpenAIWrapper,
    )

from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types import CompletionUsage

from supermemory_openai.exceptions import (
    SupermemoryAPIError,
    SupermemoryNetworkError,
)


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client."""
    client = Mock(spec=OpenAI)
    client.chat = Mock()
    client.chat.completions = Mock()
    return client


@pytest.fixture
def mock_async_openai_client():
    """Create a mock async OpenAI client."""
    client = Mock(spec=AsyncOpenAI)
    client.chat = Mock()
    client.chat.completions = Mock()
    return client


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI response."""
    return ChatCompletion(
        id="chatcmpl-test",
        object="chat.completion",
        created=1234567890,
        model="gpt-4",
        choices=[
            {
                "index": 0,
                "message": ChatCompletionMessage(
                    role="assistant",
                    content="Hello! How can I help you today?"
                ),
                "finish_reason": "stop"
            }
        ],
        usage=CompletionUsage(
            prompt_tokens=10,
            completion_tokens=10,
            total_tokens=20
        )
    )


@pytest.fixture
def mock_supermemory_response():
    """Create a mock Supermemory API response."""
    return {
        "profile": {
            "static": [
                {"memory": "User prefers Python for development"},
                {"memory": "Lives in San Francisco"}
            ],
            "dynamic": [
                {"memory": "Recently asked about AI frameworks"}
            ]
        },
        "searchResults": {
            "results": [
                {"memory": "User likes machine learning projects"},
                {"memory": "Has experience with FastAPI"}
            ]
        }
    }


class TestMiddlewareInitialization:
    """Test middleware initialization."""

    def test_with_supermemory_basic(self, mock_openai_client):
        """Test basic middleware initialization."""
        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            options = OpenAIMiddlewareOptions(
                container_tag="user-123",
                custom_id="test-conv"
            )
            wrapped_client = with_supermemory(mock_openai_client, options)

            assert isinstance(wrapped_client, SupermemoryOpenAIWrapper)
            assert wrapped_client._container_tag == "user-123"
            assert wrapped_client._options.mode == "profile"
            assert wrapped_client._options.verbose is False
            assert wrapped_client._options.add_memory == "always"  # New default

    def test_with_supermemory_with_options(self, mock_openai_client):
        """Test middleware initialization with options."""
        options = OpenAIMiddlewareOptions(
            container_tag="user-123",
            custom_id="conv-456",
            verbose=True,
            mode="full",
            add_memory="always"
        )

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            wrapped_client = with_supermemory(mock_openai_client, options)

            assert wrapped_client._options.custom_id == "conv-456"
            assert wrapped_client._options.verbose is True
            assert wrapped_client._options.mode == "full"
            assert wrapped_client._options.add_memory == "always"

    def test_missing_api_key_raises_error(self, mock_openai_client):
        """Test that missing API key raises error."""
        from supermemory_openai.exceptions import SupermemoryConfigurationError

        with patch.dict(os.environ, {}, clear=True):
            options = OpenAIMiddlewareOptions(
                container_tag="user-123",
                custom_id="test-conv"
            )
            with pytest.raises(SupermemoryConfigurationError, match="SUPERMEMORY_API_KEY"):
                with_supermemory(mock_openai_client, options)

    def test_wrapper_delegates_attributes(self, mock_openai_client):
        """Test that wrapper delegates attributes to wrapped client."""
        mock_openai_client.models = Mock()

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            options = OpenAIMiddlewareOptions(
                container_tag="user-123",
                custom_id="test-conv"
            )
            wrapped_client = with_supermemory(mock_openai_client, options)

            # Should delegate to the original client
            assert wrapped_client.models is mock_openai_client.models


class TestMemoryInjection:
    """Test memory injection functionality."""

    @pytest.mark.asyncio
    async def test_memory_injection_profile_mode(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test memory injection in profile mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = mock_supermemory_response["profile"]
                mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", mode="profile")
                )

                messages = [
                    {"role": "user", "content": "What's my favorite programming language?"}
                ]

                await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                # Verify the original create was called
                original_create.assert_called_once()
                call_args = original_create.call_args[1]

                # Should have injected memories as system prompt
                enhanced_messages = call_args["messages"]
                assert len(enhanced_messages) >= len(messages)

                # First message should be system prompt with memories
                system_message = enhanced_messages[0]
                assert system_message["role"] == "system"
                assert "User prefers Python" in system_message["content"]

    @pytest.mark.asyncio
    async def test_memory_injection_query_mode(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test memory injection in query mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = {"static": [], "dynamic": []}
                mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", mode="query")
                )

                messages = [
                    {"role": "user", "content": "What machine learning frameworks do I like?"}
                ]

                await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                # Verify search was called with the user message
                mock_search.assert_called_once()
                search_args = mock_search.call_args[0]
                assert search_args[1] == "What machine learning frameworks do I like?"

    @pytest.mark.asyncio
    async def test_memory_injection_full_mode(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test memory injection in full mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = mock_supermemory_response["profile"]
                mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", mode="full")
                )

                messages = [
                    {"role": "user", "content": "Tell me about my preferences"}
                ]

                await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                original_create.assert_called_once()
                call_args = original_create.call_args[1]
                enhanced_messages = call_args["messages"]

                # Should include both profile and search results
                system_content = enhanced_messages[0]["content"]
                assert "Static Profile" in system_content
                assert "Dynamic Profile" in system_content
                assert "Search results" in system_content

    @pytest.mark.asyncio
    async def test_existing_system_prompt_enhancement(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test that existing system prompts are enhanced with memories."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = mock_supermemory_response["profile"]
                mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv")
                )

                messages = [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "What do you know about me?"}
                ]

                await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                original_create.assert_called_once()
                call_args = original_create.call_args[1]
                enhanced_messages = call_args["messages"]

                # Should still have same number of messages
                assert len(enhanced_messages) == len(messages)

                # System message should be enhanced
                system_message = enhanced_messages[0]
                assert system_message["role"] == "system"
                assert "You are a helpful assistant." in system_message["content"]
                assert "User prefers Python" in system_message["content"]


    @pytest.mark.asyncio
    async def test_empty_memories_do_not_modify_messages(
        self, mock_async_openai_client, mock_openai_response
    ):
        """No system prompt should be injected when the memory lookup returns nothing.

        Previously, ``add_system_prompt`` would still modify messages even when
        ``memories`` resolved to an empty string: it appended `` \\n `` (whitespace) to
        any existing system prompt, or prepended a new ``{"role": "system", "content": ""}``
        message when none existed.  Both outcomes pollute the conversation context with
        meaningless tokens and can confuse the downstream model.
        """
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        empty_response = {
            "profile": {"static": [], "dynamic": []},
            "searchResults": {"results": []},
        }

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = empty_response["profile"]
                mock_search.return_value.search_results = empty_response["searchResults"]

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(
                        container_tag="user-123", custom_id="test-conv", mode="full"
                    ),
                )

                # Case 1: no pre-existing system prompt — no system message should be prepended
                user_only_messages = [{"role": "user", "content": "Hello"}]
                await wrapped_client.chat.completions.create(
                    model="gpt-4", messages=user_only_messages
                )
                sent_messages = original_create.call_args[1]["messages"]
                assert sent_messages == user_only_messages, (
                    "An empty-memory response must not prepend a blank system message"
                )

                original_create.reset_mock()

                # Case 2: existing system prompt — it must not be modified
                with_system = [
                    {"role": "system", "content": "You are helpful."},
                    {"role": "user", "content": "Hello"},
                ]
                await wrapped_client.chat.completions.create(
                    model="gpt-4", messages=with_system
                )
                sent_messages = original_create.call_args[1]["messages"]
                assert sent_messages[0]["content"] == "You are helpful.", (
                    "An empty-memory response must not append whitespace to the existing system prompt"
                )


class TestMemoryStorage:
    """Test memory storage functionality."""

    @pytest.mark.asyncio
    async def test_add_memory_always_mode(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test memory storage in always mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    )

                    messages = [
                        {"role": "user", "content": "I really love Python programming"}
                    ]

                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=messages
                    )

                    # Should attempt to add memory (but not wait for it)
                    # We can't easily test the background task, but we can verify
                    # the main flow still works
                    original_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_memory_never_mode(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test that memory is not stored in never mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="never")
                    )

                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Test message"}]
                    )

                    # add_memory_tool should never be called
                    mock_add_memory.assert_not_called()


class TestSyncAsyncCompatibility:
    """Test sync and async client compatibility."""

    def test_sync_client_compatibility(self, mock_openai_client, mock_openai_response):
        """Test that sync clients work with middleware."""
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.return_value = Mock()
                mock_search.return_value.profile = {"static": [], "dynamic": []}
                mock_search.return_value.search_results = {"results": []}

                wrapped_client = with_supermemory(
                    mock_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv")
                )

                # This should work for sync clients too
                wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": "Hello"}]
                )

                original_create.assert_called_once()

    def test_sync_client_in_async_context(self, mock_openai_client, mock_openai_response):
        """Test sync client behavior when called from async context."""
        import asyncio

        async def test_in_async():
            original_create = Mock(return_value=mock_openai_response)
            mock_openai_client.chat.completions.create = original_create

            with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
                with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    wrapped_client = with_supermemory(
                        mock_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv")
                    )

                    # This should work even when called from async context
                    result = wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    assert result == mock_openai_response
                    original_create.assert_called_once()

        # Run the async test
        asyncio.run(test_in_async())

    def test_sync_client_memory_addition_error_handling(self, mock_openai_client, mock_openai_response):
        """Test error handling in sync client memory addition."""
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    # Simulate memory addition failure
                    mock_add_memory.side_effect = Exception("Memory API error")

                    wrapped_client = with_supermemory(
                        mock_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    )

                    # Should not raise exception, should continue with main request
                    result = wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    assert result == mock_openai_response
                    original_create.assert_called_once()


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.asyncio
    async def test_supermemory_api_error_handling(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test handling of Supermemory API errors.

        The memory-search path must fail open: an error from the search should
        not propagate. The chat completion should still succeed using the
        original (unmodified) messages.
        """
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        messages = [{"role": "user", "content": "Hello"}]

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                mock_search.side_effect = Exception("API Error")

                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv")
                )

                # Should not raise exception, should fall back gracefully
                result = await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                assert result == mock_openai_response
                original_create.assert_called_once()
                assert original_create.call_args[1]["messages"] == messages

    @pytest.mark.asyncio
    async def test_no_user_message_handling(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test handling when no user message is present in query mode."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            wrapped_client = with_supermemory(
                mock_async_openai_client,
                OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", mode="query")
            )

            messages = [
                {"role": "system", "content": "You are a helpful assistant."}
            ]

            await wrapped_client.chat.completions.create(
                model="gpt-4",
                messages=messages
            )

            # Should skip memory search and call original create
            original_create.assert_called_once()
            call_args = original_create.call_args[1]
            assert call_args["messages"] == messages  # No modification


class TestLogging:
    """Test logging functionality."""

    @pytest.mark.asyncio
    async def test_verbose_logging(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test verbose logging output."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("builtins.print") as mock_print:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = mock_supermemory_response["profile"]
                    mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", verbose=True)
                    )

                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    # Should have printed log messages
                    assert mock_print.called

    @pytest.mark.asyncio
    async def test_silent_logging(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test that logging is silent when verbose=False."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("builtins.print") as mock_print:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = mock_supermemory_response["profile"]
                    mock_search.return_value.search_results = mock_supermemory_response["searchResults"]

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", verbose=False)
                    )

                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    # Should not have printed anything
                    mock_print.assert_not_called()


class TestBackgroundTaskManagement:
    """Test background task management and cleanup."""

    @pytest.mark.asyncio
    async def test_background_task_tracking(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Test that background tasks are properly tracked."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    # Make add_memory_tool take some time
                    async def slow_add_memory(*args, **kwargs):
                        await asyncio.sleep(0.1)

                    mock_add_memory.side_effect = slow_add_memory

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    )

                    # Make a request that should create a background task
                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    # Should have one background task
                    assert len(wrapped_client._background_tasks) == 1

                    # Wait for background tasks to complete
                    await wrapped_client.wait_for_background_tasks()

                    # Task should be removed from set after completion
                    assert len(wrapped_client._background_tasks) == 0
                    mock_add_memory.assert_called_once()

    @pytest.mark.asyncio
    async def test_context_manager_cleanup(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test that async context manager waits for background tasks."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    task_completed = False

                    async def slow_add_memory(*args, **kwargs):
                        nonlocal task_completed
                        await asyncio.sleep(0.05)
                        task_completed = True

                    mock_add_memory.side_effect = slow_add_memory

                    # Use async context manager
                    async with with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    ) as wrapped_client:
                        await wrapped_client.chat.completions.create(
                            model="gpt-4",
                            messages=[{"role": "user", "content": "Hello"}]
                        )
                        # Task should still be running
                        assert not task_completed

                    # After context exit, task should have completed
                    assert task_completed

    @pytest.mark.asyncio
    async def test_background_task_timeout(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Test timeout handling for background tasks."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool") as mock_add_memory:
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    # Make add_memory_tool hang
                    async def hanging_add_memory(*args, **kwargs):
                        await asyncio.sleep(10)  # Longer than timeout

                    mock_add_memory.side_effect = hanging_add_memory

                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    )

                    await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}]
                    )

                    # Should timeout and cancel tasks
                    with pytest.raises(asyncio.TimeoutError):
                        await wrapped_client.wait_for_background_tasks(timeout=0.1)

                    # Tasks should be cancelled
                    for task in wrapped_client._background_tasks:
                        assert task.cancelled()

    def test_sync_context_manager_cleanup(
        self, mock_openai_client, mock_openai_response
    ):
        """Test that sync context manager attempts cleanup."""
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch("supermemory_openai.middleware.supermemory_profile_search") as mock_search:
                with patch("supermemory_openai.middleware.add_memory_tool"):
                    mock_search.return_value = Mock()
                    mock_search.return_value.profile = {"static": [], "dynamic": []}
                    mock_search.return_value.search_results = {"results": []}

                    # Use sync context manager
                    with with_supermemory(
                        mock_openai_client,
                        OpenAIMiddlewareOptions(container_tag="user-123", custom_id="test-conv", add_memory="always")
                    ) as wrapped_client:
                        wrapped_client.chat.completions.create(
                            model="gpt-4",
                            messages=[{"role": "user", "content": "Hello"}]
                        )

                    # Should complete without error


class TestMemorySearchFailOpen:
    """The memory-search path must fail open.

    When ``add_system_prompt`` (which drives ``supermemory_profile_search``)
    raises, the chat completion must still succeed by falling through to the
    original ``create`` with the ORIGINAL, unmodified messages. Expected
    failure modes (network/API errors) are logged at warning level; unexpected
    errors are logged at error level. These behaviours are verified for both
    the async and sync wrappers.
    """

    ORIGINAL_MESSAGES = [{"role": "user", "content": "What do you know about me?"}]
    ENHANCED_MESSAGES = [
        {"role": "system", "content": "memories about the user"},
        {"role": "user", "content": "What do you know about me?"},
    ]

    # --- Async wrapper -----------------------------------------------------

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "exc, expected_log",
        [
            (SupermemoryNetworkError("network down"), "warn"),
            (SupermemoryAPIError("api boom", status_code=500), "warn"),
            (ValueError("totally unexpected"), "error"),
        ],
    )
    async def test_async_fail_open(
        self, mock_async_openai_client, mock_openai_response, exc, expected_log
    ):
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_system_prompt",
                new=AsyncMock(side_effect=exc),
            ):
                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(
                        container_tag="user-123",
                        custom_id="test-conv",
                        add_memory="never",
                    ),
                )
                wrapped_client._logger.warn = Mock()
                wrapped_client._logger.error = Mock()

                result = await wrapped_client.chat.completions.create(
                    model="gpt-4", messages=self.ORIGINAL_MESSAGES
                )

                # Completion still succeeds with the mocked LLM response
                assert result == mock_openai_response

                # original_create was called with the ORIGINAL messages
                original_create.assert_called_once()
                assert (
                    original_create.call_args[1]["messages"] == self.ORIGINAL_MESSAGES
                )

                # Logged at the expected severity
                if expected_log == "warn":
                    wrapped_client._logger.warn.assert_called_once()
                    wrapped_client._logger.error.assert_not_called()
                else:
                    wrapped_client._logger.error.assert_called_once()
                    wrapped_client._logger.warn.assert_not_called()

    @pytest.mark.asyncio
    async def test_async_happy_path_unchanged(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Regression: when search succeeds, enhanced messages are still used."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_system_prompt",
                new=AsyncMock(return_value=self.ENHANCED_MESSAGES),
            ):
                wrapped_client = with_supermemory(
                    mock_async_openai_client,
                    OpenAIMiddlewareOptions(
                        container_tag="user-123",
                        custom_id="test-conv",
                        add_memory="never",
                    ),
                )
                wrapped_client._logger.warn = Mock()
                wrapped_client._logger.error = Mock()

                result = await wrapped_client.chat.completions.create(
                    model="gpt-4", messages=self.ORIGINAL_MESSAGES
                )

                assert result == mock_openai_response
                original_create.assert_called_once()
                assert (
                    original_create.call_args[1]["messages"] == self.ENHANCED_MESSAGES
                )
                wrapped_client._logger.warn.assert_not_called()
                wrapped_client._logger.error.assert_not_called()

    # --- Sync wrapper ------------------------------------------------------

    @pytest.mark.parametrize(
        "exc, expected_log",
        [
            (SupermemoryNetworkError("network down"), "warn"),
            (SupermemoryAPIError("api boom", status_code=500), "warn"),
            (ValueError("totally unexpected"), "error"),
        ],
    )
    def test_sync_fail_open(
        self, mock_openai_client, mock_openai_response, exc, expected_log
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_system_prompt",
                new=AsyncMock(side_effect=exc),
            ):
                wrapped_client = with_supermemory(
                    mock_openai_client,
                    OpenAIMiddlewareOptions(
                        container_tag="user-123",
                        custom_id="test-conv",
                        add_memory="never",
                    ),
                )
                wrapped_client._logger.warn = Mock()
                wrapped_client._logger.error = Mock()

                result = wrapped_client.chat.completions.create(
                    model="gpt-4", messages=self.ORIGINAL_MESSAGES
                )

                assert result == mock_openai_response
                original_create.assert_called_once()
                assert (
                    original_create.call_args[1]["messages"] == self.ORIGINAL_MESSAGES
                )

                if expected_log == "warn":
                    wrapped_client._logger.warn.assert_called_once()
                    wrapped_client._logger.error.assert_not_called()
                else:
                    wrapped_client._logger.error.assert_called_once()
                    wrapped_client._logger.warn.assert_not_called()

    def test_sync_fail_open_in_async_context(
        self, mock_openai_client, mock_openai_response
    ):
        """Fail-open must also cover the ThreadPoolExecutor fallback branch.

        When the sync wrapper is invoked from within a running event loop, the
        search runs on a thread pool and the exception surfaces from
        ``future.result()``. That path must fail open too.
        """

        async def run_in_async():
            original_create = Mock(return_value=mock_openai_response)
            mock_openai_client.chat.completions.create = original_create

            with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
                with patch(
                    "supermemory_openai.middleware.add_system_prompt",
                    new=AsyncMock(side_effect=SupermemoryNetworkError("network down")),
                ):
                    wrapped_client = with_supermemory(
                        mock_openai_client,
                        OpenAIMiddlewareOptions(
                            container_tag="user-123",
                            custom_id="test-conv",
                            add_memory="never",
                        ),
                    )
                    wrapped_client._logger.warn = Mock()
                    wrapped_client._logger.error = Mock()

                    result = wrapped_client.chat.completions.create(
                        model="gpt-4", messages=self.ORIGINAL_MESSAGES
                    )

                    assert result == mock_openai_response
                    original_create.assert_called_once()
                    assert (
                        original_create.call_args[1]["messages"]
                        == self.ORIGINAL_MESSAGES
                    )
                    wrapped_client._logger.warn.assert_called_once()
                    wrapped_client._logger.error.assert_not_called()

        asyncio.run(run_in_async())

    def test_sync_happy_path_unchanged(self, mock_openai_client, mock_openai_response):
        """Regression: when search succeeds, enhanced messages are still used."""
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_system_prompt",
                new=AsyncMock(return_value=self.ENHANCED_MESSAGES),
            ):
                wrapped_client = with_supermemory(
                    mock_openai_client,
                    OpenAIMiddlewareOptions(
                        container_tag="user-123",
                        custom_id="test-conv",
                        add_memory="never",
                    ),
                )
                wrapped_client._logger.warn = Mock()
                wrapped_client._logger.error = Mock()

                result = wrapped_client.chat.completions.create(
                    model="gpt-4", messages=self.ORIGINAL_MESSAGES
                )

                assert result == mock_openai_response
                original_create.assert_called_once()
                assert (
                    original_create.call_args[1]["messages"] == self.ENHANCED_MESSAGES
                )
                wrapped_client._logger.warn.assert_not_called()
                wrapped_client._logger.error.assert_not_called()

    # --- Black-box repro from the filed issue ------------------------------

    @pytest.mark.asyncio
    async def test_black_box_async_connection_error(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Exact repro: the real search path hits a connection error at the
        HTTP layer, and ``create()`` must still return successfully."""
        import aiohttp

        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            # add_memory path is out of scope for this repro; keep it a no-op
            with patch(
                "supermemory_openai.middleware.add_memory_tool",
                new=AsyncMock(return_value=None),
            ):
                with patch(
                    "aiohttp.ClientSession.post",
                    side_effect=aiohttp.ClientConnectionError("connection refused"),
                ):
                    wrapped_client = with_supermemory(
                        mock_async_openai_client,
                        OpenAIMiddlewareOptions(
                            container_tag="user-123", custom_id="test-conv"
                        ),
                    )

                    result = await wrapped_client.chat.completions.create(
                        model="gpt-4",
                        messages=[{"role": "user", "content": "Hello"}],
                    )

                    assert result == mock_openai_response
                    original_create.assert_called_once()

    def test_black_box_sync_connection_error(
        self, mock_openai_client, mock_openai_response
    ):
        """Exact repro for the sync wrapper: a connection error at the HTTP
        layer must not crash ``create()``."""
        import aiohttp
        import requests

        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_memory_tool",
                new=AsyncMock(return_value=None),
            ):
                # Fail whichever HTTP client the search path ends up using.
                with patch(
                    "aiohttp.ClientSession.post",
                    side_effect=aiohttp.ClientConnectionError("connection refused"),
                ):
                    with patch(
                        "requests.post",
                        side_effect=requests.exceptions.ConnectionError(
                            "connection refused"
                        ),
                    ):
                        wrapped_client = with_supermemory(
                            mock_openai_client,
                            OpenAIMiddlewareOptions(
                                container_tag="user-123", custom_id="test-conv"
                            ),
                        )

                        result = wrapped_client.chat.completions.create(
                            model="gpt-4",
                            messages=[{"role": "user", "content": "Hello"}],
                        )

                        assert result == mock_openai_response
                        original_create.assert_called_once()
