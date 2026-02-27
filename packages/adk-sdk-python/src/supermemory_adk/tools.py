"""Supermemory tools for ADK function calling.

This module provides memory tools that integrate with Google's Agent Development Kit (ADK).
Tools follow ADK best practices: return dict for LLM context, use ToolContext for state.
"""

import os
from typing import Any, Optional

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore

from .exceptions import (
    SupermemoryConfigurationError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
    SupermemoryToolError,
)
from .utils import Logger, create_logger


class SupermemoryTools:
    """Supermemory tools for ADK agents.

    Provides memory search, add, and profile retrieval capabilities as ADK-compatible tools.

    Example:
        ```python
        from google.adk.agents import Agent
        from supermemory_adk import create_supermemory_tools

        tools = create_supermemory_tools(
            api_key="your-api-key",
            container_tags=["user-123"]
        )

        root_agent = Agent(
            model='gemini-2.5-flash',
            tools=[tools.search_memories, tools.add_memory],
            instruction="Use memory tools when needed"
        )
        ```
    """

    def __init__(
        self,
        api_key: str,
        container_tags: Optional[list[str]] = None,
        project_id: Optional[str] = None,
        base_url: Optional[str] = None,
        verbose: bool = False,
    ):
        """Initialize Supermemory tools.

        Args:
            api_key: Supermemory API key
            container_tags: Container tags for memory scoping (cannot be used with project_id)
            project_id: Project ID for memory scoping (cannot be used with container_tags)
            base_url: Optional custom base URL for Supermemory API
            verbose: Enable verbose logging

        Raises:
            SupermemoryConfigurationError: If configuration is invalid
        """
        if not api_key:
            raise SupermemoryConfigurationError("API key is required")

        if project_id and container_tags:
            raise SupermemoryConfigurationError(
                "Cannot specify both project_id and container_tags. Choose one."
            )

        self.api_key = api_key
        self.base_url = base_url
        self.verbose = verbose
        self.logger: Logger = create_logger(verbose)

        # Set container tags
        if project_id:
            self.container_tags = [f"sm_project_{project_id}"]
        elif container_tags:
            self.container_tags = container_tags
        else:
            self.container_tags = ["sm_project_default"]

        # Initialize Supermemory client
        if supermemory is None:
            raise SupermemoryConfigurationError(
                "supermemory package is required but not found. "
                "Install with: pip install supermemory"
            )

        try:
            client_kwargs = {"api_key": api_key}
            if base_url:
                client_kwargs["base_url"] = base_url

            self.client = supermemory.Supermemory(**client_kwargs)
            self.logger.info("Supermemory client initialized", {"container_tags": self.container_tags})
        except Exception as e:
            raise SupermemoryConfigurationError(f"Failed to initialize Supermemory client: {e}", e)

    async def search_memories(
        self,
        information_to_get: str,
        include_full_docs: bool = True,
        limit: int = 10,
    ) -> dict[str, Any]:
        """Search for memories using semantic search.

        This tool is designed to be used by ADK agents via function calling.
        Returns a dict (ADK best practice) with search results.

        Args:
            information_to_get: Search query for retrieving memories
            include_full_docs: Whether to include full document content
            limit: Maximum number of results to return

        Returns:
            Dictionary with search results:
            {
                "success": bool,
                "results": list of memory objects (if success),
                "count": int number of results (if success),
                "error": str error message (if failure)
            }
        """
        try:
            self.logger.info(
                "Searching memories",
                {
                    "query": information_to_get[:100],
                    "limit": limit,
                    "container_tags": self.container_tags,
                },
            )

            response = await self.client.search.execute(
                q=information_to_get,
                container_tags=self.container_tags,
                limit=limit,
                chunk_threshold=0.6,
                include_full_docs=include_full_docs,
            )

            results = response.results if hasattr(response, "results") else []

            self.logger.info("Memory search completed", {"count": len(results)})

            return {
                "success": True,
                "results": results,
                "count": len(results),
            }

        except (OSError, ConnectionError) as network_error:
            error_msg = f"Network error: {network_error}"
            self.logger.error("Network error during memory search", {"error": str(network_error)})
            return {
                "success": False,
                "error": error_msg,
            }

        except Exception as error:
            error_msg = f"Memory search failed: {error}"
            self.logger.error("Memory search failed", {"error": str(error)})
            return {
                "success": False,
                "error": error_msg,
            }

    async def add_memory(self, memory: str) -> dict[str, Any]:
        """Add a new memory to Supermemory.

        This tool is designed to be used by ADK agents via function calling.
        Returns a dict (ADK best practice) with the result.

        Args:
            memory: The memory content to add (should be a single fact or short paragraph)

        Returns:
            Dictionary with add result:
            {
                "success": bool,
                "memory_id": str ID of created memory (if success),
                "error": str error message (if failure)
            }
        """
        try:
            self.logger.info(
                "Adding memory",
                {
                    "content_length": len(memory),
                    "container_tags": self.container_tags,
                },
            )

            add_params = {
                "content": memory,
                "container_tags": self.container_tags,
            }

            response = await self.client.add(**add_params)
            memory_id = response.id if hasattr(response, "id") else "unknown"

            self.logger.info("Memory added successfully", {"memory_id": memory_id})

            return {
                "success": True,
                "memory_id": memory_id,
            }

        except (OSError, ConnectionError) as network_error:
            error_msg = f"Network error: {network_error}"
            self.logger.error("Network error during memory add", {"error": str(network_error)})
            return {
                "success": False,
                "error": error_msg,
            }

        except Exception as error:
            error_msg = f"Memory add failed: {error}"
            self.logger.error("Memory add failed", {"error": str(error)})
            return {
                "success": False,
                "error": error_msg,
            }

    async def get_memory_profile(self, query: Optional[str] = None) -> dict[str, Any]:
        """Get user's memory profile (static and dynamic memories).

        This tool retrieves the user's profile including static facts and dynamic context.
        Optionally performs semantic search if a query is provided.

        Returns a dict (ADK best practice) with profile data.

        Args:
            query: Optional search query for retrieving relevant memories

        Returns:
            Dictionary with profile data:
            {
                "success": bool,
                "profile": {
                    "static": list of static memories,
                    "dynamic": list of dynamic memories
                },
                "search_results": list of search results (if query provided),
                "error": str error message (if failure)
            }
        """
        try:
            self.logger.info(
                "Fetching memory profile",
                {
                    "has_query": query is not None,
                    "container_tags": self.container_tags,
                },
            )

            kwargs: dict[str, Any] = {"container_tag": self.container_tags[0]}

            if query:
                kwargs["q"] = query
                kwargs["threshold"] = 0.1
                kwargs["extra_body"] = {"limit": 10}

            response = await self.client.profile(**kwargs)

            profile = {
                "static": response.profile.static if hasattr(response, "profile") else [],
                "dynamic": response.profile.dynamic if hasattr(response, "profile") else [],
            }

            search_results = []
            if hasattr(response, "search_results") and response.search_results:
                if hasattr(response.search_results, "results"):
                    search_results = response.search_results.results

            self.logger.info(
                "Memory profile retrieved",
                {
                    "static_count": len(profile["static"]),
                    "dynamic_count": len(profile["dynamic"]),
                    "search_count": len(search_results),
                },
            )

            return {
                "success": True,
                "profile": profile,
                "search_results": search_results,
            }

        except (OSError, ConnectionError) as network_error:
            error_msg = f"Network error: {network_error}"
            self.logger.error("Network error during profile fetch", {"error": str(network_error)})
            return {
                "success": False,
                "error": error_msg,
            }

        except Exception as error:
            error_msg = f"Profile fetch failed: {error}"
            self.logger.error("Profile fetch failed", {"error": str(error)})
            return {
                "success": False,
                "error": error_msg,
            }


def create_supermemory_tools(
    api_key: Optional[str] = None,
    container_tags: Optional[list[str]] = None,
    project_id: Optional[str] = None,
    base_url: Optional[str] = None,
    verbose: bool = False,
) -> SupermemoryTools:
    """Create Supermemory tools for ADK agents.

    Helper function to create a SupermemoryTools instance with automatic API key resolution.

    Args:
        api_key: Supermemory API key (falls back to SUPERMEMORY_API_KEY env var)
        container_tags: Container tags for memory scoping
        project_id: Project ID for memory scoping (alternative to container_tags)
        base_url: Optional custom base URL
        verbose: Enable verbose logging

    Returns:
        SupermemoryTools instance ready to use with ADK agents

    Raises:
        SupermemoryConfigurationError: If API key is missing or configuration is invalid

    Example:
        ```python
        tools = create_supermemory_tools(
            container_tags=["user-123"],
            verbose=True
        )

        root_agent = Agent(
            model='gemini-2.5-flash',
            tools=[tools.search_memories, tools.add_memory]
        )
        ```
    """
    resolved_api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")

    if not resolved_api_key:
        raise SupermemoryConfigurationError(
            "API key is required. Provide api_key parameter or set SUPERMEMORY_API_KEY environment variable."
        )

    return SupermemoryTools(
        api_key=resolved_api_key,
        container_tags=container_tags,
        project_id=project_id,
        base_url=base_url,
        verbose=verbose,
    )
