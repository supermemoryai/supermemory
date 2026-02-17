"""Supermemory Cartesia Line agent integration.

This module provides a memory-enhanced agent wrapper that integrates with
Cartesia Line voice agents, adding persistent memory and context enrichment.
"""

import asyncio
import os
import re
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from .exceptions import ConfigurationError, MemoryRetrievalError
from .utils import deduplicate_memories, format_memories_to_text

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore

try:
    from line.events import Event
except ImportError:
    Event = Any  # type: ignore

# XML tags for memory injection
MEMORY_TAG_START = "<user_memories>"
MEMORY_TAG_END = "</user_memories>"


class SupermemoryCartesiaAgent:
    """Memory-enhanced wrapper for Cartesia Line agents.

    This wrapper intercepts UserTurnEnded events, retrieves relevant memories
    from Supermemory, and enriches the conversation history before passing to
    the wrapped agent.

    Example:
        ```python
        from line.llm_agent import LlmAgent, LlmConfig
        from supermemory_cartesia import SupermemoryCartesiaAgent

        base_agent = LlmAgent(
            model="anthropic/claude-haiku-4-5-20251001",
            config=LlmConfig(
                system_prompt="You are a helpful assistant.",
                introduction="Hello! How can I help you today?"
            )
        )

        memory_agent = SupermemoryCartesiaAgent(
            agent=base_agent,
            api_key=os.getenv("SUPERMEMORY_API_KEY"),
            container_tag="user-123",
        )
        ```
    """

    class MemoryConfig(BaseModel):
        """Configuration for memory retrieval.

        Attributes:
            search_limit: Maximum memories to retrieve per query.
            search_threshold: Minimum similarity threshold (0.0-1.0).
            system_prompt: Prefix text for memory context.
            mode: "profile", "query", or "full".
        """

        search_limit: int = Field(default=10, ge=1)
        search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
        system_prompt: str = Field(default="Based on previous conversations:\n\n")
        mode: Literal["profile", "query", "full"] = Field(default="full")

    def __init__(
        self,
        *,
        agent: Any,
        api_key: Optional[str] = None,
        container_tag: str,
        session_id: Optional[str] = None,
        container_tags: Optional[List[str]] = None,
        custom_id: Optional[str] = None,
        config: Optional[MemoryConfig] = None,
        base_url: Optional[str] = None,
    ):
        """Initialize the Supermemory Cartesia agent wrapper.

        Args:
            agent: The inner Cartesia Line agent to wrap.
            api_key: Supermemory API key (or SUPERMEMORY_API_KEY env var).
            container_tag: Primary container tag for memory scoping (e.g., user ID).
            session_id: Optional session ID for grouping memories.
            container_tags: Optional list of additional container tags for
                           organization/categorization (e.g., ["org-acme", "prod"]).
            custom_id: Optional custom ID to store all conversation messages in the same document.
                      Useful for grouping multi-turn conversations (e.g., session ID, conversation ID).
            config: Memory retrieval configuration.
            base_url: Optional custom Supermemory API URL.

        Raises:
            ConfigurationError: If API key or container_tag is missing.
        """
        self.agent = agent
        self.container_tag = container_tag
        self.session_id = session_id
        self.custom_id = custom_id

        # Build container tags list: primary tag first, then additional tags
        self.container_tags = [container_tag]
        if container_tags:
            self.container_tags.extend(container_tags)

        self.config = config or SupermemoryCartesiaAgent.MemoryConfig()

        self.api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key:
            raise ConfigurationError(
                "API key required. Set SUPERMEMORY_API_KEY or pass api_key."
            )

        if not container_tag:
            raise ConfigurationError("container_tag is required")

        self._supermemory_client = None
        if supermemory is not None:
            try:
                self._supermemory_client = supermemory.AsyncSupermemory(
                    api_key=self.api_key,
                    base_url=base_url,
                )
                logger.info(f"[Supermemory] Initialized client for container_tag={container_tag}, all_tags={self.container_tags}")
            except Exception as e:
                logger.error(f"[Supermemory] Failed to initialize client: {e}")

        self._messages_sent_count: int = 0
        self._last_query: Optional[str] = None

    async def _retrieve_memories(self, query: str) -> Dict[str, Any]:
        """Retrieve memories from Supermemory."""
        if self._supermemory_client is None:
            raise MemoryRetrievalError("Supermemory client not initialized")

        try:
            # Use primary container tag for profile retrieval
            kwargs: Dict[str, Any] = {"container_tag": self.container_tags[0]}

            if self.config.mode != "profile" and query:
                kwargs["q"] = query
                kwargs["threshold"] = self.config.search_threshold
                kwargs["extra_body"] = {"limit": self.config.search_limit}

            logger.info(f"[Supermemory] Retrieving memories for query: {query[:50]}...")

            response = await asyncio.wait_for(
                self._supermemory_client.profile(**kwargs),
                timeout=10.0
            )

            static_count = len(response.profile.static) if response.profile.static else 0
            dynamic_count = len(response.profile.dynamic) if response.profile.dynamic else 0
            search_count = len(response.search_results.results) if response.search_results and response.search_results.results else 0

            logger.info(f"[Supermemory] Retrieved memories - static: {static_count}, dynamic: {dynamic_count}, search: {search_count}")

            search_results = []
            if response.search_results and response.search_results.results:
                search_results = response.search_results.results

            return {
                "profile": {
                    "static": response.profile.static or [],
                    "dynamic": response.profile.dynamic or [],
                },
                "search_results": search_results,
            }

        except asyncio.TimeoutError:
            logger.warning("[Supermemory] Profile API timed out after 10s")
            raise MemoryRetrievalError("Profile API timed out")
        except Exception as e:
            logger.error(f"[Supermemory] Error retrieving memories: {e}")
            raise MemoryRetrievalError("Failed to retrieve memories", e)

    async def _store_messages(self, messages: List[Dict[str, Any]]) -> None:
        """Store messages in Supermemory."""
        if self._supermemory_client is None or not messages:
            return

        try:
            # Format as conversation transcript
            lines = []
            for msg in messages:
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role == "user":
                    lines.append(f"User: {content}")
                elif role == "assistant":
                    lines.append(f"Assistant: {content}")

            logger.info(f"[Supermemory] Storing {len(messages)} messages to containers={self.container_tags}")

            # Build kwargs for add() call
            add_kwargs: Dict[str, Any] = {
                "content": "\n".join(lines),
                "container_tags": self.container_tags,
                "metadata": {"platform": "cartesia"},
            }

            # Add custom_id if provided, fallback to session_id for document grouping
            if self.custom_id:
                add_kwargs["custom_id"] = self.custom_id
                logger.info(f"[Supermemory] Using custom_id={self.custom_id} for document grouping")
            elif self.session_id:
                add_kwargs["custom_id"] = self.session_id
                logger.info(f"[Supermemory] Using session_id={self.session_id} as custom_id for document grouping")

            await self._supermemory_client.add(**add_kwargs)

            logger.info(f"[Supermemory] Successfully stored {len(messages)} messages")

        except Exception as e:
            logger.error(f"[Supermemory] Error storing messages: {e}")

    def _build_memory_message(self, memories_data: Dict[str, Any]) -> Optional[str]:
        """Build memory context from retrieved data."""
        profile = memories_data["profile"]
        deduplicated = deduplicate_memories(
            static=profile["static"],
            dynamic=profile["dynamic"],
            search_results=memories_data["search_results"],
        )

        total = (
            len(deduplicated["static"])
            + len(deduplicated["dynamic"])
            + len(deduplicated["search_results"])
        )

        if total == 0:
            return None

        include_profile = self.config.mode in ("profile", "full")
        include_search = self.config.mode in ("query", "full")

        memory_text = format_memories_to_text(
            deduplicated,
            system_prompt=self.config.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )

        if not memory_text:
            return None

        return f"{MEMORY_TAG_START}\n{memory_text}\n{MEMORY_TAG_END}"

    def _extract_user_message(self, event: Any) -> Optional[str]:
        """Extract user text from a UserTurnEnded event."""
        if not hasattr(event, 'content'):
            return None

        content = event.content

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            texts = []
            for item in content:
                if hasattr(item, 'content') and isinstance(item.content, str):
                    texts.append(item.content)
                elif isinstance(item, str):
                    texts.append(item)
            return " ".join(texts) if texts else None

        if hasattr(content, 'content'):
            return str(content.content)

        return str(content)

    def _extract_conversation_from_history(self, history: list) -> List[Dict[str, str]]:
        """Extract messages from Cartesia event history."""
        messages = []
        seen = set()

        for item in history:
            if isinstance(item, dict):
                if item.get("role") in ("user", "assistant"):
                    content = item.get("content", "")
                    if content and content not in seen:
                        messages.append(item)
                        seen.add(content)
                continue

            event_type = getattr(item, 'type', None) or type(item).__name__

            if event_type in ('user_turn_ended', 'UserTurnEnded'):
                nested = getattr(item, 'content', [])
                if isinstance(nested, list):
                    for n in nested:
                        if hasattr(n, 'content') and isinstance(n.content, str):
                            if n.content not in seen:
                                messages.append({"role": "user", "content": n.content})
                                seen.add(n.content)

            elif event_type in ('agent_turn_ended', 'AgentTurnEnded'):
                nested = getattr(item, 'content', [])
                if isinstance(nested, list):
                    texts = [n.content for n in nested if hasattr(n, 'content') and isinstance(n.content, str)]
                    if texts:
                        content = " ".join(texts)
                        if content not in seen:
                            messages.append({"role": "assistant", "content": content})
                            seen.add(content)

            elif event_type in ('user_text_sent', 'UserTextSent'):
                content = getattr(item, 'content', '')
                if content and isinstance(content, str) and content not in seen:
                    messages.append({"role": "user", "content": content})
                    seen.add(content)

            elif event_type in ('agent_text_sent', 'AgentTextSent'):
                content = getattr(item, 'content', '')
                if content and isinstance(content, str) and content not in seen:
                    messages.append({"role": "assistant", "content": content})
                    seen.add(content)

        return messages

    async def _enrich_event_with_memories(self, event: Any) -> tuple[Any, Optional[str]]:
        """Enrich event by retrieving memories.
        
        Returns:
            Tuple of (event, memory_context) - memory_context is None if no memories found.
            The event is returned unchanged; memory injection happens at the agent level.
        """
        user_message = self._extract_user_message(event)

        if not user_message:
            logger.warning("[Supermemory] Could not extract user message from event")
            return event, None

        if user_message == self._last_query:
            return event, None

        self._last_query = user_message
        logger.info(f"[Supermemory] Processing user message: {user_message[:50]}...")

        try:
            memories_data = await self._retrieve_memories(user_message)
            memory_context = self._build_memory_message(memories_data)

            if not memory_context:
                logger.info("[Supermemory] No memories found for context injection")
                return event, None

            logger.info("[Supermemory] Retrieved memory context for injection")
            return event, memory_context

        except MemoryRetrievalError as e:
            logger.warning(f"[Supermemory] Memory retrieval failed: {e}")
            return event, None
        except Exception as e:
            logger.error(f"[Supermemory] Error in memory enrichment: {e}")
            return event, None

    async def process(self, env: Any, event: Event) -> AsyncGenerator[Event, None]:
        """Process events with memory enrichment.

        Args:
            env: Turn environment from Cartesia Line.
            event: Input event to process.

        Yields:
            Output events from the wrapped agent.
        """
        try:
            if type(event).__name__ == "UserTurnEnded":
                logger.info("[Supermemory] Processing UserTurnEnded event")
                event, memory_context = await self._enrich_event_with_memories(event)

                # Inject memory context into the agent's system prompt
                if memory_context and hasattr(self.agent, 'config'):
                    original_prompt = getattr(self.agent.config, 'system_prompt', '')
                    # Remove old memory context if present
                    if MEMORY_TAG_START in original_prompt:
                        original_prompt = re.sub(
                            rf'{re.escape(MEMORY_TAG_START)}.*?{re.escape(MEMORY_TAG_END)}\s*',
                            '',
                            original_prompt,
                            flags=re.DOTALL
                        )
                    # Prepend new memory context
                    self.agent.config.system_prompt = f"{memory_context}\n\n{original_prompt}"
                    logger.info("[Supermemory] Injected memory context into system prompt")

                # Store conversation in background
                if hasattr(event, 'history') and event.history:
                    messages = self._extract_conversation_from_history(event.history)
                    unsent = messages[self._messages_sent_count:]
                    if unsent:
                        logger.info(f"[Supermemory] Queuing {len(unsent)} messages for storage")
                        asyncio.create_task(self._store_messages(unsent))
                        self._messages_sent_count = len(messages)
                else:
                    # No history yet, store just the current user message
                    user_content = self._extract_user_message(event)
                    if user_content:
                        logger.info(f"[Supermemory] No history, storing current user message: {user_content[:50]}...")
                        asyncio.create_task(self._store_messages([{"role": "user", "content": user_content}]))
                        self._messages_sent_count = 1  # CRITICAL: Increment counter to prevent duplicate storage

                async for output in self.agent.process(env, event):
                    yield output
            else:
                async for output in self.agent.process(env, event):
                    yield output

        except Exception as e:
            logger.error(f"[Supermemory] Error in process: {e}")
            async for output in self.agent.process(env, event):
                yield output

    def reset_memory_tracking(self) -> None:
        """Reset memory tracking for a new conversation."""
        self._messages_sent_count = 0
        self._last_query = None
        logger.info("[Supermemory] Reset memory tracking state")
