"""Supermemory Pipecat service integration.

This module provides a memory service that integrates with Supermemory to store
and retrieve conversational memories, enhancing LLM context with relevant
historical information.
"""

import asyncio
import json
import os
from typing import Any, Dict, List, Optional

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
            add_as_system_message: Whether to add memories as system messages.
            position: Position to insert memory messages in context.
            mode: Memory retrieval mode - "profile", "query", or "full".
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations, I recall:\n\n")
        add_as_system_message: bool = Field(default=True)
        position: int = Field(default=1)
        mode: str = Field(default="full")  # "profile", "query", "full"

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

        # Track conversation history separately (clean, no injected memories)
        self._conversation_history: List[Dict[str, str]] = []

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

            # Convert SDK response to dict format expected by rest of code
            data: Dict[str, Any] = {
                "profile": {
                    "static": response.profile.static,
                    "dynamic": response.profile.dynamic,
                },
                "searchResults": {
                    "results": response.search_results.results if response.search_results else [],
                },
            }

            logger.debug(
                f"Retrieved memories - static: {len(data['profile']['static'])}, "
                f"dynamic: {len(data['profile']['dynamic'])}, "
                f"search: {len(data['searchResults']['results'])}"
            )
            return data

        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            raise MemoryRetrievalError("Failed to retrieve memories", e)

    async def _store_message(self, message: Dict[str, str]) -> None:
        """Store a single message in Supermemory.

        Args:
            message: Message dict with 'role' and 'content' keys.
        """
        if self._supermemory_client is None:
            logger.warning("Supermemory client not initialized, skipping memory storage")
            return

        try:
            content = message.get("content", "")
            if not content or not isinstance(content, str):
                return

            formatted_content = json.dumps(message)

            logger.debug(f"Storing message to Supermemory: {formatted_content[:100]}...")

            # Build storage params
            add_params: Dict[str, Any] = {
                "content": formatted_content,
                "container_tags": [self.container_tag],
                "metadata": {"platform": "pipecat"},
            }
            if self.session_id:
                add_params["custom_id"] = self.session_id

            self._supermemory_client.memories.add(**add_params)
            logger.debug("Successfully stored message in Supermemory")

        except Exception as e:
            # Don't fail the pipeline on storage errors
            logger.error(f"Error storing message in Supermemory: {e}")

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
        profile = memories_data.get("profile", {})
        search_results = memories_data.get("searchResults", {})

        deduplicated = deduplicate_memories(
            static=profile.get("static", []),
            dynamic=profile.get("dynamic", []),
            search_results=search_results.get("results", []),
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

        # Inject memories into context
        if self.params.add_as_system_message:
            context.add_message({"role": "system", "content": memory_text})
        else:
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

                # Find latest user message for memory query
                latest_user_message = get_last_user_message(context_messages)

                if latest_user_message:
                    # Track the user message in our conversation history (clean)
                    user_msg = {"role": "user", "content": latest_user_message}

                    # Only add if it's a new message (not already tracked)
                    if (
                        not self._conversation_history
                        or self._conversation_history[-1].get("content") != latest_user_message
                    ):
                        self._conversation_history.append(user_msg)

                    # Retrieve memories from Supermemory
                    try:
                        memories_data = await self._retrieve_memories(latest_user_message)

                        # Enhance context with memories
                        self._enhance_context_with_memories(
                            context, latest_user_message, memories_data
                        )
                    except MemoryRetrievalError as e:
                        # Log but don't fail the pipeline
                        logger.warning(f"Memory retrieval failed, continuing without memories: {e}")

                    # Store the last user message (runs in background, non-blocking)
                    asyncio.create_task(self._store_message(user_msg))

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

    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get the tracked conversation history (without injected memories).

        Returns:
            List of message dicts with 'role' and 'content'.
        """
        return self._conversation_history.copy()

    def clear_conversation_history(self) -> None:
        """Clear the tracked conversation history."""
        self._conversation_history.clear()
        self._last_query = None
