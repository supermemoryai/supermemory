"""Tests for Supermemory tools."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from supermemory_agent_framework import AgentSupermemory, SupermemoryTools

ALL_TOOL_NAMES = [
    "search_memories",
    "add_memory",
    "get_profile",
    "document_list",
    "document_delete",
    "document_add",
    "memory_forget",
]


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
        assert len(result) == 7

    def test_get_tools_names(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        result = tools.get_tools()
        assert [t.name for t in result] == ALL_TOOL_NAMES

    def test_uses_connection_client(self) -> None:
        conn = _make_conn()
        tools = SupermemoryTools(conn)
        assert tools._client is conn.client

    def test_shares_custom_id_with_connection(self) -> None:
        conn = _make_conn(conversation_id="conv-123")
        tools = SupermemoryTools(conn)
        assert tools._connection.custom_id == "conversation_conv-123"


def _make_tools(container_tag: str = "user-1") -> SupermemoryTools:
    tools = SupermemoryTools(_make_conn(container_tag=container_tag))
    tools._client = AsyncMock()
    return tools


def _document(**fields):
    fields.setdefault("id", "doc_1")
    fields.setdefault("container_tags", ["user-1"])
    fields.setdefault("status", "done")
    return SimpleNamespace(**fields)


class TestToolSchemas:
    @pytest.mark.parametrize(
        ("name", "required", "properties"),
        [
            ("document_list", [], ["limit", "page"]),
            ("document_delete", ["document_id"], ["document_id"]),
            ("document_add", ["content"], ["content", "title", "description"]),
            ("memory_forget", [], ["memory_id", "memory_content", "reason"]),
        ],
    )
    def test_model_facing_parameters(self, name, required, properties) -> None:
        tool = {t.name: t for t in _make_tools().get_tools()}[name]
        schema = tool.parameters()

        assert schema.get("required", []) == required
        assert list(schema["properties"]) == properties


class TestDocumentList:
    async def test_lists_only_the_configured_tag(self) -> None:
        tools = _make_tools()
        tools._client.documents.list.return_value = SimpleNamespace(
            memories=[{"id": "doc_1"}],
            pagination={"currentPage": 2, "totalPages": 3},
        )

        result = json.loads(await tools.document_list(limit=5, page=2))

        tools._client.documents.list.assert_awaited_once_with(
            container_tags=["user-1"], limit=5, page=2
        )
        assert result == {
            "success": True,
            "documents": [{"id": "doc_1"}],
            "pagination": {"currentPage": 2, "totalPages": 3},
        }

    async def test_reports_api_errors(self) -> None:
        tools = _make_tools()
        tools._client.documents.list.side_effect = RuntimeError("boom")

        result = json.loads(await tools.document_list())

        assert result == {"success": False, "error": "boom"}


class TestDocumentDelete:
    async def test_deletes_by_resolved_id(self) -> None:
        tools = _make_tools()
        tools._client.documents.get.return_value = _document(id="doc_real")

        result = json.loads(await tools.document_delete("my-custom-id"))

        tools._client.documents.get.assert_awaited_once_with("my-custom-id")
        tools._client.documents.delete.assert_awaited_once_with("doc_real")
        assert result["success"] is True

    @pytest.mark.parametrize(
        "container_tags",
        [["other-user"], ["user-1", "other-user"], [], None],
        ids=["foreign", "shared", "empty", "missing"],
    )
    async def test_refuses_documents_outside_scope(self, container_tags) -> None:
        tools = _make_tools()
        tools._client.documents.get.return_value = _document(
            container_tags=container_tags
        )

        result = json.loads(await tools.document_delete("doc_1"))

        assert result["success"] is False
        assert "outside" in result["error"]
        tools._client.documents.delete.assert_not_awaited()

    async def test_refuses_documents_still_processing(self) -> None:
        tools = _make_tools()
        tools._client.documents.get.return_value = _document(status="extracting")

        result = json.loads(await tools.document_delete("doc_1"))

        assert result["success"] is False
        assert "extracting" in result["error"]
        tools._client.documents.delete.assert_not_awaited()

    async def test_deletes_failed_documents(self) -> None:
        tools = _make_tools()
        tools._client.documents.get.return_value = _document(status="failed")

        result = json.loads(await tools.document_delete("doc_1"))

        assert result["success"] is True

    async def test_reports_missing_documents(self) -> None:
        tools = _make_tools()
        tools._client.documents.get.side_effect = RuntimeError("404 Not Found")

        result = json.loads(await tools.document_delete("doc_missing"))

        assert result == {"success": False, "error": "404 Not Found"}
        tools._client.documents.delete.assert_not_awaited()


class TestDocumentAdd:
    async def test_adds_to_the_configured_tag_with_metadata(self) -> None:
        tools = _make_tools()
        tools._client.documents.add.return_value = {"id": "doc_1", "status": "queued"}

        result = json.loads(
            await tools.document_add(
                "meeting notes", title="Standup", description="Sep 30"
            )
        )

        tools._client.documents.add.assert_awaited_once_with(
            content="meeting notes",
            container_tag="user-1",
            metadata={"title": "Standup", "description": "Sep 30"},
        )
        assert result == {
            "success": True,
            "document": {"id": "doc_1", "status": "queued"},
        }

    async def test_does_not_reuse_the_conversation_custom_id(self) -> None:
        tools = SupermemoryTools(
            _make_conn(container_tag="user-1", conversation_id="conv-1")
        )
        tools._client = AsyncMock()
        tools._client.documents.add.return_value = {"id": "doc_1"}

        await tools.document_add("an article")

        kwargs = tools._client.documents.add.await_args.kwargs
        assert "custom_id" not in kwargs
        assert "metadata" not in kwargs


class TestMemoryForget:
    async def test_forgets_by_id_in_the_configured_tag(self) -> None:
        tools = _make_tools()

        result = json.loads(
            await tools.memory_forget(memory_id="mem_1", reason="outdated")
        )

        tools._client.memories.forget.assert_awaited_once_with(
            container_tag="user-1", id="mem_1", reason="outdated"
        )
        assert result["success"] is True

    async def test_forgets_by_exact_content(self) -> None:
        tools = _make_tools()

        await tools.memory_forget(memory_content="likes tea")

        tools._client.memories.forget.assert_awaited_once_with(
            container_tag="user-1", content="likes tea"
        )

    async def test_requires_an_id_or_content(self) -> None:
        tools = _make_tools()

        result = json.loads(await tools.memory_forget())

        assert result["success"] is False
        tools._client.memories.forget.assert_not_awaited()

    async def test_is_callable_through_the_framework(self) -> None:
        tools = _make_tools()
        tool = {t.name: t for t in tools.get_tools()}["memory_forget"]

        await tool.invoke(arguments={"memory_id": "mem_1"})

        tools._client.memories.forget.assert_awaited_once_with(
            container_tag="user-1", id="mem_1"
        )
