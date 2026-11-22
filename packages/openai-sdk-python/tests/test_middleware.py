"""Tests for middleware module."""

import os
import sys
import pytest
import requests
import asyncio
import threading
import time
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

from supermemory_openai.middleware import supermemory_profile_search
from openai import AsyncOpenAI, AsyncStream, OpenAI, Stream
from openai.types.chat import ChatCompletion, ChatCompletionChunk, ChatCompletionMessage
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

                enhanced_messages = call_args["messages"]
                assert [message["role"] for message in enhanced_messages] == [
                    "system",
                    "user",
                ]
                assert "User prefers Python" in enhanced_messages[0]["content"]
                assert enhanced_messages[1] == messages[0]

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
                mock_search.return_value.profile = {
                    "static": [{"memory": "User likes machine learning projects"}],
                    "dynamic": [],
                }
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
                enhanced_messages = original_create.call_args[1]["messages"]
                assert "User likes machine learning projects" in enhanced_messages[0]["content"]

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

                system_content = enhanced_messages[0]["content"]
                user_content = enhanced_messages[1]["content"]
                assert enhanced_messages[0]["role"] == "system"
                assert "Static Profile" in system_content
                assert "Dynamic Profile" in system_content
                assert "Search results" not in system_content
                assert "Search results" in user_content
                assert "Static Profile" not in user_content

    @pytest.mark.asyncio
    async def test_profile_is_appended_to_existing_system_prompt(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """The profile replaces only the SDK's own block in the caller's system prompt."""
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
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant.\n\n"
                            '<supermemory context="user-memories" readonly>\n'
                            "Stale profile fact\n"
                            "</supermemory>"
                        ),
                    },
                    {"role": "user", "content": "What do you know about me?"}
                ]

                await wrapped_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )

                original_create.assert_called_once()
                call_args = original_create.call_args[1]
                enhanced_messages = call_args["messages"]

                assert len(enhanced_messages) == len(messages)
                system_content = enhanced_messages[0]["content"]
                assert system_content.startswith("You are a helpful assistant.\n")
                assert "User prefers Python" in system_content
                assert "Stale profile fact" not in system_content
                assert system_content.count(
                    '<supermemory context="user-memories" readonly>'
                ) == 1
                assert enhanced_messages[1] == messages[1]


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
        """Supermemory API errors fail open with the original messages."""
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
    """The memory-search path must fail open."""

    ORIGINAL_MESSAGES = [{"role": "user", "content": "What do you know about me?"}]
    SEARCH_RESPONSE = Mock(
        profile={"static": ["memories about the user"], "dynamic": []},
        search_results={"results": []},
    )
    ENHANCED_MESSAGES = [
        {
            "role": "system",
            "content": (
                '<supermemory context="user-memories" readonly>\n'
                "## Static Profile\n\n"
                "- memories about the user\n"
                "</supermemory>"
            ),
        },
        {"role": "user", "content": "What do you know about me?"},
    ]


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
                "supermemory_openai.middleware.supermemory_profile_search",
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

    @pytest.mark.asyncio
    async def test_async_happy_path_unchanged(
        self, mock_async_openai_client, mock_openai_response
    ):
        """Regression: when search succeeds, enhanced messages are still used."""
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.supermemory_profile_search",
                new=AsyncMock(return_value=self.SEARCH_RESPONSE),
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
                "supermemory_openai.middleware.supermemory_profile_search",
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
        """Fail-open must also cover the ThreadPoolExecutor fallback branch."""

        async def run_in_async():
            original_create = Mock(return_value=mock_openai_response)
            mock_openai_client.chat.completions.create = original_create

            with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
                with patch(
                    "supermemory_openai.middleware.supermemory_profile_search",
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
                "supermemory_openai.middleware.supermemory_profile_search",
                new=AsyncMock(return_value=self.SEARCH_RESPONSE),
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


    @pytest.mark.asyncio
    async def test_black_box_async_connection_error(
        self, mock_async_openai_client, mock_openai_response
    ):
        """A real aiohttp connection error must not crash create()."""
        aiohttp = pytest.importorskip("aiohttp")

        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
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
        """A real requests connection error must not crash create()."""
        import sys

        import requests

        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            with patch(
                "supermemory_openai.middleware.add_memory_tool",
                new=AsyncMock(return_value=None),
            ):
                with patch.dict(sys.modules, {"aiohttp": None}):
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


class TestProfileSearchFallback:
    """Test the requests fallback used when aiohttp is not installed."""

    @pytest.mark.asyncio
    async def test_requests_fallback_does_not_block_event_loop(self):
        """requests.post must run off the event loop so other tasks keep running."""
        released = threading.Event()

        def slow_post(*args, **kwargs):
            if not released.wait(timeout=2):
                raise AssertionError("requests.post blocked the event loop")
            response = Mock(status_code=200)
            response.json.return_value = {
                "profile": {"static": ["Prefers vegetarian food"], "dynamic": []},
                "searchResults": {"results": []},
            }
            return response

        with patch.dict(sys.modules, {"aiohttp": None}):
            with patch.object(requests, "post", side_effect=slow_post):
                search = asyncio.create_task(
                    supermemory_profile_search(
                        "user-123", "", "test-key", "https://api.supermemory.ai"
                    )
                )
                await asyncio.sleep(0)
                released.set()
                result = await search

        assert result.profile["static"] == ["Prefers vegetarian food"]


def _recall_response(*args: Any, include_profile: bool = True, **kwargs: Any) -> Mock:
    query = args[1] if len(args) > 1 else ""
    if include_profile:
        return Mock(
            profile={"static": ["Prefers Python"], "dynamic": ["Planning a trip"]},
            search_results={},
        )
    return Mock(
        profile={},
        search_results={
            "results": [
                {"memory": f"Result for {query}"},
                {"memory": "Prefers Python"},
                {"memory": "Runs 5k"},
            ]
        },
    )


def _tool_call_response() -> ChatCompletion:
    return ChatCompletion(
        id="chatcmpl-tool",
        object="chat.completion",
        created=1234567890,
        model="gpt-4",
        choices=[
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "type": "function",
                            "function": {"name": "get_weather", "arguments": "{}"},
                        }
                    ],
                },
                "finish_reason": "tool_calls",
            }
        ],
    )


class TestCacheSafeTurns:
    """The profile is frozen in the system prompt and each turn keeps its own search block."""

    SYSTEM = {"role": "system", "content": "You are helpful."}

    def _wrap(self, client: Any, **options: Any) -> Any:
        with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
            return with_supermemory(
                client,
                OpenAIMiddlewareOptions(
                    container_tag="user-123",
                    custom_id="test-conv",
                    **{"mode": "full", "add_memory": "never", **options},
                ),
            )

    def test_profile_once_in_system_and_turns_stay_byte_identical(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        search = AsyncMock(side_effect=_recall_response)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client)
            turn_one = [self.SYSTEM, {"role": "user", "content": "Weather?"}]
            wrapped.chat.completions.create(model="gpt-4", messages=turn_one)
            tool_step = [
                *turn_one,
                {"role": "assistant", "content": None, "tool_calls": []},
                {"role": "tool", "tool_call_id": "call_1", "content": "sunny"},
            ]
            wrapped.chat.completions.create(model="gpt-4", messages=tool_step)
            turn_two = [
                *tool_step,
                {"role": "assistant", "content": "It is sunny."},
                {"role": "user", "content": "Dinner?"},
            ]
            wrapped.chat.completions.create(model="gpt-4", messages=turn_two)

        flags = [call.kwargs.get("include_profile", True) for call in search.await_args_list]
        assert sorted(flags) == [False, False, True]
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert sent[0][0] == sent[1][0] == sent[2][0]
        assert sent[0][0]["content"].startswith("You are helpful.\n<supermemory")
        assert all(str(request).count("Prefers Python") == 1 for request in sent)
        assert all("Prefers Python" in request[0]["content"] for request in sent)
        assert sent[0][1] == sent[1][1] == sent[2][1]
        assert "Result for Weather?" in sent[0][1]["content"]
        assert sent[1][: len(sent[0])] == sent[0]
        assert sent[2][: len(sent[1])] == sent[1]
        latest = sent[2][-1]["content"]
        assert latest.startswith("Dinner?\n<supermemory")
        assert "Result for Dinner?" in latest
        assert "Runs 5k" not in latest
        assert turn_two[-1] == {"role": "user", "content": "Dinner?"}

    def test_repeated_question_is_a_new_turn_and_trimming_keeps_blocks(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        calls = iter(range(1, 100))

        async def recall(*args: Any, **kwargs: Any) -> Any:
            return Mock(
                profile={},
                search_results={"results": [{"memory": f"Search {next(calls)}"}]},
            )

        search = AsyncMock(side_effect=recall)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client, mode="query")
            messages: list[Any] = []
            for question, reply in (
                ("Weather?", "Sunny."),
                ("Weather?", "Still sunny."),
                ("Dinner?", "Pasta."),
                ("Dessert?", None),
            ):
                messages = [*messages, {"role": "user", "content": question}]
                wrapped.chat.completions.create(model="gpt-4", messages=messages)
                if reply:
                    messages = [*messages, {"role": "assistant", "content": reply}]
            searches = search.await_count
            wrapped.chat.completions.create(model="gpt-4", messages=messages[4:])

        assert searches == 4
        assert search.await_count == 4
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        full = sent[3]
        assert "Search 1" in full[0]["content"]
        assert "Search 2" in full[2]["content"]
        assert full[0]["content"].startswith("Weather?\n")
        assert full[2]["content"].startswith("Weather?\n")
        assert sent[4] == full[4:]

    def test_trimmed_repeated_question_keeps_the_later_turns_block(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        blocks = iter(["Block A", "Block B", "Block C"])

        async def recall(*args: Any, **kwargs: Any) -> Any:
            return Mock(
                profile={},
                search_results={"results": [{"memory": next(blocks)}]},
            )

        search = AsyncMock(side_effect=recall)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client, mode="query")
            history = [
                {"role": "user", "content": "Weather?"},
                {"role": "assistant", "content": "Sunny."},
                {"role": "user", "content": "Weather?"},
            ]
            wrapped.chat.completions.create(model="gpt-4", messages=history[:1])
            wrapped.chat.completions.create(model="gpt-4", messages=history)
            tool_step = [
                history[2],
                {"role": "assistant", "content": None, "tool_calls": []},
                {"role": "tool", "tool_call_id": "call_1", "content": "sunny"},
            ]
            wrapped.chat.completions.create(model="gpt-4", messages=tool_step)
            searches = search.await_count
            next_turn = [
                *tool_step,
                {"role": "assistant", "content": "Still sunny."},
                {"role": "user", "content": "Dinner?"},
            ]
            wrapped.chat.completions.create(model="gpt-4", messages=next_turn)

        assert searches == 2
        assert search.await_count == 3
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert "Block A" in sent[1][0]["content"]
        assert "Block B" in sent[1][2]["content"]
        assert sent[2][0] == sent[1][2]
        assert sent[3][0] == sent[1][2]
        assert "Block C" in sent[3][-1]["content"]

    def test_iterable_instruction_content_carries_the_profile(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        part = {"type": "text", "text": "You are helpful."}
        search = AsyncMock(side_effect=_recall_response)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client, mode="profile")
            for content in ((part,), iter([part])):
                wrapped.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": content},
                        {"role": "user", "content": "Weather?"},
                    ],
                )

        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert sent[0][0] == sent[1][0]
        assert sent[0][0]["content"][0] == part
        assert "Prefers Python" in sent[0][0]["content"][1]["text"]
        assert len(sent[0]) == 2

    @pytest.mark.parametrize("content", [None, b"raw", {"text": "odd"}])
    def test_unexpected_instruction_content_gets_a_leading_profile_message(
        self, mock_openai_client, mock_openai_response, content
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        system = {"role": "system", "content": content}
        search = AsyncMock(side_effect=_recall_response)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client, mode="profile")
            wrapped.chat.completions.create(
                model="gpt-4",
                messages=[system, {"role": "user", "content": "Weather?"}],
            )

        sent = original_create.call_args.kwargs["messages"]
        assert sent[0]["role"] == "system"
        assert "Prefers Python" in sent[0]["content"]
        assert sent[1] is system

    @pytest.mark.asyncio
    async def test_failed_profile_is_retried_on_the_next_user_turn(
        self, mock_async_openai_client, mock_openai_response
    ):
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create
        profile_failures = [SupermemoryNetworkError("network down")]

        async def recall(*args: Any, include_profile: bool = True, **kwargs: Any) -> Any:
            if include_profile and profile_failures:
                raise profile_failures.pop()
            return _recall_response(*args, include_profile=include_profile)

        search = AsyncMock(side_effect=recall)
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_async_openai_client)
            turn_one = [self.SYSTEM, {"role": "user", "content": "Weather?"}]
            await wrapped.chat.completions.create(model="gpt-4", messages=turn_one)
            tool_step = [
                *turn_one,
                {"role": "tool", "tool_call_id": "call_1", "content": "sunny"},
            ]
            await wrapped.chat.completions.create(model="gpt-4", messages=tool_step)
            turn_two = [
                *tool_step,
                {"role": "assistant", "content": "It is sunny."},
                {"role": "user", "content": "Dinner?"},
            ]
            await wrapped.chat.completions.create(model="gpt-4", messages=turn_two)

        flags = [call.kwargs.get("include_profile", True) for call in search.await_args_list]
        assert sorted(flags) == [False, False, True, True]
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert sent[0][0] == self.SYSTEM
        assert sent[1][0] == self.SYSTEM
        assert sent[0][1] == sent[1][1] == sent[2][1]
        assert "Prefers Python" in sent[2][0]["content"]
        assert "Result for Dinner?" in sent[2][-1]["content"]

    def test_profile_is_fetched_once_even_when_empty(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        search = AsyncMock(
            return_value=Mock(profile={"static": [], "dynamic": []}, search_results={})
        )
        with patch("supermemory_openai.middleware.supermemory_profile_search", new=search):
            wrapped = self._wrap(mock_openai_client, mode="profile")
            messages: list[Any] = [self.SYSTEM]
            for text in ("One", "Two", "Three"):
                messages = [*messages, {"role": "user", "content": text}]
                wrapped.chat.completions.create(model="gpt-4", messages=messages)
                messages = [*messages, {"role": "assistant", "content": "ok"}]

        assert search.await_count == 1
        assert original_create.call_args.kwargs["messages"] == messages[:-1]

    def test_recall_timeout_degrades_to_no_memory(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create

        async def hanging_search(*args: Any, **kwargs: Any) -> Any:
            await asyncio.sleep(5)

        messages = [{"role": "user", "content": "Hello"}]
        with patch(
            "supermemory_openai.middleware.supermemory_profile_search",
            new=hanging_search,
        ), patch("supermemory_openai.middleware.RECALL_TIMEOUT_SECONDS", 0.2):
            wrapped = self._wrap(mock_openai_client)
            started = time.monotonic()
            wrapped.chat.completions.create(model="gpt-4", messages=messages)
            elapsed = time.monotonic() - started

        assert elapsed < 1.5
        assert original_create.call_args.kwargs["messages"] == messages

    def test_turn_is_saved_once_with_its_final_reply_without_system_prompts(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(side_effect=[_tool_call_response(), mock_openai_response])
        mock_openai_client.chat.completions.create = original_create
        release = threading.Event()
        uploads: list[tuple[str, Any]] = []

        async def slow_add_memory(client, container_tag, content, custom_id, logger):
            uploads.append((content, custom_id))
            await asyncio.to_thread(release.wait, 5)

        with patch(
            "supermemory_openai.middleware.supermemory_profile_search",
            new=AsyncMock(side_effect=_recall_response),
        ), patch(
            "supermemory_openai.middleware.add_memory_tool", new=slow_add_memory
        ):
            with self._wrap(mock_openai_client, add_memory="always") as wrapped:
                turn = [
                    self.SYSTEM,
                    {"role": "developer", "content": "Internal rules."},
                    {"role": "user", "content": "Weather?"},
                ]
                started = time.monotonic()
                wrapped.chat.completions.create(model="gpt-4", messages=turn)
                wrapped.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        *turn,
                        {"role": "assistant", "content": None, "tool_calls": []},
                        {"role": "tool", "tool_call_id": "call_1", "content": "sunny"},
                    ],
                )
                assert time.monotonic() - started < 1.0
                release.set()

        assert uploads == [
            (
                "User: Weather?\n\nTool: sunny\n\n"
                "Assistant: Hello! How can I help you today?",
                "conversation:test-conv",
            )
        ]

    @staticmethod
    def _chunks() -> list[ChatCompletionChunk]:
        return [
            ChatCompletionChunk(
                id="chunk",
                object="chat.completion.chunk",
                created=1234567890,
                model="gpt-4",
                choices=[{"index": 0, "delta": delta, "finish_reason": reason}],
            )
            for delta, reason in (
                ({"role": "assistant", "content": "It is "}, None),
                ({"content": "sunny."}, None),
                ({}, "stop"),
                ({}, None),
            )
        ]

    def test_stream_closed_at_the_stop_chunk_is_saved_once(self, mock_openai_client):
        stream = Stream.__new__(Stream)
        stream._iterator = iter(self._chunks())
        mock_openai_client.chat.completions.create = Mock(return_value=stream)
        uploads: list[str] = []

        async def add_memory(client, container_tag, content, custom_id, logger):
            uploads.append(content)

        with patch(
            "supermemory_openai.middleware.supermemory_profile_search",
            new=AsyncMock(side_effect=_recall_response),
        ), patch("supermemory_openai.middleware.add_memory_tool", new=add_memory):
            wrapped = self._wrap(mock_openai_client, add_memory="always")
            response = wrapped.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "Weather?"}],
                stream=True,
            )
            for chunk in response:
                if chunk.choices[0].finish_reason == "stop":
                    break
            wrapped.wait_for_background_captures()
            saved_at_stop = list(uploads)
            list(response)
            wrapped.wait_for_background_captures()

        assert saved_at_stop == ["User: Weather?\n\nAssistant: It is sunny."]
        assert uploads == saved_at_stop

    @pytest.mark.asyncio
    async def test_async_stream_closed_at_the_stop_chunk_is_saved_once(
        self, mock_async_openai_client
    ):
        async def chunks() -> Any:
            for chunk in self._chunks():
                yield chunk

        stream = AsyncStream.__new__(AsyncStream)
        stream._iterator = chunks()
        mock_async_openai_client.chat.completions.create = AsyncMock(return_value=stream)
        uploads: list[str] = []

        async def add_memory(client, container_tag, content, custom_id, logger):
            uploads.append(content)

        with patch(
            "supermemory_openai.middleware.supermemory_profile_search",
            new=AsyncMock(side_effect=_recall_response),
        ), patch("supermemory_openai.middleware.add_memory_tool", new=add_memory):
            wrapped = self._wrap(mock_async_openai_client, add_memory="always")
            response = await wrapped.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "Weather?"}],
                stream=True,
            )
            async for chunk in response:
                if chunk.choices[0].finish_reason == "stop":
                    break
            await wrapped.wait_for_background_tasks()
            saved_at_stop = list(uploads)
            async for _ in response:
                pass
            await wrapped.wait_for_background_tasks()

        assert saved_at_stop == ["User: Weather?\n\nAssistant: It is sunny."]
        assert uploads == saved_at_stop

    def test_supermemory_requests_identify_the_plugin(self):
        from importlib.metadata import version

        from supermemory_openai.middleware import SUPERMEMORY_HEADERS

        assert SUPERMEMORY_HEADERS == {
            "x-sm-source": "openai-python",
            "x-sm-plugin-version": version("supermemory-openai-sdk"),
        }
