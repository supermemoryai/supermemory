"""Supermemory Agent Framework - Memory tools and middleware for Microsoft Agent Framework."""

from .connection import (
    AgentSupermemory,
)

from .tools import (
    SupermemoryTools,
    MemorySearchResult,
    MemoryAddResult,
    ProfileResult,
)

from .middleware import (
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
)

from .context_provider import (
    SupermemoryContextProvider,
)

from .utils import (
    Logger,
    create_logger,
    deduplicate_memories,
    DeduplicatedMemories,
    convert_profile_to_markdown,
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
    "AgentSupermemory",
    "SupermemoryTools",
    "MemorySearchResult",
    "MemoryAddResult",
    "ProfileResult",
    "SupermemoryChatMiddleware",
    "SupermemoryMiddlewareOptions",
    "SupermemoryContextProvider",
    "Logger",
    "create_logger",
    "deduplicate_memories",
    "DeduplicatedMemories",
    "convert_profile_to_markdown",
    "SupermemoryError",
    "SupermemoryConfigurationError",
    "SupermemoryAPIError",
    "SupermemoryMemoryOperationError",
    "SupermemoryTimeoutError",
    "SupermemoryNetworkError",
]