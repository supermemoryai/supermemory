"""Supermemory middleware for OpenAI clients."""

import asyncio
import atexit
import hashlib
import inspect
import os
import threading
import time
import types
from collections import OrderedDict
from collections.abc import Coroutine, Iterable
from dataclasses import dataclass
from importlib.metadata import version as package_version
from typing import Any, Callable, Literal, Optional, TypeVar, Union, cast

import supermemory
from openai import AsyncOpenAI, AsyncStream, OpenAI, Stream
from openai.types.chat import ChatCompletionMessageParam

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
    replace_memory_context,
    strip_memory_context,
    wrap_memory_context,
)

DEFAULT_SUPERMEMORY_BASE_URL = "https://api.supermemory.ai"
RECALL_TIMEOUT_SECONDS = 3.0
CAPTURE_TIMEOUT_SECONDS = 5.0
EXIT_WAIT_SECONDS = 5.0
MAX_TURNS_PER_CONVERSATION = 500
UNCAPTURED_ROLES = ("system", "developer")
SM_SOURCE = "openai-python"


def _plugin_version() -> str:
    try:
        return package_version("supermemory-openai-sdk")
    except Exception:
        return "unknown"


SUPERMEMORY_HEADERS = {
    "x-sm-source": SM_SOURCE,
    "x-sm-plugin-version": _plugin_version(),
}

T = TypeVar("T")

_PENDING_CAPTURES: set[threading.Thread] = set()


@atexit.register
def _finish_pending_captures() -> None:
    """Give the last sync saves a bounded chance to land, as Node keeps the process alive for open requests."""
    deadline = time.monotonic() + EXIT_WAIT_SECONDS
    for thread in list(_PENDING_CAPTURES):
        thread.join(max(0.0, deadline - time.monotonic()))


@dataclass
class OpenAIMiddlewareOptions:
    """Configuration options for OpenAI middleware.

    Attributes:
        container_tag: Identifies whose memories are read and written, such as a
            user or project ID. Required.
        custom_id: Conversation ID. Messages saved by this wrapper are grouped into
            one Supermemory document with this ID, and the wrapper keeps the memory
            it injected for this conversation. Required.
        verbose: Print detailed logs of memory recall and saving. Defaults to False.
        mode: Where memories come from and where they go. Defaults to "profile".

            - "profile": the user's profile, fetched once per conversation and
              appended to the system prompt.
            - "query": search results for each user message, appended to that
              message.
            - "full": both; the profile once in the system prompt plus per-message
              search results.

            Recall waits at most 3 seconds. A failed or timed-out fetch sends the
            request without that memory, and the profile is fetched again on the
            next user message.
        add_memory: "always" saves each finished turn (the conversation plus the
            final assistant reply, without system or developer messages) in the
            background; "never" only reads memories. Defaults to "always".
        api_key: Supermemory API key. Falls back to the SUPERMEMORY_API_KEY
            environment variable.
        base_url: Supermemory API base URL. Falls back to SUPERMEMORY_BASE_URL, then
            https://api.supermemory.ai.
    """

    container_tag: str
    custom_id: str
    verbose: bool = False
    mode: Literal["profile", "query", "full"] = "profile"
    add_memory: Literal["always", "never"] = "always"
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class SupermemoryProfileSearch:
    """Parsed response of a profile or memory search request.

    Attributes:
        profile: The ``static`` and ``dynamic`` profile lists, empty for a
            search-only request.
        search_results: The search results object with a ``results`` list, empty
            when no search ran.
    """

    def __init__(self, data: dict[str, Any]):
        self.profile: dict[str, Any] = data.get("profile", {})
        self.search_results: dict[str, Any] = data.get("searchResults", {})


@dataclass(frozen=True)
class _TurnBlock:
    """Search memory pinned to one user turn so later requests resend the same bytes."""

    text: str = ""
    memories: tuple[str, ...] = ()


class _ConversationMemory:
    """The frozen profile and per-turn blocks of one conversation, bounded per conversation."""

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.turns: OrderedDict[str, _TurnBlock] = OrderedDict()
        self.positions: dict[str, int] = {}
        self.keys_by_position: dict[int, str] = {}
        self.next_position = 0
        self.profile_text: Optional[str] = None
        self.profile_memories: tuple[str, ...] = ()

    def resolve(self, keys: list[tuple[int, str]]) -> list[tuple[int, str]]:
        """A trim keeps the tail, so turns that lost their preceding reply map onto the stored turns in order."""
        with self.lock:
            anchor = next(
                (
                    (offset, self.positions[key])
                    for offset, (_, key) in enumerate(keys)
                    if "\x00" in key and key in self.positions
                ),
                None,
            )
            if anchor is None and keys:
                last = keys[-1][1]
                tail = self.keys_by_position.get(self.next_position - 1)
                same_turn = (
                    tail is not None and "\x00" not in last and _key_text(tail) == last
                )
                anchor = (len(keys) - 1, self.next_position - int(same_turn))
            resolved = []
            for offset, (index, key) in enumerate(keys):
                if anchor is not None and "\x00" not in key:
                    stored = self.keys_by_position.get(anchor[1] - anchor[0] + offset)
                    if stored is not None and _key_text(stored) == key:
                        key = stored
                resolved.append((index, key))
            return resolved

    def block(self, key: str) -> Optional[_TurnBlock]:
        with self.lock:
            block = self.turns.get(key)
            if block is not None:
                self.turns.move_to_end(key)
            return block

    def pin(self, key: str, block: _TurnBlock) -> None:
        """Keep the first block stored for a turn so a racing duplicate request cannot replace it."""
        with self.lock:
            if key in self.turns:
                return
            self.turns[key] = block
            self.positions[key] = self.next_position
            self.keys_by_position[self.next_position] = key
            self.next_position += 1
            while len(self.turns) > MAX_TURNS_PER_CONVERSATION:
                evicted, _ = self.turns.popitem(last=False)
                del self.keys_by_position[self.positions.pop(evicted)]


def _key_text(key: str) -> str:
    return key.split("\x00")[0]


def _role(message: Any) -> Any:
    if isinstance(message, dict):
        return message.get("role")
    return getattr(message, "role", None)


def _message_text(message: Any) -> str:
    content = (
        message.get("content")
        if isinstance(message, dict)
        else getattr(message, "content", None)
    )
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""
    texts = []
    for part in content:
        text = (
            part.get("text") if isinstance(part, dict) else getattr(part, "text", None)
        )
        if isinstance(text, str) and text.strip():
            texts.append(text.strip())
    return "\n".join(texts)


def _turn_text(text: str) -> str:
    return " ".join(strip_memory_context(text).split())


def _turn_keys(messages: list[ChatCompletionMessageParam]) -> list[tuple[int, str]]:
    """Key each user turn by its text and the reply before it, so repeats are new turns and trimming keeps keys."""
    keys: list[tuple[int, str]] = []
    reply = ""
    for index, message in enumerate(messages):
        role = _role(message)
        if role == "assistant":
            reply_text = _turn_text(_message_text(message))
            if reply_text:
                reply = hashlib.sha256(reply_text.encode()).hexdigest()[:16]
        elif role == "user":
            text = _turn_text(_message_text(message))
            keys.append((index, f"{text}\x00{reply}" if reply else text))
    return keys


def _listed_content(message: Any) -> Any:
    """Read an iterable of content parts once, so a one-shot iterator still reaches the model intact."""
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, (str, bytes, bytearray, dict, list)) or not isinstance(
        content, Iterable
    ):
        return message
    return {**message, "content": list(content)}


def _accepts_memory(message: Any) -> bool:
    return isinstance(message, dict) and isinstance(message.get("content"), (str, list))


def _with_memory_block(message: Any, memories: str) -> Any:
    """Replace only SDK-owned blocks, so caller-authored bytes reach the model exactly as sent."""
    if not _accepts_memory(message):
        return message
    content = message["content"]
    if isinstance(content, str):
        return {**message, "content": replace_memory_context(content, memories)}
    parts = []
    for part in content:
        text = part.get("text") if isinstance(part, dict) else None
        if not isinstance(text, str) or "<supermemory" not in text:
            parts.append(part)
            continue
        stripped = strip_memory_context(text)
        if stripped:
            parts.append({**part, "text": stripped})
    block = wrap_memory_context(memories)
    return {
        **message,
        "content": [*parts, {"type": "text", "text": block}] if block else parts,
    }


def _profile_memories(
    response: SupermemoryProfileSearch,
) -> tuple[str, tuple[str, ...]]:
    profile = response.profile or {}
    deduplicated = deduplicate_memories(
        static=profile.get("static", []),
        dynamic=profile.get("dynamic", []),
    )
    markdown = convert_profile_to_markdown(
        {"profile": {"static": deduplicated.static, "dynamic": deduplicated.dynamic}}
    )
    return markdown, (*deduplicated.static, *deduplicated.dynamic)


def _search_block(response: SupermemoryProfileSearch, seen: set[str]) -> _TurnBlock:
    """Leave out what the profile or an earlier turn already carried."""
    deduplicated = deduplicate_memories(
        search_results=(response.search_results or {}).get("results", [])
    )
    memories = tuple(m for m in deduplicated.search_results if m not in seen)
    if not memories:
        return _TurnBlock()
    text = "Search results for user's recent message: \n" + "\n".join(
        f"- {memory}" for memory in memories
    )
    return _TurnBlock(text=text, memories=memories)


def _succeeded(result: Any) -> bool:
    return result is not None and not isinstance(result, BaseException)


def _run_with_deadline(coroutine: Coroutine[Any, Any, T], timeout: float) -> T:
    """Run a coroutine on a daemon thread so a hung request can never hold the caller."""
    outcome: dict[str, Any] = {}

    def run() -> None:
        try:
            outcome["value"] = asyncio.run(coroutine)
        except BaseException as error:
            outcome["error"] = error

    thread = threading.Thread(target=run, name="supermemory-recall", daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise TimeoutError(f"Supermemory recall exceeded {timeout}s")
    if "error" in outcome:
        raise outcome["error"]
    return cast(T, outcome["value"])


class _StreamedReply:
    """Save at the reply's terminal chunk, before it is yielded, since callers often stop reading there."""

    def __init__(self, finish: Callable[[str], None]) -> None:
        self._finish = finish
        self._text: list[str] = []
        self._called_tool = False
        self._saved = False

    def observe(self, chunk: Any) -> None:
        choices = getattr(chunk, "choices", None)
        choice = choices[0] if choices else None
        delta = getattr(choice, "delta", None)
        if delta is not None:
            self._text.append(getattr(delta, "content", None) or "")
            self._called_tool = self._called_tool or bool(
                getattr(delta, "tool_calls", None)
            )
        reason = getattr(choice, "finish_reason", None)
        if reason and reason != "tool_calls":
            self.end()

    def end(self) -> None:
        if self._called_tool or self._saved:
            return
        self._saved = True
        self._finish("".join(self._text))


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
            observe_reply=False,
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
    base_url: str,
    timeout: float = RECALL_TIMEOUT_SECONDS,
    include_profile: bool = True,
) -> SupermemoryProfileSearch:
    """Fetch the user's profile or search their memories.

    With ``include_profile`` the request goes to ``/v4/profile`` (adding a search
    when ``query_text`` is set). Without it the request goes to ``/v4/search`` with
    the same parameters ``/v4/profile`` uses for its own search. The request makes
    one attempt with no retries. When aiohttp is not installed, the requests
    fallback runs on a worker thread so it never blocks the event loop.

    Args:
        container_tag: Tag whose memories are read.
        query_text: Search query; empty for a profile-only request.
        api_key: Supermemory API key.
        base_url: Supermemory API base URL.
        timeout: Seconds before the request is abandoned.
        include_profile: Fetch the profile (``True``) or only search (``False``).

    Returns:
        The parsed profile and/or search results.

    Raises:
        SupermemoryAPIError: When the API answers with a non-2xx status.
    """
    payload: dict[str, Any]
    if include_profile:
        payload = {"containerTag": container_tag, "include": ["static", "dynamic"]}
        if query_text:
            payload["q"] = query_text
        url = f"{base_url.rstrip('/')}/v4/profile"
    else:
        payload = {
            "q": query_text,
            "containerTag": container_tag,
            "limit": 15,
            "threshold": 0.5,
            "include": {"documents": True},
            "rerank": False,
            "aggregate": False,
            "rewriteQuery": False,
            "searchMode": "memories",
        }
        url = f"{base_url.rstrip('/')}/v4/search"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        **SUPERMEMORY_HEADERS,
    }

    try:
        import aiohttp

        client_timeout = aiohttp.ClientTimeout(total=timeout)
        async with aiohttp.ClientSession(timeout=client_timeout) as session:
            async with session.post(
                url, headers=headers, json=payload, allow_redirects=False
            ) as response:
                if not 200 <= response.status < 300:
                    raise SupermemoryAPIError(
                        "Supermemory profile search failed",
                        status_code=response.status,
                        response_text=await response.text(),
                    )
                data = await response.json()

    except ImportError:
        import requests

        sync_response = await asyncio.to_thread(
            requests.post,
            url,
            headers=headers,
            json=payload,
            timeout=timeout,
            allow_redirects=False,
        )
        if not 200 <= sync_response.status_code < 300:
            raise SupermemoryAPIError(
                "Supermemory profile search failed",
                status_code=sync_response.status_code,
                response_text=sync_response.text,
            )
        data = sync_response.json()

    return SupermemoryProfileSearch(
        data if include_profile else {"searchResults": data}
    )


async def add_memory_tool(
    client: Union[supermemory.Supermemory, supermemory.AsyncSupermemory],
    container_tag: str,
    content: str,
    custom_id: Optional[str],
    logger: Logger,
) -> None:
    """Save content to Supermemory.

    The sync wrapper calls this from its background save thread with a sync
    client; the async wrapper passes an async client.

    Args:
        client: Supermemory client used for the save.
        container_tag: Tag the memory is saved under.
        content: Text to save, typically the formatted conversation.
        custom_id: Document ID that groups saves of one conversation, or None.
        logger: Logger for the outcome.

    Raises:
        SupermemoryNetworkError: When the save fails on a network error.
        SupermemoryMemoryOperationError: When the save fails for any other reason.
    """
    try:
        kwargs = {"content": content, "container_tag": container_tag}
        if custom_id is not None:
            kwargs["custom_id"] = custom_id

        result = client.add(**kwargs)
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
    """OpenAI client wrapper that adds Supermemory recall and saving to chat completions.

    Create it with :func:`with_supermemory`. Every attribute other than ``chat``
    and the ``with_raw_response`` / ``with_streaming_response`` prefixes is
    delegated to the wrapped client unchanged. One wrapper serves one
    conversation (``OpenAIMiddlewareOptions.custom_id``).

    The wrapper keeps the prompt cache intact. The user's profile is fetched once
    per conversation and appended to the first system or developer message (or
    sent as a leading system message), byte-identical on every call. Each user
    message gets the search results retrieved for it, and earlier messages keep
    exactly the block they first received. Tool-call continuations reuse their
    turn's block. Each finished turn is saved in the background once its final
    assistant reply arrives.
    """

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
        self.__supermemory_openai_base_client__ = self._client
        self._container_tag: str = options.container_tag
        self._options: OpenAIMiddlewareOptions = options
        self._logger: Logger = create_logger(self._options.verbose)
        self._api_key = self._resolve_api_key(options.api_key)
        self._base_url = self._resolve_base_url(options.base_url)
        base_create = self._client.chat.completions.create
        self._is_async_client = isinstance(
            self._client, AsyncOpenAI
        ) or inspect.iscoroutinefunction(inspect.unwrap(base_create))

        self._background_tasks: set[asyncio.Task] = set()
        self._capture_threads: set[threading.Thread] = set()
        self._conversation = _ConversationMemory()

        if not hasattr(supermemory, "Supermemory"):
            raise SupermemoryConfigurationError(
                "supermemory package is required but not found",
                ImportError("supermemory package not installed"),
            )

        try:
            client_class = (
                supermemory.AsyncSupermemory
                if self._is_async_client
                else supermemory.Supermemory
            )
            self._supermemory_client: Union[
                supermemory.Supermemory, supermemory.AsyncSupermemory
            ] = client_class(
                api_key=self._api_key,
                base_url=self._base_url,
                timeout=CAPTURE_TIMEOUT_SECONDS,
                max_retries=0,
                default_headers=SUPERMEMORY_HEADERS,
            )
        except Exception as e:
            raise SupermemoryConfigurationError(
                f"Failed to initialize Supermemory client: {e}", e
            )

        self.chat = self._create_chat_facade()

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

    def _create_chat_facade(self) -> _ResourceFacade:
        """Create isolated chat facades; stream() is rebound so it calls the wrapped create."""
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
        stream = getattr(type(completions_resource), "stream", None)
        if stream is not None:
            completions.stream = types.MethodType(stream, completions)
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
        chat_resource = client_resource.chat
        completions_resource = chat_resource.completions
        return _ResourceFacade(
            client_resource,
            chat=_ResourceFacade(
                chat_resource,
                completions=_ResourceFacade(
                    completions_resource,
                    create=self._create_completion_method(
                        completions_resource.create,
                        streaming_response=name == "with_streaming_response",
                    ),
                ),
            ),
        )

    def _create_completion_method(
        self,
        original_create: Any,
        *,
        streaming_response: bool = False,
    ) -> Any:
        """Wrap one completion create implementation with memory injection."""
        if self._is_async_client and streaming_response:

            def create_streaming_with_memory(
                **kwargs: Any,
            ) -> _AsyncMemoryResponseContextManager:
                return _AsyncMemoryResponseContextManager(
                    self,
                    original_create,
                    kwargs,
                )

            return create_streaming_with_memory

        if self._is_async_client:

            async def create_async_with_memory(
                **kwargs: Any,
            ) -> Any:
                return await self._create_with_memory_async(original_create, **kwargs)

            return create_async_with_memory

        def create_sync_with_memory(
            **kwargs: Any,
        ) -> Any:
            return self._create_with_memory_sync(
                original_create, observe_reply=not streaming_response, **kwargs
            )

        return create_sync_with_memory

    async def _create_with_memory_async(
        self,
        original_create: Any,
        observe_reply: bool = True,
        **kwargs: Any,
    ) -> Any:
        """Async create with memory injection; memory failures fail open."""
        messages = [_listed_content(message) for message in kwargs.get("messages", [])]
        keys = self._conversation.resolve(_turn_keys(messages))
        plan = self._recall_plan(messages, keys)
        if plan is not None:
            results: list[Any] = [None, None]
            if plan[2] or plan[3]:
                try:
                    results = await asyncio.wait_for(
                        asyncio.gather(
                            *self._recall_requests(plan), return_exceptions=True
                        ),
                        timeout=RECALL_TIMEOUT_SECONDS,
                    )
                except Exception as error:
                    results = [error, error]
            self._finish_recall(plan, results)
            if not observe_reply:
                self._capture_async(messages, None)
        kwargs["messages"] = self._apply_memory(messages, keys)
        value = await original_create(**kwargs)
        if observe_reply and keys:
            return self._observe_reply(
                value, lambda reply: self._capture_async(messages, reply)
            )
        return value

    def _create_with_memory_sync(
        self,
        original_create: Any,
        observe_reply: bool = True,
        **kwargs: Any,
    ) -> Any:
        """Sync create with memory injection; memory failures fail open."""
        messages = [_listed_content(message) for message in kwargs.get("messages", [])]
        keys = self._conversation.resolve(_turn_keys(messages))
        plan = self._recall_plan(messages, keys)
        if plan is not None:
            results: list[Any] = [None, None]
            if plan[2] or plan[3]:
                requests = self._recall_requests(plan)

                async def gather() -> list[Any]:
                    return await asyncio.gather(*requests, return_exceptions=True)

                try:
                    results = _run_with_deadline(gather(), RECALL_TIMEOUT_SECONDS)
                except Exception as error:
                    results = [error, error]
            self._finish_recall(plan, results)
            if not observe_reply:
                self._capture_sync(messages, None)
        kwargs["messages"] = self._apply_memory(messages, keys)
        value = original_create(**kwargs)
        if observe_reply and keys:
            return self._observe_reply(
                value, lambda reply: self._capture_sync(messages, reply)
            )
        return value

    def _recall_plan(
        self,
        messages: list[ChatCompletionMessageParam],
        keys: list[tuple[int, str]],
    ) -> Optional[tuple[str, str, bool, bool, set[str]]]:
        """Plan recall for a user turn seen for the first time; tool continuations reuse their turn."""
        if not keys:
            return None
        index, key = keys[-1]
        conversation = self._conversation
        if conversation.block(key) is not None:
            return None
        query = _turn_text(_message_text(messages[index]))
        with conversation.lock:
            fetch_profile = (
                self._options.mode != "query" and conversation.profile_text is None
            )
            seen = set(conversation.profile_memories)
            for _, earlier in keys[:-1]:
                block = conversation.block(earlier)
                if block is not None:
                    seen.update(block.memories)
        search = self._options.mode != "profile" and bool(query)
        self._logger.info(
            "Starting memory recall",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._options.custom_id,
                "mode": self._options.mode,
                "fetch_profile": fetch_profile,
                "search": search,
            },
        )
        return key, query, fetch_profile, search, seen

    def _recall_requests(
        self, plan: tuple[str, str, bool, bool, set[str]]
    ) -> list[Coroutine[Any, Any, Any]]:
        _, query, fetch_profile, search, _ = plan

        async def skipped() -> None:
            return None

        return [
            (
                supermemory_profile_search(
                    self._container_tag, "", self._api_key, self._base_url
                )
                if fetch_profile
                else skipped()
            ),
            (
                supermemory_profile_search(
                    self._container_tag,
                    query,
                    self._api_key,
                    self._base_url,
                    include_profile=False,
                )
                if search
                else skipped()
            ),
        ]

    def _finish_recall(
        self,
        plan: tuple[str, str, bool, bool, set[str]],
        results: list[Any],
    ) -> None:
        """Freeze a fetched profile once; a failed fetch stays unset so the next new turn retries it."""
        key, _, fetch_profile, search, seen = plan
        profile_result, search_result = results
        conversation = self._conversation
        if fetch_profile and _succeeded(profile_result):
            markdown, memories = _profile_memories(profile_result)
            with conversation.lock:
                if conversation.profile_text is None:
                    conversation.profile_text = markdown
                    conversation.profile_memories = memories
                seen = seen | set(conversation.profile_memories)
        block = _TurnBlock()
        if search and _succeeded(search_result):
            block = _search_block(search_result, seen)
        for requested, result in (
            (fetch_profile, profile_result),
            (search, search_result),
        ):
            if requested and isinstance(result, BaseException):
                self._log_recall_failure(result)
        self._logger.debug(
            "Memory recall completed",
            {"memory_count": len(block.memories), "content": block.text},
        )
        conversation.pin(key, block)

    def _apply_memory(
        self,
        messages: list[ChatCompletionMessageParam],
        keys: list[tuple[int, str]],
    ) -> list[ChatCompletionMessageParam]:
        """Put the frozen profile in the system prompt and each pinned search block on its own user message."""
        enhanced = list(messages)
        for index, key in keys:
            block = self._conversation.block(key)
            if block is not None:
                enhanced[index] = _with_memory_block(enhanced[index], block.text)
        profile = self._conversation.profile_text or ""
        if self._options.mode == "query":
            return enhanced
        system = next(
            (
                index
                for index, message in enumerate(enhanced)
                if _role(message) in UNCAPTURED_ROLES
            ),
            None,
        )
        if system is not None and _accepts_memory(enhanced[system]):
            enhanced[system] = _with_memory_block(enhanced[system], profile)
            return enhanced
        block = wrap_memory_context(profile)
        if not block:
            return enhanced
        system_message = cast(
            ChatCompletionMessageParam, {"role": "system", "content": block}
        )
        return [system_message, *enhanced]

    def _observe_reply(self, value: Any, finish: Callable[[str], None]) -> Any:
        """Save once the turn's final reply arrives; replies that only call tools keep the turn open."""
        if hasattr(value, "http_response") and hasattr(value, "parse"):
            try:
                self._observe_reply(value.parse(), finish)
            except Exception as error:
                self._logger.debug(
                    "Could not read the reply to save it", {"error": str(error)}
                )
            return value
        if isinstance(value, Stream):
            value._iterator = self._observed_stream(value._iterator, finish)
            return value
        if isinstance(value, AsyncStream):
            value._iterator = self._observed_async_stream(value._iterator, finish)
            return value
        choices = getattr(value, "choices", None)
        message = getattr(choices[0], "message", None) if choices else None
        if message is not None and not getattr(message, "tool_calls", None):
            finish(getattr(message, "content", None) or "")
        return value

    @staticmethod
    def _observed_stream(iterator: Any, finish: Callable[[str], None]) -> Any:
        reply = _StreamedReply(finish)
        for chunk in iterator:
            reply.observe(chunk)
            yield chunk
        reply.end()

    @staticmethod
    async def _observed_async_stream(
        iterator: Any, finish: Callable[[str], None]
    ) -> Any:
        reply = _StreamedReply(finish)
        async for chunk in iterator:
            reply.observe(chunk)
            yield chunk
        reply.end()

    def _log_recall_failure(self, error: BaseException) -> None:
        if isinstance(
            error,
            (
                SupermemoryNetworkError,
                SupermemoryAPIError,
                asyncio.TimeoutError,
                TimeoutError,
            ),
        ):
            self._logger.warn(
                "Memory recall failed, proceeding without it",
                {"error": str(error), "type": type(error).__name__},
            )
        else:
            self._logger.error(
                "Unexpected error during memory recall, proceeding without it",
                {"error": str(error), "type": type(error).__name__},
            )

    def _capture_request(
        self, messages: list[ChatCompletionMessageParam], reply: Optional[str]
    ) -> Optional[tuple[str, Optional[str]]]:
        """Build the upload for a finished turn; system and developer prompts never leave the process."""
        if self._options.add_memory != "always":
            return None
        conversation: list[Any] = []
        for message in messages:
            if not isinstance(message, dict) or message.get("role") in UNCAPTURED_ROLES:
                continue
            content = message.get("content")
            if isinstance(content, str):
                message = {**message, "content": strip_memory_context(content)}
            conversation.append(message)
        user_text = next(
            (
                _message_text(message)
                for message in reversed(conversation)
                if message.get("role") == "user"
            ),
            "",
        )
        if not user_text:
            return None
        if reply is not None:
            conversation.append({"role": "assistant", "content": reply})
        if not self._options.custom_id:
            return user_text, None
        return (
            get_conversation_content(conversation),
            f"conversation:{self._options.custom_id}",
        )

    def _capture_async(
        self, messages: list[ChatCompletionMessageParam], reply: Optional[str]
    ) -> None:
        capture = self._capture_request(messages, reply)
        if capture is None:
            return
        task = asyncio.create_task(
            add_memory_tool(
                self._supermemory_client,
                self._container_tag,
                capture[0],
                capture[1],
                self._logger,
            )
        )
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        task.add_done_callback(self._log_capture_task)

    def _log_capture_task(self, task: "asyncio.Task[None]") -> None:
        if task.cancelled():
            self._logger.debug("Memory storage task was cancelled")
            return
        exception = task.exception()
        if exception is not None:
            self._logger.warn(
                "Background memory storage failed",
                {"error": str(exception), "type": type(exception).__name__},
            )

    def _capture_sync(
        self, messages: list[ChatCompletionMessageParam], reply: Optional[str]
    ) -> None:
        """Save on a daemon thread so a slow or hung API never delays the model call or exit."""
        capture = self._capture_request(messages, reply)
        if capture is None:
            return
        coroutine = add_memory_tool(
            self._supermemory_client,
            self._container_tag,
            capture[0],
            capture[1],
            self._logger,
        )

        def run() -> None:
            try:
                asyncio.run(coroutine)
            except Exception as error:
                self._logger.warn(
                    "Background memory storage failed",
                    {"error": str(error), "type": type(error).__name__},
                )
            finally:
                self._capture_threads.discard(thread)
                _PENDING_CAPTURES.discard(thread)

        thread = threading.Thread(target=run, name="supermemory-capture", daemon=True)
        self._capture_threads.add(thread)
        _PENDING_CAPTURES.add(thread)
        thread.start()

    def wait_for_background_captures(self, timeout: float = EXIT_WAIT_SECONDS) -> None:
        """Wait for pending saves made by a sync client.

        Saves from a sync client run on daemon threads, which do not keep the
        process alive. Call this before exiting (the sync context manager calls
        it for you) so the last turn is saved.

        Args:
            timeout: Maximum total time to wait, in seconds.
        """
        deadline = time.monotonic() + timeout
        for thread in list(self._capture_threads):
            thread.join(max(0.0, deadline - time.monotonic()))

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
        self.wait_for_background_captures()
        if self._background_tasks:
            try:
                asyncio.run(self.wait_for_background_tasks(timeout=5.0))
            except RuntimeError as e:
                if "cannot be called from a running event loop" in str(e):
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
        if name in {"with_raw_response", "with_streaming_response"}:
            value = self._create_client_variant_facade(name)
            setattr(self, name, value)
            return value
        return getattr(self._client, name)


def with_supermemory(
    openai_client: Union[OpenAI, AsyncOpenAI],
    options: OpenAIMiddlewareOptions,
) -> Union[OpenAI, AsyncOpenAI]:
    """
    Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
    into the conversation based on the user's message content.

    Placement keeps the provider's prompt cache matching:

    - The profile (modes "profile" and "full") is fetched once per conversation and
      appended as a delimited block to the first system or developer message, or sent
      as a new leading system message when there is none. It is byte-identical on
      every later call and never refreshed.
    - Search results (modes "query" and "full") are recalled once per user turn and
      appended to that turn's user message. Earlier user messages keep exactly the
      block they first received, and tool-call continuations reuse their turn's block.

    Recall waits at most 3 seconds with no retries; on a failure or timeout the call
    goes ahead without that memory, and a missing profile is fetched again on the next
    user message. With ``add_memory="always"`` each finished turn is saved in the
    background once its final assistant reply arrives, without system or developer
    messages, so saving never delays the model call.

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
        SupermemoryConfigurationError: When no Supermemory API key is configured
    """
    wrapper = SupermemoryOpenAIWrapper(openai_client, options)
    # Return the wrapper, which delegates all attributes to the original client
    return cast(Union[OpenAI, AsyncOpenAI], wrapper)
