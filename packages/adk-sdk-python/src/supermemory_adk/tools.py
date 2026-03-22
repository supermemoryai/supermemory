"""Supermemory tools for ADK function calling.

This module provides memory tools that integrate with Google's Agent Development Kit (ADK).
Simple one-function API: just call supermemory_tools() and get a list of ready-to-use tools.
"""

import os
from typing import Any, Optional

try:
    import supermemory
except ImportError:
    supermemory = None  # type: ignore

from .exceptions import SupermemoryConfigurationError
from .utils import Logger, create_logger


def supermemory_tools(
    api_key: Optional[str] = None,
    container_tags: Optional[list[str]] = None,
    project_id: Optional[str] = None,
    base_url: Optional[str] = None,
    verbose: bool = False,
) -> list:
    """Create Supermemory tools for ADK agents.

    Returns a list of tool functions ready to use with ADK Agent.

    Args:
        api_key: Supermemory API key (falls back to SUPERMEMORY_API_KEY env var)
        container_tags: Container tags for memory scoping
        project_id: Project ID for memory scoping (alternative to container_tags)
        base_url: Optional custom base URL
        verbose: Enable verbose logging

    Returns:
        List of tool functions [search_memories, add_memory, get_memory_profile]

    Raises:
        SupermemoryConfigurationError: If API key is missing or configuration is invalid

    Example:
        ```python
        from google.adk.agents import Agent
        from supermemory_adk import supermemory_tools

        # Create agent with Supermemory tools
        root_agent = Agent(
            model='gemini-2.5-flash',
            tools=supermemory_tools(
                api_key="your-api-key",
                container_tags=["user-123"]
            ),
            instruction="Use memory tools when needed"
        )
        ```
    """
    # Resolve API key
    resolved_api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
    if not resolved_api_key:
        raise SupermemoryConfigurationError(
            "API key is required. Provide api_key parameter or set SUPERMEMORY_API_KEY environment variable."
        )

    # Validate configuration
    if project_id and container_tags:
        raise SupermemoryConfigurationError(
            "Cannot specify both project_id and container_tags. Choose one."
        )

    # Set container tags
    if project_id:
        resolved_container_tags = [f"sm_project_{project_id}"]
    elif container_tags:
        resolved_container_tags = container_tags
    else:
        resolved_container_tags = ["sm_project_default"]

    # Initialize Supermemory client
    if supermemory is None:
        raise SupermemoryConfigurationError(
            "supermemory package is required but not found. "
            "Install with: pip install supermemory"
        )

    try:
        client_kwargs = {"api_key": resolved_api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = supermemory.Supermemory(**client_kwargs)
        logger: Logger = create_logger(verbose)
        logger.info("Supermemory tools initialized", {"container_tags": resolved_container_tags})
    except Exception as e:
        raise SupermemoryConfigurationError(f"Failed to initialize Supermemory client: {e}", e)

    # Define tool functions with closure over client and config
    async def search_memories(
        information_to_get: str,
        include_full_docs: bool = True,
        limit: int = 10,
    ) -> dict[str, Any]:
        """Search for memories using semantic search.

        Args:
            information_to_get: Search query for retrieving memories
            include_full_docs: Whether to include full document content
            limit: Maximum number of results to return

        Returns:
            Dictionary with search results: {success, results, count} or {success, error}
        """
        try:
            logger.info(
                "Searching memories",
                {
                    "query": information_to_get[:100],
                    "limit": limit,
                    "container_tags": resolved_container_tags,
                },
            )

            response = await client.search.execute(
                q=information_to_get,
                container_tags=resolved_container_tags,
                limit=limit,
                chunk_threshold=0.6,
                include_full_docs=include_full_docs,
            )

            results = response.results if hasattr(response, "results") else []
            logger.info("Memory search completed", {"count": len(results)})

            return {
                "success": True,
                "results": results,
                "count": len(results),
            }

        except (OSError, ConnectionError) as network_error:
            error_msg = f"Network error: {network_error}"
            logger.error("Network error during memory search", {"error": str(network_error)})
            return {"success": False, "error": error_msg}

        except Exception as error:
            error_msg = f"Memory search failed: {error}"
            logger.error("Memory search failed", {"error": str(error)})
            return {"success": False, "error": error_msg}

    async def add_memory(memory: str) -> dict[str, Any]:
        """Add a new memory to Supermemory.

        Args:
            memory: The memory content to add (should be a single fact or short paragraph)

        Returns:
            Dictionary with add result: {success, memory_id} or {success, error}
        """
        try:
            logger.info(
                "Adding memory",
                {
                    "content_length": len(memory),
                    "container_tags": resolved_container_tags,
                },
            )

            add_params = {
                "content": memory,
                "container_tags": resolved_container_tags,
            }

            response = await client.add(**add_params)
            memory_id = response.id if hasattr(response, "id") else "unknown"

            logger.info("Memory added successfully", {"memory_id": memory_id})

            return {
                "success": True,
                "memory_id": memory_id,
            }

        except (OSError, ConnectionError) as network_error:
            error_msg = f"Network error: {network_error}"
            logger.error("Network error during memory add", {"error": str(network_error)})
            return {"success": False, "error": error_msg}

        except Exception as error:
            error_msg = f"Memory add failed: {error}"
            logger.error("Memory add failed", {"error": str(error)})
            return {"success": False, "error": error_msg}

    async def get_memory_profile(query: Optional[str] = None) -> dict[str, Any]:
        """Get user's memory profile (static and dynamic memories).

        Args:
            query: Optional search query for retrieving relevant memories

        Returns:
            Dictionary with profile data: {success, profile, search_results} or {success, error}
        """
        try:
            logger.info(
                "Fetching memory profile",
                {
                    "has_query": query is not None,
                    "container_tags": resolved_container_tags,
                },
            )

            kwargs: dict[str, Any] = {"container_tag": resolved_container_tags[0]}

            if query:
                kwargs["q"] = query
                kwargs["threshold"] = 0.1
                kwargs["extra_body"] = {"limit": 10}

            response = await client.profile(**kwargs)

            profile = {
                "static": response.profile.static if hasattr(response, "profile") else [],
                "dynamic": response.profile.dynamic if hasattr(response, "profile") else [],
            }

            search_results = []
            if hasattr(response, "search_results") and response.search_results:
                if hasattr(response.search_results, "results"):
                    search_results = response.search_results.results

            logger.info(
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
            logger.error("Network error during profile fetch", {"error": str(network_error)})
            return {"success": False, "error": error_msg}

        except Exception as error:
            error_msg = f"Profile fetch failed: {error}"
            logger.error("Profile fetch failed", {"error": str(error)})
            return {"success": False, "error": error_msg}

    # Add docstrings as tool descriptions for ADK
    search_memories.__doc__ = "Search (recall) memories/details/information about the user or other facts. Use when explicitly asked or when context about user's past choices would be helpful."
    add_memory.__doc__ = "Add (remember) memories/details/information about the user or other facts. Use when user shares information that should be remembered for future conversations."
    get_memory_profile.__doc__ = "Get user's memory profile including static facts and dynamic context. Use at conversation start or when needing full user context."

    # Return list of tool functions
    return [search_memories, add_memory, get_memory_profile]
