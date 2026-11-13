"""A Strands ``MemoryStore`` backed by Supermemory.

A memory store gives a Strands agent cross-session recall: a
:class:`~strands.memory.MemoryManager` searches it to recall context and, when
the store is writable, writes new content to it, either through the
``add_memory`` tool or through automatic extraction from the conversation.

Supermemory is a hosted memory API. It stores content, extracts memories from
it, keeps a profile per namespace, and returns relevant context on search.
``SupermemoryMemoryStore`` maps the ``MemoryStore`` interface onto it like this:

- :meth:`SupermemoryMemoryStore.search` calls ``client.search`` and returns one
  :class:`~strands.memory.MemoryEntry` per result.
- :meth:`SupermemoryMemoryStore.add` calls ``client.add`` with one piece of
  content. Supermemory has no call that writes a memory verbatim, so the content
  is stored as a document and memories are extracted from it on the server.
- :meth:`SupermemoryMemoryStore.add_messages` renders conversation turns to text
  and calls ``client.add`` with the store's ``conversation_id`` as the document
  ID, so every batch from one conversation is appended to the same document.
  Because this method exists, enabling ``extraction`` uses Supermemory's own
  extraction and needs no extra model call.

The ``MemoryStore`` interface has no delete operation, so a ``MemoryManager``
never removes anything. :meth:`SupermemoryMemoryStore.forget` and
:meth:`SupermemoryMemoryStore.profile` are extra methods for your own code.

Example:
    ```python
    from strands import Agent
    from strands.memory import MemoryManager
    from supermemory_strands import SupermemoryMemoryStore

    store = SupermemoryMemoryStore(namespace="user_alex", extraction=True)
    agent = Agent(memory_manager=MemoryManager(stores=[store]))
    ```

The API key comes from the ``api_key`` argument or the ``SUPERMEMORY_API_KEY``
environment variable.
"""

from __future__ import annotations

import asyncio
import hashlib
import uuid
from typing import Any, Literal

from strands.memory import AddMessagesContext, ExtractionConfig, MemoryEntry, MemoryStore, SearchOptions
from strands.types.content import Message
from supermemory import AsyncSupermemory, DocumentRef, ForgetResult, Profile, SearchResult, Supermemory

# The search API accepts between 1 and 100 results per request.
MAX_SEARCH_LIMIT = 100

SearchMode = Literal["hybrid", "memories", "chunks"]
DreamingMode = Literal["dynamic", "instant"]


class SupermemoryMemoryStore(MemoryStore):
    """A Strands :class:`~strands.memory.MemoryStore` backed by Supermemory.

    Implements :meth:`search`, :meth:`add` and :meth:`add_messages`. Every call
    is scoped to the ``namespace`` the store was created with.

    ``initialize`` and ``get_tools`` are not implemented: the store needs no
    setup call and contributes no tools of its own.
    """

    def __init__(
        self,
        *,
        namespace: str,
        name: str = "supermemory",
        description: str | None = "Long-term memory backed by Supermemory.",
        max_search_results: int | None = None,
        writable: bool = True,
        extraction: ExtractionConfig | bool | None = None,
        conversation_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        search_mode: SearchMode | None = None,
        threshold: float | None = None,
        dreaming: DreamingMode | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        client: Supermemory | None = None,
    ) -> None:
        """Initialize the store.

        Args:
            namespace: The Supermemory namespace that isolates this store's
                content. Use a user ID, a project ID, or any other string.
            name: Unique store identifier, used to target it in tools.
            description: Human-readable description, included in tool descriptions.
            max_search_results: Default maximum results per search. When unset,
                the Supermemory API default applies.
            writable: Whether the store accepts writes.
            extraction: Automatic-extraction config (``bool | ExtractionConfig``).
                When enabled, the manager sends raw conversation turns to
                :meth:`add_messages` and Supermemory extracts memories from them.
            conversation_id: Document ID that :meth:`add_messages` writes to.
                Pass your own session or conversation ID to keep one document
                per conversation across processes. When unset, a random ID is
                generated for the lifetime of this store instance.
            metadata: Default metadata attached to every write. A flat mapping
                of string, number, boolean, or list-of-string values.
            search_mode: ``"hybrid"`` (memories and source chunks), ``"memories"``
                or ``"chunks"``. When unset, the Supermemory API default applies.
            threshold: Minimum relevance score from 0 to 1. When unset, the
                Supermemory API default applies.
            dreaming: Processing mode for writes. ``"dynamic"`` groups related
                documents, so memories can take a few minutes to appear.
                ``"instant"`` skips the batching, so memories are usually searchable
                within about a minute, and bills one extra operation per document. When unset, the Supermemory API
                default applies.
            api_key: Supermemory API key. Defaults to ``$SUPERMEMORY_API_KEY``.
            base_url: Supermemory API base URL. Defaults to the SDK default.
            client: A pre-built synchronous ``supermemory.Supermemory`` client.
                When given, ``api_key`` and ``base_url`` are ignored.

        Raises:
            ValueError: If ``namespace`` is empty, ``metadata`` holds an
                unsupported value, or ``client`` is an ``AsyncSupermemory``.
        """
        if not isinstance(namespace, str) or not namespace.strip():
            raise ValueError("SupermemoryMemoryStore requires a non-empty namespace")
        if isinstance(client, AsyncSupermemory):
            raise ValueError(
                "AsyncSupermemory clients are not supported. Pass a synchronous supermemory.Supermemory client: "
                "the store runs the SDK in a worker thread, so an async client's coroutines would never be awaited."
            )
        _check_metadata(metadata)

        self.name = name
        self.description = description
        self.max_search_results = max_search_results
        self.writable = writable
        self.extraction = extraction

        self.namespace = namespace.strip()
        self.conversation_id = conversation_id or f"strands-{uuid.uuid4().hex}"
        self.metadata = metadata
        self.search_mode = search_mode
        self.threshold = threshold
        self.dreaming = dreaming

        self._client = client if client is not None else Supermemory(api_key=api_key, base_url=base_url)

    async def search(self, query: str, options: SearchOptions | None = None) -> list[MemoryEntry]:
        """Search the namespace for entries matching ``query``, ordered by relevance.

        Each entry's ``metadata`` carries the result's own metadata plus ``id``,
        ``type`` (``"memory"`` or ``"chunk"``), ``similarity`` and ``updated_at``.
        With the default hybrid search mode, results include both extracted
        memories and source chunks. Only memory IDs can be passed to :meth:`forget`.

        A blank query returns no entries without calling the API.
        """
        if not query or not query.strip():
            return []

        limit = options.get("max_search_results") if options is not None else None
        if limit is None:
            limit = self.max_search_results

        request: dict[str, Any] = {}
        if limit is not None:
            request["limit"] = max(1, min(limit, MAX_SEARCH_LIMIT))
        if self.search_mode is not None:
            request["search_mode"] = self.search_mode
        if self.threshold is not None:
            request["threshold"] = self.threshold

        response = await asyncio.to_thread(lambda: self._client.search(self.namespace, query=query, **request))
        entries = [_to_entry(result) for result in response.results]
        return [entry for entry in entries if entry is not None]

    async def add(self, content: str, metadata: dict[str, Any] | None = None) -> DocumentRef:
        """Store one piece of content in the namespace.

        This is the sink for the ``add_memory`` tool and for a client-side
        extractor. Supermemory does not store the text as a memory verbatim: it
        stores a document and extracts memories from it on the server, so the
        recalled wording can differ from ``content`` and, with the default
        ``dreaming`` mode, new memories can take a few minutes to appear.

        The document ID is derived from the namespace and the content, so a
        repeated write of the same content addresses the same document instead
        of creating a second one. Extraction writes are at-least-once, which
        makes this the common retry case.

        Args:
            content: The text to store.
            metadata: Metadata for this write, merged over the store's default
                ``metadata``. A flat mapping of string, number, boolean, or
                list-of-string values.

        Returns:
            The ``DocumentRef`` (``id`` and ``status``) for the stored document.

        Raises:
            ValueError: If ``metadata`` holds an unsupported value.
        """
        _check_metadata(metadata)
        merged = {**(self.metadata or {}), **(metadata or {})}
        document_id = _content_id(self.namespace, content)
        options = self._write_options(merged)

        return await asyncio.to_thread(
            lambda: self._client.add(self.namespace, content=content, id=document_id, **options)
        )

    async def add_messages(
        self, messages: list[Message], context: AddMessagesContext | None = None
    ) -> DocumentRef | None:
        """Send conversation turns to Supermemory, which extracts memories from them.

        Each message's text blocks are rendered as ``"<role>: <text>"``. Tool-use,
        tool-result, image and other non-text blocks are dropped, and a message
        with no text is skipped. The batch is written under the store's
        ``conversation_id``, so successive batches are appended to one document
        per conversation.

        ``context`` is not used. Newer SDK versions pass per-message
        ``sequence_numbers`` in it, but the numbers reset on every agent run and
        the interface supplies no run ID to pair them with, so a batch the
        manager retries is sent again under the same document ID.

        Returns:
            The ``DocumentRef`` for the conversation document, or ``None`` when
            no message had text to store.
        """
        turns = []
        for message in messages:
            text = _render_content(message.get("content"))
            if text:
                turns.append(f"{message['role']}: {text}")
        if not turns:
            return None

        transcript = "\n\n".join(turns)
        options = self._write_options(self.metadata)

        return await asyncio.to_thread(
            lambda: self._client.add(self.namespace, content=transcript, id=self.conversation_id, **options)
        )

    async def profile(self) -> Profile:
        """Return the profile Supermemory maintains for the namespace.

        Not part of the ``MemoryStore`` interface, so a ``MemoryManager`` never
        calls it. The profile has ``static`` facts, ``dynamic`` (recent)
        context and named ``buckets``; each fact has an ``id`` and ``memory``.
        """
        response = await asyncio.to_thread(lambda: self._client.profile(self.namespace))
        return response.profile

    async def forget(self, memory_ids: list[str]) -> ForgetResult:
        """Forget memories in the namespace by ID.

        Not part of the ``MemoryStore`` interface, so a ``MemoryManager`` never
        calls it. Forgotten memories are removed from normal recall. This call
        does not delete source documents; use ``client.documents.delete`` from
        the Supermemory SDK for that.

        Args:
            memory_ids: Memory IDs, for example the ``id`` in the metadata of a
                search entry whose ``type`` is ``"memory"``.

        Returns:
            The ``ForgetResult`` with the match ``count``, the ``matches`` and
            any per-memory ``errors``.

        Raises:
            ValueError: If ``memory_ids`` is empty.
        """
        if not memory_ids:
            raise ValueError("forget requires at least one memory ID")

        ids = list(memory_ids)
        return await asyncio.to_thread(lambda: self._client.memories.forget(self.namespace, ids=ids))

    def _write_options(self, metadata: dict[str, Any] | None) -> dict[str, Any]:
        """Build the optional ``client.add`` arguments, leaving unset ones out."""
        options: dict[str, Any] = {}
        if metadata:
            options["metadata"] = metadata
        if self.dreaming is not None:
            options["dreaming"] = self.dreaming
        return options


def _check_metadata(metadata: dict[str, Any] | None) -> None:
    """Reject metadata that Supermemory cannot store.

    Supermemory metadata is a flat mapping of string, number, boolean, or
    list-of-string values.
    """
    if metadata is None:
        return
    if not isinstance(metadata, dict):
        raise ValueError("metadata must be a mapping")
    for key, value in metadata.items():
        if isinstance(value, (str, int, float, bool)):
            continue
        if isinstance(value, list) and all(isinstance(item, str) for item in value):
            continue
        raise ValueError(f"metadata value for '{key}' must be a string, number, boolean, or list of strings")


def _content_id(namespace: str, content: str) -> str:
    """Derive a stable document ID from the namespace and the content."""
    digest = hashlib.sha256(f"{namespace}\0{content}".encode()).hexdigest()
    return f"strands-{digest[:32]}"


def _render_content(content: Any) -> str:
    """Flatten a Strands message ``content`` to plain text.

    Accepts either a string or a list of content blocks, joins the text of
    every ``{"text": ...}`` block, and ignores every other block type.
    """
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [block["text"] for block in content if isinstance(block, dict) and isinstance(block.get("text"), str)]
        return "\n".join(part for part in parts if part.strip()).strip()
    return ""


def _to_entry(result: SearchResult) -> MemoryEntry | None:
    """Map a Supermemory search result to a Strands ``MemoryEntry``.

    Returns ``None`` for a result that carries neither memory nor chunk text.
    """
    content = result.memory or result.chunk
    if not content:
        return None

    metadata: dict[str, Any] = dict(result.metadata or {})
    metadata.update(
        {
            "id": result.id,
            "type": "memory" if result.memory else "chunk",
            "similarity": result.similarity,
            "updated_at": result.system.updated_at,
        }
    )
    return MemoryEntry(content=content, metadata=metadata)
