"""Supermemory Cartesia SDK - Memory-enhanced voice agents with Cartesia Line.

This package provides seamless integration between Supermemory and Cartesia Line,
enabling persistent memory and context enhancement for voice AI applications.

Example:
    ```python
    from supermemory_cartesia import SupermemoryCartesiaAgent, MemoryConfig
    from line.llm_agent import LlmAgent, LlmConfig

    # Create base LLM agent
    base_agent = LlmAgent(
        model="gemini/gemini-2.5-flash-preview-09-2025",
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

__version__ = "0.1.0"

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
