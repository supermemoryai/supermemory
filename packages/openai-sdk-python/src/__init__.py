"""Supermemory OpenAI SDK - Enhanced OpenAI Python SDK with infinite context."""

from .infinite_chat import (
    SupermemoryOpenAI,
    SupermemoryInfiniteChatConfig,
    SupermemoryInfiniteChatConfigWithProviderName,
    SupermemoryInfiniteChatConfigWithProviderUrl,
    ProviderName,
    PROVIDER_MAP,
    create_supermemory_openai,
)

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

__version__ = "0.1.0"

__all__ = [
    # Infinite Chat
    "SupermemoryOpenAI",
    "SupermemoryInfiniteChatConfig",
    "SupermemoryInfiniteChatConfigWithProviderName",
    "SupermemoryInfiniteChatConfigWithProviderUrl",
    "ProviderName",
    "PROVIDER_MAP",
    "create_supermemory_openai",
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
]
