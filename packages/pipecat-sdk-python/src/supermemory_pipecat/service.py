"""Supermemory Pipecat service integration.

This module provides a memory service that integrates with Supermemory to store
and retrieve conversational memories, enhancing LLM context with relevant
historical information.
"""

import asyncio
import copy
import hashlib
import json
import os
import re
from collections import OrderedDict, deque
from importlib.metadata import version as _package_version
from typing import Any, Dict, List, Literal, Optional, Tuple

from loguru import logger
from pydantic import BaseModel, Field

from pipecat.frames.frames import Frame, LLMContextFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from .exceptions import ConfigurationError, MemoryRetrievalError, MemoryStorageError
from .utils import (
    _field,
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
_OWNED_BLOCK_PATTERN = re.compile(r"(?:\n\n)?<user_memories>\n.*?\n</user_memories>", re.DOTALL)
RECALL_TIMEOUT_SECONDS = 3.0
SOURCE = "pipecat-python"
_MAX_TURNS_PER_CONVERSATION = 500
_EMPTY_PROFILE: Dict[str, List[str]] = {"static": [], "dynamic": []}


def _plugin_version() -> str:
    try:
        return _package_version("supermemory-pipecat")
    except Exception:
        return "unknown"


PLUGIN_VERSION = _plugin_version()


def _is_legacy_openai_context_frame(frame: Frame) -> bool:
    return _LegacyOpenAILLMContextFrame is not None and isinstance(
        frame, _LegacyOpenAILLMContextFrame
    )


def _is_legacy_messages_frame(frame: Frame) -> bool:
    return _LegacyLLMMessagesFrame is not None and isinstance(frame, _LegacyLLMMessagesFrame)


def _wrap_block(text: str) -> str:
    """Delimit memory text so later requests can find and keep this integration's block."""
    text = text.strip()
    return f"{MEMORY_TAG_START}\n{escape_memory_delimiters(text)}\n{MEMORY_TAG_END}" if text else ""


def _is_owned_part(part: Any) -> bool:
    text = part.get("text") if isinstance(part, dict) else None
    return isinstance(text, str) and MEMORY_TAG_PATTERN.fullmatch(text.strip()) is not None


def _strip_blocks(content: Any) -> Any:
    """Return message content without the memory blocks this integration added."""
    if isinstance(content, str):
        return _OWNED_BLOCK_PATTERN.sub("", content)
    if isinstance(content, list):
        return [part for part in content if not _is_owned_part(part)]
    return content


def _with_blocks(content: Any, blocks: List[str]) -> Any:
    """Replace this integration's blocks in content, leaving caller-authored bytes as sent."""
    joined = "\n\n".join(block for block in blocks if block)
    preserved = _strip_blocks(content)
    if isinstance(preserved, list):
        return [*preserved, {"type": "text", "text": joined}] if joined else preserved
    preserved = preserved if isinstance(preserved, str) else ""
    if not joined:
        return preserved
    return f"{preserved}\n\n{joined}" if preserved else joined


def _content_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            part["text"]
            for part in content
            if isinstance(part, dict)
            and part.get("type") == "text"
            and isinstance(part.get("text"), str)
        )
    return ""


def _normalize(text: str) -> str:
    return " ".join(_strip_blocks(text).split())


def _turn_keys(messages: List[Any]) -> List[Tuple[int, str]]:
    """Key each user message by its text and the reply before it, so repeats are new turns and trimming keeps keys."""
    keys: List[Tuple[int, str]] = []
    reply = ""
    for index, message in enumerate(messages):
        if not isinstance(message, dict):
            continue
        text = _normalize(_content_text(message.get("content")))
        if message.get("role") == "assistant" and text:
            reply = hashlib.blake2b(text.encode(), digest_size=8).hexdigest()
        elif message.get("role") == "user":
            keys.append((index, f"{text}\u0000{reply}" if reply else text))
    return keys


def _snapshot_storable_messages(messages: List[Any]) -> List[Dict[str, Any]]:
    """Copy the conversation without system or developer messages or injected memory."""
    storable: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") in ("system", "developer"):
            continue

        stored = copy.deepcopy(message)
        if stored.get("role") == "user":
            stored["content"] = _strip_blocks(stored.get("content"))
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


class SupermemoryPipecatService(FrameProcessor):
    """Memory service that integrates Supermemory with Pipecat pipelines.

    Place it between the user context aggregator and the LLM. For each new user
    turn it recalls memories from Supermemory and adds them to the context:

    - The user profile is fetched once per conversation and appended as a
      ``<user_memories>`` block to the first system message (or sent as a new
      leading system message). It stays byte-identical on every later request.
    - Each turn's search results are appended to the user message they were
      retrieved for, and earlier user messages keep the block they first got.

    The system prompt and earlier turns therefore never change, so provider prompt
    caches keep hitting. Recall is bounded by ``RECALL_TIMEOUT_SECONDS`` and never
    fails the LLM call. Finished turns are saved to Supermemory in the background.

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
            system_prompt: Prefix text for each memory block.
            mode: Memory retrieval mode. "profile" adds only the user profile, once,
                in the system message. "query" appends search results for each user
                message to that message. "full" (default) does both.
            inject_mode: Where per-turn search results go. "auto" (default) and "user"
                append them to the user message they were retrieved for, which keeps
                the prompt cacheable. "system" rewrites them into the system message
                every turn instead, for services that read only the system prompt;
                that prompt then changes each turn, so caching does not apply. The
                profile always goes in the system message.
            storage_drain_timeout: Seconds cleanup waits for pending conversation
                writes before giving up and logging the unsaved batches.
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations, I recall:\n\n")
        mode: Literal["profile", "query", "full"] = Field(default="full")
        inject_mode: Literal["auto", "system", "user"] = Field(default="auto")
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

        One service instance serves one pipeline, and so one conversation. Call
        ``reset_memory_tracking()`` before reusing it for a new conversation.

        Args:
            api_key: Supermemory API key. Falls back to SUPERMEMORY_API_KEY env var.
            user_id: User identifier passed as the v5 namespace for memory scoping.
            session_id: Session/conversation ID for grouping memories; saved
                conversation segments use it as the document id.
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
                    default_headers={
                        "x-sm-source": SOURCE,
                        "x-sm-plugin-version": PLUGIN_VERSION,
                    },
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Supermemory client: {e}")

        self._turn_blocks: OrderedDict[str, str] = OrderedDict()
        self._profile: Optional[Dict[str, List[str]]] = None
        self._profile_block = ""
        self._recalled_once = False
        self._context: Optional[LLMContext] = None
        self._latest_storable_context: List[Dict[str, Any]] = []
        self._storage_queue: deque[List[Dict[str, Any]]] = deque()
        self._storage_worker_task: Optional[asyncio.Task[None]] = None

    async def _retrieve_memories(self, query: str, include_profile: bool = True) -> Dict[str, Any]:
        """Retrieve the profile and search results within RECALL_TIMEOUT_SECONDS.

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

        request_options = {"max_retries": 0, "timeout": RECALL_TIMEOUT_SECONDS}
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
            *(asyncio.wait_for(call, RECALL_TIMEOUT_SECONDS) for call in calls.values()),
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

    async def _recall_turn(self, query: str) -> str:
        """Recall once for a turn and return its search block; a failed profile stays unloaded for the next turn."""
        self._recalled_once = True
        try:
            memories = await self._retrieve_memories(query, include_profile=self._profile is None)
        except MemoryRetrievalError as e:
            logger.warning(f"Memory retrieval failed; continuing without memories: {e}")
            return ""

        if memories["profile"] is not None and self._profile is None:
            self._profile = memories["profile"]
            profile_only = deduplicate_memories(
                static=self._profile["static"], dynamic=self._profile["dynamic"], search_results=[]
            )
            self._profile_block = _wrap_block(
                format_memories_to_text(
                    profile_only, system_prompt=self.params.system_prompt, include_search=False
                )
            )

        if self.params.mode == "profile":
            return ""
        profile = self._profile or _EMPTY_PROFILE
        search_only = deduplicate_memories(
            static=profile["static"],
            dynamic=profile["dynamic"],
            search_results=memories["search_results"],
        )
        return _wrap_block(
            format_memories_to_text(
                {"static": [], "dynamic": [], "search_results": search_only["search_results"]},
                system_prompt=self.params.system_prompt,
                include_static=False,
                include_dynamic=False,
            )
        )

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

    def _render(self, messages: List[Any], keys: List[Tuple[int, str]]) -> None:
        """Write the frozen profile and each turn's frozen block into the context."""
        system_mode = self.params.inject_mode == "system"
        system_blocks = [self._profile_block]
        for index, key in keys:
            block = self._turn_blocks.get(key)
            if block is None:
                continue
            if system_mode:
                messages[index]["content"] = _with_blocks(messages[index].get("content"), [])
            else:
                messages[index]["content"] = _with_blocks(messages[index].get("content"), [block])
        if system_mode and keys:
            system_blocks.append(self._turn_blocks.get(keys[-1][1], ""))

        for index, message in enumerate(messages):
            if isinstance(message, dict) and message.get("role") == "system":
                content = _with_blocks(message.get("content"), system_blocks)
                if content:
                    message["content"] = content
                else:
                    messages.pop(index)
                return
        if any(system_blocks):
            messages.insert(0, {"role": "system", "content": _with_blocks("", system_blocks)})

    async def _prepare_context(self, context: LLMContext) -> None:
        """Recall once per new user turn, render every turn's block, and queue finished turns."""
        self._context = context
        messages = context.get_messages()
        keys = _turn_keys(messages)

        if keys:
            index, key = keys[-1]
            if key in self._turn_blocks:
                self._turn_blocks.move_to_end(key)
            else:
                self._turn_blocks[key] = await self._recall_turn(
                    _normalize(_content_text(messages[index].get("content")))
                )
                while len(self._turn_blocks) > _MAX_TURNS_PER_CONVERSATION:
                    self._turn_blocks.popitem(last=False)
        elif not self._recalled_once and self.params.mode != "query":
            await self._recall_turn("")

        self._render(messages, keys)

        storable = _snapshot_storable_messages(messages)
        last_user = max(
            (i for i, message in enumerate(storable) if message.get("role") == "user"), default=0
        )
        self._queue_context_for_storage(storable[:last_user])

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Process frames, intercept context frames for memory integration.

        Args:
            frame: The incoming frame. Context frames get memories added before they
                continue downstream; every other frame passes through unchanged.
            direction: The direction the frame is travelling.
        """
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
        """Save the last turn and drain pending writes before Pipecat tears down the processor.

        Waits at most ``InputParams.storage_drain_timeout`` seconds for the writes.
        """
        if self._context is not None:
            self._queue_context_for_storage(
                _snapshot_storable_messages(self._context.get_messages())
            )
        await self._drain_storage_queue()
        await super().cleanup()

    def reset_memory_tracking(self) -> None:
        """Reset memory and save tracking so the service can serve a new conversation.

        Clears the per-turn memory blocks, the loaded profile, and the storage cursor.
        The previous conversation's unsaved last turn stays queued, and is written
        with the next save or during cleanup.
        """
        if self._context is not None:
            unsaved = _messages_after_overlap(
                self._latest_storable_context,
                _snapshot_storable_messages(self._context.get_messages()),
            )
            if unsaved:
                self._storage_queue.append(unsaved)
        self._latest_storable_context = []
        self._turn_blocks.clear()
        self._profile = None
        self._profile_block = ""
        self._recalled_once = False
        self._context = None
