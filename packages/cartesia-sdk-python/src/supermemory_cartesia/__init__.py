"""Supermemory Cartesia SDK - Memory-enhanced voice agents with Cartesia Line.

This package provides seamless integration between Supermemory and Cartesia Line,
enabling persistent memory and context enhancement for voice AI applications.

Example:
    ```python
    import os

    from supermemory_cartesia import SupermemoryCartesiaAgent, MemoryConfig
    from line.llm_agent import LlmAgent, LlmConfig

    # Create base LLM agent
    base_agent = LlmAgent(
        model="gemini/gemini-2.5-flash-preview-09-2025",
        api_key=os.getenv("GEMINI_API_KEY"),
        config=LlmConfig(
            system_prompt="You are a helpful assistant.",
            introduction="Hello!"
        )
    )

    # Wrap with Supermemory
    memory_agent = SupermemoryCartesiaAgent(
        agent=base_agent,
        api_key=os.getenv("SUPERMEMORY_API_KEY"),
        container_tag="user-123",
        custom_id="conversation-456",
    )
    ```
"""

from .agent import SupermemoryCartesiaAgent

# Export MemoryConfig as a top-level class for convenience
MemoryConfig = SupermemoryCartesiaAgent.MemoryConfig

from .exceptions import (
    APIError,
    ConfigurationError,
    MemoryRetrievalError,
    MemoryStorageError,
    NetworkError,
    SupermemoryCartesiaError,
)
from .utils import (
    deduplicate_memories,
    format_memories_to_text,
    format_relative_time,
    get_last_user_message,
)

try:
    from importlib.metadata import PackageNotFoundError, version

    __version__ = version("supermemory-cartesia")
except PackageNotFoundError:
    # Source checkouts do not have installed distribution metadata.
    __version__ = "0.1.3"

__all__ = [
    # Main agent
    "SupermemoryCartesiaAgent",
    "MemoryConfig",
    # Exceptions
    "SupermemoryCartesiaError",
    "ConfigurationError",
    "MemoryRetrievalError",
    "MemoryStorageError",
    "APIError",
    "NetworkError",
    # Utilities
    "get_last_user_message",
    "deduplicate_memories",
    "format_memories_to_text",
    "format_relative_time",
]
