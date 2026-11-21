"""Supermemory Pipecat service integration.

This module provides a memory service that integrates with Supermemory to store
and retrieve conversational memories, enhancing LLM context with relevant
historical information.
"""

import asyncio
import copy
import json
import os
import re
from collections import OrderedDict, deque
from typing import Any, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from pipecat.frames.frames import Frame, LLMContextFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from .exceptions import ConfigurationError, MemoryRetrievalError, MemoryStorageError
from .utils import (
    _field,
    _memory_key,
    _memory_text,
    deduplicate_memories,
    escape_memory_delimiters,
    format_memories_to_text,
)

# Pipecat 1.0 removed the legacy message and OpenAI-specific context frames.
# Keep them optional so the integration supports both the declared 0.0.98
# minimum and the universal LLMContextFrame used by current Pipecat releases.
try:
    from pipecat.frames.frames import LLMMessagesFrame as _LegacyLLMMessagesFrame
except ImportError:  # Pipecat >= 1.0
    _LegacyLLMMessagesFrame = None  # type: ignore[assignment]

try:
    from pipecat.processors.aggregators.openai_llm_context import (
        OpenAILLMContextFrame as _LegacyOpenAILLMContextFrame,
    )
except (ImportError, ModuleNotFoundError):  # Pipecat >= 1.0
    _LegacyOpenAILLMContextFrame = None  # type: ignore[assignment]

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore

MEMORY_TAG_START = "<user_memories>"
MEMORY_TAG_END = "</user_memories>"
MEMORY_TAG_PATTERN = re.compile(r"<user_memories>.*?</user_memories>", re.DOTALL)
_INJECTED_SUFFIX_PATTERN = re.compile(r"\n\n<user_memories>\n.*?\n</user_memories>\Z", re.DOTALL)
_MAX_INJECTED_MEMORY_KEYS = 500


def _is_legacy_openai_context_frame(frame: Frame) -> bool:
    return _LegacyOpenAILLMContextFrame is not None and isinstance(
        frame, _LegacyOpenAILLMContextFrame
    )


def _is_legacy_messages_frame(frame: Frame) -> bool:
    return _LegacyLLMMessagesFrame is not None and isinstance(frame, _LegacyLLMMessagesFrame)


def _is_injected_memory_part(part: Any) -> bool:
    text = part.get("text") if isinstance(part, dict) else None
    return isinstance(text, str) and MEMORY_TAG_PATTERN.fullmatch(text.strip()) is not None


def _strip_injected_memory(content: Any) -> Any:
    """Return message content without the memory block this wrapper appended."""
    if isinstance(content, str):
        return _INJECTED_SUFFIX_PATTERN.sub("", content)
    if isinstance(content, list):
        return [part for part in content if not _is_injected_memory_part(part)]
    return content


def _content_text(content: Any) -> Optional[str]:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = [
            part["text"]
            for part in content
            if isinstance(part, dict)
            and part.get("type") == "text"
            and isinstance(part.get("text"), str)
        ]
        return "\n".join(texts) if texts else None
    return None


def _snapshot_storable_messages(messages: List[Any]) -> List[Dict[str, Any]]:
    """Copy real conversation messages, excluding injected memory context."""
    storable: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in ("user", "assistant"):
            continue

        stored = copy.deepcopy(message)
        if stored["role"] == "user":
            stored["content"] = _strip_injected_memory(stored.get("content"))
        storable.append(stored)

    return storable


def _messages_after_overlap(
    previous: List[Dict[str, Any]],
    current: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Return messages after the largest previous-suffix/current-prefix overlap.

    Comparing ordered occurrences instead of only list lengths handles appended,
    replaced, and front-truncated contexts. Identical repeated messages remain
    distinct because overlap is positional rather than set-based.
    """
    max_overlap = min(len(previous), len(current))
    for overlap in range(max_overlap, 0, -1):
        if previous[-overlap:] == current[:overlap]:
            return copy.deepcopy(current[overlap:])
    return copy.deepcopy(current)


def _latest_user_turn(
    messages: List[Dict[str, Any]],
) -> tuple[Optional[str], Optional[List[Dict[str, Any]]]]:
    """Return the latest user message's text and the conversation up to it."""
    for index in range(len(messages) - 1, -1, -1):
        if messages[index].get("role") == "user":
            return _content_text(messages[index].get("content")), messages[: index + 1]
    return None, None


def _latest_user_message(messages: List[Any]) -> Optional[Dict[str, Any]]:
    for message in reversed(messages):
        if isinstance(message, dict) and message.get("role") == "user":
            return message
    return None


class SupermemoryPipecatService(FrameProcessor):
    """Memory service that integrates Supermemory with Pipecat pipelines.

    This service intercepts message frames in the pipeline, retrieves relevant
    memories from Supermemory, and appends them to the current user message
    before passing the context downstream.

    Example:
        ```python
        from supermemory_pipecat import SupermemoryPipecatService

        memory = SupermemoryPipecatService(
            api_key=os.getenv("SUPERMEMORY_API_KEY"),
            user_id="user-123",
        )
        ```
    """

    class InputParams(BaseModel):
        """Configuration parameters for memory retrieval and injection.

        Attributes:
            search_limit: Maximum number of memories to retrieve per query.
            search_threshold: Minimum similarity threshold (0.0-1.0).
            system_prompt: Prefix text for memory context.
            mode: Memory retrieval mode - "profile", "query", or "full".
            inject_mode: "auto" and "user" append each turn's memories to that turn's
                user message, which keeps the prompt cacheable. "system" rewrites a
                memory block in the system message every turn, for speech-to-speech
                services that have no text user message to attach to.
            recall_timeout: Seconds a turn waits for Supermemory before the LLM call
                proceeds without memories.
            storage_drain_timeout: Seconds cleanup waits for pending writes.
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations, I recall:\n\n")
        mode: Literal["profile", "query", "full"] = Field(default="full")
        inject_mode: Literal["auto", "system", "user"] = Field(default="auto")
        recall_timeout: float = Field(default=1.5, gt=0)
        storage_drain_timeout: float = Field(default=3.0, ge=0)

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        user_id: str,
        session_id: Optional[str] = None,
        params: Optional[InputParams] = None,
        base_url: Optional[str] = None,
    ):
        """Initialize the Supermemory Pipecat service.

        Args:
            api_key: Supermemory API key. Falls back to SUPERMEMORY_API_KEY env var.
            user_id: User identifier passed as the v5 namespace for memory scoping.
            session_id: Session/conversation ID for grouping memories.
            params: Configuration parameters for memory retrieval.
            base_url: Optional custom base URL for Supermemory API.

        Raises:
            ConfigurationError: If API key or user_id is missing.
        """
        super().__init__()

        self.api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key:
            raise ConfigurationError(
                "API key is required. Provide api_key parameter or set SUPERMEMORY_API_KEY environment variable."
            )

        if not user_id:
            raise ConfigurationError("user_id is required")

        self.user_id = user_id
        self.container_tag = user_id
        self.session_id = session_id
        self.params = params or SupermemoryPipecatService.InputParams()

        self._supermemory_client = None
        if supermemory is not None:
            try:
                self._supermemory_client = supermemory.AsyncSupermemory(
                    api_key=self.api_key,
                    base_url=base_url,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Supermemory client: {e}")

        self._last_recalled_user_prefix: Optional[List[Dict[str, Any]]] = None
        self._loaded_profile: Optional[Dict[str, List[str]]] = None
        self._injected_memory_keys: OrderedDict[str, None] = OrderedDict()
        self._latest_storable_context: List[Dict[str, Any]] = []
        self._storage_queue: deque[List[Dict[str, Any]]] = deque()
        self._storage_worker_task: Optional[asyncio.Task[None]] = None

    async def _retrieve_memories(self, query: str, include_profile: bool = True) -> Dict[str, Any]:
        """Retrieve relevant memories from Supermemory within the recall budget.

        Args:
            query: The search query for memory retrieval.
            include_profile: Whether to fetch the profile in profile or full mode.

        Returns:
            Dictionary with the profile (static/dynamic, or None when it was not
            fetched or failed) and search results.

        Raises:
            MemoryRetrievalError: If every requested call fails or times out.
        """
        if self._supermemory_client is None:
            raise MemoryRetrievalError(
                "Supermemory client not initialized. Install with: pip install supermemory"
            )

        budget = self.params.recall_timeout
        request_options = {"max_retries": 0, "timeout": budget}
        calls: Dict[str, Any] = {}
        if include_profile and self.params.mode != "query":
            calls["profile"] = self._supermemory_client.profile(
                self.user_id, request_options=request_options
            )
        if self.params.mode != "profile" and query:
            calls["search"] = self._supermemory_client.search(
                self.user_id,
                query=query,
                search_mode="memories",
                limit=min(self.params.search_limit, 100),
                threshold=self.params.search_threshold,
                request_options=request_options,
            )
        results = await asyncio.gather(
            *(asyncio.wait_for(call, budget) for call in calls.values()),
            return_exceptions=True,
        )
        responses = {}
        for name, result in zip(calls, results):
            if isinstance(result, asyncio.CancelledError):
                raise result
            if isinstance(result, Exception):
                logger.warning(f"Supermemory {name} failed: {type(result).__name__}: {result}")
            else:
                responses[name] = result
        if calls and not responses:
            raise MemoryRetrievalError("Failed to retrieve memories", results[0])

        profile = None
        if "profile" in responses:
            raw_profile = _field(responses["profile"], "profile")
            profile = {
                "static": [
                    text
                    for item in _field(raw_profile, "static", default=[]) or []
                    if (text := _memory_text(item))
                ],
                "dynamic": [
                    text
                    for item in _field(raw_profile, "dynamic", default=[]) or []
                    if (text := _memory_text(item))
                ],
            }

        return {
            "profile": profile,
            "search_results": list(_field(responses.get("search"), "results", default=[]) or []),
        }

    async def _store_messages(self, messages: List[Dict[str, Any]]) -> None:
        """Store one ordered message batch in Supermemory."""
        if not messages:
            return

        if self._supermemory_client is None:
            raise MemoryStorageError("Supermemory client is not initialized")

        try:
            add_params: Dict[str, Any] = {
                "content": json.dumps(messages),
                "metadata": {"platform": "pipecat"},
            }
            if self.session_id:
                add_params["id"] = self.session_id

            await self._supermemory_client.add(self.user_id, **add_params)

        except Exception as e:
            raise MemoryStorageError("Failed to store messages", e) from e

    def _queue_context_for_storage(self, messages: List[Dict[str, Any]]) -> None:
        """Queue only newly observed message occurrences, preserving order."""
        current = copy.deepcopy(messages)
        new_messages = _messages_after_overlap(self._latest_storable_context, current)
        self._latest_storable_context = current

        if new_messages:
            self._storage_queue.append(new_messages)

        # A new frame also retries a previously failed head batch.
        self._start_storage_worker()

    def _start_storage_worker(self) -> None:
        """Start the single serial storage worker when work is pending."""
        if not self._storage_queue:
            return
        if self._storage_worker_task is not None and not self._storage_worker_task.done():
            return
        self._storage_worker_task = asyncio.create_task(self._run_storage_queue())

    async def _run_storage_queue(self) -> None:
        """Write queued batches serially, retaining the head batch on failure."""
        while self._storage_queue:
            messages = self._storage_queue[0]
            try:
                await self._store_messages(messages)
            except Exception as e:
                logger.error(f"Error storing messages; batch remains queued for retry: {e}")
                return
            self._storage_queue.popleft()

    async def _finish_storage_queue(self) -> None:
        """Wait for queued writes and retry a failed head batch once."""
        task = self._storage_worker_task
        if task is not None and not task.done():
            await task

        if self._storage_queue:
            self._start_storage_worker()
            retry_task = self._storage_worker_task
            if retry_task is not None:
                await retry_task

    async def _drain_storage_queue(self) -> None:
        """Drain pending writes at teardown, bounded by storage_drain_timeout."""
        try:
            await asyncio.wait_for(
                self._finish_storage_queue(), self.params.storage_drain_timeout
            )
        except asyncio.TimeoutError:
            task = self._storage_worker_task
            if task is not None and not task.done():
                task.cancel()

        if self._storage_queue:
            logger.error(
                f"Unable to drain {len(self._storage_queue)} Supermemory storage batch(es)"
            )

    def _enhance_context_with_memories(
        self,
        context: LLMContext,
        query: str,
        memories_data: Dict[str, Any],
    ) -> None:
        """Inject this turn's memories, wrapped in <user_memories> tags.

        "auto" and "user" append the block once to the latest user message, so later
        requests resend it byte-identically; the profile goes into the first turn that
        loaded it and memories from earlier turns are skipped. "system" replaces this
        integration's block in the system message with the loaded profile plus this
        turn's search results.

        Args:
            context: The LLM context to enhance.
            query: The query used for retrieval.
            memories_data: Memory data from Supermemory API.
        """
        system_mode = self.params.inject_mode == "system"
        messages = context.get_messages()
        target = _latest_user_message(messages)
        if not system_mode and (target is None or _content_text(target.get("content")) is None):
            return

        fetched_profile = memories_data["profile"]
        first_profile_load = fetched_profile is not None and self._loaded_profile is None
        if first_profile_load:
            self._loaded_profile = fetched_profile

        profile = self._loaded_profile if system_mode else fetched_profile
        include_profile = (
            self.params.mode in ("profile", "full")
            and profile is not None
            and (system_mode or first_profile_load)
        )
        include_search = self.params.mode in ("query", "full")
        search_results = memories_data["search_results"]
        if not system_mode:
            search_results = [
                result
                for result in search_results
                if _memory_key(_memory_text(result)) not in self._injected_memory_keys
            ]

        deduplicated = deduplicate_memories(
            static=profile["static"] if include_profile else [],
            dynamic=profile["dynamic"] if include_profile else [],
            search_results=search_results,
        )
        memory_text = format_memories_to_text(
            deduplicated,
            system_prompt=self.params.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )
        tagged_memory = (
            f"{MEMORY_TAG_START}\n{escape_memory_delimiters(memory_text)}\n{MEMORY_TAG_END}"
            if memory_text
            else ""
        )

        if system_mode:
            self._replace_system_memory(messages, tagged_memory)
            return
        if not tagged_memory:
            return

        for memory in [
            *deduplicated["static"],
            *deduplicated["dynamic"],
            *(_memory_text(result) for result in deduplicated["search_results"]),
        ]:
            self._injected_memory_keys[_memory_key(memory)] = None
        while len(self._injected_memory_keys) > _MAX_INJECTED_MEMORY_KEYS:
            self._injected_memory_keys.popitem(last=False)

        content = target.get("content")
        if isinstance(content, str):
            target["content"] = f"{content}\n\n{tagged_memory}"
        else:
            target["content"] = [*content, {"type": "text", "text": tagged_memory}]

    @staticmethod
    def _replace_system_memory(messages: List[Any], tagged_memory: str) -> None:
        """Swap this integration's block in the system message so blocks never stack."""
        for index, message in enumerate(messages):
            if not (
                isinstance(message, dict)
                and message.get("role") == "system"
                and isinstance(message.get("content"), str)
            ):
                continue
            content = message["content"]
            if MEMORY_TAG_PATTERN.fullmatch(content.strip()):
                if tagged_memory:
                    message["content"] = tagged_memory
                else:
                    messages.pop(index)
            elif MEMORY_TAG_PATTERN.search(content):
                replaced = MEMORY_TAG_PATTERN.sub(lambda _match: tagged_memory, content, count=1)
                message["content"] = replaced if tagged_memory else replaced.rstrip()
            elif tagged_memory:
                message["content"] = f"{content}\n\n{tagged_memory}"
            return
        if tagged_memory:
            messages.insert(0, {"role": "system", "content": tagged_memory})

    async def _prepare_context(self, context: LLMContext) -> None:
        """Recall once per new user turn, inject into that turn, and queue storage."""
        storable_messages = _snapshot_storable_messages(context.get_messages())
        latest_user_message, user_prefix = _latest_user_turn(storable_messages)

        if (
            latest_user_message
            and user_prefix is not None
            and user_prefix != self._last_recalled_user_prefix
        ):
            self._last_recalled_user_prefix = user_prefix
            try:
                memories_data = await self._retrieve_memories(
                    latest_user_message, include_profile=self._loaded_profile is None
                )
            except MemoryRetrievalError as e:
                logger.warning(f"Memory retrieval failed; continuing without memories: {e}")
                memories_data = {"profile": None, "search_results": []}
            self._enhance_context_with_memories(context, latest_user_message, memories_data)

        self._queue_context_for_storage(storable_messages)

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Process frames, intercept context frames for memory integration."""
        await super().process_frame(frame, direction)

        context = None

        legacy_messages_frame = False

        if isinstance(frame, LLMContextFrame) or _is_legacy_openai_context_frame(frame):
            context = frame.context
        elif _is_legacy_messages_frame(frame):
            legacy_messages_frame = True
            context = LLMContext(frame.messages)

        if context is not None:
            try:
                await self._prepare_context(context)

                if legacy_messages_frame:
                    await self.push_frame(frame.__class__(context.get_messages()), direction)
                else:
                    await self.push_frame(frame, direction)

            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await self.push_frame(frame, direction)
        else:
            await self.push_frame(frame, direction)

    async def cleanup(self) -> None:
        """Drain pending Supermemory writes before Pipecat tears down the processor."""
        await self._drain_storage_queue()
        await super().cleanup()

    def reset_memory_tracking(self) -> None:
        """Reset memory tracking state for a new conversation."""
        self._latest_storable_context = []
        self._last_recalled_user_prefix = None
        self._loaded_profile = None
        self._injected_memory_keys.clear()
