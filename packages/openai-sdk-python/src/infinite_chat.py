"""Enhanced OpenAI client with Supermemory infinite context integration."""

from typing import Dict, List, Optional, Union, overload, Unpack
from typing_extensions import Literal

from openai import OpenAI, AsyncStream
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionMessageParam,
    ChatCompletionToolParam,
    ChatCompletionToolChoiceOptionParam,
    CompletionCreateParams,
)


# Provider URL mapping
PROVIDER_MAP = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "deepinfra": "https://api.deepinfra.com/v1/openai",
    "groq": "https://api.groq.com/openai/v1",
    "google": "https://generativelanguage.googleapis.com/v1beta/openai",
    "cloudflare": "https://gateway.ai.cloudflare.com/v1/*/unlimited-context/openai",
}

ProviderName = Literal[
    "openai", "anthropic", "openrouter", "deepinfra", "groq", "google", "cloudflare"
]


class SupermemoryInfiniteChatConfigBase:
    """Base configuration for Supermemory infinite chat."""

    def __init__(
        self,
        provider_api_key: str,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.provider_api_key = provider_api_key
        self.headers = headers or {}


class SupermemoryInfiniteChatConfigWithProviderName(SupermemoryInfiniteChatConfigBase):
    """Configuration using a predefined provider name."""

    def __init__(
        self,
        provider_name: ProviderName,
        provider_api_key: str,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(provider_api_key, headers)
        self.provider_name = provider_name
        self.provider_url: None = None


class SupermemoryInfiniteChatConfigWithProviderUrl(SupermemoryInfiniteChatConfigBase):
    """Configuration using a custom provider URL."""

    def __init__(
        self,
        provider_url: str,
        provider_api_key: str,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(provider_api_key, headers)
        self.provider_url = provider_url
        self.provider_name: None = None


SupermemoryInfiniteChatConfig = Union[
    SupermemoryInfiniteChatConfigWithProviderName,
    SupermemoryInfiniteChatConfigWithProviderUrl,
]


class SupermemoryOpenAI(OpenAI):
    """Enhanced OpenAI client with supermemory integration.

    Only chat completions are supported - all other OpenAI API endpoints are disabled.
    """

    def __init__(
        self,
        supermemory_api_key: str,
        config: Optional[SupermemoryInfiniteChatConfig] = None,
    ):
        """Initialize the SupermemoryOpenAI client.

        Args:
            supermemory_api_key: API key for Supermemory service
            config: Configuration for the AI provider
        """
        # Determine base URL
        if config is None:
            base_url = "https://api.openai.com/v1"
            api_key = None
            headers = {}
        elif hasattr(config, "provider_name") and config.provider_name:
            base_url = PROVIDER_MAP[config.provider_name]
            api_key = config.provider_api_key
            headers = config.headers
        else:
            base_url = config.provider_url
            api_key = config.provider_api_key
            headers = config.headers

        # Prepare default headers
        default_headers = {
            "x-supermemory-api-key": supermemory_api_key,
            **headers,
        }

        # Initialize the parent OpenAI client
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            default_headers=default_headers,
        )

        self._supermemory_api_key = supermemory_api_key

        # Disable unsupported endpoints
        self._disable_unsupported_endpoints()

    def _disable_unsupported_endpoints(self) -> None:
        """Disable all OpenAI endpoints except chat completions."""

        def unsupported_error() -> None:
            raise RuntimeError(
                "Supermemory only supports chat completions. "
                "Use chat_completion() or chat.completions.create() instead."
            )

        # List of endpoints to disable
        endpoints = [
            "embeddings",
            "fine_tuning",
            "images",
            "audio",
            "models",
            "moderations",
            "files",
            "batches",
            "uploads",
            "beta",
        ]

        # Override endpoints with error function
        for endpoint in endpoints:
            setattr(self, endpoint, property(lambda self: unsupported_error()))

    async def create_chat_completion(
        self,
        **params: Unpack[CompletionCreateParams],
    ) -> ChatCompletion:
        """Create chat completions with infinite context support.

        Args:
            **params: Parameters for chat completion

        Returns:
            ChatCompletion response
        """
        return await self.chat.completions.create(**params)

    @overload
    async def chat_completion(
        self,
        messages: List[ChatCompletionMessageParam],
        *,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[ChatCompletionToolParam]] = None,
        tool_choice: Optional[ChatCompletionToolChoiceOptionParam] = None,
        stream: Literal[False] = False,
        **kwargs: Unpack[CompletionCreateParams],
    ) -> ChatCompletion: ...

    @overload
    async def chat_completion(
        self,
        messages: List[ChatCompletionMessageParam],
        *,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[ChatCompletionToolParam]] = None,
        tool_choice: Optional[ChatCompletionToolChoiceOptionParam] = None,
        stream: Literal[True],
        **kwargs: Unpack[CompletionCreateParams],
    ) -> AsyncStream[ChatCompletion]: ...

    async def chat_completion(
        self,
        messages: List[ChatCompletionMessageParam],
        *,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[ChatCompletionToolParam]] = None,
        tool_choice: Optional[ChatCompletionToolChoiceOptionParam] = None,
        stream: bool = False,
        **kwargs: Unpack[CompletionCreateParams],
    ) -> Union[ChatCompletion, AsyncStream[ChatCompletion]]:
        """Create chat completions with simplified interface.

        Args:
            messages: List of chat messages
            model: Model to use (defaults to gpt-4o)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            tools: Available tools for function calling
            tool_choice: Tool choice strategy
            stream: Whether to stream the response
            **kwargs: Additional parameters

        Returns:
            ChatCompletion response or stream
        """
        params: Dict[
            str,
            Union[
                str,
                List[ChatCompletionMessageParam],
                List[ChatCompletionToolParam],
                ChatCompletionToolChoiceOptionParam,
                bool,
                float,
                int,
            ],
        ] = {
            "model": model or "gpt-4o",
            "messages": messages,
            **kwargs,
        }

        # Add optional parameters if provided
        if temperature is not None:
            params["temperature"] = temperature
        if max_tokens is not None:
            params["max_tokens"] = max_tokens
        if tools is not None:
            params["tools"] = tools
        if tool_choice is not None:
            params["tool_choice"] = tool_choice
        if stream is not None:
            params["stream"] = stream

        return await self.chat.completions.create(**params)


def create_supermemory_openai(
    supermemory_api_key: str,
    config: Optional[SupermemoryInfiniteChatConfig] = None,
) -> SupermemoryOpenAI:
    """Helper function to create a SupermemoryOpenAI instance.

    Args:
        supermemory_api_key: API key for Supermemory service
        config: Configuration for the AI provider

    Returns:
        SupermemoryOpenAI instance
    """
    return SupermemoryOpenAI(supermemory_api_key, config)
