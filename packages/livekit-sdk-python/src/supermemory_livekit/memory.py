"""Recall and capture memory for a LiveKit voice session."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from .exceptions import ConfigurationError
from .identifiers import to_identifier
from .utils import (
    _field,
    deduplicate_memories,
    format_memories_to_text,
    format_tool_results,
    is_injected_memory,
    message_role,
    message_text,
    wrap_memory,
)

logger = logging.getLogger("supermemory_livekit")

_UNAVAILABLE = "I couldn't reach memory just now."
_ATTRIBUTE = "supermemory_container_tag"
_STORE_TIMEOUT = 10.0
_MAX_DOCUMENT_CHARS = 100_000
_MAX_BUFFERED = 2_000


def _log_flush_failure(task: "asyncio.Task[None]") -> None:
    if not task.cancelled() and task.exception() is not None:
        logger.warning("memory capture failed; will retry", exc_info=task.exception())


class InputParams(BaseModel):
    search_limit: int = Field(default=10, ge=1, le=20)
    search_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
    system_prompt: str = Field(default="Relevant memory for this caller:\n\n")
    mode: Literal["profile", "query", "full"] = "full"
    recall_timeout: float = Field(default=2.0, gt=0.0, le=8.0)
    capture: Literal["always", "never"] = "always"
    capture_dreaming: Literal["dynamic", "instant"] = "dynamic"


class SupermemoryLiveKit:
    """Persistent memory for a LiveKit Agents session.

    Call ``enrich`` from ``llm_node`` before the LLM replies, and ``attach`` the
    session so completed turns are stored. ``tools()`` exposes search, remember,
    and forget to the model. A Supermemory outage never fails the call.
    """

    InputParams = InputParams

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        container_tag: Optional[str] = None,
        session_id: Optional[str] = None,
        params: Optional[InputParams] = None,
        base_url: Optional[str] = None,
        client: Any = None,
    ) -> None:
        self.api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key and client is None:
            raise ConfigurationError(
                "API key is required. Pass api_key or set SUPERMEMORY_API_KEY."
            )

        self.params = params or InputParams()
        self.container_tag: Optional[str] = None
        self.session_id: Optional[str] = None
        self._generated_session = f"session-{uuid4().hex[:12]}"
        self._client = client if client is not None else self._build_client(base_url)
        self._seen: set[str] = set()
        # Each captured turn keeps the scope it was spoken in, so a rebind cannot move it.
        self._buffer: list[dict[str, Optional[str]]] = []
        self._lock = asyncio.Lock()
        self._flush_task: Optional[asyncio.Task[None]] = None
        self._recall: Optional[tuple[tuple[Optional[str], str], asyncio.Future[Optional[str]]]] = None
        self._preloaded: Optional[tuple[str, str]] = None
        self._session: Any = None
        self._shutdown_registered = False

        if container_tag or session_id:
            self.bind(container_tag=container_tag, session_id=session_id)

    def _build_client(self, base_url: Optional[str]) -> Any:
        try:
            import supermemory
        except ImportError as exc:
            raise ConfigurationError(
                "supermemory is not installed. Install with: pip install supermemory-livekit"
            ) from exc
        kwargs: dict[str, Any] = {"api_key": self.api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return supermemory.AsyncSupermemory(**kwargs)

    def bind(
        self,
        *,
        container_tag: Optional[str] = None,
        session_id: Optional[str] = None,
        participant: Any = None,
    ) -> None:
        """Scope memory to a container tag, or to a LiveKit participant identity."""
        if participant is not None and not container_tag:
            attributes = getattr(participant, "attributes", None) or {}
            if isinstance(attributes, dict) and attributes.get(_ATTRIBUTE):
                container_tag = str(attributes[_ATTRIBUTE])
            else:
                container_tag = getattr(participant, "identity", None)

        if container_tag is not None:
            raw = str(container_tag).strip()
            if not raw:
                if participant is None:
                    raise ConfigurationError("container_tag is empty")
            else:
                scoped = to_identifier(raw)
                if scoped != raw:
                    logger.info("scoped memory to container tag %s", scoped)
                self.container_tag = scoped
        if session_id:
            self.session_id = str(session_id)
        if self.container_tag:
            custom_id = self._custom_id()
            for message in self._buffer:
                if message["tag"] is None:
                    message["tag"], message["custom_id"] = self.container_tag, custom_id
        self._schedule_flush()

    def tools(self) -> list[Any]:
        from .tools import build_tools

        return build_tools(self)

    async def preload(self, chat_ctx: Any) -> bool:
        """Inject the caller profile into the initial chat context. Returns whether anything was added."""
        tag = self.container_tag
        text = await self._recall_text(query=None)
        if not text or tag is None or tag != self.container_tag:
            return False
        self._preloaded = (tag, text)
        self._inject(chat_ctx, text, created_at=None)
        return True

    async def enrich(self, chat_ctx: Any) -> None:
        """Recall for the latest user message and insert it just before that message.

        Call from ``llm_node``. That covers voice and text turns, and runs during
        LiveKit's preemptive generation instead of invalidating it. Each user message
        is recalled once; tool follow-ups and preemptive retries reuse the result.
        """
        user = self._last_user_item(chat_ctx)
        if user is not None:
            await self._recall_into(chat_ctx, user)
        elif not self._preload_matches():
            self._strip_injected(chat_ctx)

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:
        """Recall from the turn hook, for realtime models that skip ``llm_node``.

        With an STT-LLM-TTS pipeline use ``enrich`` from ``llm_node`` instead. Editing
        the turn context here discards LiveKit's preemptive generation.
        """
        await self._recall_into(turn_ctx, new_message)

    async def _recall_into(self, chat_ctx: Any, user: Any) -> None:
        query = message_text(user)
        if not query:
            return
        tag = self.container_tag
        # Drop earlier injections first, so a failed recall leaves no memory rather than stale
        # or foreign memory. The caller's own call-start profile is the fallback.
        self._strip_injected(chat_ctx)
        text: Optional[str] = None
        try:
            text = await self._recall_once(user, query)
        except Exception:
            logger.warning("memory recall failed", exc_info=True)
        if tag != self.container_tag:
            return
        if not text and self._preload_matches():
            text = self._preloaded[1] if self._preloaded else None
        if not text:
            return
        created_at = getattr(user, "created_at", None)
        before = created_at - 0.001 if isinstance(created_at, (int, float)) else None
        try:
            self._inject(chat_ctx, text, created_at=before)
        except Exception:
            logger.warning("memory inject failed", exc_info=True)

    async def _recall_once(self, user: Any, query: str) -> Optional[str]:
        # Keyed on the user message, so retries and tool follow-ups of one turn share a recall
        # while a later turn with the same words recalls again.
        key = (self.container_tag, str(getattr(user, "id", None) or query))
        if self._recall is None or self._recall[0] != key:
            self._recall = (key, asyncio.ensure_future(self._recall_text(query=query)))
        # A cancelled preemptive generation must not cancel a recall the next attempt reuses.
        return await asyncio.shield(self._recall[1])

    def _preload_matches(self) -> bool:
        return self._preloaded is not None and self._preloaded[0] == self.container_tag

    def attach(
        self,
        session: Any,
        *,
        container_tag: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> None:
        """Store completed user and assistant turns from this session."""
        if container_tag or session_id:
            self.bind(container_tag=container_tag, session_id=session_id)
        if self._session is not session:
            self._detach()
            session.on("conversation_item_added", self._on_conversation_item)
            session.on("close", self._on_close)
            self._session = session
        self._register_shutdown()

    async def aclose(self) -> None:
        """Flush captured turns. Safe to call more than once."""
        task = self._flush_task
        if task is not None and not task.done():
            try:
                await task
            except Exception:
                logger.warning("memory capture failed while closing", exc_info=True)
        for _ in range(2):
            if not self._buffer:
                return
            try:
                await self._flush()
                return
            except Exception:
                logger.warning("memory capture failed while closing", exc_info=True)

    async def search(self, query: str) -> str:
        tag = self.container_tag
        if not tag:
            return "Memory is not scoped to a caller yet."
        if not query.strip():
            return "No matching memories."
        try:
            response = await asyncio.wait_for(
                self._client.search.memories(
                    q=query,
                    container_tag=tag,
                    limit=self.params.search_limit,
                    threshold=self.params.search_threshold,
                    search_mode="hybrid",
                ),
                timeout=4.0,
            )
        except Exception:
            logger.warning("memory search failed", exc_info=True)
            return _UNAVAILABLE
        results = list(_field(response, "results", default=[]) or [])
        return format_tool_results(results[: self.params.search_limit])

    async def remember(self, memory_text: str) -> str:
        tag = self.container_tag
        text = memory_text.strip()
        if not tag:
            return "Memory is not scoped to a caller yet."
        if not text:
            return "Nothing to remember."
        add = {
            "content": text,
            "container_tag": tag,
            "metadata": {"source": "livekit", "kind": "explicit"},
        }
        try:
            await asyncio.wait_for(self._client.add(**add, dreaming="instant"), timeout=4.0)
        except Exception as exc:
            if getattr(exc, "status_code", None) != 402:
                logger.warning("memory remember failed", exc_info=True)
                return _UNAVAILABLE
            # No balance for instant processing: save it on the default schedule instead.
            try:
                await asyncio.wait_for(self._client.add(**add), timeout=4.0)
            except Exception:
                logger.warning("memory remember failed", exc_info=True)
                return _UNAVAILABLE
        return "Saved."

    async def forget(self, *, memory_id: str = "", memory_text: str = "") -> str:
        tag = self.container_tag
        if not tag:
            return "Memory is not scoped to a caller yet."
        memory_id = memory_id.strip()
        memory_text = memory_text.strip()
        if not memory_id and not memory_text:
            return "Pass a memory id from search_memories, or the exact memory text."
        kwargs: dict[str, Any] = {"container_tag": tag}
        if memory_id:
            kwargs["id"] = memory_id
        if memory_text:
            kwargs["content"] = memory_text
        try:
            await asyncio.wait_for(self._client.memories.forget(**kwargs), timeout=4.0)
        except Exception:
            logger.warning("memory forget failed", exc_info=True)
            return _UNAVAILABLE
        return "Forgotten."

    async def _recall_text(self, *, query: Optional[str]) -> Optional[str]:
        if not self.container_tag or self._client is None:
            return None
        include_profile = self.params.mode in ("profile", "full")
        include_search = self.params.mode in ("query", "full") and bool(query)
        if self.params.mode == "profile":
            include_search = False
        if not include_profile and not include_search:
            return None
        try:
            memories = await asyncio.wait_for(
                self._retrieve(query if include_search else None),
                timeout=self.params.recall_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning("memory recall timed out after %.2fs", self.params.recall_timeout)
            return None
        except Exception:
            logger.warning("memory recall failed", exc_info=True)
            return None

        profile = memories["profile"]
        deduped = deduplicate_memories(
            static=profile["static"] if include_profile else [],
            dynamic=profile["dynamic"] if include_profile else [],
            search_results=memories["search_results"] if include_search else [],
        )
        text = format_memories_to_text(
            deduped,
            system_prompt=self.params.system_prompt,
            include_static=include_profile,
            include_dynamic=include_profile,
            include_search=include_search,
        )
        return text or None

    async def _retrieve(self, query: Optional[str]) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "container_tag": self.container_tag,
            "timeout": self.params.recall_timeout,
        }
        if query:
            kwargs["q"] = query
            kwargs["threshold"] = self.params.search_threshold
        response = await self._client.profile(**kwargs)
        profile = _field(response, "profile")
        search_response = _field(response, "search_results", "searchResults")
        raw_results = list(_field(search_response, "results", default=[]) or [])
        return {
            "profile": {
                "static": list(_field(profile, "static", default=[]) or []),
                "dynamic": list(_field(profile, "dynamic", default=[]) or []),
            },
            "search_results": raw_results[: self.params.search_limit],
        }

    # LiveKit orders the user turn by timestamp, so a late add would land after it.
    def _inject(self, chat_ctx: Any, text: str, *, created_at: Optional[float]) -> None:
        wrapped = wrap_memory(text)
        if created_at is None:
            chat_ctx.add_message(role="assistant", content=wrapped)
            return
        try:
            chat_ctx.add_message(role="assistant", content=wrapped, created_at=created_at)
        except TypeError:
            chat_ctx.add_message(role="assistant", content=wrapped)

    def _last_user_item(self, chat_ctx: Any) -> Any:
        for item in reversed(list(getattr(chat_ctx, "items", []) or [])):
            if message_role(item) == "user" and message_text(item):
                return item
        return None

    def _strip_injected(self, chat_ctx: Any) -> None:
        items = list(getattr(chat_ctx, "items", []) or [])
        for item in items:
            text = message_text(item)
            if message_role(item) != "assistant" or not text or not is_injected_memory(text):
                continue
            item_id = getattr(item, "id", None)
            if item_id is not None and hasattr(chat_ctx, "remove"):
                chat_ctx.remove(item_id)
            elif hasattr(chat_ctx, "items") and item in chat_ctx.items:
                chat_ctx.items.remove(item)

    def _on_conversation_item(self, event: Any) -> None:
        item = getattr(event, "item", event)
        role = message_role(item)
        if role not in ("user", "assistant"):
            return
        text = message_text(item)
        if not text or is_injected_memory(text):
            return
        item_id = getattr(item, "id", None) or f"anon-{id(item)}"
        if item_id in self._seen:
            return
        self._seen.add(item_id)
        tag = self.container_tag
        self._buffer.append(
            {
                "role": role,
                "content": text,
                "tag": tag,
                "custom_id": self._custom_id() if tag else None,
            }
        )
        if len(self._buffer) > _MAX_BUFFERED:
            del self._buffer[: len(self._buffer) - _MAX_BUFFERED]
            logger.warning("memory capture buffer full; dropped the oldest turns")
        if role == "assistant":
            self._schedule_flush()

    def _on_close(self, _event: Any = None) -> None:
        self._schedule_flush()

    def _schedule_flush(self) -> None:
        if self.params.capture != "always" or not self._buffer or self._buffer[0]["tag"] is None:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        if self._flush_task is not None and not self._flush_task.done():
            return
        self._flush_task = loop.create_task(self._flush())
        self._flush_task.add_done_callback(_log_flush_failure)

    async def _flush(self) -> None:
        while True:
            async with self._lock:
                if self.params.capture != "always":
                    return
                batch = self._take_batch()
                if not batch:
                    return
            try:
                await asyncio.wait_for(self._store(batch), timeout=_STORE_TIMEOUT)
            except BaseException:
                async with self._lock:
                    self._buffer = batch + self._buffer
                raise

    def _take_batch(self) -> list[dict[str, Optional[str]]]:
        """Take the leading turns that share one scope, capped in size."""
        if not self._buffer or self._buffer[0]["tag"] is None:
            return []
        scope = (self._buffer[0]["tag"], self._buffer[0]["custom_id"])
        count, size = 0, 0
        for message in self._buffer:
            length = len(message["content"] or "")
            if (message["tag"], message["custom_id"]) != scope:
                break
            if count and size + length > _MAX_DOCUMENT_CHARS:
                break
            count, size = count + 1, size + length
        batch, self._buffer = self._buffer[:count], self._buffer[count:]
        return batch

    async def _store(self, messages: list[dict[str, Optional[str]]]) -> None:
        lines = [
            f"{'User' if message['role'] == 'user' else 'Assistant'}: {message['content']}"
            for message in messages
        ]
        await self._client.add(
            content="\n".join(lines),
            container_tag=messages[0]["tag"],
            custom_id=messages[0]["custom_id"],
            metadata={"source": "livekit", "kind": "conversation"},
            dreaming=self.params.capture_dreaming,
        )

    def _custom_id(self) -> str:
        raw = self.session_id or self._generated_session
        return to_identifier(f"lk-{raw}")

    def _detach(self) -> None:
        session = self._session
        if session is None or not hasattr(session, "off"):
            self._session = None
            return
        session.off("conversation_item_added", self._on_conversation_item)
        session.off("close", self._on_close)
        self._session = None

    def _register_shutdown(self) -> None:
        if self._shutdown_registered:
            return
        try:
            from livekit.agents import get_job_context

            try:
                ctx = get_job_context(required=False)
            except TypeError:
                ctx = get_job_context()
        except Exception:
            return
        if ctx is None or not hasattr(ctx, "add_shutdown_callback"):
            return
        ctx.add_shutdown_callback(self.aclose)
        self._shutdown_registered = True
