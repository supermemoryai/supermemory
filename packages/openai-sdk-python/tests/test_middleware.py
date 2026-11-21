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

                enhanced_messages = call_args["messages"]
                assert [message["role"] for message in enhanced_messages] == ["user"]
                user_content = enhanced_messages[0]["content"]
                assert user_content.startswith(messages[0]["content"] + "\n\n")
                assert "User prefers Python" in user_content
                assert messages[0]["content"] == "What's my favorite programming language?"

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

                assert enhanced_messages[0]["role"] == "user"
                user_content = enhanced_messages[0]["content"]
                assert "Static Profile" in user_content
                assert "Dynamic Profile" in user_content
                assert "Search results" in user_content

    @pytest.mark.asyncio
    async def test_existing_system_prompt_is_never_modified(
        self, mock_async_openai_client, mock_openai_response, mock_supermemory_response
    ):
        """Memories go on the user turn; the system prompt is sent byte-for-byte."""
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
                assert enhanced_messages[0] == messages[0]

                user_message = enhanced_messages[1]
                assert user_message["role"] == "user"
                assert user_message["content"].startswith("What do you know about me?\n\n")
                assert "User prefers Python" in user_message["content"]
                assert user_message["content"].count(
                    '<supermemory context="user-memories" readonly>'
                ) == 1


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
            "role": "user",
            "content": (
                "What do you know about me?\n\n"
                '<supermemory context="user-memories" readonly>\n'
                "## Static Profile\n\n"
                "- memories about the user\n"
                "</supermemory>"
            ),
        },
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


def _profile_response(search: list[str]) -> Mock:
    return Mock(
        profile={"static": ["Prefers Python"], "dynamic": ["Planning a trip"]},
        search_results={"results": [{"memory": memory} for memory in search]},
    )


class TestCacheSafeTurns:
    """Memory is pinned per user turn so every earlier request prefix is resent unchanged."""

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

    def test_turns_stay_byte_identical_and_tool_steps_reuse_memory(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        search = AsyncMock(
            side_effect=[
                _profile_response(["Likes cortados", "Runs 5k"]),
                _profile_response(["Runs 5k", "Learning Portuguese"]),
            ]
        )
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

        assert search.await_count == 2
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert all(request[0] == self.SYSTEM for request in sent)
        assert sent[0][1] == sent[1][1] == sent[2][1]
        assert "Prefers Python" in sent[0][1]["content"]
        assert "Likes cortados" in sent[0][1]["content"]
        assert sent[1][: len(sent[0])] == sent[0]
        assert sent[2][: len(sent[1])] == sent[1]
        latest = sent[2][-1]["content"]
        assert latest.startswith("Dinner?\n\n")
        assert "Learning Portuguese" in latest
        assert "Prefers Python" not in latest
        assert "Runs 5k" not in latest
        assert turn_two[-1] == {"role": "user", "content": "Dinner?"}

    @pytest.mark.asyncio
    async def test_failed_recall_is_retried_on_the_next_user_turn(
        self, mock_async_openai_client, mock_openai_response
    ):
        original_create = AsyncMock(return_value=mock_openai_response)
        mock_async_openai_client.chat.completions.create = original_create
        search = AsyncMock(
            side_effect=[
                SupermemoryNetworkError("network down"),
                _profile_response(["Likes cortados"]),
            ]
        )
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

        assert search.await_count == 2
        sent = [call.kwargs["messages"] for call in original_create.call_args_list]
        assert sent[0] == turn_one
        assert sent[1] == tool_step
        assert sent[2][:-1] == turn_two[:-1]
        assert "Prefers Python" in sent[2][-1]["content"]
        assert "Likes cortados" in sent[2][-1]["content"]

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
        ):
            wrapped = self._wrap(mock_openai_client, recall_timeout=0.2)
            started = time.monotonic()
            wrapped.chat.completions.create(model="gpt-4", messages=messages)
            elapsed = time.monotonic() - started

        assert elapsed < 1.5
        assert original_create.call_args.kwargs["messages"] == messages

    def test_sync_capture_runs_in_background_once_per_turn_without_system_prompts(
        self, mock_openai_client, mock_openai_response
    ):
        original_create = Mock(return_value=mock_openai_response)
        mock_openai_client.chat.completions.create = original_create
        release = threading.Event()
        uploads: list[tuple[str, Any]] = []

        async def slow_add_memory(client, container_tag, content, custom_id, logger):
            uploads.append((content, custom_id))
            await asyncio.to_thread(release.wait, 5)

        with patch(
            "supermemory_openai.middleware.supermemory_profile_search",
            new=AsyncMock(return_value=_profile_response([])),
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
                        {"role": "tool", "tool_call_id": "call_1", "content": "sunny"},
                    ],
                )
                assert time.monotonic() - started < 1.0
                release.set()

        assert uploads == [("User: Weather?", "conversation:test-conv")]
