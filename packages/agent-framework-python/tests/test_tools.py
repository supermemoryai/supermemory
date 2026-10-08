"""Tests for Supermemory tools."""

import pytest

from supermemory_agent_framework import AgentSupermemory, SupermemoryTools


def _make_conn(**kwargs):
    kwargs.setdefault("api_key", "test-key")
    kwargs.setdefault("container_tag", "msft_agent_chat")
    return AgentSupermemory(**kwargs)


class TestSupermemoryTools:
    def test_create_tools_instance(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        assert tools._connection.container_tag == "msft_agent_chat"

    def test_create_tools_with_custom_tag(self) -> None:
        conn = _make_conn(container_tag="custom-tag")
        tools = SupermemoryTools(conn)
        assert tools._connection.container_tag == "custom-tag"

    def test_get_tools_returns_list(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        result = tools.get_tools()
        assert isinstance(result, list)
        assert len(result) == 3

    def test_get_tools_names(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        result = tools.get_tools()
        names = [t.name for t in result]
        assert "search_memories" in names
        assert "add_memory" in names
        assert "get_profile" in names

    def test_uses_connection_client(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        assert tools._client is conn.client

    def test_shares_custom_id_with_connection(self) -> None:
        conn = _make_conn(conversation_id="conv-123")
        tools = SupermemoryTools(conn)
        assert tools._connection.custom_id == "conversation_conv-123"


class _RecordingClient:
    def __init__(self) -> None:
        self.add_calls: list[dict] = []

    async def add(self, **kwargs):
        self.add_calls.append(kwargs)
        return {"id": f"doc-{len(self.add_calls)}", "status": "queued"}


class TestAddMemoryDocumentIdentity:
    @pytest.mark.asyncio
    async def test_add_memory_does_not_reuse_conversation_document_id(self) -> None:
        conn = _make_conn(conversation_id="conv-123")
        tools = SupermemoryTools(conn)
        client = _RecordingClient()
        tools._client = client

        await tools.add_memory("The user likes green tea.")
        await tools.add_memory("The user lives in Lisbon.")

        assert len(client.add_calls) == 2
        # A shared custom_id makes Supermemory treat every call as an update of one
        # document, so the second memory replaces the first and both collide with the
        # conversation transcript saved under the same id.
        assert all(call.get("custom_id") != conn.custom_id for call in client.add_calls)
        assert all(call["container_tag"] == "msft_agent_chat" for call in client.add_calls)
