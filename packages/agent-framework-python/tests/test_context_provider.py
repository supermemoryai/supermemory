"""Tests for Supermemory context provider."""

import pytest

from supermemory_agent_framework import AgentSupermemory, SupermemoryContextProvider


def _make_conn(**kwargs):
    kwargs.setdefault("api_key", "test-key")
    kwargs.setdefault("container_tag", "user-123")
    return AgentSupermemory(**kwargs)


class TestContextProviderConfiguration:
    def test_accepts_connection(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)
        assert provider._container_tag == "user-123"
        assert provider.source_id == "supermemory"

    def test_uses_connection_client(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)
        assert provider._client is conn.client

    def test_custom_source_id(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(
            conn, source_id="custom-source"
        )
        assert provider.source_id == "custom-source"

    def test_default_mode(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)
        assert provider._mode == "full"

    def test_custom_mode(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn, mode="profile")
        assert provider._mode == "profile"

    def test_store_conversations_default(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)
        assert provider._store_conversations is False

    def test_conversation_id_from_connection(self) -> None:
        conn = _make_conn(conversation_id="conv-xyz")
        provider = SupermemoryContextProvider(conn)
        assert provider._connection.conversation_id == "conv-xyz"
        assert provider._connection.custom_id == "conversation_conv-xyz"

    def test_entity_context_from_connection(self) -> None:
        conn = _make_conn(entity_context="User prefers TypeScript")
        provider = SupermemoryContextProvider(conn)
        assert provider._connection.entity_context == "User prefers TypeScript"


class TestExtractQuery:
    def test_dict_messages(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)

        class MockContext:
            input_messages = [
                {"role": "user", "content": "Hello!"},
                {"role": "assistant", "content": "Hi!"},
                {"role": "user", "content": "How are you?"},
            ]

        result = provider._extract_query_from_context(MockContext())
        assert result == "How are you?"

    def test_empty_messages(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)

        class MockContext:
            input_messages = []

        result = provider._extract_query_from_context(MockContext())
        assert result == ""

    def test_no_messages_attr(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)

        class MockContext:
            pass

        result = provider._extract_query_from_context(MockContext())
        assert result == ""


class TestExtractConversation:
    def test_basic_conversation(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)

        class MockContext:
            input_messages = [
                {"role": "user", "content": "Hello!"},
            ]
            response = None

        result = provider._extract_conversation_from_context(MockContext())
        assert "User: Hello!" in result

    def test_with_response(self) -> None:
        conn = _make_conn()
        provider = SupermemoryContextProvider(conn)

        class MockResponse:
            text = "Hi there!"

        class MockContext:
            input_messages = [
                {"role": "user", "content": "Hello!"},
            ]
            response = MockResponse()

        result = provider._extract_conversation_from_context(MockContext())
        assert "User: Hello!" in result
        assert "Assistant: Hi there!" in result
