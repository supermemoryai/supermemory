"""Supermemory Cartesia Line agent integration.

This module provides a memory-enhanced agent wrapper that integrates with
Cartesia Line voice agents, adding persistent memory and context enrichment.
"""

import asyncio
import inspect
import os
import re
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from loguru import logger
from pydantic import BaseModel, Field

from .exceptions import ConfigurationError, MemoryRetrievalError
from .utils import (
    _field,
    deduplicate_memories,
    escape_memory_delimiters,
    format_memories_to_text,
)

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
    from Supermemory, and passes them as per-turn context to the wrapped agent.

    Example:
        ```python
        from line.llm_agent import LlmAgent, LlmConfig
        from supermemory_cartesia import SupermemoryCartesiaAgent

        base_agent = LlmAgent(
            model="anthropic/claude-haiku-4-5-20251001",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            config=LlmConfig(
                system_prompt="You are a helpful assistant.",
                introduction="Hello! How can I help you today?"
            )
        )

        memory_agent = SupermemoryCartesiaAgent(
            agent=base_agent,
            api_key=os.getenv("SUPERMEMORY_API_KEY"),
            container_tag="user-123",
            custom_id="conversation-456",
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
        custom_id: str,
        add_memory: Literal["always", "never"] = "always",
        container_tags: Optional[List[str]] = None,
        config: Optional[MemoryConfig] = None,
        base_url: Optional[str] = None,
    ):
        """Initialize the Supermemory Cartesia agent wrapper.

        Args:
            agent: The inner Cartesia Line agent to wrap.
            api_key: Supermemory API key (or SUPERMEMORY_API_KEY env var).
            container_tag: Primary container tag for memory scoping (e.g., user ID).
            custom_id: Required. Custom ID to store all conversation messages in the same document.
                      Useful for grouping multi-turn conversations (e.g., call ID, conversation ID).
            add_memory: Memory persistence mode - "always" (default) or "never".
            container_tags: Optional list of additional container tags for
                           organization/categorization (e.g., ["org-acme", "prod"]).
            config: Memory retrieval configuration.
            base_url: Optional custom Supermemory API URL.

        Raises:
            ConfigurationError: If API key, container_tag, or custom_id is missing.
        """
        self.agent = agent
        self.container_tag = container_tag
        self.custom_id = custom_id
        self.add_memory = add_memory

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

        if not custom_id or not custom_id.strip():
            raise ConfigurationError(
                "custom_id is required and must be a non-empty string. "
                "This ensures messages are grouped into the same document for a conversation."
            )

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

        self._history_cursor: List[Dict[str, str]] = []
        self._last_retrieval_event: Optional[str] = None
        self._background_tasks: set = set()  # Track background tasks to prevent GC

    async def _retrieve_memories(self, query: str) -> Dict[str, Any]:
        """Retrieve memories from Supermemory."""
        if self._supermemory_client is None:
            raise MemoryRetrievalError("Supermemory client not initialized")

        try:
            logger.info(f"[Supermemory] Retrieving memories for query: {query[:50]}...")

            # One profile call: static + dynamic, and (when mode/query allow)
            # search_results via `q` — keeps a single round trip for latency.
            kwargs: Dict[str, Any] = {"container_tag": self.container_tags[0]}
            if self.config.mode != "profile" and query:
                kwargs["q"] = query
                kwargs["threshold"] = self.config.search_threshold

            response = await asyncio.wait_for(
                self._supermemory_client.profile(**kwargs),
                timeout=10.0,
            )

            # A user with no stored memories yet gets a null profile back, which
            # is a normal case, not an error. Guard against it so we return an
            # empty profile instead of raising AttributeError on response.profile.
            profile = _field(response, "profile")
            profile_static = list(_field(profile, "static", default=[]) or [])
            profile_dynamic = list(_field(profile, "dynamic", default=[]) or [])

            search_results: List[Any] = []
            search_response = _field(response, "search_results", "searchResults")
            raw_search_results = _field(search_response, "results", default=[]) or []
            search_results = list(raw_search_results)[: self.config.search_limit]

            logger.info(
                f"[Supermemory] Retrieved memories - static: {len(profile_static)}, "
                f"dynamic: {len(profile_dynamic)}, search: {len(search_results)}"
            )

            return {
                "profile": {
                    "static": profile_static,
                    "dynamic": profile_dynamic,
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
        if self._supermemory_client is None or not messages or self.add_memory == "never":
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

            # Use custom_id for document grouping (required field)
            add_kwargs["custom_id"] = self.custom_id
            logger.info(f"[Supermemory] Using custom_id={self.custom_id} for document grouping")

            await self._supermemory_client.add(**add_kwargs)

            logger.info(f"[Supermemory] Successfully stored {len(messages)} messages")

        except Exception as e:
            logger.error(f"[Supermemory] Error storing messages: {e}")

    def _build_memory_message(self, memories_data: Dict[str, Any]) -> Optional[str]:
        """Build memory context from retrieved data."""
        profile = memories_data["profile"]
        include_profile = self.config.mode in ("profile", "full")
        include_search = self.config.mode in ("query", "full")
        deduplicated = deduplicate_memories(
            static=profile["static"] if include_profile else [],
            dynamic=profile["dynamic"] if include_profile else [],
            search_results=memories_data["search_results"],
        )

        total = (
            len(deduplicated["static"])
            + len(deduplicated["dynamic"])
            + len(deduplicated["search_results"])
        )

        if total == 0:
            return None

        memory_text = format_memories_to_text(
            deduplicated,
            system_prompt=self.config.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )

        if not memory_text:
            return None

        safe_memory_text = escape_memory_delimiters(memory_text)
        return f"{MEMORY_TAG_START}\n{safe_memory_text}\n{MEMORY_TAG_END}"

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
        """Extract messages, suppressing only adjacent duplicate representations."""
        messages: List[Dict[str, str]] = []

        def append_message(role: str, content: Any) -> None:
            if role not in ("user", "assistant") or not isinstance(content, str) or not content:
                return
            message = {"role": role, "content": content}
            if not messages or messages[-1] != message:
                messages.append(message)

        for item in history:
            if isinstance(item, dict):
                if item.get("role") in ("user", "assistant"):
                    append_message(item["role"], item.get("content", ""))
                continue

            event_type = getattr(item, "type", None) or type(item).__name__

            if event_type in ("user_turn_ended", "UserTurnEnded"):
                nested = getattr(item, "content", [])
                if isinstance(nested, list):
                    for nested_item in nested:
                        if hasattr(nested_item, "content"):
                            append_message("user", nested_item.content)

            elif event_type in ("agent_turn_ended", "AgentTurnEnded"):
                nested = getattr(item, "content", [])
                if isinstance(nested, list):
                    texts = [
                        nested_item.content
                        for nested_item in nested
                        if hasattr(nested_item, "content") and isinstance(nested_item.content, str)
                    ]
                    if texts:
                        append_message("assistant", " ".join(texts))

            elif event_type in ("user_text_sent", "UserTextSent"):
                append_message("user", getattr(item, "content", ""))

            elif event_type in ("agent_text_sent", "AgentTextSent"):
                append_message("assistant", getattr(item, "content", ""))

        return messages

    def _new_messages_from_sequence(
        self,
        current_messages: List[Dict[str, str]],
    ) -> List[Dict[str, str]]:
        """Return the append after the longest previous-suffix/current-prefix overlap."""
        if current_messages and len(current_messages) <= len(self._history_cursor):
            for start in range(len(self._history_cursor) - len(current_messages) + 1):
                if self._history_cursor[start : start + len(current_messages)] == current_messages:
                    return []

        overlap = 0
        for size in range(min(len(self._history_cursor), len(current_messages)), 0, -1):
            if self._history_cursor[-size:] == current_messages[:size]:
                overlap = size
                break

        self._history_cursor = current_messages
        return current_messages[overlap:]

    def _new_history_messages(self, history: list) -> List[Dict[str, str]]:
        """Return only messages appended to a cumulative or front-truncated history."""
        return self._new_messages_from_sequence(self._extract_conversation_from_history(history))

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

        event_id = _field(event, "event_id", "eventId")
        event_marker = f"event:{event_id}" if event_id else f"object:{id(event)}"
        if event_marker == self._last_retrieval_event:
            return event, None

        logger.info(f"[Supermemory] Processing user message: {user_message[:50]}...")

        try:
            memories_data = await self._retrieve_memories(user_message)
            self._last_retrieval_event = event_marker
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

    def _agent_accepts_context(self) -> bool:
        """Return whether the wrapped agent supports per-call context."""
        try:
            parameters = inspect.signature(self.agent.process).parameters.values()
        except (TypeError, ValueError):
            return False

        return any(
            parameter.name == "context" or parameter.kind is inspect.Parameter.VAR_KEYWORD
            for parameter in parameters
        )

    @staticmethod
    def _without_memory_context(prompt: str) -> str:
        """Remove context previously injected by this wrapper."""
        return re.sub(
            rf"{re.escape(MEMORY_TAG_START)}.*?{re.escape(MEMORY_TAG_END)}\s*",
            "",
            prompt,
            flags=re.DOTALL,
        ).strip()

    async def _process_agent(
        self,
        env: Any,
        event: Event,
        memory_context: Optional[str],
    ) -> AsyncGenerator[Event, None]:
        """Call modern Line agents with per-turn context, with a legacy fallback."""
        if self._agent_accepts_context():
            process_kwargs = {"context": memory_context} if memory_context else {}
            async for output in self.agent.process(env, event, **process_kwargs):
                yield output
            return

        # Cartesia Line 0.2.0-0.2.2 exposed a mutable ``config`` property and
        # did not yet support per-call context. Keep that narrow compatibility
        # path while avoiding persistent memory text in the base prompt.
        legacy_config = getattr(self.agent, "config", None)
        if legacy_config is None:
            if memory_context:
                logger.warning(
                    "[Supermemory] Wrapped agent cannot accept memory context; "
                    "forwarding the event unchanged"
                )
            async for output in self.agent.process(env, event):
                yield output
            return

        original_prompt = getattr(legacy_config, "system_prompt", "") or ""
        clean_prompt = self._without_memory_context(str(original_prompt))
        prompt_for_call = (
            f"{memory_context}\n\n{clean_prompt}"
            if memory_context and clean_prompt
            else memory_context or clean_prompt
        )
        legacy_config.system_prompt = prompt_for_call
        try:
            async for output in self.agent.process(env, event):
                yield output
        finally:
            legacy_config.system_prompt = clean_prompt

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

                # Store conversation in background
                if hasattr(event, 'history') and event.history:
                    new_messages = self._new_history_messages(event.history)
                    if new_messages:
                        logger.info(
                            f"[Supermemory] Queuing {len(new_messages)} messages for storage"
                        )
                        task = asyncio.create_task(self._store_messages(new_messages))
                        self._background_tasks.add(task)
                        task.add_done_callback(self._background_tasks.discard)
                else:
                    # No history yet, store just the current user message
                    current_messages = self._extract_conversation_from_history([event])
                    if not current_messages:
                        user_content = self._extract_user_message(event)
                        if user_content:
                            current_messages = [{"role": "user", "content": user_content}]
                    new_messages = self._new_messages_from_sequence(current_messages)
                    if new_messages:
                        logger.info("[Supermemory] No history, storing current user message")
                        task = asyncio.create_task(self._store_messages(new_messages))
                        self._background_tasks.add(task)
                        task.add_done_callback(self._background_tasks.discard)

                async for output in self._process_agent(env, event, memory_context):
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
        self._history_cursor = []
        self._last_retrieval_event = None
        logger.info("[Supermemory] Reset memory tracking state")
