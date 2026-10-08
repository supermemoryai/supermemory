"""Exercise the published v5 SDK through HTTP and the real framework pipeline."""

import inspect
import json
from copy import deepcopy
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
import pytest_asyncio
import supermemory
from agent_framework import (
    AgentSession,
    BaseChatClient,
    ChatContext,
    ChatMiddlewareLayer,
    ChatResponse,
    Content,
    FunctionInvocationLayer,
    Message,
    SessionContext,
)

from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryContextProvider,
    SupermemoryMemoryOperationError,
    SupermemoryMiddlewareOptions,
    SupermemoryNetworkError,
    SupermemoryTimeoutError,
    SupermemoryTools,
)
from supermemory_agent_framework.middleware import _save_memory
from supermemory_agent_framework.utils import wrap_memory_injection


class MemoryAPI:
    def __init__(self) -> None:
        self.requests: list[tuple[str, str, dict[str, Any]]] = []
        self.failure: int | str | None = None
        self.empty = False

    def handle(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        self.requests.append((request.method, request.url.path, body))
        if self.failure == "network":
            raise httpx.ConnectError("Offline", request=request)
        if self.failure == "timeout":
            raise httpx.ReadTimeout("Timed out", request=request)
        if isinstance(self.failure, int):
            return httpx.Response(self.failure, json={"error": "Unavailable"})

        namespace = request.url.path.split("/")[2]
        fact = f"{namespace} prefers Python"
        if request.url.path.endswith("/profile"):
            return httpx.Response(
                200,
                json={
                    "profile": {
                        "static": (
                            [] if self.empty else [{"id": "fact", "memory": fact}]
                        ),
                        "dynamic": (
                            []
                            if self.empty
                            else [
                                {
                                    "id": "recent",
                                    "memory": f"{namespace} is building an agent",
                                }
                            ]
                        ),
                        "buckets": {"work": [{"id": "work", "memory": "Uses async"}]},
                    }
                },
            )
        if request.url.path.endswith("/search"):
            response = httpx.Response(
                200,
                json={
                    "results": (
                        []
                        if self.empty
                        else [
                            {
                                "id": "fact",
                                "memory": fact,
                                "metadata": {"tenant": namespace},
                                "similarity": 0.95,
                                "isLatest": True,
                                "isInference": False,
                                "system": {"updatedAt": "2026-10-08T00:00:00Z"},
                            },
                            {
                                "id": "chunk",
                                "chunk": f"{namespace} source passage",
                                "metadata": {},
                                "similarity": 0.9,
                                "isLatest": True,
                                "isInference": False,
                                "system": {"updatedAt": "2026-10-08T00:00:00Z"},
                            },
                        ]
                    ),
                    "searchTime": 2.5,
                },
            )
            if body.get("searchMode") == "memories":
                data = response.json()
                data["results"] = [
                    result for result in data["results"] if "memory" in result
                ]
                return httpx.Response(200, json=data)
            return response
        assert request.url.path.endswith("/document")
        assert request.method == "POST"
        return httpx.Response(200, json={"id": body["id"], "status": "queued"})


@pytest_asyncio.fixture
async def memory_api(monkeypatch: pytest.MonkeyPatch):
    api = MemoryAPI()
    client_class = supermemory.AsyncSupermemory
    async with httpx.AsyncClient(transport=httpx.MockTransport(api.handle)) as http:
        monkeypatch.setattr(
            supermemory,
            "AsyncSupermemory",
            lambda **kwargs: client_class(**kwargs, http_client=http, max_retries=0),
        )
        yield api


@pytest.mark.parametrize("mode", ["profile", "query", "full"])
async def test_provider_and_middleware_retrieval_modes(memory_api, mode):
    connection = AgentSupermemory(
        api_key="test", container_tag="tenant-a", entity_context="Custom entity context"
    )
    provider = SupermemoryContextProvider(
        connection, mode=mode, context_prompt="Known facts"
    )
    context = SessionContext(input_messages=[Message("user", ["preferences"])])
    state = {"legacy_user_value": {"keep": True}}
    await provider.before_run(agent=None, session=None, context=context, state=state)
    injected = "\n".join(context.instructions)
    assert "tenant-a prefers Python" in injected
    assert injected.count("tenant-a prefers Python") == 1
    assert "Custom entity context" in injected
    assert "Known facts" in injected
    assert ("tenant-a is building an agent" in injected) == (mode != "query")
    assert "tenant-a source passage" not in injected
    assert state == {"legacy_user_value": {"keep": True}}
    await provider.after_run(agent=None, session=None, context=context, state=state)
    expected = {"profile"} if mode == "profile" else {"search"}
    if mode == "full":
        expected.add("profile")
    assert {path.rsplit("/", 1)[1] for _, path, _ in memory_api.requests} == expected
    for _, path, body in memory_api.requests:
        assert path.startswith("/ns/tenant-a/")
        assert body == (
            {"query": "preferences", "threshold": 0.6, "searchMode": "memories"}
            if path.endswith("search")
            else {}
        )

    memory_api.requests.clear()
    middleware = SupermemoryChatMiddleware(
        connection, SupermemoryMiddlewareOptions(mode=mode)
    )
    chat = ChatContext(
        client=BaseChatClient,
        messages=[Message("system", ["Be helpful"]), Message("user", ["preferences"])],
        options={},
    )
    next_call = AsyncMock()
    await middleware.process(chat, next_call)
    next_call.assert_awaited_once()
    text = chat.messages[0].text
    assert "Be helpful" in text
    assert "tenant-a prefers Python" in text
    assert text.count("tenant-a prefers Python") == 1
    assert "Custom entity context" in text
    assert {path.rsplit("/", 1)[1] for _, path, _ in memory_api.requests} == expected


async def test_tool_formats_and_append_mapping(memory_api):
    connection = AgentSupermemory(
        api_key="test", container_tag="tenant-a", conversation_id="existing"
    )
    tools = SupermemoryTools(connection)
    with pytest.warns(DeprecationWarning):
        result = json.loads(await tools.search_memories("Python", True, limit=3))
    assert result["success"] is True
    assert result["count"] == 2
    assert result["results"][0]["memory"] == "tenant-a prefers Python"
    assert result["results"][1]["chunk"] == "tenant-a source passage"
    assert result["results"][0]["updated_at"] == "2026-10-08T00:00:00Z"
    for field in (
        "chunks",
        "context",
        "documents",
        "filepath",
        "is_aggregated",
        "root_memory_id",
        "version",
    ):
        assert result["results"][0][field] is None
    assert memory_api.requests[-1] == (
        "POST",
        "/ns/tenant-a/search",
        {"query": "Python", "limit": 3, "threshold": 0.6, "searchMode": "hybrid"},
    )

    profile = json.loads(await tools.get_profile("preferences"))
    assert profile["profile"] == {
        "static": ["tenant-a prefers Python"],
        "dynamic": ["tenant-a is building an agent"],
        "buckets": {"work": ["Uses async"]},
    }
    assert profile["search_results"]["total"] == 1
    assert profile["search_results"]["timing"] == 2.5
    assert json.loads(await tools.get_profile())["search_results"] is None

    for memory in ["First fact", "Second fact"]:
        added = json.loads(await tools.add_memory(memory))
        assert added == {
            "success": True,
            "memory": {"id": "conversation_existing", "status": "queued"},
        }
        assert memory_api.requests[-1] == (
            "POST",
            "/ns/tenant-a/document",
            {"content": memory, "id": "conversation_existing"},
        )
    search_tool = tools.get_tools()[0]
    assert "include_full_docs" not in search_tool.parameters()["properties"]


@pytest.mark.parametrize("failure", [401, 429, 503, "network", "timeout"])
async def test_failure_policy_with_sdk_errors(memory_api, failure):
    memory_api.failure = failure
    connection = AgentSupermemory(api_key="test", container_tag="tenant-a")
    tools = SupermemoryTools(connection)
    for operation in [
        tools.search_memories("preferences"),
        tools.add_memory("A fact"),
        tools.get_profile("preferences"),
    ]:
        result = json.loads(await operation)
        assert result["success"] is False
        assert result["error"]

    provider = SupermemoryContextProvider(connection, store_conversations=True)
    context = SessionContext(input_messages=[Message("user", ["preferences"])])
    await provider.before_run(agent=None, session=None, context=context, state={})
    assert not context.instructions
    await provider.after_run(agent=None, session=None, context=context, state={})

    middleware = SupermemoryChatMiddleware(
        connection, SupermemoryMiddlewareOptions(mode="full", add_memory="always")
    )
    chat = ChatContext(
        client=BaseChatClient,
        messages=[
            Message("system", ["Be helpful\n" + wrap_memory_injection("Stale memory")]),
            Message("user", ["preferences"]),
        ],
        options={},
    )
    next_call = AsyncMock()
    await middleware.process(chat, next_call)
    await middleware.wait_for_background_tasks()
    next_call.assert_awaited_once()
    assert chat.messages[0].text == "Be helpful"
    error_type = (
        SupermemoryNetworkError
        if failure == "network"
        else (
            SupermemoryTimeoutError
            if failure == "timeout"
            else SupermemoryMemoryOperationError
        )
    )
    with pytest.raises(error_type) as caught:
        await _save_memory(connection.client, "tenant-a", "fact", "existing", Mock())
    assert isinstance(caught.value.original_error, supermemory.APIError)


async def test_empty_and_missing_query_do_not_inject_stale_memories(memory_api):
    memory_api.empty = True
    connection = AgentSupermemory(api_key="test")
    provider = SupermemoryContextProvider(connection)
    context = SessionContext(input_messages=[Message("user", ["hello"])])
    await provider.before_run(agent=None, session=None, context=context, state={})
    assert not context.instructions
    assert json.loads(await SupermemoryTools(connection).search_memories("hello")) == {
        "success": True,
        "results": [],
        "count": 0,
    }
    memory_api.requests.clear()
    query_provider = SupermemoryContextProvider(connection, mode="query")
    await query_provider.before_run(
        agent=None,
        session=None,
        context=SessionContext(input_messages=[]),
        state={},
    )
    assert not memory_api.requests
    middleware = SupermemoryChatMiddleware(
        connection, SupermemoryMiddlewareOptions(mode="query")
    )
    chat = ChatContext(
        client=BaseChatClient,
        messages=[Message("system", [wrap_memory_injection("Stale memory")])],
        options={},
    )
    next_call = AsyncMock()
    await middleware.process(chat, next_call)
    next_call.assert_awaited_once()
    assert not chat.messages
    assert not memory_api.requests


if "function_middleware" in inspect.signature(FunctionInvocationLayer).parameters:

    class SmokeChatClientBase(
        ChatMiddlewareLayer, FunctionInvocationLayer, BaseChatClient
    ):
        pass

else:

    class SmokeChatClientBase(
        FunctionInvocationLayer, ChatMiddlewareLayer, BaseChatClient
    ):
        pass


class SmokeChatClient(SmokeChatClientBase):
    def __init__(self) -> None:
        super().__init__()
        self.calls: list[tuple[list[Message], dict[str, Any]]] = []

    async def _inner_get_response(self, *, messages, stream, options, **kwargs):
        assert not stream
        self.calls.append((deepcopy(list(messages)), dict(options)))
        if not any(
            content.type == "function_result"
            for message in messages
            for content in message.contents
        ):
            return ChatResponse(
                messages=[
                    Message(
                        "assistant",
                        [
                            Content.from_function_call(
                                "search",
                                "search_memories",
                                arguments={"information_to_get": "Python"},
                            ),
                            Content.from_function_call(
                                "add",
                                "add_memory",
                                arguments={"memory": "An explicit new fact"},
                            ),
                            Content.from_function_call(
                                "profile",
                                "get_profile",
                                arguments={"query": "preferences"},
                            ),
                        ],
                    )
                ]
            )
        return ChatResponse(messages=[Message("assistant", ["Remembered"])])


async def test_real_framework_pipeline_and_tenant_isolation(memory_api):
    for tenant in ["tenant-a", "tenant-b"]:
        connection = AgentSupermemory(
            api_key="test", container_tag=tenant, conversation_id="existing"
        )
        provider = SupermemoryContextProvider(connection, store_conversations=True)
        middleware = SupermemoryChatMiddleware(
            connection, SupermemoryMiddlewareOptions(mode="full", add_memory="always")
        )
        model = SmokeChatClient()
        agent = model.as_agent(
            name="MemoryAgent",
            instructions="Be helpful",
            context_providers=[provider],
            middleware=[middleware],
            tools=SupermemoryTools(connection).get_tools(),
        )
        old_state = {
            "type": "session",
            "session_id": "persisted-session",
            "service_session_id": None,
            "state": {
                "supermemory": {
                    "legacy_caller_data": {
                        "container_tag": tenant,
                        "conversation_id": "existing",
                    }
                }
            },
        }
        session = AgentSession.from_dict(deepcopy(old_state))
        assert session.to_dict() == old_state
        start = len(memory_api.requests)
        response = await agent.run("My preferences?", session=session)
        await middleware.wait_for_background_tasks()
        assert response.text == "Remembered"
        assert len(model.calls) == 2
        assert session.state["supermemory"] == old_state["state"]["supermemory"]
        assert (
            AgentSession.from_dict(session.to_dict()).state["supermemory"]
            == old_state["state"]["supermemory"]
        )
        for messages, options in model.calls:
            text = "\n".join(message.text for message in messages)
            assert f"{tenant} prefers Python" in text
            assert f"{tenant} prefers Python" in options["instructions"]
            other_tenant = "tenant-b" if tenant == "tenant-a" else "tenant-a"
            assert other_tenant not in text
            assert other_tenant not in options["instructions"]
        tool_results = [
            json.loads(content.result)
            for message in model.calls[-1][0]
            for content in message.contents
            if content.type == "function_result"
        ]
        assert len(tool_results) == 3
        assert all(result["success"] for result in tool_results)
        requests = memory_api.requests[start:]
        assert all(path.startswith(f"/ns/{tenant}/") for _, path, _ in requests)
        writes = [body for _, path, body in requests if path.endswith("/document")]
        assert all(body["id"] == "conversation_existing" for body in writes)
        assert any(body["content"] == "An explicit new fact" for body in writes)
        assert any("Assistant: Remembered" in body["content"] for body in writes)
        assert any(body["content"] == "User: My preferences?" for body in writes)


@pytest.mark.parametrize("failure", [503, "network", "timeout"])
async def test_real_framework_pipeline_continues_on_memory_failure(memory_api, failure):
    memory_api.failure = failure
    connection = AgentSupermemory(api_key="test", container_tag="tenant-a")
    provider = SupermemoryContextProvider(connection, store_conversations=True)
    middleware = SupermemoryChatMiddleware(
        connection, SupermemoryMiddlewareOptions(mode="full", add_memory="always")
    )
    model = SmokeChatClient()
    agent = model.as_agent(
        name="MemoryAgent",
        instructions="Be helpful",
        context_providers=[provider],
        middleware=[middleware],
        tools=SupermemoryTools(connection).get_tools(),
    )
    response = await agent.run("My preferences?", session=AgentSession())
    await middleware.wait_for_background_tasks()
    assert response.text == "Remembered"
    assert len(model.calls) == 2
    for messages, options in model.calls:
        assert "supermemory context=" not in "\n".join(
            message.text for message in messages
        )
        assert options["instructions"] == "Be helpful"
    results = [
        json.loads(content.result)
        for message in model.calls[-1][0]
        for content in message.contents
        if content.type == "function_result"
    ]
    assert len(results) == 3
    assert all(result["success"] is False and result["error"] for result in results)
