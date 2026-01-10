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

from .service import SupermemoryPipecatService
from .exceptions import (
    SupermemoryPipecatError,
    ConfigurationError,
    MemoryRetrievalError,
    MemoryStorageError,
    APIError,
    NetworkError,
)
from .utils import (
    get_last_user_message,
    deduplicate_memories,
    format_memories_to_text,
)

__version__ = "0.1.0"

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
