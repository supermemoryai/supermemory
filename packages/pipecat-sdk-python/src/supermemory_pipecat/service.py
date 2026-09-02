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
from collections import deque
from typing import Any, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from pipecat.frames.frames import Frame, InputAudioRawFrame, LLMContextFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from .exceptions import ConfigurationError, MemoryRetrievalError, MemoryStorageError
from .utils import (
    _field,
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

# XML tags for memory injection (replacement instead of accumulation)
MEMORY_TAG_START = "<user_memories>"
MEMORY_TAG_END = "</user_memories>"
MEMORY_TAG_PATTERN = re.compile(r"<user_memories>.*?</user_memories>", re.DOTALL)


def _is_legacy_openai_context_frame(frame: Frame) -> bool:
    return _LegacyOpenAILLMContextFrame is not None and isinstance(
        frame, _LegacyOpenAILLMContextFrame
    )


def _is_legacy_messages_frame(frame: Frame) -> bool:
    return _LegacyLLMMessagesFrame is not None and isinstance(frame, _LegacyLLMMessagesFrame)


def _snapshot_storable_messages(messages: List[Any]) -> List[Dict[str, Any]]:
    """Copy real conversation messages, excluding injected memory context."""
    storable: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in ("user", "assistant"):
            continue

        if _is_injected_user_memory(message):
            continue

        storable.append(copy.deepcopy(message))

    return storable


def _is_injected_user_memory(message: Any) -> bool:
    """Return whether a message is the wrapper's standalone memory message."""
    return _is_standalone_memory_message(message, roles=("user",))


def _is_standalone_memory_message(message: Any, *, roles: tuple[str, ...]) -> bool:
    if not isinstance(message, dict) or message.get("role") not in roles:
        return False
    content = message.get("content")
    return isinstance(content, str) and MEMORY_TAG_PATTERN.fullmatch(content.strip()) is not None


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


def _latest_user_occurrence(
    messages: List[Dict[str, Any]],
) -> tuple[Optional[str], Optional[List[Dict[str, Any]]]]:
    """Return the last text user query and its ordered conversation prefix."""
    for index in range(len(messages) - 1, -1, -1):
        message = messages[index]
        content = message.get("content")
        if message.get("role") == "user" and isinstance(content, str):
            return content, copy.deepcopy(messages[: index + 1])
    return None, None


class SupermemoryPipecatService(FrameProcessor):
    """Memory service that integrates Supermemory with Pipecat pipelines.

    This service intercepts message frames in the pipeline, retrieves relevant
    memories from Supermemory, and enhances the context before passing downstream.

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
            inject_mode: How to inject memories - "auto", "system", or "user".
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations, I recall:\n\n")
        mode: Literal["profile", "query", "full"] = Field(default="full")
        inject_mode: Literal["auto", "system", "user"] = Field(default="auto")

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
            user_id: The user ID - used as container_tag for memory scoping.
            session_id: Session/conversation ID for grouping memories.
            params: Configuration parameters for memory retrieval.
            base_url: Optional custom base URL for Supermemory API.

        Raises:
            ConfigurationError: If API key is missing or user_id not provided.
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

        self._last_query: Optional[str] = None
        self._last_recalled_user_prefix: Optional[List[Dict[str, Any]]] = None
        self._audio_frames_detected: bool = False
        self._latest_storable_context: List[Dict[str, Any]] = []
        self._storage_queue: deque[List[Dict[str, Any]]] = deque()
        self._storage_worker_task: Optional[asyncio.Task[None]] = None

    async def _retrieve_memories(self, query: str) -> Dict[str, Any]:
        """Retrieve relevant memories from Supermemory.

        Args:
            query: The search query for memory retrieval.

        Returns:
            Dictionary containing profile (static/dynamic) and search results.

        Raises:
            MemoryRetrievalError: If retrieval fails.
        """
        if self._supermemory_client is None:
            raise MemoryRetrievalError(
                "Supermemory client not initialized. Install with: pip install supermemory"
            )

        try:
            # One profile call: static + dynamic, and (when mode/query allow)
            # search_results via `q`. This is the intended profile API shape.
            kwargs: Dict[str, Any] = {"container_tag": self.container_tag}
            if self.params.mode != "profile" and query:
                kwargs["q"] = query
                kwargs["threshold"] = self.params.search_threshold

            response = await self._supermemory_client.profile(**kwargs)

            profile = _field(response, "profile")
            search_results_response = _field(response, "search_results", "searchResults")

            raw_search_results = _field(search_results_response, "results", default=[]) or []
            search_results = list(raw_search_results)[: self.params.search_limit]

            return {
                "profile": {
                    "static": list(_field(profile, "static", default=[]) or []),
                    "dynamic": list(_field(profile, "dynamic", default=[]) or []),
                },
                "search_results": search_results,
            }

        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            raise MemoryRetrievalError("Failed to retrieve memories", e)

    async def _store_messages(self, messages: List[Dict[str, Any]]) -> None:
        """Store one ordered message batch in Supermemory."""
        if not messages:
            return

        if self._supermemory_client is None:
            raise MemoryStorageError("Supermemory client is not initialized")

        try:
            add_params: Dict[str, Any] = {
                "content": json.dumps(messages),
                "container_tags": [self.container_tag],
                "metadata": {"platform": "pipecat"},
            }
            if self.session_id:
                add_params["custom_id"] = self.session_id

            await self._supermemory_client.add(**add_params)

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

    async def _drain_storage_queue(self) -> None:
        """Wait for queued writes and retry a failed head batch once at teardown."""
        task = self._storage_worker_task
        if task is not None and not task.done():
            await task

        if self._storage_queue:
            self._start_storage_worker()
            retry_task = self._storage_worker_task
            if retry_task is not None:
                await retry_task

        if self._storage_queue:
            logger.error(
                f"Unable to drain {len(self._storage_queue)} Supermemory storage batch(es)"
            )

    @staticmethod
    def _clear_injected_memories(context: LLMContext) -> None:
        """Remove memory tags owned by this wrapper while preserving other entries."""
        messages = context.get_messages()
        cleaned_messages: List[Any] = []

        for message in messages:
            if _is_standalone_memory_message(message, roles=("system", "user")):
                continue
            if not isinstance(message, dict):
                cleaned_messages.append(message)
                continue

            role = message.get("role")
            content = message.get("content")
            if role in ("system", "user") and isinstance(content, str):
                cleaned_content = MEMORY_TAG_PATTERN.sub("", content)
                if cleaned_content != content:
                    message["content"] = cleaned_content.strip()

            cleaned_messages.append(message)

        messages[:] = cleaned_messages

    def _enhance_context_with_memories(
        self,
        context: LLMContext,
        query: str,
        memories_data: Dict[str, Any],
    ) -> None:
        """Enhance LLM context with retrieved memories.

        Uses XML tags <user_memories>...</user_memories> to wrap memories,
        allowing replacement on each turn instead of accumulation.

        Args:
            context: The LLM context to enhance.
            query: The query used for retrieval.
            memories_data: Memory data from Supermemory API.
        """
        profile = memories_data["profile"]
        include_profile = self.params.mode in ("profile", "full")
        include_search = self.params.mode in ("query", "full")
        deduplicated = deduplicate_memories(
            static=profile["static"] if include_profile else [],
            dynamic=profile["dynamic"] if include_profile else [],
            search_results=memories_data["search_results"],
        )

        total_memories = (
            len(deduplicated["static"])
            + len(deduplicated["dynamic"])
            + len(deduplicated["search_results"])
        )

        if total_memories == 0:
            return

        memory_text = format_memories_to_text(
            deduplicated,
            system_prompt=self.params.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )

        if not memory_text:
            return

        safe_memory_text = escape_memory_delimiters(memory_text)
        tagged_memory = f"{MEMORY_TAG_START}\n{safe_memory_text}\n{MEMORY_TAG_END}"

        inject_to_system = self.params.inject_mode == "system" or (
            self.params.inject_mode == "auto" and self._audio_frames_detected
        )

        messages = context.get_messages()

        if inject_to_system:
            system_idx = None
            for i, msg in enumerate(messages):
                if (
                    isinstance(msg, dict)
                    and msg.get("role") == "system"
                    and isinstance(msg.get("content"), str)
                ):
                    system_idx = i
                    break

            if system_idx is not None:
                existing_content = messages[system_idx].get("content", "")
                if MEMORY_TAG_PATTERN.search(existing_content):
                    messages[system_idx]["content"] = MEMORY_TAG_PATTERN.sub(
                        tagged_memory, existing_content
                    )
                else:
                    messages[system_idx]["content"] = f"{existing_content}\n\n{tagged_memory}"
            else:
                messages.insert(0, {"role": "system", "content": tagged_memory})
        else:
            # Remove previous memory message if exists
            for i in range(len(messages) - 1, -1, -1):
                msg = messages[i]
                if _is_injected_user_memory(msg):
                    messages.pop(i)
                    break

            context.add_message({"role": "user", "content": tagged_memory})

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Process frames, intercept context frames for memory integration."""
        await super().process_frame(frame, direction)

        # Auto-detect speech-to-speech mode via audio frames
        if isinstance(frame, InputAudioRawFrame):
            if not self._audio_frames_detected:
                self._audio_frames_detected = True
            await self.push_frame(frame, direction)
            return

        context = None

        legacy_messages_frame = False

        if isinstance(frame, LLMContextFrame) or _is_legacy_openai_context_frame(frame):
            context = frame.context
        elif _is_legacy_messages_frame(frame):
            legacy_messages_frame = True
            context = LLMContext(frame.messages)

        if context is not None:
            try:
                context_messages = context.get_messages()
                # Snapshot the real conversation before adding memory context.
                # Injected <user_memories> messages must never be persisted or
                # included in the sent-message cursor.
                storable_messages = _snapshot_storable_messages(context_messages)
                latest_user_message, user_prefix = _latest_user_occurrence(storable_messages)

                if (
                    latest_user_message
                    and user_prefix is not None
                    and user_prefix != self._last_recalled_user_prefix
                ):
                    # Clear stale recall before a new lookup. If retrieval
                    # fails or returns no memories, old context cannot leak
                    # into the new turn.
                    self._clear_injected_memories(context)
                    try:
                        memories_data = await self._retrieve_memories(latest_user_message)
                        self._enhance_context_with_memories(
                            context, latest_user_message, memories_data
                        )
                        # Mark only successful recalls (including empty ones).
                        # Failures stay retryable on the next repeated frame.
                        self._last_query = latest_user_message
                        self._last_recalled_user_prefix = user_prefix
                    except MemoryRetrievalError as e:
                        logger.warning(f"Memory retrieval failed: {e}")

                self._queue_context_for_storage(storable_messages)

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
        self._last_query = None
        self._last_recalled_user_prefix = None
        self._audio_frames_detected = False
