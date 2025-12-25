"""Supermemory OpenAI SDK - Memory tools and middleware for OpenAI function calling."""

from .tools import (
    SupermemoryTools,
    SupermemoryToolsConfig,
    MemoryObject,
    MemorySearchResult,
    MemoryAddResult,
    SearchMemoriesTool,
    AddMemoryTool,
    MEMORY_TOOL_SCHEMAS,
    create_supermemory_tools,
    get_memory_tool_definitions,
    execute_memory_tool_calls,
    create_search_memories_tool,
    create_add_memory_tool,
)

from .middleware import (
    with_supermemory,
    OpenAIMiddlewareOptions,
    SupermemoryOpenAIWrapper,
)

from .utils import (
    Logger,
    create_logger,
    get_last_user_message,
    get_conversation_content,
    convert_profile_to_markdown,
    deduplicate_memories,
    DeduplicatedMemories,
)

from .exceptions import (
    SupermemoryError,
    SupermemoryConfigurationError,
    SupermemoryAPIError,
    SupermemoryMemoryOperationError,
    SupermemoryTimeoutError,
    SupermemoryNetworkError,
)

__all__ = [
    # Tools
    "SupermemoryTools",
    "SupermemoryToolsConfig",
    "MemoryObject",
    "MemorySearchResult",
    "MemoryAddResult",
    "SearchMemoriesTool",
    "AddMemoryTool",
    "MEMORY_TOOL_SCHEMAS",
    "create_supermemory_tools",
    "get_memory_tool_definitions",
    "execute_memory_tool_calls",
    "create_search_memories_tool",
    "create_add_memory_tool",
    # Middleware
    "with_supermemory",
    "OpenAIMiddlewareOptions",
    "SupermemoryOpenAIWrapper",
    # Utils
    "Logger",
    "create_logger",
    "get_last_user_message",
    "get_conversation_content",
    "convert_profile_to_markdown",
    "deduplicate_memories",
    "DeduplicatedMemories",
    # Exceptions
    "SupermemoryError",
    "SupermemoryConfigurationError",
    "SupermemoryAPIError",
    "SupermemoryMemoryOperationError",
    "SupermemoryTimeoutError",
    "SupermemoryNetworkError",
]
