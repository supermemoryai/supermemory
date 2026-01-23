"""Supermemory Pipecat SDK - Memory-enhanced conversational AI pipelines.

This package provides seamless integration between Supermemory and Pipecat,
enabling persistent memory and context enhancement for voice AI applications.

Example:
    ```python
    from supermemory_pipecat import SupermemoryPipecatService

    # Create memory service
    memory = SupermemoryPipecatService(
        api_key=os.getenv("SUPERMEMORY_API_KEY"),
        user_id="user-123",
    )

    # Add to Pipecat pipeline
    pipeline = Pipeline([
        transport.input(),
        stt,
        user_context,
        memory,  # Automatically retrieves and injects memories
        llm,
        transport.output(),
    ])
    ```
"""

from .exceptions import (
    APIError,
    ConfigurationError,
    MemoryRetrievalError,
    MemoryStorageError,
    NetworkError,
    SupermemoryPipecatError,
)
from .service import SupermemoryPipecatService
from .utils import (
    deduplicate_memories,
    format_memories_to_text,
    get_last_user_message,
)

__version__ = "0.1.1"

__all__ = [
    # Main service
    "SupermemoryPipecatService",
    # Exceptions
    "SupermemoryPipecatError",
    "ConfigurationError",
    "MemoryRetrievalError",
    "MemoryStorageError",
    "APIError",
    "NetworkError",
    # Utilities
    "get_last_user_message",
    "deduplicate_memories",
    "format_memories_to_text",
]
