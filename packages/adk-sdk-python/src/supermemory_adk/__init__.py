"""Supermemory ADK - Memory-enhanced AI agents with Google Agent Development Kit.

This package provides seamless integration between Supermemory and Google's Agent
Development Kit (ADK), enabling persistent memory and context enhancement for AI agents.

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

Example (Wrapper Mode):
    ```python
    from google.adk.agents import Agent
    from supermemory_adk import with_supermemory, MemoryMode

    # Create base agent
    base_agent = Agent(
        model='gemini-2.5-flash',
        instruction="You are a helpful assistant"
    )

    # Wrap with automatic memory injection
    root_agent = with_supermemory(
        base_agent,
        container_tag="user-123",
        mode=MemoryMode.FULL,
        auto_save=True
    )
    ```
"""

from .exceptions import (
    SupermemoryADKError,
    SupermemoryAPIError,
    SupermemoryConfigurationError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
    SupermemoryTimeoutError,
    SupermemoryToolError,
)
from .tools import supermemory_tools
from .utils import (
    DeduplicatedMemories,
    Logger,
    create_logger,
    deduplicate_memories,
    format_memories_to_markdown,
    format_memories_to_text,
)

__version__ = "0.1.0"

__all__ = [
    # Version
    "__version__",
    # Exceptions
    "SupermemoryADKError",
    "SupermemoryConfigurationError",
    "SupermemoryAPIError",
    "SupermemoryMemoryOperationError",
    "SupermemoryNetworkError",
    "SupermemoryTimeoutError",
    "SupermemoryToolError",
    # Utils
    "Logger",
    "create_logger",
    "DeduplicatedMemories",
    "deduplicate_memories",
    "format_memories_to_markdown",
    "format_memories_to_text",
    # Tools
    "supermemory_tools",
]
