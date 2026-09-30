"""Supermemory tools for Microsoft Agent Framework.

Provides FunctionTool-compatible tools that can be passed to Agent.run(tools=[...]).
"""

import json
import warnings
from typing import Annotated, Any, Optional, TypedDict

from agent_framework import FunctionTool, tool

from .connection import AgentSupermemory


class MemorySearchResult(TypedDict, total=False):
    """Result type for memory search operations."""

    success: bool
    results: list[Any] | None
    count: int | None
    error: str | None


class MemoryAddResult(TypedDict, total=False):
    """Result type for memory add operations."""

    success: bool
    memory: Any | None
    error: str | None


class ProfileResult(TypedDict, total=False):
    """Result type for profile operations."""

    success: bool
    profile: dict[str, Any] | None
    search_results: dict[str, Any] | None
    error: str | None


class DocumentListResult(TypedDict, total=False):
    """Result type for document list operations."""

    success: bool
    documents: list[Any] | None
    pagination: dict[str, Any] | None
    error: str | None


class DocumentDeleteResult(TypedDict, total=False):
    """Result type for document delete operations."""

    success: bool
    message: str | None
    error: str | None


class DocumentAddResult(TypedDict, total=False):
    """Result type for document add operations."""

    success: bool
    document: Any | None
    error: str | None


class MemoryForgetResult(TypedDict, total=False):
    """Result type for memory forget operations."""

    success: bool
    message: str | None
    error: str | None


# Deleting a document mid-ingestion races the extraction pipeline, so only
# documents that reached a terminal state are eligible.
_TERMINAL_DOCUMENT_STATUSES = {"done", "failed"}


def _to_jsonable(value: Any) -> Any:
    """Convert generated SDK models into JSON-compatible structures."""
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(item) for item in value]

    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        try:
            return _to_jsonable(model_dump(mode="json"))
        except TypeError:
            # Compatibility with pydantic-like models whose model_dump does not
            # accept Pydantic v2's ``mode`` argument.
            return _to_jsonable(model_dump())

    return value


class SupermemoryTools:
    """Memory tools for Microsoft Agent Framework.

    Creates FunctionTool instances that can be passed to Agent.run(tools=[...]).

    Example:
        ```python
        from supermemory_agent_framework import AgentSupermemory, SupermemoryTools

        conn = AgentSupermemory(api_key="your-key", container_tag="user-123")
        tools = SupermemoryTools(conn)
        agent_tools = tools.get_tools()

        response = await agent.run(
            "What do you remember about me?",
            tools=agent_tools,
        )
        ```
    """

    def __init__(self, connection: AgentSupermemory) -> None:
        self._connection = connection
        self._client = connection.client

    async def search_memories(
        self,
        information_to_get: Annotated[
            str, "Terms to search for in stored memories and source content"
        ],
        include_full_docs: Optional[bool] = None,
        limit: Annotated[int, "Maximum number of results to return"] = 10,
    ) -> str:
        """Search stored memories and source chunks.

        ``include_full_docs`` remains a deprecated Python-only argument for
        source compatibility. V4 search cannot return full source documents.
        """
        if include_full_docs is not None:
            warnings.warn(
                "include_full_docs is deprecated and ignored because v4 search "
                "does not return full source documents",
                DeprecationWarning,
                stacklevel=2,
            )

        try:
            response = await self._client.search.memories(
                q=information_to_get,
                container_tag=self._connection.container_tag,
                limit=limit,
                threshold=0.6,
                search_mode="hybrid",
            )
            results = response.results or []
            result: MemorySearchResult = {
                "success": True,
                "results": [_to_jsonable(item) for item in results],
                "count": len(results),
            }
            return json.dumps(result, default=str)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def add_memory(
        self,
        memory: Annotated[
            str,
            "The text content of the memory to add. Should be a single sentence or short paragraph.",
        ],
    ) -> str:
        """Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation."""
        try:
            response = await self._client.add(
                content=memory,
                container_tag=self._connection.container_tag,
                custom_id=self._connection.custom_id,
            )
            result: MemoryAddResult = {
                "success": True,
                "memory": _to_jsonable(response),
            }
            return json.dumps(result, default=str)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def get_profile(
        self,
        query: Annotated[
            str,
            "Optional search query to include relevant search results.",
        ] = "",
    ) -> str:
        """Get user profile containing static memories (permanent facts) and dynamic memories (recent context). Optionally include search results by providing a query."""
        try:
            kwargs: dict[str, Any] = {"container_tag": self._connection.container_tag}
            if query:
                kwargs["q"] = query

            response = await self._client.profile(**kwargs)
            result: dict[str, Any] = {
                "success": True,
                "profile": (
                    _to_jsonable(response.profile)
                    if hasattr(response, "profile")
                    else None
                ),
                "search_results": (
                    _to_jsonable(response.search_results)
                    if hasattr(response, "search_results")
                    else None
                ),
            }
            return json.dumps(result, default=str)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def document_list(
        self,
        limit: Annotated[int, "Maximum number of documents to return"] = 10,
        page: Annotated[int, "Page number to fetch, 1-based"] = 1,
    ) -> str:
        """List stored source documents in the configured container tag."""
        try:
            response = await self._client.documents.list(
                container_tags=[self._connection.container_tag],
                limit=limit,
                page=page,
            )
            result: DocumentListResult = {
                "success": True,
                "documents": [_to_jsonable(item) for item in response.memories or []],
                "pagination": _to_jsonable(response.pagination),
            }
            return json.dumps(result, default=str)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def document_delete(
        self,
        document_id: Annotated[
            str,
            "Document ID from document_list. Permanently deletes the source and "
            "soft-forgets its extracted memories. Not a profile memory ID.",
        ],
    ) -> str:
        """Delete a stored source document if it is safely within scope."""
        try:
            # The delete endpoint takes no container tag, so verify scope on the
            # document itself first. This also resolves a custom ID to its real ID.
            document = await self._client.documents.get(document_id)
            tags = document.container_tags or []
            if not tags or any(tag != self._connection.container_tag for tag in tags):
                result: DocumentDeleteResult = {
                    "success": False,
                    "error": "Document is outside the configured container tag",
                }
                return json.dumps(result)

            status = getattr(document, "status", None)
            if status is not None and status not in _TERMINAL_DOCUMENT_STATUSES:
                result = {
                    "success": False,
                    "error": (
                        "Document cannot be deleted while it is still processing "
                        f"(status: {status})"
                    ),
                }
                return json.dumps(result)

            await self._client.documents.delete(document.id)
            result = {
                "success": True,
                "message": f"Document {document_id} deleted successfully",
            }
            return json.dumps(result)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def document_add(
        self,
        content: Annotated[
            str,
            "Document body to store: plain text, a conversation transcript, a long "
            "pasted blob, or a URL. Memories are extracted automatically; do not "
            "split into add_memory calls.",
        ],
        title: Annotated[Optional[str], "Optional title for the document"] = None,
        description: Annotated[
            Optional[str], "Optional description for the document"
        ] = None,
    ) -> str:
        """Store a source document for background processing and memory extraction."""
        try:
            metadata: dict[str, str] = {}
            if title:
                metadata["title"] = title
            if description:
                metadata["description"] = description

            # No custom_id: the connection's custom_id keys the conversation
            # document, and reusing it here would overwrite that conversation.
            kwargs: dict[str, Any] = {
                "content": content,
                "container_tag": self._connection.container_tag,
            }
            if metadata:
                kwargs["metadata"] = metadata

            response = await self._client.documents.add(**kwargs)
            result: DocumentAddResult = {
                "success": True,
                "document": _to_jsonable(response),
            }
            return json.dumps(result, default=str)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    async def memory_forget(
        self,
        memory_id: Annotated[
            Optional[str],
            "Memory entry ID from a search_memories result containing a memory. "
            "Chunk and document IDs are invalid.",
        ] = None,
        memory_content: Annotated[
            Optional[str],
            "Exact text of the profile memory to forget (alternative to memory_id). "
            "If unsure, search first and use memory_id.",
        ] = None,
        reason: Annotated[
            Optional[str],
            "Optional reason recorded when forgetting (e.g. outdated, user correction)",
        ] = None,
    ) -> str:
        """Soft-delete a single extracted profile memory."""
        if not memory_id and not memory_content:
            result: MemoryForgetResult = {
                "success": False,
                "error": "Either memory_id or memory_content must be provided",
            }
            return json.dumps(result)

        try:
            kwargs: dict[str, Any] = {"container_tag": self._connection.container_tag}
            if memory_id:
                kwargs["id"] = memory_id
            if memory_content:
                kwargs["content"] = memory_content
            if reason:
                kwargs["reason"] = reason

            await self._client.memories.forget(**kwargs)
            result = {"success": True, "message": "Memory forgotten successfully"}
            return json.dumps(result)
        except Exception as error:
            result = {"success": False, "error": str(error)}
            return json.dumps(result)

    def get_tools(self) -> list[FunctionTool]:
        """Get all Supermemory tools as FunctionTool instances.

        Returns:
            List of FunctionTool instances ready to pass to Agent.run(tools=...)
        """
        return [
            tool(
                name="search_memories",
                description=(
                    "Search stored memories and source chunks for relevant facts, preferences, "
                    "history, and context. Use proactively whenever prior context could help; "
                    "hybrid results can contain either a memory or a source chunk."
                ),
            )(self._search_memories_tool),
            tool(
                name="add_memory",
                description=(
                    "Add (remember) memories/details/information about the user or other "
                    "facts or entities. Run when explicitly asked or when the user mentions "
                    "any information generalizable beyond the context of the current conversation."
                ),
            )(self.add_memory),
            tool(
                name="get_profile",
                description=(
                    "Get user profile containing static memories (permanent facts) and "
                    "dynamic memories (recent context). Optionally include search results "
                    "by providing a query."
                ),
            )(self.get_profile),
            tool(
                name="document_list",
                description=(
                    "List stored source documents (conversations, URLs, files, pasted "
                    "text) with pagination. Returns document metadata and summaries, "
                    "including IDs for document_delete. It does not return full source "
                    "content or memory IDs."
                ),
            )(self.document_list),
            tool(
                name="document_delete",
                description=(
                    "Permanently delete a stored source document and soft-forget "
                    "memories extracted from it. Use a document ID from document_list "
                    "when the user wants to remove an entire source. Deletion is "
                    "refused for documents outside the configured scope, shared with "
                    "another scope, or still processing. Use memory_forget to remove "
                    "one learned fact."
                ),
            )(self.document_delete),
            tool(
                name="document_add",
                description=(
                    "Store a source document for asynchronous processing and automatic "
                    "memory extraction. Use when the user gives you raw content to "
                    "ingest (a pasted text blob, conversation transcript, notes, URL, "
                    "or article) rather than a single atomic fact; use add_memory for "
                    "one short generalizable sentence. Memories are extracted in the "
                    "background, so do not call add_memory for facts inside the document."
                ),
            )(self.document_add),
            tool(
                name="memory_forget",
                description=(
                    "Soft-delete a single extracted profile memory (a learned fact) so "
                    "it no longer appears in profile or search. This does not delete "
                    "source documents. Provide a memory_id from a search result "
                    "containing a memory, or memory_content for an exact text match. "
                    "Use document_delete to remove an entire source."
                ),
            )(self.memory_forget),
        ]

    async def _search_memories_tool(
        self,
        information_to_get: Annotated[
            str, "Terms to search for in stored memories and source content"
        ],
        limit: Annotated[int, "Maximum number of results to return"] = 10,
    ) -> str:
        """Model-facing search wrapper that omits deprecated arguments."""
        return await self.search_memories(
            information_to_get=information_to_get,
            limit=limit,
        )
