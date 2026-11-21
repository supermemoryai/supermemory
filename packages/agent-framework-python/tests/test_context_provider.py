"""Tests for Supermemory context provider."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from agent_framework import Message, SessionContext

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
        provider = SupermemoryContextProvider(conn, source_id="custom-source")
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


class TestMemoryRetrieval:
    @pytest.mark.asyncio
    async def test_query_mode_keeps_search_fact_also_present_in_profile(self) -> None:
        fact = "User likes machine learning projects"
        conn = _make_conn()
        conn.client = SimpleNamespace(
            profile=AsyncMock(
                return_value=SimpleNamespace(
                    profile=SimpleNamespace(static=[fact], dynamic=[]),
                )
            ),
            search=AsyncMock(
                return_value=SimpleNamespace(results=[SimpleNamespace(memory=fact)])
            ),
        )
        provider = SupermemoryContextProvider(conn, mode="query")
        context = SessionContext(input_messages=[Message("user", ["machine learning"])])

        await provider.before_run(agent=None, session=None, context=context, state={})

        assert fact in context.input_messages[0].text
        conn.client.profile.assert_not_awaited()
        conn.client.search.assert_awaited_once_with(
            "user-123", query="machine learning", threshold=0.6, search_mode="memories"
        )

    @pytest.mark.asyncio
    async def test_profile_in_instructions_once_and_search_on_user_turns(self) -> None:
        conn = _make_conn()
        conn.client = SimpleNamespace(
            profile=AsyncMock(
                return_value=SimpleNamespace(
                    profile=SimpleNamespace(static=["Prefers Python"], dynamic=[])
                )
            ),
            search=AsyncMock(
                return_value=SimpleNamespace(
                    results=[
                        SimpleNamespace(memory="Prefers Python"),
                        SimpleNamespace(memory="Lives in Lisbon"),
                    ]
                )
            ),
        )
        provider = SupermemoryContextProvider(conn, mode="full")
        state: dict = {}
        first = SessionContext(input_messages=[Message("user", ["hello"])])
        await provider.before_run(agent=None, session=None, context=first, state=state)
        turn_one = first.input_messages[0]
        assert len(first.instructions) == 1
        assert "Prefers Python" in first.instructions[0]
        assert "Prefers Python" not in turn_one.text
        assert "Lives in Lisbon" in turn_one.text

        second = SessionContext(
            input_messages=[Message("user", ["where do I live?"])],
            context_messages={"in_memory": [turn_one, Message("assistant", ["Hi"])]},
        )
        await provider.before_run(agent=None, session=None, context=second, state=state)
        assert second.instructions == first.instructions
        assert second.context_messages["in_memory"][0] is turn_one
        assert "Lives in Lisbon" in second.input_messages[0].text
        assert "Prefers Python" not in second.input_messages[0].text

        service_history = SessionContext(input_messages=[Message("user", ["more"])])
        await provider.before_run(
            agent=None, session=None, context=service_history, state=state
        )
        assert service_history.instructions == first.instructions
        assert conn.client.profile.await_count == 1
        assert conn.client.search.await_count == 3

    @pytest.mark.asyncio
    async def test_failed_profile_is_retried_on_next_turn(self) -> None:
        conn = _make_conn()
        conn.client = SimpleNamespace(
            profile=AsyncMock(side_effect=RuntimeError("down")),
            search=AsyncMock(
                return_value=SimpleNamespace(results=[SimpleNamespace(memory="Fact")])
            ),
        )
        provider = SupermemoryContextProvider(conn, mode="full")
        state: dict = {}
        first = SessionContext(input_messages=[Message("user", ["hello"])])
        await provider.before_run(agent=None, session=None, context=first, state=state)
        assert not first.instructions
        assert "Fact" in first.input_messages[0].text
        assert state == {}

        conn.client.profile = AsyncMock(
            return_value=SimpleNamespace(
                profile=SimpleNamespace(static=["Prefers Python"], dynamic=[])
            )
        )
        second = SessionContext(input_messages=[Message("user", ["again"])])
        await provider.before_run(agent=None, session=None, context=second, state=state)
        assert "Prefers Python" in second.instructions[0]
        assert "Prefers Python" not in second.input_messages[0].text
        assert state == {"profile_block": second.instructions[0]}
