"""Shared connection class for Supermemory Agent Framework integrations.

Provides a single connection object that holds the SDK client, container tag,
conversation ID, and entity context — shared across middleware, tools, and
context providers.
"""

import os
import uuid
from typing import Any, Optional

import supermemory

from .exceptions import SupermemoryConfigurationError
from .utils import RECALL_TIMEOUT, sm_headers


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
        base_url: Optional[str] = None,
    ) -> None:
        """Initialize the shared Supermemory connection.

        Args:
            api_key: Supermemory API key. Falls back to SUPERMEMORY_API_KEY env var.
            container_tag: Unique identifier for memory scope (e.g., user ID).
            entity_context: Custom context about the user/entity to prepend to memories.
            conversation_id: Conversation ID for grouping messages. Auto-generated if None.
            base_url: Supermemory API base URL. Falls back to the SDK default.
        """
        resolved_api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not resolved_api_key:
            raise SupermemoryConfigurationError(
                "SUPERMEMORY_API_KEY environment variable is required but not set. "
                "Pass api_key parameter or set the environment variable."
            )

        self.client: supermemory.AsyncSupermemory = supermemory.AsyncSupermemory(
            api_key=resolved_api_key, base_url=base_url, default_headers=sm_headers()
        )
        self.container_tag: str = container_tag
        self.conversation_id: str = conversation_id or str(uuid.uuid4())
        self.custom_id: str = f"conversation_{self.conversation_id}"
        self.entity_context: Optional[str] = entity_context
        self._recall_clients: tuple[Any, Any] = (None, None)

    # Derived lazily so a replaced `client` is honored; the shared client keeps SDK retries for writes.
    def recall_client(self) -> supermemory.AsyncSupermemory:
        """Return the client used for prompt-time recall.

        It is derived from ``client`` with ``max_retries=0``, a request timeout of
        ``RECALL_TIMEOUT`` seconds and the Supermemory attribution headers, so a slow
        or failing API can never hold a model call longer than the recall budget.
        The derived client shares ``client``'s HTTP connection pool and is rebuilt
        when ``client`` is replaced.

        Returns:
            The recall client, or ``client`` itself when it cannot derive copies.
        """
        source, derived = self._recall_clients
        if source is self.client:
            return derived
        with_options = getattr(self.client, "with_options", None)
        derived = (
            with_options(
                max_retries=0, timeout=RECALL_TIMEOUT, default_headers=sm_headers()
            )
            if with_options
            else self.client
        )
        self._recall_clients = (self.client, derived)
        return derived
