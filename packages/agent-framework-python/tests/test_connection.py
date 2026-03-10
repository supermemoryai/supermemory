"""Tests for AgentSupermemory connection class."""

import os
from unittest.mock import patch

import pytest

from supermemory_agent_framework import AgentSupermemory, SupermemoryConfigurationError


class TestAgentSupermemory:
    def test_requires_api_key(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("SUPERMEMORY_API_KEY", None)
            with pytest.raises(SupermemoryConfigurationError):
                AgentSupermemory()

    def test_accepts_api_key_param(self) -> None:
        conn = AgentSupermemory(api_key="test-key")
        assert conn.client is not None

    @patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "env-key"})
    def test_reads_env_api_key(self) -> None:
        conn = AgentSupermemory()
        assert conn.client is not None

    def test_default_container_tag(self) -> None:
        conn = AgentSupermemory(api_key="test-key")
        assert conn.container_tag == "msft_agent_chat"

    def test_custom_container_tag(self) -> None:
        conn = AgentSupermemory(api_key="test-key", container_tag="user-123")
        assert conn.container_tag == "user-123"

    def test_auto_generates_conversation_id(self) -> None:
        conn = AgentSupermemory(api_key="test-key")
        assert conn.conversation_id is not None
        assert len(conn.conversation_id) > 0
        assert conn.custom_id == f"conversation_{conn.conversation_id}"

    def test_custom_conversation_id(self) -> None:
        conn = AgentSupermemory(api_key="test-key", conversation_id="conv-abc")
        assert conn.conversation_id == "conv-abc"
        assert conn.custom_id == "conversation_conv-abc"

    def test_entity_context(self) -> None:
        conn = AgentSupermemory(
            api_key="test-key",
            entity_context="User is a Python developer",
        )
        assert conn.entity_context == "User is a Python developer"

    def test_entity_context_default_none(self) -> None:
        conn = AgentSupermemory(api_key="test-key")
        assert conn.entity_context is None

    def test_shared_client_instance(self) -> None:
        conn = AgentSupermemory(api_key="test-key")
        # Client should be the same object
        assert conn.client is conn.client
