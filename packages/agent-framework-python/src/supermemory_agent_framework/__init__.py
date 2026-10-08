"""Supermemory Agent Framework - Memory tools and middleware for Microsoft Agent Framework."""

from .connection import (
    AgentSupermemory,
)
from .context_provider import (
    SupermemoryContextProvider,
)
from .exceptions import (
    SupermemoryAPIError,
    SupermemoryConfigurationError,
    SupermemoryError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
    SupermemoryTimeoutError,
)
from .middleware import (
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
)
from .tools import (
    MemoryAddResult,
    MemorySearchResult,
    ProfileResult,
    SupermemoryTools,
)
from .utils import (
    DeduplicatedMemories,
    Logger,
    convert_profile_to_markdown,
    create_logger,
    deduplicate_memories,
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
