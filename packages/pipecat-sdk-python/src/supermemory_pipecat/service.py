"""Supermemory Pipecat service integration.

This module provides a memory service that integrates with Supermemory to store
and retrieve conversational memories, enhancing LLM context with relevant
historical information.
"""

import asyncio
import json
import os
import re
from typing import Any, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from pipecat.frames.frames import Frame, InputAudioRawFrame, LLMContextFrame, LLMMessagesFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContextFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pydantic import BaseModel, Field

from .exceptions import ConfigurationError, MemoryRetrievalError
from .utils import deduplicate_memories, format_memories_to_text, get_last_user_message

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore

# XML tags for memory injection (replacement instead of accumulation)
MEMORY_TAG_START = "<user_memories>"
MEMORY_TAG_END = "</user_memories>"
MEMORY_TAG_PATTERN = re.compile(r"<user_memories>.*?</user_memories>", re.DOTALL)


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

        self._messages_sent_count: int = 0
        self._last_query: Optional[str] = None
        self._audio_frames_detected: bool = False

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
            kwargs: Dict[str, Any] = {"container_tag": self.container_tag}

            if self.params.mode != "profile" and query:
                kwargs["q"] = query
                kwargs["threshold"] = self.params.search_threshold
                kwargs["extra_body"] = {"limit": self.params.search_limit}

            response = await self._supermemory_client.profile(**kwargs)

            search_results = []
            if response.search_results and response.search_results.results:
                search_results = response.search_results.results

            return {
                "profile": {
                    "static": response.profile.static,
                    "dynamic": response.profile.dynamic,
                },
                "search_results": search_results,
            }

        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            raise MemoryRetrievalError("Failed to retrieve memories", e)

    async def _store_messages(self, messages: List[Dict[str, Any]]) -> None:
        """Store messages in Supermemory (non-blocking, fire-and-forget)."""
        if self._supermemory_client is None or not messages:
            return

        try:
            add_params: Dict[str, Any] = {
                "content": json.dumps(messages),
                "container_tags": [self.container_tag],
                "metadata": {"platform": "pipecat"},
            }
            if self.session_id:
                add_params["custom_id"] = self.session_id

            await self._supermemory_client.memories.add(**add_params)

        except Exception as e:
            logger.error(f"Error storing messages: {e}")

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
        if self._last_query == query:
            return

        self._last_query = query

        profile = memories_data["profile"]
        deduplicated = deduplicate_memories(
            static=profile["static"],
            dynamic=profile["dynamic"],
            search_results=memories_data["search_results"],
        )

        total_memories = (
            len(deduplicated["static"])
            + len(deduplicated["dynamic"])
            + len(deduplicated["search_results"])
        )

        if total_memories == 0:
            return

        include_profile = self.params.mode in ("profile", "full")
        include_search = self.params.mode in ("query", "full")

        memory_text = format_memories_to_text(
            deduplicated,
            system_prompt=self.params.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )

        if not memory_text:
            return

        tagged_memory = f"{MEMORY_TAG_START}\n{memory_text}\n{MEMORY_TAG_END}"

        inject_to_system = self.params.inject_mode == "system" or (
            self.params.inject_mode == "auto" and self._audio_frames_detected
        )

        messages = context.get_messages()

        if inject_to_system:
            system_idx = None
            for i, msg in enumerate(messages):
                if msg.get("role") == "system":
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
                if msg.get("role") == "user" and MEMORY_TAG_START in msg.get("content", ""):
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
        messages = None

        if isinstance(frame, (LLMContextFrame, OpenAILLMContextFrame)):
            context = frame.context
        elif isinstance(frame, LLMMessagesFrame):
            messages = frame.messages
            context = LLMContext(messages)

        if context:
            try:
                context_messages = context.get_messages()
                latest_user_message = get_last_user_message(context_messages)

                if latest_user_message:
                    try:
                        memories_data = await self._retrieve_memories(latest_user_message)
                        self._enhance_context_with_memories(
                            context, latest_user_message, memories_data
                        )
                    except MemoryRetrievalError as e:
                        logger.warning(f"Memory retrieval failed: {e}")

                # Store unsent messages (user and assistant only)
                storable_messages = [
                    msg for msg in context_messages if msg["role"] in ("user", "assistant")
                ]
                unsent_messages = storable_messages[self._messages_sent_count :]

                if unsent_messages:
                    asyncio.create_task(self._store_messages(unsent_messages))
                    self._messages_sent_count = len(storable_messages)

                if messages is not None:
                    await self.push_frame(LLMMessagesFrame(context.get_messages()))
                else:
                    await self.push_frame(frame)

            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await self.push_frame(frame)
        else:
            await self.push_frame(frame, direction)

    def reset_memory_tracking(self) -> None:
        """Reset memory tracking state for a new conversation."""
        self._messages_sent_count = 0
        self._last_query = None
        self._audio_frames_detected = False
