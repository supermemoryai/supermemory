"""Supermemory Pipecat service integration.

This module provides a memory service that integrates with Supermemory to store
and retrieve conversational memories, enhancing LLM context with relevant
historical information.
"""

import asyncio
import json
import os
from typing import Any, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from pipecat.frames.frames import Frame, LLMContextFrame, LLMMessagesFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContextFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from .exceptions import (
    ConfigurationError,
    MemoryRetrievalError,
)
from .utils import (
    deduplicate_memories,
    format_memories_to_text,
    get_last_user_message,
)

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore


class SupermemoryPipecatService(FrameProcessor):
    """A memory service that integrates Supermemory with Pipecat pipelines.

    This service intercepts message frames in the pipeline, retrieves relevant
    memories from Supermemory, enhances the context, and optionally stores
    new conversations.

    Example:
        ```python
        from supermemory_pipecat import SupermemoryPipecatService

        memory = SupermemoryPipecatService(
            api_key=os.getenv("SUPERMEMORY_API_KEY"),
            user_id="user-123",
        )

        pipeline = Pipeline([
            transport.input(),
            stt,
            user_context,
            memory,  # Memory service enhances context here
            llm,
            transport.output(),
        ])
        ```
    """

    class InputParams(BaseModel):
        """Configuration parameters for Supermemory Pipecat service.

        Parameters:
            search_limit: Maximum number of memories to retrieve per query.
            search_threshold: Minimum similarity threshold for memory retrieval.
            system_prompt: Prefix text for memory context messages.
            mode: Memory retrieval mode - "profile", "query", or "full".
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations, I recall:\n\n")
        mode: Literal["profile", "query", "full"] = Field(default="full")

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
            api_key: The API key for Supermemory. Falls back to SUPERMEMORY_API_KEY env var.
            user_id: The user ID - used as container_tag for memory scoping (REQUIRED).
            session_id: Session/conversation ID for grouping memories (optional).
            params: Configuration parameters for memory retrieval and storage.
            base_url: Optional custom base URL for Supermemory API.

        Raises:
            ConfigurationError: If API key is missing or user_id not provided.
        """
        super().__init__()

        # Get API key
        self.api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key:
            raise ConfigurationError(
                "API key is required. Provide api_key parameter or set SUPERMEMORY_API_KEY environment variable."
            )

        # user_id is required and used directly as container_tag
        if not user_id:
            raise ConfigurationError("user_id is required")

        self.user_id = user_id
        self.container_tag = user_id  # container_tag = user_id directly
        self.session_id = session_id  # optional session/conversation ID

        # Configuration
        self.params = params or SupermemoryPipecatService.InputParams()

        # Initialize async Supermemory client
        self._supermemory_client = None
        if supermemory is not None:
            try:
                self._supermemory_client = supermemory.AsyncSupermemory(
                    api_key=self.api_key,
                    base_url=base_url,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Supermemory client: {e}")

        # Track how many messages we've already sent to memory
        self._messages_sent_count: int = 0

        # Track last query to avoid duplicate processing
        self._last_query: Optional[str] = None

        logger.info(
            f"Initialized SupermemoryPipecatService with "
            f"user_id={user_id}, session_id={session_id}"
        )

    async def _retrieve_memories(self, query: str) -> Dict[str, Any]:
        """Retrieve relevant memories from Supermemory.

        Args:
            query: The query to search for relevant memories.

        Returns:
            Dictionary containing profile and search results.
        """
        if self._supermemory_client is None:
            raise MemoryRetrievalError(
                "Supermemory client not initialized. Install with: pip install supermemory"
            )

        try:
            logger.debug(f"Retrieving memories for query: {query[:100]}...")

            # Build kwargs for profile request
            kwargs: Dict[str, Any] = {
                "container_tag": self.container_tag,
            }

            # Add query for search modes
            if self.params.mode != "profile" and query:
                kwargs["q"] = query
                kwargs["threshold"] = self.params.search_threshold
                # Pass limit via extra_body since SDK doesn't have direct param
                kwargs["extra_body"] = {"limit": self.params.search_limit}

            # Use SDK's profile method
            response = await self._supermemory_client.profile(**kwargs)

            # Extract memory strings from SDK response
            search_results = []
            if response.search_results and response.search_results.results:
                search_results = [r["memory"] for r in response.search_results.results]

            data: Dict[str, Any] = {
                "profile": {
                    "static": response.profile.static,
                    "dynamic": response.profile.dynamic,
                },
                "search_results": search_results,
            }

            logger.debug(
                f"Retrieved memories - static: {len(data['profile']['static'])}, "
                f"dynamic: {len(data['profile']['dynamic'])}, "
                f"search: {len(data['search_results'])}"
            )
            return data

        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            raise MemoryRetrievalError("Failed to retrieve memories", e)

    async def _store_messages(self, messages: List[Dict[str, Any]]) -> None:
        """Store messages in Supermemory.

        Args:
            messages: List of message dicts with 'role' and 'content' keys.
        """
        if self._supermemory_client is None:
            logger.warning("Supermemory client not initialized, skipping memory storage")
            return

        if not messages:
            return

        try:
            # Format messages as JSON array
            formatted_content = json.dumps(messages)

            logger.debug(f"Storing {len(messages)} messages to Supermemory")

            # Build storage params
            add_params: Dict[str, Any] = {
                "content": formatted_content,
                "container_tags": [self.container_tag],
                "metadata": {"platform": "pipecat"},
            }
            if self.session_id:
                add_params["custom_id"] = f"{self.session_id}"

            await self._supermemory_client.memories.add(**add_params)
            logger.debug(f"Successfully stored {len(messages)} messages in Supermemory")

        except Exception as e:
            # Don't fail the pipeline on storage errors
            logger.error(f"Error storing messages in Supermemory: {e}")

    def _enhance_context_with_memories(
        self,
        context: LLMContext,
        query: str,
        memories_data: Dict[str, Any],
    ) -> None:
        """Enhance the LLM context with relevant memories.

        Args:
            context: The LLM context to enhance.
            query: The query used for retrieval.
            memories_data: Raw memory data from Supermemory API.
        """
        # Skip if same query (avoid duplicate processing)
        if self._last_query == query:
            return

        self._last_query = query

        # Extract and deduplicate memories
        profile = memories_data["profile"]

        deduplicated = deduplicate_memories(
            static=profile["static"],
            dynamic=profile["dynamic"],
            search_results=memories_data["search_results"],
        )

        # Check if we have any memories
        total_memories = (
            len(deduplicated["static"])
            + len(deduplicated["dynamic"])
            + len(deduplicated["search_results"])
        )

        if total_memories == 0:
            logger.debug("No memories found to inject")
            return

        # Format memories based on mode
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

        # Inject memories into context as user message
        context.add_message({"role": "user", "content": memory_text})

        logger.debug(f"Enhanced context with {total_memories} memories")

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Process incoming frames, intercept context frames for memory integration.

        Args:
            frame: The incoming frame to process.
            direction: The direction of frame flow in the pipeline.
        """
        await super().process_frame(frame, direction)

        context = None
        messages = None

        # Handle different frame types
        if isinstance(frame, (LLMContextFrame, OpenAILLMContextFrame)):
            context = frame.context
        elif isinstance(frame, LLMMessagesFrame):
            messages = frame.messages
            context = LLMContext(messages)

        if context:
            try:
                # Get messages from context
                context_messages = context.get_messages()
                latest_user_message = get_last_user_message(context_messages)

                if latest_user_message:
                    # Retrieve memories from Supermemory
                    try:
                        memories_data = await self._retrieve_memories(latest_user_message)
                        self._enhance_context_with_memories(
                            context, latest_user_message, memories_data
                        )
                    except MemoryRetrievalError as e:
                        logger.warning(f"Memory retrieval failed, continuing without memories: {e}")

                # Store unsent messages (user and assistant only, skip system)
                storable_messages = [
                    msg for msg in context_messages if msg["role"] in ("user", "assistant")
                ]
                unsent_messages = storable_messages[self._messages_sent_count :]

                if unsent_messages:
                    asyncio.create_task(self._store_messages(unsent_messages))
                    self._messages_sent_count = len(storable_messages)

                # Pass the frame downstream
                if messages is not None:
                    # For LLMMessagesFrame, create new frame with enhanced messages
                    await self.push_frame(LLMMessagesFrame(context.get_messages()))
                else:
                    # For context frames, pass the enhanced frame
                    await self.push_frame(frame)

            except Exception as e:
                logger.error(f"Error processing frame with Supermemory: {e}")
                # Still pass the original frame through on error
                await self.push_frame(frame)
        else:
            # Non-context frames pass through unchanged
            await self.push_frame(frame, direction)

    def get_messages_sent_count(self) -> int:
        """Get the count of messages sent to memory.

        Returns:
            Number of messages already sent to Supermemory.
        """
        return self._messages_sent_count

    def reset_memory_tracking(self) -> None:
        """Reset memory tracking for a new conversation."""
        self._messages_sent_count = 0
        self._last_query = None
