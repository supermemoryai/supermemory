"""Supermemory tools for Microsoft Agent Framework.

Provides FunctionTool-compatible tools that can be passed to Agent.run(tools=[...]).
"""

import json
import warnings
from typing import Annotated, Any, Optional, TypedDict

from agent_framework import FunctionTool, tool
from supermemory.types import SearchResponse

from .connection import AgentSupermemory
from .utils import _fetch_profile_and_search


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
            return _to_jsonable(model_dump())

    return value


def _serialize_search_results(response: SearchResponse) -> dict[str, Any]:
    """Keep the tool's legacy result fields while retaining v5 metadata."""
    results = [
        {
            "chunks": None,
            "context": None,
            "documents": None,
            "filepath": None,
            "is_aggregated": None,
            "root_memory_id": None,
            "version": None,
            **_to_jsonable(item),
            "updated_at": item.system.updated_at,
        }
        for item in response.results
    ]
    return {"results": results, "timing": response.search_time, "total": len(results)}


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
        source compatibility. This tool does not return full source documents.
        """
        if include_full_docs is not None:
            warnings.warn(
                "include_full_docs is deprecated and ignored; search_memories "
                "does not request full source documents",
                DeprecationWarning,
                stacklevel=2,
            )

        try:
            response = await self._client.search(
                self._connection.container_tag,
                query=information_to_get,
                limit=limit,
                threshold=0.6,
                search_mode="hybrid",
            )
            results = _serialize_search_results(response)["results"]
            result: MemorySearchResult = {
                "success": True,
                "results": results,
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
                self._connection.container_tag,
                content=memory,
                id=self._connection.custom_id,
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
            response, search = await _fetch_profile_and_search(
                self._client, self._connection.container_tag, query=query
            )
            result: dict[str, Any] = {
                "success": True,
                "profile": (
                    {
                        "static": [fact.memory for fact in response.profile.static],
                        "dynamic": [fact.memory for fact in response.profile.dynamic],
                        "buckets": {
                            name: [fact.memory for fact in facts]
                            for name, facts in response.profile.buckets.items()
                        },
                    }
                    if response
                    else None
                ),
                "search_results": _serialize_search_results(search) if search else None,
            }
            return json.dumps(result, default=str)
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
