"""Tests for Supermemory middleware."""

import asyncio
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
)
from supermemory_agent_framework.middleware import (
    _build_memories_text,
    _get_conversation_content,
    _get_last_user_message,
)


def _fake_client(fact: str = "Prefers Python") -> SimpleNamespace:
    return SimpleNamespace(
        profile=AsyncMock(
            return_value=SimpleNamespace(
                profile=SimpleNamespace(static=[fact], dynamic=[])
            )
        ),
        search=AsyncMock(
            side_effect=lambda tag, query, **kwargs: SimpleNamespace(
                results=[SimpleNamespace(memory=f"Asked about {query}")]
            )
        ),
    )


def _make_conn(**kwargs):
    kwargs.setdefault("api_key", "test-key")
    kwargs.setdefault("container_tag", "user-123")
    return AgentSupermemory(**kwargs)


class TestGetLastUserMessage:
    def test_dict_messages(self) -> None:
        messages = [
            {"role": "system", "content": "You are helpful."},
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "How are you?"},
        ]
        assert _get_last_user_message(messages) == "How are you?"

    def test_no_user_message(self) -> None:
        messages = [
            {"role": "system", "content": "You are helpful."},
            {"role": "assistant", "content": "Hi!"},
        ]
        assert _get_last_user_message(messages) == ""

    def test_empty_messages(self) -> None:
        assert _get_last_user_message([]) == ""
        assert _get_last_user_message(None) == ""

    def test_content_parts(self) -> None:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Hello"},
                    {"type": "text", "text": "world"},
                ],
            }
        ]
        assert _get_last_user_message(messages) == "Hello world"


class TestGetConversationContent:
    def test_basic_conversation(self) -> None:
        messages = [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "How are you?"},
        ]
        result = _get_conversation_content(messages)
        assert "User: Hello!" in result
        assert "Assistant: Hi there!" in result
        assert "User: How are you?" in result


class TestMiddlewareOptions:
    def test_defaults(self) -> None:
        options = SupermemoryMiddlewareOptions()
        assert options.verbose is False
        assert options.mode == "profile"
        assert options.add_memory == "never"

    def test_custom_options(self) -> None:
        options = SupermemoryMiddlewareOptions(
            verbose=True,
            mode="full",
            add_memory="always",
        )
        assert options.verbose is True
        assert options.mode == "full"
        assert options.add_memory == "always"


class TestMiddlewareConfiguration:
    def test_accepts_connection(self) -> None:
        conn = _make_conn()
        middleware = SupermemoryChatMiddleware(conn)
        assert middleware._container_tag == "user-123"

    def test_uses_connection_client(self) -> None:
        conn = _make_conn()
        middleware = SupermemoryChatMiddleware(conn)
        assert middleware._supermemory_client is conn.client

    def test_conversation_id_from_connection(self) -> None:
        conn = _make_conn(conversation_id="conv-abc")
        middleware = SupermemoryChatMiddleware(conn)
        assert middleware._connection.conversation_id == "conv-abc"
        assert middleware._connection.custom_id == "conversation_conv-abc"

    def test_auto_generated_conversation_id(self) -> None:
        conn = _make_conn()
        middleware = SupermemoryChatMiddleware(conn)
        assert middleware._connection.conversation_id is not None
        assert len(middleware._connection.conversation_id) > 0

    def test_entity_context_from_connection(self) -> None:
        conn = _make_conn(entity_context="User is a Python developer")
        middleware = SupermemoryChatMiddleware(conn)
        assert middleware._connection.entity_context == "User is a Python developer"


class TestMemoryInjection:
    @pytest.mark.asyncio
    async def test_profile_goes_to_system_and_search_to_user(self) -> None:
        conn = _make_conn()
        conn.client = _fake_client()
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="full")
        )
        context = SimpleNamespace(
            messages=[
                {"role": "system", "content": "Be helpful."},
                {"role": "user", "content": "What do you remember?"},
            ]
        )

        await middleware.process(context, AsyncMock())

        system = context.messages[0]["content"]
        assert system.startswith("Be helpful.\n")
        assert system.count("Prefers Python") == 1
        user = context.messages[1]["content"]
        assert user.startswith("What do you remember?")
        assert "Prefers Python" not in user
        assert "Asked about What do you remember?" in user

    @pytest.mark.asyncio
    async def test_recalls_once_per_turn_and_replays_earlier_turns(self) -> None:
        conn = _make_conn()
        conn.client = _fake_client()
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="full")
        )
        history = [{"role": "user", "content": "first"}]
        sent = []
        for extra in [[], [{"role": "tool", "content": "step"}]]:
            context = SimpleNamespace(messages=[*history, *extra])
            await middleware.process(context, AsyncMock())
            sent.append([m["content"] for m in context.messages[:2]])
        assert sent[0] == sent[1]
        assert conn.client.profile.await_count == 1
        assert conn.client.search.await_count == 1

        history += [
            {"role": "assistant", "content": "answer"},
            {"role": "user", "content": "first"},
        ]
        context = SimpleNamespace(messages=list(history))
        await middleware.process(context, AsyncMock())
        assert [m["content"] for m in context.messages[:2]] == sent[0]
        assert "Asked about first" in context.messages[3]["content"]
        assert conn.client.profile.await_count == 1
        assert conn.client.search.await_count == 2

        trimmed = SimpleNamespace(messages=list(history[2:]))
        await middleware.process(trimmed, AsyncMock())
        assert trimmed.messages[-1]["content"] == context.messages[3]["content"]
        assert conn.client.search.await_count == 2

    @pytest.mark.asyncio
    async def test_trimmed_repeated_question_keeps_its_own_block(self) -> None:
        conn = _make_conn()
        conn.client = _fake_client()
        searches = iter(range(1, 10))
        conn.client.search.side_effect = lambda tag, query, **kwargs: SimpleNamespace(
            results=[SimpleNamespace(memory=f"Search {next(searches)}")]
        )
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="query")
        )
        history: list = []
        sent = []
        for answer in ["Sunny", "Rainy", None]:
            history.append({"role": "user", "content": "Weather?"})
            context = SimpleNamespace(messages=list(history))
            await middleware.process(context, AsyncMock())
            sent.append(context.messages[-1]["content"])
            if answer:
                history.append({"role": "assistant", "content": answer})
        assert ["Search 1" in sent[0], "Search 2" in sent[1]] == [True, True]

        trimmed = SimpleNamespace(messages=list(history[2:]))
        await middleware.process(trimmed, AsyncMock())
        assert [m["content"] for m in trimmed.messages if m["role"] == "user"] == [
            sent[1],
            sent[2],
        ]
        assert conn.client.search.await_count == 3

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "content",
        [
            ("Be helpful.",),
            ({"type": "text", "text": "Be helpful."},),
            (part for part in ["Be helpful."]),
        ],
    )
    async def test_iterable_system_content_keeps_the_profile(self, content) -> None:
        conn = _make_conn()
        conn.client = _fake_client()
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="full")
        )
        context = SimpleNamespace(
            messages=[
                {"role": "system", "content": content},
                {"role": "user", "content": ("What do you remember?",)},
            ]
        )

        await middleware.process(context, AsyncMock())

        system = context.messages[0]["content"]
        assert isinstance(system, list)
        texts = [p if isinstance(p, str) else p["text"] for p in system]
        assert texts[0] == "Be helpful."
        assert sum("Prefers Python" in text for text in texts) == 1
        user = context.messages[1]["content"]
        assert user[0] == "What do you remember?"
        assert "Asked about What do you remember?" in user[-1]["text"]

    @pytest.mark.asyncio
    async def test_profile_once_per_session_without_visible_history(self) -> None:
        conn = _make_conn()
        conn.client = _fake_client()
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="full")
        )
        session = SimpleNamespace(session_id="session-1")
        systems = []
        for turn in ["first", "second"]:
            context = SimpleNamespace(
                messages=[{"role": "user", "content": turn}], session=session
            )
            await middleware.process(context, AsyncMock())
            systems.append(context.messages[0])
            assert "Asked about " + turn in context.messages[1]["content"]
        assert systems[0] == systems[1]
        assert systems[0]["role"] == "system"
        assert conn.client.profile.await_count == 1

    @pytest.mark.asyncio
    async def test_failed_recall_degrades_and_retries_on_next_turn(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("supermemory_agent_framework.utils.RECALL_TIMEOUT", 0.1)
        conn = _make_conn()
        conn.client = _fake_client()

        async def slow_profile(tag):
            await asyncio.sleep(5)

        conn.client.profile = AsyncMock(side_effect=slow_profile)
        middleware = SupermemoryChatMiddleware(
            conn, SupermemoryMiddlewareOptions(mode="profile")
        )
        history = [{"role": "user", "content": "first"}]
        context = SimpleNamespace(messages=list(history))
        started = time.monotonic()
        await middleware.process(context, AsyncMock())
        assert time.monotonic() - started < 1
        assert context.messages == history

        conn.client.profile = _fake_client().profile
        history += [
            {"role": "assistant", "content": "answer"},
            {"role": "user", "content": "second"},
        ]
        context = SimpleNamespace(messages=list(history))
        await middleware.process(context, AsyncMock())
        assert context.messages[0]["role"] == "system"
        assert "Prefers Python" in context.messages[0]["content"]
        assert context.messages[1:] == history

    @pytest.mark.asyncio
    async def test_query_mode_keeps_search_fact_also_present_in_profile(self) -> None:
        fact = "User likes machine learning projects"
        client = SimpleNamespace(
            search=AsyncMock(
                return_value=SimpleNamespace(results=[SimpleNamespace(memory=fact)])
            ),
            profile=AsyncMock(
                return_value=SimpleNamespace(
                    profile=SimpleNamespace(static=[fact], dynamic=[]),
                    search_results=SimpleNamespace(
                        results=[SimpleNamespace(memory=fact)]
                    ),
                )
            ),
        )
        logger = Mock()

        memories = await _build_memories_text(
            "user-123", logger, "query", client, "machine learning"
        )

        assert fact in memories
        client.profile.assert_not_awaited()
        client.search.assert_awaited_once_with(
            "user-123", query="machine learning", threshold=0.6, search_mode="memories"
        )
