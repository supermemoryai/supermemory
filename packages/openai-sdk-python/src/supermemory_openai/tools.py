"""Supermemory tools for OpenAI function calling."""

import json
from typing import Dict, List, Optional, Union, TypedDict

from openai.types.chat import (
    ChatCompletionMessageToolCall,
    ChatCompletionToolMessageParam,
    ChatCompletionFunctionToolParam,
)
import supermemory
from supermemory.types import (
    MemoryAddResponse,
    MemoryGetResponse,
    SearchExecuteResponse,
)
from supermemory.types.search_execute_response import Result

from .exceptions import (
    SupermemoryConfigurationError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
)


class SupermemoryToolsConfig(TypedDict, total=False):
    """Configuration for Supermemory tools.

    Only one of `project_id` or `container_tags` can be provided.
    """

    base_url: Optional[str]
    container_tags: Optional[List[str]]
    project_id: Optional[str]


# Type aliases using inferred types from supermemory package
MemoryObject = Union[MemoryGetResponse, MemoryAddResponse]


class MemorySearchResult(TypedDict, total=False):
    """Result type for memory search operations."""

    success: bool
    results: Optional[List[Result]]
    count: Optional[int]
    error: Optional[str]


class MemoryAddResult(TypedDict, total=False):
    """Result type for memory add operations."""

    success: bool
    memory: Optional[MemoryAddResponse]
    error: Optional[str]


# Function schemas for OpenAI function calling
MEMORY_TOOL_SCHEMAS: Dict[str, ChatCompletionFunctionToolParam] = {
    "search_memories": {
        "name": "search_memories",
        "description": (
            "Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "information_to_get": {
                    "type": "string",
                    "description": "Terms to search for in the user's memories",
                },
                "include_full_docs": {
                    "type": "boolean",
                    "description": (
                        "Whether to include the full document content in the response. "
                        "Defaults to true for better AI context."
                    ),
                    "default": True,
                },
                "limit": {
                    "type": "number",
                    "description": "Maximum number of results to return",
                    "default": 10,
                },
            },
            "required": ["information_to_get"],
        },
    },
    "add_memory": {
        "name": "add_memory",
        "description": (
            "Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "memory": {
                    "type": "string",
                    "description": (
                        "The text content of the memory to add. This should be a "
                        "single sentence or a short paragraph."
                    ),
                },
            },
            "required": ["memory"],
        },
    },
}


class SupermemoryTools:
    """Create memory tool handlers for OpenAI function calling."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        """Initialize SupermemoryTools.

        Args:
            api_key: Supermemory API key
            config: Optional configuration
        """
        config = config or {}

        # Initialize Supermemory client
        client_kwargs = {"api_key": api_key}
        if config.get("base_url"):
            client_kwargs["base_url"] = config["base_url"]

        self.client = supermemory.Supermemory(**client_kwargs)

        # Set container tags
        if config.get("project_id"):
            self.container_tags = [f"sm_project_{config['project_id']}"]
        elif config.get("container_tags"):
            self.container_tags = config["container_tags"]
        else:
            self.container_tags = ["sm_project_default"]

    def get_tool_definitions(self) -> List[ChatCompletionFunctionToolParam]:
        """Get OpenAI function definitions for all memory tools.

        Returns:
            List of ChatCompletionToolParam definitions
        """
        return [
            {"type": "function", "function": MEMORY_TOOL_SCHEMAS["search_memories"]},
            {"type": "function", "function": MEMORY_TOOL_SCHEMAS["add_memory"]},
        ]

    async def execute_tool_call(self, tool_call: ChatCompletionMessageToolCall) -> str:
        """Execute a tool call based on the function name and arguments.

        Args:
            tool_call: The tool call from OpenAI

        Returns:
            JSON string result
        """
        function_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        if function_name == "search_memories":
            result = await self.search_memories(**args)
        elif function_name == "add_memory":
            result = await self.add_memory(**args)
        else:
            result = {
                "success": False,
                "error": f"Unknown function: {function_name}",
            }

        return json.dumps(result)

    async def search_memories(
        self,
        information_to_get: str,
        include_full_docs: bool = True,
        limit: int = 10,
    ) -> MemorySearchResult:
        """Search memories.

        Args:
            information_to_get: Terms to search for
            include_full_docs: Whether to include full document content
            limit: Maximum number of results

        Returns:
            MemorySearchResult
        """
        try:
            response: SearchExecuteResponse = await self.client.search.execute(
                q=information_to_get,
                container_tags=self.container_tags,
                limit=limit,
                chunk_threshold=0.6,
                include_full_docs=include_full_docs,
            )

            return MemorySearchResult(
                success=True,
                results=response.results,
                count=len(response.results),
            )
        except (OSError, ConnectionError) as network_error:
            return MemorySearchResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return MemorySearchResult(
                success=False,
                error=f"Memory search failed: {error}",
            )

    async def add_memory(self, memory: str) -> MemoryAddResult:
        """Add a memory.

        Args:
            memory: The memory content to add

        Returns:
            MemoryAddResult
        """
        try:
            metadata: Dict[str, object] = {}

            add_params = {
                "content": memory,
                "container_tags": self.container_tags,
            }
            if metadata:
                add_params["metadata"] = metadata

            response: MemoryAddResponse = await self.client.memories.add(**add_params)

            return MemoryAddResult(
                success=True,
                memory=response,
            )
        except (OSError, ConnectionError) as network_error:
            return MemoryAddResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return MemoryAddResult(
                success=False,
                error=f"Memory add failed: {error}",
            )


def create_supermemory_tools(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> SupermemoryTools:
    """Helper function to create SupermemoryTools instance.

    Args:
        api_key: Supermemory API key
        config: Optional configuration

    Returns:
        SupermemoryTools instance
    """
    return SupermemoryTools(api_key, config)


def get_memory_tool_definitions() -> List[ChatCompletionFunctionToolParam]:
    """Get OpenAI function definitions for memory tools.

    Returns:
        List of ChatCompletionToolParam definitions
    """
    return [
        {"type": "function", "function": MEMORY_TOOL_SCHEMAS["search_memories"]},
        {"type": "function", "function": MEMORY_TOOL_SCHEMAS["add_memory"]},
    ]


async def execute_memory_tool_calls(
    api_key: str,
    tool_calls: List[ChatCompletionMessageToolCall],
    config: Optional[SupermemoryToolsConfig] = None,
) -> List[ChatCompletionToolMessageParam]:
    """Execute tool calls from OpenAI function calling.

    Args:
        api_key: Supermemory API key
        tool_calls: List of tool calls from OpenAI
        config: Optional configuration

    Returns:
        List of tool message parameters
    """
    tools = SupermemoryTools(api_key, config)

    async def execute_single_call(
        tool_call: ChatCompletionMessageToolCall,
    ) -> ChatCompletionToolMessageParam:
        result = await tools.execute_tool_call(tool_call)
        return ChatCompletionToolMessageParam(
            tool_call_id=tool_call.id,
            role="tool",
            content=result,
        )

    # Execute all tool calls concurrently
    import asyncio

    results = await asyncio.gather(
        *[execute_single_call(tool_call) for tool_call in tool_calls]
    )

    return results


# Individual tool creators for more granular control
class SearchMemoriesTool:
    """Individual search memories tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = {
            "type": "function",
            "function": MEMORY_TOOL_SCHEMAS["search_memories"],
        }

    async def execute(
        self,
        information_to_get: str,
        include_full_docs: bool = True,
        limit: int = 10,
    ) -> MemorySearchResult:
        """Execute search memories."""
        return await self.tools.search_memories(
            information_to_get=information_to_get,
            include_full_docs=include_full_docs,
            limit=limit,
        )


class AddMemoryTool:
    """Individual add memory tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = {
            "type": "function",
            "function": MEMORY_TOOL_SCHEMAS["add_memory"],
        }

    async def execute(self, memory: str) -> MemoryAddResult:
        """Execute add memory."""
        return await self.tools.add_memory(memory=memory)


def create_search_memories_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> SearchMemoriesTool:
    """Create individual search memories tool.

    Args:
        api_key: Supermemory API key
        config: Optional configuration

    Returns:
        SearchMemoriesTool instance
    """
    return SearchMemoriesTool(api_key, config)


def create_add_memory_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> AddMemoryTool:
    """Create individual add memory tool.

    Args:
        api_key: Supermemory API key
        config: Optional configuration

    Returns:
        AddMemoryTool instance
    """
    return AddMemoryTool(api_key, config)
