"""Tests for infinite_chat module."""

import os
import pytest
from typing import List

from openai.types.chat import ChatCompletionMessageParam
from ..src import (
    SupermemoryOpenAI,
    SupermemoryInfiniteChatConfigWithProviderName,
    SupermemoryInfiniteChatConfigWithProviderUrl,
    ProviderName,
)


# Test configuration
PROVIDERS: List[ProviderName] = [
    "openai",
    "anthropic",
    "openrouter",
    "deepinfra",
    "groq",
    "google",
    "cloudflare",
]


@pytest.fixture
def test_api_key() -> str:
    """Get test Supermemory API key from environment."""
    api_key = os.getenv("SUPERMEMORY_API_KEY")
    if not api_key:
        pytest.skip("SUPERMEMORY_API_KEY environment variable is required for tests")
    return api_key


@pytest.fixture
def test_provider_api_key() -> str:
    """Get test provider API key from environment."""
    api_key = os.getenv("PROVIDER_API_KEY")
    if not api_key:
        pytest.skip("PROVIDER_API_KEY environment variable is required for tests")
    return api_key


@pytest.fixture
def test_provider_name() -> ProviderName:
    """Get test provider name from environment."""
    provider_name = os.getenv("PROVIDER_NAME", "openai")
    if provider_name not in PROVIDERS:
        pytest.fail(f"Invalid provider name: {provider_name}")
    return provider_name  # type: ignore


@pytest.fixture
def test_provider_url() -> str:
    """Get test provider URL from environment."""
    return os.getenv("PROVIDER_URL", "")


@pytest.fixture
def test_model_name() -> str:
    """Get test model name from environment."""
    return os.getenv("MODEL_NAME", "gpt-4o-mini")


@pytest.fixture
def test_headers() -> dict:
    """Get test headers."""
    return {"custom-header": "test-value"}


@pytest.fixture
def test_messages() -> List[List[ChatCompletionMessageParam]]:
    """Test message sets."""
    return [
        [{"role": "user", "content": "Hello!"}],
        [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "What is AI?"},
        ],
        [
            {"role": "user", "content": "Tell me a joke"},
            {
                "role": "assistant",
                "content": "Why don't scientists trust atoms? Because they make up everything!",
            },
            {"role": "user", "content": "Tell me another one"},
        ],
    ]


class TestClientCreation:
    """Test client creation."""

    def test_create_client_with_provider_name(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
        test_headers: dict,
    ):
        """Test creating client with provider name configuration."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers=test_headers,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        assert client is not None
        assert client.chat is not None

    def test_create_client_with_openai_provider(
        self, test_api_key: str, test_provider_api_key: str, test_headers: dict
    ):
        """Test creating client with OpenAI provider configuration."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai",
            provider_api_key=test_provider_api_key,
            headers=test_headers,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        assert client is not None

    def test_create_client_with_custom_provider_url(
        self, test_api_key: str, test_provider_api_key: str, test_headers: dict
    ):
        """Test creating client with custom provider URL."""
        custom_url = "https://custom-provider.com/v1"
        config = SupermemoryInfiniteChatConfigWithProviderUrl(
            provider_url=custom_url,
            provider_api_key=test_provider_api_key,
            headers=test_headers,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        assert client is not None


class TestChatCompletions:
    """Test chat completions functionality."""

    @pytest.mark.asyncio
    async def test_create_chat_completion_simple_message(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
        test_model_name: str,
        test_messages: List[List[ChatCompletionMessageParam]],
    ):
        """Test creating chat completion with simple message."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers={},
        )

        client = SupermemoryOpenAI(test_api_key, config)

        result = await client.create_chat_completion(
            model=test_model_name,
            messages=test_messages[0],  # "Hello!"
        )

        assert result is not None
        assert hasattr(result, "choices")
        assert len(result.choices) > 0
        assert result.choices[0].message.content is not None

    @pytest.mark.asyncio
    async def test_chat_completion_convenience_method(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
        test_model_name: str,
        test_messages: List[List[ChatCompletionMessageParam]],
    ):
        """Test chat completion using convenience method."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers={},
        )

        client = SupermemoryOpenAI(test_api_key, config)

        result = await client.chat_completion(
            messages=test_messages[1],  # System + user messages
            model=test_model_name,
            temperature=0.7,
        )

        assert result is not None
        assert hasattr(result, "choices")
        assert len(result.choices) > 0
        assert result.choices[0].message.content is not None

    @pytest.mark.asyncio
    async def test_handle_conversation_history(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
        test_model_name: str,
        test_messages: List[List[ChatCompletionMessageParam]],
    ):
        """Test handling conversation history."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers={},
        )

        client = SupermemoryOpenAI(test_api_key, config)

        result = await client.chat_completion(
            messages=test_messages[2],  # Multi-turn conversation
            model=test_model_name,
        )

        assert result is not None
        assert hasattr(result, "choices")
        assert len(result.choices) > 0
        assert result.choices[0].message.content is not None

    @pytest.mark.asyncio
    async def test_custom_headers(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
        test_model_name: str,
    ):
        """Test working with custom headers."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers={"x-custom-header": "test-value"},
        )

        client = SupermemoryOpenAI(test_api_key, config)

        result = await client.chat_completion(
            messages=[{"role": "user", "content": "Hello"}],
            model=test_model_name,
        )

        assert result is not None
        assert hasattr(result, "choices")


class TestConfigurationValidation:
    """Test configuration validation."""

    def test_handle_empty_headers_object(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
    ):
        """Test handling empty headers object."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
            headers={},
        )

        client = SupermemoryOpenAI(test_api_key, config)

        assert client is not None

    def test_handle_configuration_without_headers(
        self,
        test_api_key: str,
        test_provider_api_key: str,
        test_provider_name: ProviderName,
    ):
        """Test handling configuration without headers."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name=test_provider_name,
            provider_api_key=test_provider_api_key,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        assert client is not None

    def test_handle_different_api_keys(self):
        """Test handling different API keys."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai",
            provider_api_key="different-provider-key",
        )

        client = SupermemoryOpenAI("different-sm-key", config)

        assert client is not None


class TestDisabledEndpoints:
    """Test that non-chat endpoints are disabled."""

    def test_disabled_endpoints_throw_errors(
        self, test_api_key: str, test_provider_api_key: str
    ):
        """Test that all disabled endpoints throw appropriate errors."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai",
            provider_api_key=test_provider_api_key,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        # Test that all disabled endpoints throw appropriate errors
        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.embeddings

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.fine_tuning

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.images

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.audio

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.models

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.moderations

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.files

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.batches

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.uploads

        with pytest.raises(
            RuntimeError, match="Supermemory only supports chat completions"
        ):
            _ = client.beta

    def test_chat_completions_still_work(
        self, test_api_key: str, test_provider_api_key: str
    ):
        """Test that chat completions still work after disabling other endpoints."""
        config = SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai",
            provider_api_key=test_provider_api_key,
        )

        client = SupermemoryOpenAI(test_api_key, config)

        # Chat completions should still be accessible
        assert client.chat is not None
        assert client.chat.completions is not None
        assert callable(client.create_chat_completion)
        assert callable(client.chat_completion)
