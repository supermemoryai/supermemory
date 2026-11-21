"""Supermemory middleware for OpenAI clients."""

import asyncio
import hashlib
import inspect
import json
import os
import threading
import time
import types
from collections import OrderedDict
from collections.abc import Coroutine
from dataclasses import dataclass
from typing import Any, Literal, Optional, TypeVar, Union, cast

import supermemory
from openai import AsyncOpenAI, OpenAI
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
    get_last_user_message,
    wrap_memory_context,
)

DEFAULT_SUPERMEMORY_BASE_URL = "https://api.supermemory.ai"
DEFAULT_RECALL_TIMEOUT_SECONDS = 2.0
CAPTURE_TIMEOUT_SECONDS = 5.0
EXIT_WAIT_SECONDS = 5.0
TURN_CACHE_SIZE = 256
UNCAPTURED_ROLES = ("system", "developer")

T = TypeVar("T")


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
    recall_timeout: float = DEFAULT_RECALL_TIMEOUT_SECONDS


class SupermemoryProfileSearch:
    """Type for Supermemory profile search response."""

    def __init__(self, data: dict[str, Any]):
        self.profile: dict[str, Any] = data.get("profile", {})
        self.search_results: dict[str, Any] = data.get("searchResults", {})


@dataclass(frozen=True)
class _TurnMemory:
    """Memory text pinned to one user turn so later requests resend the same bytes."""

    text: str = ""
    has_profile: bool = False
    memories: tuple[str, ...] = ()


def _message_fingerprint(message: Any) -> bytes:
    """Serialize a caller message deterministically for turn keys."""
    if hasattr(message, "model_dump"):
        message = message.model_dump(exclude_none=True)
    return json.dumps(message, sort_keys=True, default=str).encode()


def _role(message: Any) -> Any:
    if isinstance(message, dict):
        return message.get("role")
    return getattr(message, "role", None)


def _user_turns(messages: list[ChatCompletionMessageParam]) -> list[tuple[int, str]]:
    """Key each user message by a hash of the original conversation up to it."""
    digest = hashlib.sha256()
    turns: list[tuple[int, str]] = []
    for index, message in enumerate(messages):
        digest.update(_message_fingerprint(message))
        digest.update(b"\x00")
        if _role(message) == "user":
            turns.append((index, digest.copy().hexdigest()))
    return turns


def _append_to_user_message(
    message: ChatCompletionMessageParam, memory_text: str
) -> ChatCompletionMessageParam:
    """Append memory after the user's own content without touching other fields."""
    if not isinstance(message, dict):
        return message
    content = message.get("content")
    if isinstance(content, str):
        joined = f"{content}\n\n{memory_text}" if content else memory_text
        return cast(ChatCompletionMessageParam, {**message, "content": joined})
    if isinstance(content, list):
        parts = [*content, {"type": "text", "text": memory_text}]
        return cast(ChatCompletionMessageParam, {**message, "content": parts})
    return message


def _build_turn_memory(
    response: SupermemoryProfileSearch,
    mode: Literal["profile", "query", "full"],
    include_profile: bool,
    seen: set[str],
) -> _TurnMemory:
    """Format one turn's memory, leaving out anything an earlier turn already carried."""
    profile = (response.profile or {}) if include_profile else {}
    deduplicated = deduplicate_memories(
        static=profile.get("static", []),
        dynamic=profile.get("dynamic", []),
        search_results=(response.search_results or {}).get("results", []),
    )
    static = [m for m in deduplicated.static if m not in seen]
    dynamic = [m for m in deduplicated.dynamic if m not in seen]
    search = (
        [m for m in deduplicated.search_results if m not in seen]
        if mode != "profile"
        else []
    )

    profile_markdown = convert_profile_to_markdown(
        {"profile": {"static": static, "dynamic": dynamic}}
    )
    search_markdown = (
        "Search results for user's recent message: \n"
        + "\n".join(f"- {memory}" for memory in search)
        if search
        else ""
    )
    text = wrap_memory_context(f"{profile_markdown}\n{search_markdown}")
    return _TurnMemory(
        text=text,
        has_profile=bool(static or dynamic),
        memories=(*static, *dynamic, *search),
    )


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
    base_url: str,
    timeout: float = DEFAULT_RECALL_TIMEOUT_SECONDS,
) -> SupermemoryProfileSearch:
    """Search memories via the profile API; the requests fallback runs on a thread."""
    payload = {
        "containerTag": container_tag,
        "include": ["static", "dynamic"],
    }
    if query_text:
        payload["q"] = query_text
    profile_url = f"{base_url.rstrip('/')}/v4/profile"

    try:
        import aiohttp

        timeout = aiohttp.ClientTimeout(total=timeout)
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
        import requests

        response = await asyncio.to_thread(
            requests.post,
            profile_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=timeout,
            allow_redirects=False,
        )

        if not 200 <= response.status_code < 300:
            raise SupermemoryAPIError(
                "Supermemory profile search failed",
                status_code=response.status_code,
                response_text=response.text,
            )

        return SupermemoryProfileSearch(response.json())


async def add_memory_tool(
    client: Union[supermemory.Supermemory, supermemory.AsyncSupermemory],
    container_tag: str,
    content: str,
    custom_id: Optional[str],
    logger: Logger,
) -> None:
    """Add a memory; a sync client is only passed in from the sync wrapper's capture thread."""
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
        self._turn_memories: OrderedDict[str, _TurnMemory] = OrderedDict()
        self._turn_lock = threading.Lock()

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
            return self._create_with_memory_sync(original_create, **kwargs)

        return create_sync_with_memory

    async def _create_with_memory_async(
        self,
        original_create: Any,
        **kwargs: Any,
    ) -> Any:
        """Async create with memory injection; memory failures fail open."""
        messages = list(kwargs.get("messages", []))
        turns = _user_turns(messages)
        turn_key = self._new_turn_key(messages, turns)
        if turn_key is not None:
            self._capture_async(messages)
            plan = self._recall_plan(messages, turns)
            response = None
            if plan is not None:
                try:
                    response = await asyncio.wait_for(
                        supermemory_profile_search(
                            self._container_tag,
                            plan[0],
                            self._api_key,
                            self._base_url,
                            timeout=self._options.recall_timeout,
                        ),
                        timeout=self._options.recall_timeout,
                    )
                except Exception as error:
                    self._log_recall_failure(error)
            self._remember_turn(turn_key, response, plan)
        kwargs["messages"] = self._apply_turn_memories(messages, turns)
        return await original_create(**kwargs)

    def _create_with_memory_sync(
        self,
        original_create: Any,
        **kwargs: Any,
    ) -> Any:
        """Sync create with memory injection; memory failures fail open."""
        messages = list(kwargs.get("messages", []))
        turns = _user_turns(messages)
        turn_key = self._new_turn_key(messages, turns)
        if turn_key is not None:
            self._capture_sync(messages)
            plan = self._recall_plan(messages, turns)
            response = None
            if plan is not None:
                try:
                    response = _run_with_deadline(
                        supermemory_profile_search(
                            self._container_tag,
                            plan[0],
                            self._api_key,
                            self._base_url,
                            timeout=self._options.recall_timeout,
                        ),
                        self._options.recall_timeout,
                    )
                except Exception as error:
                    self._log_recall_failure(error)
            self._remember_turn(turn_key, response, plan)
        kwargs["messages"] = self._apply_turn_memories(messages, turns)
        return original_create(**kwargs)

    def _new_turn_key(
        self,
        messages: list[ChatCompletionMessageParam],
        turns: list[tuple[int, str]],
    ) -> Optional[str]:
        """Return the key of a user turn seen for the first time; tool steps reuse their turn."""
        if not turns or turns[-1][0] != len(messages) - 1:
            return None
        turn_key = turns[-1][1]
        with self._turn_lock:
            if turn_key in self._turn_memories:
                return None
            self._turn_memories[turn_key] = _TurnMemory()
            self._evict_turns()
        return turn_key

    def _recall_plan(
        self,
        messages: list[ChatCompletionMessageParam],
        turns: list[tuple[int, str]],
    ) -> Optional[tuple[str, bool, set[str]]]:
        """Decide the query, whether the profile is still owed, and what earlier turns carried."""
        include_profile = self._options.mode != "query"
        seen: set[str] = set()
        with self._turn_lock:
            for _, key in turns[:-1]:
                earlier = self._turn_memories.get(key)
                if earlier is None:
                    continue
                include_profile = include_profile and not earlier.has_profile
                seen.update(earlier.memories)
        if self._options.mode == "profile" and not include_profile:
            return None
        query_text = (
            get_last_user_message(messages) if self._options.mode != "profile" else ""
        )
        if self._options.mode != "profile" and not query_text.strip():
            return None
        self._logger.info(
            "Starting memory search",
            {
                "container_tag": self._container_tag,
                "conversation_id": self._options.custom_id,
                "mode": self._options.mode,
                "include_profile": include_profile,
            },
        )
        return query_text, include_profile, seen

    def _remember_turn(
        self,
        turn_key: str,
        response: Optional[SupermemoryProfileSearch],
        plan: Optional[tuple[str, bool, set[str]]],
    ) -> None:
        """Pin the turn's memory; a failed recall leaves it empty so the next turn retries."""
        if response is None or plan is None:
            return
        try:
            memory = _build_turn_memory(response, self._options.mode, plan[1], plan[2])
        except Exception as error:
            self._log_recall_failure(error)
            return
        self._logger.debug(
            "Memory search completed",
            {"memory_count": len(memory.memories), "content": memory.text},
        )
        with self._turn_lock:
            if turn_key in self._turn_memories:
                self._turn_memories[turn_key] = memory

    def _evict_turns(self) -> None:
        while len(self._turn_memories) > TURN_CACHE_SIZE:
            self._turn_memories.popitem(last=False)

    def _apply_turn_memories(
        self,
        messages: list[ChatCompletionMessageParam],
        turns: list[tuple[int, str]],
    ) -> list[ChatCompletionMessageParam]:
        """Re-attach every pinned turn memory to its user message on a copy of the request."""
        enhanced = list(messages)
        with self._turn_lock:
            for index, key in turns:
                memory = self._turn_memories.get(key)
                if memory is None:
                    continue
                self._turn_memories.move_to_end(key)
                if memory.text:
                    enhanced[index] = _append_to_user_message(
                        enhanced[index], memory.text
                    )
        return enhanced

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
                "Memory search failed, proceeding without memory injection",
                {"error": str(error), "type": type(error).__name__},
            )
        else:
            self._logger.error(
                "Unexpected error during memory search, proceeding without memory injection",
                {"error": str(error), "type": type(error).__name__},
            )

    def _capture_request(
        self, messages: list[ChatCompletionMessageParam]
    ) -> Optional[tuple[str, Optional[str]]]:
        """Build the upload for this turn; system and developer prompts never leave the process."""
        if self._options.add_memory != "always":
            return None
        user_message = get_last_user_message(messages)
        if not user_message.strip():
            return None
        if not self._options.custom_id:
            return user_message, None
        conversation = [
            message
            for message in messages
            if isinstance(message, dict) and message.get("role") not in UNCAPTURED_ROLES
        ]
        return (
            get_conversation_content(conversation),
            f"conversation:{self._options.custom_id}",
        )

    def _capture_async(self, messages: list[ChatCompletionMessageParam]) -> None:
        capture = self._capture_request(messages)
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

    def _capture_sync(self, messages: list[ChatCompletionMessageParam]) -> None:
        """Save on a daemon thread so a slow or hung API never delays the model call or exit."""
        capture = self._capture_request(messages)
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

        thread = threading.Thread(target=run, name="supermemory-capture", daemon=True)
        self._capture_threads.add(thread)
        thread.start()

    def wait_for_background_captures(self, timeout: float = EXIT_WAIT_SECONDS) -> None:
        """Join pending sync-client captures for at most timeout seconds in total."""
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

    Memories are recalled once per user turn and appended to that turn's user message. The
    system and developer prompts are never modified, and earlier turns are resent with the
    same memory text on every later request so the provider's prompt cache keeps matching.
    Recall is bounded by ``recall_timeout`` and fails open; conversation capture runs in
    the background and never delays the model call.

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
