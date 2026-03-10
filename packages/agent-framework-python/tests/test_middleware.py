"""Tests for Supermemory middleware."""

import pytest

from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
)
from supermemory_agent_framework.middleware import (
    _get_last_user_message,
    _get_conversation_content,
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
