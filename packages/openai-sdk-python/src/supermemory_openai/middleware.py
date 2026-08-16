"""Supermemory middleware for OpenAI clients."""

import asyncio
import inspect
import os
from dataclasses import dataclass
from typing import Any, Literal, Optional, Union, cast

import supermemory
from openai import AsyncOpenAI, OpenAI
from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
)

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
)


@dataclass
class OpenAIMiddlewareOptions:
    """Configuration options for OpenAI middleware."""

    container_tag: str  # Required: identifies the user/container
    custom_id: str  # Required: groups messages into the same document
    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "always"


class SupermemoryProfileSearch:
    """Type for Supermemory profile search response."""

    def __init__(self, data: dict[str, Any]):
        self.profile: dict[str, Any] = data.get("profile", {})
        self.search_results: dict[str, Any] = data.get("searchResults", {})


class _ResourceFacade:
    """Delegate an SDK resource while overriding selected attributes."""

    def __init__(
        self,
        resource: Any,
        lazy_overrides: Optional[dict[str, Any]] = None,
        **overrides: Any,
    ) -> None:
        self._resource = resource
        self._lazy_overrides = lazy_overrides or {}
        for name, value in overrides.items():
            setattr(self, name, value)

    def __getattr__(self, name: str) -> Any:
        factory = self._lazy_overrides.get(name)
        if factory is not None:
            value = factory()
            setattr(self, name, value)
            return value
        return getattr(self._resource, name)


class _AsyncMemoryResponseContextManager:
    """Apply async middleware before entering a streaming response context."""

    def __init__(
        self,
        wrapper: "SupermemoryOpenAIWrapper",
        original_create: Any,
        kwargs: dict[str, Any],
    ) -> None:
        self._wrapper = wrapper
        self._original_create = original_create
        self._kwargs = kwargs
        self._response_context: Any = None

    async def __aenter__(self) -> Any:
        async def enter_original(**kwargs: Any) -> Any:
            self._response_context = self._original_create(**kwargs)
            return await self._response_context.__aenter__()

        return await self._wrapper._create_with_memory_async(
            enter_original,
            **self._kwargs,
        )

    async def __aexit__(
        self,
        exc_type: Any,
        exc_value: Any,
        traceback: Any,
    ) -> Any:
        if self._response_context is None:
            return None
        return await self._response_context.__aexit__(
            exc_type,
            exc_value,
            traceback,
        )


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
                        response_text=error_text,
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
                response_text=response.text,
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

    if not memories:
        return messages

    if system_prompt_exists:
        logger.debug("Added memories to existing system prompt")
        return [
            (
                {**msg, "content": f"{msg.get('content', '')} \n {memories}"}
                if msg.get("role") == "system"
                else msg
            )
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
        result = client.memories.add(**add_params)
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
                "memory_id": response.id,
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
        self._client: Union[OpenAI, AsyncOpenAI] = getattr(
            openai_client,
            "__supermemory_openai_base_client__",
            openai_client,
        )
        # A stable attribute also lets wrappers from another module copy or hot reload
        # recover the pristine client instead of nesting middleware.
        self.__supermemory_openai_base_client__ = self._client
        self._container_tag: str = options.container_tag
        self._options: OpenAIMiddlewareOptions = options
        self._logger: Logger = create_logger(self._options.verbose)
        base_create = self._client.chat.completions.create
        self._is_async_client = isinstance(
            self._client, AsyncOpenAI
        ) or inspect.iscoroutinefunction(inspect.unwrap(base_create))

        # Track background tasks to ensure they complete
        self._background_tasks: set[asyncio.Task] = set()

        if not hasattr(supermemory, "Supermemory"):
            raise SupermemoryConfigurationError(
                "supermemory package is required but not found",
                ImportError("supermemory package not installed"),
            )

        api_key = self._get_api_key()
        try:
            self._supermemory_client: supermemory.Supermemory = supermemory.Supermemory(
                api_key=api_key
            )
        except Exception as e:
            raise SupermemoryConfigurationError(
                f"Failed to initialize Supermemory client: {e}", e
            )

        # Expose isolated resource facades without mutating the supplied client.
        self.chat = self._create_chat_facade()

    def _get_api_key(self) -> str:
        """Get Supermemory API key from environment."""
        import os

        api_key = os.getenv("SUPERMEMORY_API_KEY")
        if not api_key:
            raise SupermemoryConfigurationError(
                "SUPERMEMORY_API_KEY environment variable is required but not set"
            )
        return api_key

    def _create_chat_facade(self) -> _ResourceFacade:
        """Create isolated chat/completions facades with memory injection."""
        completions_resource = self._client.chat.completions
        completions = _ResourceFacade(
            completions_resource,
            lazy_overrides={
                "with_raw_response": lambda: self._create_completion_variant_facade(
                    "with_raw_response"
                ),
                "with_streaming_response": lambda: self._create_completion_variant_facade(
                    "with_streaming_response"
                ),
            },
            create=self._create_completion_method(completions_resource.create),
        )
        return _ResourceFacade(
            self._client.chat,
            lazy_overrides={
                "with_raw_response": lambda: self._create_chat_variant_facade(
                    "with_raw_response"
                ),
                "with_streaming_response": lambda: self._create_chat_variant_facade(
                    "with_streaming_response"
                ),
            },
            completions=completions,
        )

    def _create_completion_variant_facade(self, name: str) -> _ResourceFacade:
        """Preserve raw and streaming response behavior on isolated facades."""
        resource = getattr(self._client.chat.completions, name)
        return _ResourceFacade(
            resource,
            create=self._create_completion_method(
                resource.create,
                streaming_response=name == "with_streaming_response",
            ),
        )

    def _create_chat_variant_facade(self, name: str) -> _ResourceFacade:
        """Wrap completions reached through a chat response variant."""
        chat_resource = getattr(self._client.chat, name)
        completions_resource = chat_resource.completions
        return _ResourceFacade(
            chat_resource,
            completions=_ResourceFacade(
                completions_resource,
                create=self._create_completion_method(
                    completions_resource.create,
                    streaming_response=name == "with_streaming_response",
                ),
            ),
        )

    def _create_client_variant_facade(self, name: str) -> _ResourceFacade:
        """Wrap completions reached through a client response variant."""
        client_resource = getattr(self._client, name)
        chat_resource = client_resource.chaлNЅ¶‰ћЛkєwµзXЫЫ\][ЫњЛ\]И‹]ЧШЬ™X]WЩXЭЬћB€
B€ЫY[ќЪ]ќЪ]Ь]ЧЬ™\ЬЫњЩHHЪ[\S[Y\ЬXЩJ€ЫЫ\][ЫњПXЫЫ\][Ы—Ь™\ЫЭ\ЩJЪ]\]И‹]ЧШЬ™X]WЩXЭЬћJB€
B€ЫY[ќќЪ]Ь]ЧЬ™\ЬЫњЩHHЪ[\S[Y\ЬXЩJ€Ъ]TЪ[\S[Y\ЬXЩJ€ЫЫ\][ЫњПXЫЫ\][Ы—Ь™\ЫЭ\ЩJЫY[ќ\]И‹]ЧШЬ™X]WЩXЭЬћJB€
B€
B€ЫY[ќЪ]ЫЫ\][ЫњЛќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩHHЫЫ\][Ы—Ь™\ЫЭ\ЩJ€ЫЫ\][ЫњЛ\Э™X[H‹Э™X[Z[™ЧШЬ™X]WЩXЭЬћB€
B€ЫY[ќЪ]ќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩHHЪ[\S[Y\ЬXЩJ€ЫЫ\][ЫњПXЫЫ\][Ы—Ь™\ЫЭ\ЩJЪ]\Э™X[H‹Э™X[Z[™ЧШЬ™X]WЩXЭЬћJB€
B€ЫY[ќќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩHHЪ[\S[Y\ЬXЩJ€Ъ]TЪ[\S[Y\ЬXЩJ€ЫЫ\][ЫњПXЫЫ\][Ы—Ь™\ЫЭ\ЩJЫY[ќ\Э™X[H‹Э™X[Z[™ЧШЬ™X]WЩXЭЬћJB€
B€
B€™]\›€Ш[В‚‚™Y€™\ЬЫњЩWЭ\љX[ќШЬ™X]\КЫY[ќ€[ћK[YN€ЭЉHO€\ЭР[ћWN‚€™]\›€В€Щ]]ЉЫY[ќЪ]ЫЫ\][ЫњЛ[YJKЬ™X]K€Щ]]ЉЫY[ќЪ][YJKЫЫ\][ЫњЛЬ™X]K€Щ]]ЉЫY[ќ[YJKЪ]ЫЫ\][ЫњЛЬ™X]K€B‚‚”‘PSРTЦSђЧРУУTUSУ—ФUИH
€››Ь›X[‹€ЫЫ\][ЫњЛњ]И‹€Ъ]њ]И‹€ЫY[ќњ]И‹€ЫЫ\][ЫњЛњЭ™X[Z[™И‹€Ъ]њЭ™X[Z[™И‹€ЫY[ќњЭ™X[Z[™И‹ЉB‚‚™Y€™X[Ш\Ю[ЧШЫЫ\][Ы—ШЬ™X]JЫY[ќ€[ћK]€ЭЉHO€[ћN‚€Y€]OH››Ь›X[Ћ‚€™]\›€ЫY[ќЪ]ЫЫ\][ЫњЛЬ™X]B€Y€]OHЫЫ\][ЫњЛњ]ИЋ‚€™]\›€ЫY[ќЪ]ЫЫ\][ЫњЛќЪ]Ь]ЧЬ™\ЬЫњЩKЬ™X]B€Y€]OHЪ]њ]ИЋ‚€™]\›€ЫY[ќЪ]ќЪ]Ь]ЧЬ™\ЬЫњЩKЫЫ\][ЫњЛЬ™X]B€Y€]OHЫY[ќњ]ИЋ‚€™]\›€ЫY[ќќЪ]Ь]ЧЬ™\ЬЫњЩKЪ]ЫЫ\][ЫњЛЬ™X]B€Y€]OHЫЫ\][ЫњЛњЭ™X[Z[™ИЋ‚€™]\›€ЫY[ќЪ]ЫЫ\][ЫњЛќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩKЬ™X]B€Y€]OHЪ]њЭ™X[Z[™ИЋ‚€™]\›€ЫY[ќЪ]ќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩKЫЫ\][ЫњЛЬ™X]B€Y€]OHЫY[ќњЭ™X[Z[™ИЋ‚€™]\›€ЫY[ќќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩKЪ]ЫЫ\][ЫњЛЬ™X]B€Z\ЩH\ЬЩ\ќ[Ы‘\њ›ЬЉ€•[љЫ›ЭЫ€ЫЫ\][Ы€]€Ь]HЉB‚‚ђ]\Э™љ^\™J]]Э\ЩOUќYJHИ\N€YЫ›Ь™VЭ[ќ\YYXЫЬ]Ь—B™Y€Э\\›Y[[ЬћWШ\WЪЩ^J
HO€Щ[™\]Ь–У›Ы™K›Ы™K›Ы™WN‚€Ъ]]Ъ™XЭ
ЬЛ™[ќљ\›Ы‹И”ХTT“QSSФ–WРTWТСVHЋ€ќ\ЭZЩ^HџJN‚€ZY[‚‚™Y€\ЭЬЪ\™YЬЮ[ЧШЫY[ќЩЩ\ЧЫ›ЭЬЭXЪЧЭ[[ќЫZY]Ш\™J
HO€›Ы™N‚€\ЩWШЫY[ќЬљYЪ[[ШЬ™X]HHЬ™X]WЬЮ[ЧШЫY[ќ

B€ЫЪЭ\О€\ЭЬЭ—HHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€ЪYWЩY™™XЭYZЩWЬ›Ы\€
N‚€[[ќШN€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќXHЉK€
B€[[ќШЋ€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќX€ЉK€
B‚€\ЬЩ\ќ\ЩWШЫY[ќЪ]ЫЫ\][ЫњЛЬ™X]H\ИЬљYЪ[[ШЬ™X]B€\ЬЩ\ќ[[ќШKЪ]\И›Э\ЩWШЫY[ќЪ]€\ЬЩ\ќ[[ќШ‹Ъ]›X\љЩ\€OHЪ][X\љЩ\€‚€\ЬЩ\ќ[[ќШ‹Ъ]ЫЫ\][ЫњЛ›X\љЩ\€OHЫЫ\][ЫњЛ[X\љЩ\€‚‚€[[ќШ‹Ъ]ЫЫ\][ЫњЛЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њљ]]HџWK€
B‚€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—B€Y\ЬШYЩ\ИHЬљYЪ[[ШЬ™X]KШ[Ш\™ЬЛљЭШ\™ЬЦИ›Y\ЬШYЩ\И—B€\ЬЩ\ќY\ЬШYЩ\ЦМVИЫЫќ[ќ—HOHњЩXЬ™]][[ќX€‚€\ЬЩ\ќ[
ќ[[ќXH€›Э[€ЭЉY\ЬШYЩJH›Ь€Y\ЬШYЩH[€Y\ЬШYЩ\КB‚€\ЩWШЫY[ќЪ]ЫЫ\][ЫњЛЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€ќ[ќЬ\YџWK€
B€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—B‚‚™Y€\ЭЬ™]Ь\[™ЧШWЩXШYWЬ™XЫЭ™\њЧЭWЬљ\Э[™WШЫY[ќ

HO€›Ы™N‚€\ЩWШЫY[ќЬљYЪ[[ШЬ™X]HHЬ™X]WЬЮ[ЧШЫY[ќ

B€ЫЪЭ\О€\ЭЬЭ—HHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€ЪYWЩY™™XЭYZЩWЬ›Ы\€
N‚€[[ќШN€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќXHЉK€
B€[[ќШЋ€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€[[ќШK€ZY]Ш\™WЫЬ[ЫњКќ[[ќX€ЉK€
B‚€[[ќШ‹Ъ]ЫЫ\][ЫњЛЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њљ]]HџWK€
B‚€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—B€\ЬЩ\ќЬљYЪ[[ШЬ™X]KШ[ШЫЭ[ќOHB€\ЬЩ\ќ\ЩWШЫY[ќЪ]ЫЫ\][ЫњЛЬ™X]H\ИЬљYЪ[[ШЬ™X]B‚‚™Y€\ЭЬ]ЧШ[™ЬЭ™X[Z[™ЧЬ™\ЬЫњЩWЩXШY\ЧЬ™[XZ[—ЫY[[ЬћWШ]Ш\™J
HO€›Ы™N‚€\ЩWШЫY[ќИHЬ™X]WЬЮ[ЧШЫY[ќ

B€Ш[ИH]XЪЬ™\ЬЫњЩWЭ\љX[ќК€\ЩWШЫY[ќ€[X™HX™[€[ШЪК™]\›—Э[YOT]Ф™\ЬЫњЩJX™[
JK€[X™HX™[€[ШЪК™]\›—Э[YOTЮ[ФЭ™X[PЫЫќ^
X™[
JK€
B€ЫЪЭ\О€\ЭЬЭ—HHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€ЪYWЩY™™XЭYZЩWЬ›Ы\€
N‚€[[ќШЋ€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќX€ЉK€
B‚€›Ь€Ь™X]H[€™\ЬЫњЩWЭ\љX[ќШЬ™X]\К[[ќШ‹ќЪ]Ь]ЧЬ™\ЬЫњЩHЉN‚€™\ЬЫњЩHHЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њ]ИџWK€
B€\ЬЩ\ќ™\ЬЫњЩKњ\њЩJ
KњЭ\ќЭЪ]
њ\њЩYHЉB‚€›Ь€Ь™X]H[€™\ЬЫњЩWЭ\љX[ќШЬ™X]\К[[ќШ‹ќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩHЉN‚€Ъ]Ь™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њЭ™X[Z[™ИџWK€
H\ИЭ™X[N‚€\ЬЩ\ќЭ™X[K›X™[™[™ЭЪ]
њЭ™X[HЉB‚€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—H
€‚€›Ь€Ь™X]H[€Ш[Лќ[Y\К
N‚€\ЬЩ\ќњЩXЬ™]][[ќX€€[€ЭЉЬ™X]KШ[Ш\™ЬЛљЭШ\™ЬЦИ›Y\ЬШYЩ\И—JB‚‚™Y€\ЭШ\Ю[ЧЬ]ЧШ[™ЬЭ™X[Z[™ЧЬ™\ЬЫњЩWЬ™Yљ^\ЧЬ™[XZ[—ЫY[[ЬћWШ]Ш\™J
HO€›Ы™N‚€\ЩWШЫY[ќИHЬ™X]WШ\Ю[ЧШЫY[ќ

B€Ш[ИH]XЪЬ™\ЬЫњЩWЭ\љX[ќК€\ЩWШЫY[ќ€[X™HX™[€\Ю[У[ШЪК™]\›—Э[YOT]Ф™\ЬЫњЩJX™[
JK€[X™HX™[€[ШЪК™]\›—Э[YOP\Ю[ФЭ™X[PЫЫќ^
X™[
JK€
B€ЫЪЭ\О€\ЭЬЭ—HHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€\Ю[ИY€Ш[Ь]КЬ™X]N€[ћJHO€›Ы™N‚€™\ЬЫњЩHH]ШZ]Ь™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њ]ИџWK€
B€\ЬЩ\ќ™\ЬЫњЩKњ\њЩJ
KњЭ\ќЭЪ]
њ\њЩYHЉB‚€\Ю[ИY€ЫЫњЭ[YWЬЭ™X[JЭ™X[WШЫЫќ^€[ћJHO€›Ы™N‚€\Ю[ИЪ]Э™X[WШЫЫќ^\ИЭ™X[N‚€\ЬЩ\ќЭ™X[K›X™[™[™ЭЪ]
њЭ™X[HЉB‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€ЪYWЩY™™XЭYZЩWЬ›Ы\€
N‚€[[ќШЋ€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќX€ЉK€
B‚€›Ь€Ь™X]H[€™\ЬЫњЩWЭ\љX[ќШЬ™X]\К[[ќШ‹ќЪ]Ь]ЧЬ™\ЬЫњЩHЉN‚€\Ю[Ъ[Лњќ[ЉШ[Ь]КЬ™X]JJB‚€›Ь€Ь™X]H[€™\ЬЫњЩWЭ\љX[ќШЬ™X]\К[[ќШ‹ќЪ]ЬЭ™X[Z[™ЧЬ™\ЬЫњЩHЉN‚€Э™X[WШЫЫќ^HЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њЭ™X[Z[™ИџWK€
B€\Ю[Ъ[Лњќ[ЉЫЫњЭ[YWЬЭ™X[JЭ™X[WШЫЫќ^
JB‚€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—H
€‚€›Ь€Ь™X]H[€Ш[Лќ[Y\К
N‚€\ЬЩ\ќњЩXЬ™]][[ќX€€[€ЭЉЬ™X]KШ[Ш\™ЬЛљЭШ\™ЬЦИ›Y\ЬШYЩ\И—JB‚‚ђ]\Э›X\љЛњ\[Y]љ^™Jњ]‹‘PSРTЦSђЧРУУTUSУ—ФUКBђ]\Э›X\љЛ\Ю[Ъ[В\Ю[ИY€\ЭЬ™X[Ш\Ю[ЧЫЬ[ZWЬ]ЧЭ\ЩWШ\Ю[ЧЫZY]Ш\™J]€ЭЉHO€›Ы™N‚€ЫЪЭ\О€\ЭЬЭ—HHЧB€Ьљ]\О€\ЭЭ\VЬЭ‹Ь[Ы[ЬЭ—KЭ—WHHЧB€Щ[ќЫY\ЬШYЩ\О€\ЭЫ\ЭР[ћWWHHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€\Ю[ИY€ZЩWШYЫY[[ЬћJ€ЫY[ќ€[ћK€ЫЫќZ[™\—ЭYО€Э‹€ЫЫќ[ќ€Э‹€Э\ЭЫWЪY€Ь[Ы[ЬЭ—K€ЩЩЩ\Ћ€[ћK€
HO€›Ы™N‚€Ьљ]\Л\[™

ЫЫќZ[™\—ЭYЛЭ\ЭЫWЪYЫЫќ[ќ
JB‚€Y€[™WЬ™\]Y\Э
™\]Y\Э€”™\]Y\Э
HO€”™\ЬЫњЩN‚€›ЩHHњЫЫ‹›ШYК™\]Y\ЭЫЫќ[ќ
B€Щ[ќЫY\ЬШYЩ\Л\[™
›ЩVИ›Y\ЬШYЩ\И—JB€™]\›€”™\ЬЫњЩJ€Њ€™\]Y\Э\™\]Y\Э€XY\њП^ИЫЫќ[ќ]\HЋ€\XШ][Ы‹ЪњЫЫ€џK€њЫЫЏ^В€љYЋ€Ъ]Ы\]\Э‹€›Шљ™XЭЋ€Ъ]ЫЫ\][Ы€‹€Ь™X]YЋ€€›[Щ[Ћ€™Ь]\Э‹€ЪЪXЩ\ИЋ€В€В€љ[™^Ћ€€›Y\ЬШYЩHЋ€Ињ›ЫHЋ€\ЬЪ\Э[ќ‹ЫЫќ[ќЋ€›ЪИџK€™љ[љ\ЪЬ™X\ЫЫ€Ћ€њЭЬ‹€B€K€K€
B‚€ШЫY[ќHђ\Ю[РЫY[ќ
[њЬЬќZ“[ШЪХ[њЬЬќ
[™WЬ™\]Y\Э
JB€\ЩWШЫY[ќH\Ю[УЬ[ђRJ\WЪЩ^OH›Ь[ZK]\Э‹ШЫY[ќZШЫY[ќ
B‚€ћN‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€™]ПYZЩWЬ›Ы\€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЫY[[ЬћWЭЫЫ‹€™]ПYZЩWШYЫY[[ЬћK€
KШ\›љ[™ЬЛШ]ЪЭШ\›љ[™ЬК€™XЫЬ™UќYB€
H\ИШ]YЪ‚€Ш\›љ[™ЬЛњЪ[\Yљ[\Љ[Ш^\И‹ќ[ќ[YUШ\›љ[™КB€Ь\Y€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќ\™X[‹YЫY[[ЬћOH[Ш^\ИЉK€
B€Ь™X]HH™X[Ш\Ю[ЧШЫЫ\][Ы—ШЬ™X]JЬ\Y]
B€ЭШ\™ЬИHВ€›[Щ[Ћ€™Ь]\Э‹€›Y\ЬШYЩ\ИЋ€ЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њљ]]HY\ЬШYЩHџWK€B‚€Y€]OH››Ь›X[Ћ‚€™\ЬЫњЩHH]ШZ]Ь™X]J
ЉљЭШ\™ЬКB€\ЬЩ\ќ™\ЬЫњЩKљYOHЪ]Ы\]\Э‚€[Y€]™[™ЭЪ]
‹њ]ИЉN‚€]ЧЬ™\ЬЫњЩHH]ШZ]Ь™X]J
ЉљЭШ\™ЬКB€\ЬЩ\ќ]ЧЬ™\ЬЫњЩKњ\њЩJ
KљYOHЪ]Ы\]\Э‚€[ЩN‚€™\ЬЫњЩWШЫЫќ^HЬ™X]J
ЉљЭШ\™ЬКB€\ЬЩ\ќ›Э[њЬXЭљ\Ш]ШZ]X›J™\ЬЫњЩWШЫЫќ^
B€\Ю[ИЪ]™\ЬЫњЩWШЫЫќ^\ИЭ™X[Z[™ЧЬ™\ЬЫњЩN‚€\ЬЩ\ќЭ™X[Z[™ЧЬ™\ЬЫњЩKњЭ]\ЧШЫЩHOHЊ‚€]ШZ]Ь\YќШZ]Щ›Ь—ШXЪЩЬ›Э[™Э\ЪЬК
B€]ШZ]\Ю[Ъ[ЛњЫY\

B€ШЛЫЫXЭ

B‚€ќ[ќ[YWЭШ\›љ[™ЬИHВ€Ш\›љ[™В€›Ь€Ш\›љ[™И[€Ш]YЪ€Y€\ЬЭXЫ\ЬКШ\›љ[™ЛШ]YЫЬћKќ[ќ[YUШ\›љ[™КB€B‚€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќ\™X[—B€\ЬЩ\ќЬљ]\ИOHВ€
€ќ[[ќ\™X[‹€ЫЫќ™\њШ][ЫЋќ™XY][[ќ\™X[‹€•\Щ\Ћ€љ]]HY\ЬШYЩH‹€
B€B€\ЬЩ\ќ[ЉЩ[ќЫY\ЬШYЩ\КHOHB€\ЬЩ\ќЩ[ќЫY\ЬШYЩ\ЦМVМVИЫЫќ[ќ—HOHњЩXЬ™]][[ќ\™X[‚€\ЬЩ\ќќ[ќ[YWЭШ\›љ[™ЬИOHЧB€љ[[N‚€]ШZ]\ЩWШЫY[ќЫЬЩJ
B‚‚ђ]\Э›X\љЛ\Ю[Ъ[ИИ\N€YЫ›Ь™VЭ[ќ\YYXЫЬ]Ь—B\Ю[ИY€\ЭЬЪ\™YШ\Ю[ЧШЫY[ќЬШ]™\ЧЫЫ›WЩ›Ь—ЬЩ[XЭYЭ[[ќ

HO€›Ы™N‚€\ЩWШЫY[ќЬљYЪ[[ШЬ™X]HHЬ™X]WШ\Ю[ЧШЫY[ќ

B€ЫЪЭ\О€\ЭЬЭ—HHЧB€Ьљ]\О€\ЭЭ\VЬЭ‹Ь[Ы[ЬЭ—KЭ—WHHЧB‚€\Ю[ИY€ZЩWЬ›Ы\
€Y\ЬШYЩ\О€\ЭР[ћWK€ЫЫќZ[™\—ЭYО€Э‹€ЩЩЩ\Ћ€[ћK€[ЩN€[ћK€\WЪЩ^N€Э‹€
HO€\ЭР[ћWN‚€ЫЪЭ\Л\[™
ЫЫќZ[™\—ЭYКB€™]\›€В€Ињ›ЫHЋ€њЮ\Э[H‹ЫЫќ[ќЋ€€њЩXЬ™]^ШЫЫќZ[™\—ЭYЯHџK€
›Y\ЬШYЩ\Л€B‚€\Ю[ИY€ZЩWШYЫY[[ЬћJ€ЫY[ќ€[ћK€ЫЫќZ[™\—ЭYО€Э‹€ЫЫќ[ќ€Э‹€Э\ЭЫWЪY€Ь[Ы[ЬЭ—K€ЩЩЩ\Ћ€[ћK€
HO€›Ы™N‚€Ьљ]\Л\[™

ЫЫќZ[™\—ЭYЛЭ\ЭЫWЪYЫЫќ[ќ
JB‚€Ъ]]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KњЭ\\›Y[[ЬћK”Э\\›Y[[ЬћH‹€™]\›—Э[YOS[ШЪК
K€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЬЮ\Э[WЬ›Ы\‹€ЪYWЩY™™XЭYZЩWЬ›Ы\€
K]Ъ
€њЭ\\›Y[[ЬћWЫЬ[ZK›ZY]Ш\™KYЫY[[ЬћWЭЫЫ‹€ЪYWЩY™™XЭYZЩWШYЫY[[ЬћK€
N‚€[[ќШN€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќXH‹YЫY[[ЬћOH[Ш^\ИЉK€
B€[[ќШЋ€[ћHHЪ]ЬЭ\\›Y[[ЬћJ€\ЩWШЫY[ќ€ZY]Ш\™WЫЬ[ЫњКќ[[ќX€‹YЫY[[ЬћOH[Ш^\ИЉK€
B‚€]ШZ][[ќШ‹Ъ]ЫЫ\][ЫњЛЬ™X]J€[Щ[H™Ь]\Э‹€Y\ЬШYЩ\ПVЮИњ›ЫHЋ€ќ\Щ\€‹ЫЫќ[ќЋ€њљ]]H[[ќ€Y\ЬШYЩHџWK€
B€]ШZ][[ќШKќШZ]Щ›Ь—ШXЪЩЬ›Э[™Э\ЪЬК
B€]ШZ][[ќШ‹ќШZ]Щ›Ь—ШXЪЩЬ›Э[™Э\ЪЬК
B‚€\ЬЩ\ќ\ЩWШЫY[ќЪ]ЫЫ\][ЫњЛЬ™X]H\ИЬљYЪ[[ШЬ™X]B€\ЬЩ\ќЫЪЭ\ИOHИќ[[ќX€—B€\ЬЩ\ќЬљ]\ИOHВ€
€ќ[[ќX€‹€ЫЫќ™\њШ][ЫЋќ™XY][[ќX€‹€•\Щ\Ћ€љ]]H[[ќ€Y\ЬШYЩH‹€
B€B€\ЬЩ\ќЬљYЪ[[ШЬ™X]KШ[ШЫЭ[ќOHB