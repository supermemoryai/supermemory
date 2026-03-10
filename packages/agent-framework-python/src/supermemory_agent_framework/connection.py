"""Shared connection class for Supermemory Agent Framework integrations.

Provides a single connection object that holds the SDK client, container tag,
conversation ID, and entity context — shared across middleware, tools, and
context providers.
"""

import os
import uuid
from typing import Optional

import supermemory

from .exceptions import SupermemoryConfigurationError


class AgentSupermemory:
    """Shared Supermemory connection for middleware, tools, and context providers.

    Centralizes API client creation, container tag, conversation ID, and
    entity context so that all integration points share the same session.

    Example:
        ```python
        from supermemory_agent_framework import AgentSupermemory

        conn = AgentSupermemory(
            api_key="your-key",
            container_tag="user-123",
            entity_context="The user is a Python developer who prefers async code.",
        )
        ```
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        container_tag: str = "msft_agent_chat",
        entity_context: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> None:
        """Initialize the shared Supermemory connection.

        Args:
            api_key: Supermemory API key. Falls back to SUPERMEMORY_API_KEY env var.
            container_tag: Unique identifier for memory scope (e.g., user ID).
            entity_context: Custom context about the user/entity to prepend to memories.
            conversation_id: Conversation ID for grouping messages. Auto-generated if None.
        """
        resolved_api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not resolved_api_key:
            raise SupermemoryConfigurationError(
                "SUPERMEMORY_API_KEY environment variable is required but not set. "
                "Pass api_key parameter or set the environment variable."
            )

        self.client: supermemory.AsyncSupermemory = supermemory.AsyncSupermemory(
            api_key=resolved_api_key
        )
        self.container_tag: str = container_tag
        self.conversation_id: str = conversation_id or str(uuid.uuid4())
        self.custom_id: str = f"conversation_{self.conversation_id}"
        self.entity_context: Optional[str] = entity_context
