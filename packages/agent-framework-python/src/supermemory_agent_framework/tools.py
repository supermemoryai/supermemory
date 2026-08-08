"""Supermemory tools for Microsoft Agent Framework.

Provides FunctionTool-compatible tools that can be passed to Agent.run(tools=[...]).
"""

import json
from typing import Annotated, Any, TypedDict

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
            str, "Terms to search for in the user's memories"
        ],
        include_full_docs: Annotated[
            bool,
            "Whether to include full document content. Defaults to true for better AI context.",
        ] = True,
        limit: Annotated[int, "Maximum number of results to return"] = 10,
    ) -> str:
        """Search stored memories for facts, preferences, history, and context. Use proactively before answering whenever memory could help — not only when explicitly asked."""
        try:
            response = await self._client.search.memories(
                q=information_to_get,
                container_tags=[self._connection.container_tag],
                limit=limit,
                threshold=0.6,
                search_mode="hybrid",
            )
            results = response.results or []
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
                content=memory,
                container_tag=self._connection.container_tag,
                custom_id=self._connection.custom_id,
            )
            result: MemoryAddResult = {
                "success": True,
                "memory": response,
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
                "profile": response.profile if hasattr(response, "profile") else None,
                "search_results": (
                    response.search_results
                    if hasattr(response, "search_results")
                    else None
                ),
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
                    "Search (recall) stored memories for facts, preferences, history, and context "
                    "about the user or any topic. Use proactively before answering whenever memory "
                    "could help — do not wait for the user to explicitly ask you to search or recall."
                ),
            )(self.search_memories),
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
