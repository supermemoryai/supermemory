"""Tests for SupermemoryMemoryStore.

The Supermemory client is always mocked. Responses are built from the SDK's own
response models so the tests fail if a field the store reads is renamed.
"""

from unittest.mock import MagicMock, patch

import pytest
from strands import Agent
from strands.memory import AddMessagesContext, ExtractionConfig, InvocationTrigger, MemoryManager, MemoryStore
from strands.models.model import Model
from supermemory import (
    AsyncSupermemory,
    DocumentRef,
    ForgetResult,
    ProfileResponse,
    SearchResponse,
    Supermemory,
    SupermemoryError,
)

from supermemory_strands import SupermemoryMemoryStore
from supermemory_strands.memory_store import _content_id


def _search_response(*results):
    return SearchResponse.model_validate({"results": list(results), "searchTime": 12.5})


def _memory_result(**overrides):
    result = {
        "id": "mem_1",
        "memory": "Alex prefers morning meetings.",
        "metadata": {"topic": "scheduling"},
        "similarity": 0.82,
        "isLatest": True,
        "isInference": False,
        "system": {"updatedAt": "2026-01-01T00:00:00Z"},
    }
    result.update(overrides)
    return result


def _chunk_result(**overrides):
    result = {
        "id": "chunk_1",
        "chunk": "user: I like to meet in the morning.",
        "metadata": {},
        "similarity": 0.61,
        "isLatest": True,
        "isInference": False,
        "system": {"updatedAt": "2026-01-02T00:00:00Z"},
    }
    result.update(overrides)
    return result


class _FakeModel(Model):
    """A model that records what it was sent and always answers "Noted."."""

    def __init__(self):
        self.requests = []

    def update_config(self, **model_config):
        pass

    def get_config(self):
        return {}

    async def stream(self, messages, tool_specs=None, system_prompt=None, **kwargs):
        self.requests.append([block.get("text", "") for message in messages for block in message["content"]])
        yield {"messageStart": {"role": "assistant"}}
        yield {"contentBlockStart": {"start": {}}}
        yield {"contentBlockDelta": {"delta": {"text": "Noted."}}}
        yield {"contentBlockStop": {}}
        yield {"messageStop": {"stopReason": "end_turn"}}

    async def structured_output(self, output_model, prompt, system_prompt=None, **kwargs):
        raise NotImplementedError
        yield


@pytest.fixture
def client():
    """A mocked Supermemory client."""
    mock = MagicMock()
    mock.search.return_value = _search_response()
    mock.add.return_value = DocumentRef(id="doc_1", status="queued")
    return mock


@pytest.fixture
def store(client):
    """A store bound to the mocked client."""
    return SupermemoryMemoryStore(namespace="user_alex", client=client)


def test_init_defaults(client):
    """Protocol attributes default to a writable store named supermemory."""
    store = SupermemoryMemoryStore(namespace="user_alex", client=client)

    assert store.name == "supermemory"
    assert store.description == "Long-term memory backed by Supermemory."
    assert store.max_search_results is None
    assert store.writable is True
    assert store.extraction is None
    assert store.namespace == "user_alex"


def test_init_from_config(client):
    """Protocol attributes and Supermemory options are read from the constructor."""
    store = SupermemoryMemoryStore(
        namespace=" project_x ",
        name="notes",
        description="project notes",
        max_search_results=3,
        writable=False,
        extraction=False,
        conversation_id="session-42",
        client=client,
    )

    assert store.name == "notes"
    assert store.description == "project notes"
    assert store.max_search_results == 3
    assert store.writable is False
    assert store.extraction is False
    assert store.namespace == "project_x"
    assert store.conversation_id == "session-42"


@pytest.mark.parametrize("namespace", ["", "   ", None, 42])
def test_init_requires_namespace(client, namespace):
    """A missing or blank namespace is rejected."""
    with pytest.raises(ValueError, match="non-empty namespace"):
        SupermemoryMemoryStore(namespace=namespace, client=client)


def test_init_rejects_async_client():
    """An async client would never be awaited from the worker thread."""
    with pytest.raises(ValueError, match="AsyncSupermemory clients are not supported"):
        SupermemoryMemoryStore(namespace="user_alex", client=AsyncSupermemory(api_key="test-key"))


def test_init_rejects_unsupported_default_metadata(client):
    """Default metadata is validated at construction."""
    with pytest.raises(ValueError, match="metadata value for 'nested'"):
        SupermemoryMemoryStore(namespace="user_alex", metadata={"nested": {"a": 1}}, client=client)


def test_init_builds_client_from_arguments():
    """Without an injected client, one is built from api_key and base_url."""
    with patch("supermemory_strands.memory_store.Supermemory") as supermemory:
        store = SupermemoryMemoryStore(namespace="user_alex", api_key="test-key", base_url="https://example.test")

    supermemory.assert_called_once_with(api_key="test-key", base_url="https://example.test")
    assert store._client is supermemory.return_value


def test_init_reads_api_key_from_environment(monkeypatch):
    """The SDK client reads SUPERMEMORY_API_KEY when no api_key is passed."""
    monkeypatch.setenv("SUPERMEMORY_API_KEY", "test-key")

    store = SupermemoryMemoryStore(namespace="user_alex")

    assert isinstance(store._client, Supermemory)


def test_init_without_api_key_raises(monkeypatch):
    """A missing API key fails at construction, not on the first call."""
    monkeypatch.delenv("SUPERMEMORY_API_KEY", raising=False)

    with pytest.raises(SupermemoryError, match="SUPERMEMORY_API_KEY"):
        SupermemoryMemoryStore(namespace="user_alex")


def test_implements_both_write_sinks():
    """Both write sinks are overridden; initialize and get_tools keep the protocol defaults."""
    assert SupermemoryMemoryStore.add is not MemoryStore.add
    assert SupermemoryMemoryStore.add_messages is not MemoryStore.add_messages
    assert SupermemoryMemoryStore.initialize is MemoryStore.initialize
    assert SupermemoryMemoryStore.get_tools is MemoryStore.get_tools


async def test_search_maps_memories_and_chunks(store, client):
    """Memory and chunk results both become entries, in the order returned."""
    client.search.return_value = _search_response(_memory_result(), _chunk_result())

    entries = await store.search("when does alex like to meet?")

    client.search.assert_called_once_with("user_alex", query="when does alex like to meet?")
    assert [entry.content for entry in entries] == [
        "Alex prefers morning meetings.",
        "user: I like to meet in the morning.",
    ]
    assert entries[0].metadata == {
        "topic": "scheduling",
        "id": "mem_1",
        "type": "memory",
        "similarity": 0.82,
        "updated_at": "2026-01-01T00:00:00Z",
    }
    assert entries[1].metadata == {
        "id": "chunk_1",
        "type": "chunk",
        "similarity": 0.61,
        "updated_at": "2026-01-02T00:00:00Z",
    }


async def test_search_result_fields_win_over_user_metadata(store, client):
    """A user metadata key named id cannot hide the result's real ID."""
    client.search.return_value = _search_response(_memory_result(metadata={"id": "spoofed", "type": "note"}))

    entries = await store.search("meetings")

    assert entries[0].metadata["id"] == "mem_1"
    assert entries[0].metadata["type"] == "memory"


async def test_search_skips_results_without_text(store, client):
    """A result with neither memory nor chunk text is dropped."""
    client.search.return_value = _search_response(_memory_result(memory=None), _chunk_result())

    entries = await store.search("meetings")

    assert [entry.metadata["id"] for entry in entries] == ["chunk_1"]


async def test_search_no_results(store, client):
    """An empty response maps to an empty list."""
    assert await store.search("meetings") == []


@pytest.mark.parametrize("query", ["", "   "])
async def test_search_blank_query_skips_the_api(store, client, query):
    """A blank query returns nothing without a request."""
    assert await store.search(query) == []
    client.search.assert_not_called()


async def test_search_limit_from_options(client):
    """A per-call max_search_results overrides the store default."""
    store = SupermemoryMemoryStore(namespace="user_alex", max_search_results=3, client=client)

    await store.search("meetings", {"max_search_results": 7})

    client.search.assert_called_once_with("user_alex", query="meetings", limit=7)


async def test_search_limit_from_store_default(client):
    """The store default applies when the call passes no limit."""
    store = SupermemoryMemoryStore(namespace="user_alex", max_search_results=3, client=client)

    await store.search("meetings", {})

    client.search.assert_called_once_with("user_alex", query="meetings", limit=3)


@pytest.mark.parametrize(("requested", "sent"), [(0, 1), (-5, 1), (100, 100), (500, 100)])
async def test_search_limit_is_clamped(store, client, requested, sent):
    """The limit is kept inside the range the API accepts."""
    await store.search("meetings", {"max_search_results": requested})

    client.search.assert_called_once_with("user_alex", query="meetings", limit=sent)


async def test_search_passes_mode_and_threshold(client):
    """search_mode and threshold are forwarded when set."""
    store = SupermemoryMemoryStore(namespace="user_alex", search_mode="memories", threshold=0.5, client=client)

    await store.search("meetings")

    client.search.assert_called_once_with("user_alex", query="meetings", search_mode="memories", threshold=0.5)


async def test_search_error_propagates(store, client):
    """An API failure reaches the caller."""
    client.search.side_effect = RuntimeError("backend unavailable")

    with pytest.raises(RuntimeError, match="backend unavailable"):
        await store.search("meetings")


async def test_add_stores_content_under_a_content_derived_id(store, client):
    """add writes one document whose ID is derived from the namespace and content."""
    result = await store.add("Alex prefers morning meetings.")

    assert result == DocumentRef(id="doc_1", status="queued")
    client.add.assert_called_once_with(
        "user_alex",
        content="Alex prefers morning meetings.",
        id=_content_id("user_alex", "Alex prefers morning meetings."),
    )


async def test_add_is_idempotent_for_repeated_content(store, client):
    """A retried write of the same content addresses the same document."""
    await store.add("Alex prefers morning meetings.")
    await store.add("Alex prefers morning meetings.")
    await store.add("Alex is allergic to shellfish.")

    ids = [call.kwargs["id"] for call in client.add.call_args_list]
    assert ids[0] == ids[1]
    assert ids[0] != ids[2]
    assert all(document_id.startswith("strands-") and len(document_id) == 40 for document_id in ids)


def test_content_id_differs_by_namespace():
    """The same content in two namespaces gets two document IDs."""
    assert _content_id("user_alex", "same fact") != _content_id("user_blake", "same fact")


async def test_add_merges_metadata_over_store_default(client):
    """Per-call metadata is merged over the store's default metadata."""
    store = SupermemoryMemoryStore(
        namespace="user_alex", metadata={"source": "strands", "priority": 1}, dreaming="instant", client=client
    )

    await store.add("Alex prefers morning meetings.", {"priority": 2, "tags": ["scheduling"], "pinned": True})

    client.add.assert_called_once_with(
        "user_alex",
        content="Alex prefers morning meetings.",
        id=_content_id("user_alex", "Alex prefers morning meetings."),
        metadata={"source": "strands", "priority": 2, "tags": ["scheduling"], "pinned": True},
        dreaming="instant",
    )


@pytest.mark.parametrize(
    "metadata", [{"nested": {"a": 1}}, {"missing": None}, {"mixed": ["a", 1]}, ["not", "a", "dict"]]
)
async def test_add_rejects_unsupported_metadata(store, client, metadata):
    """Metadata that Supermemory cannot store is rejected before any request."""
    with pytest.raises(ValueError, match="metadata"):
        await store.add("Alex prefers morning meetings.", metadata)

    client.add.assert_not_called()


async def test_add_error_propagates(store, client):
    """An API failure reaches the caller."""
    client.add.side_effect = RuntimeError("backend unavailable")

    with pytest.raises(RuntimeError, match="backend unavailable"):
        await store.add("Alex prefers morning meetings.")


async def test_add_messages_renders_text_under_the_conversation_id(client):
    """Text blocks are rendered per role and written to the conversation document."""
    store = SupermemoryMemoryStore(
        namespace="user_alex", conversation_id="session-42", metadata={"source": "strands"}, client=client
    )
    messages = [
        {"role": "user", "content": [{"text": "I like to meet in the morning."}, {"text": "Before 10 if possible."}]},
        {"role": "assistant", "content": [{"toolUse": {"toolUseId": "t1", "name": "calendar", "input": {}}}]},
        {"role": "user", "content": [{"toolResult": {"toolUseId": "t1", "status": "success", "content": []}}]},
        {"role": "assistant", "content": [{"text": "Noted, mornings it is."}]},
    ]

    result = await store.add_messages(messages, AddMessagesContext())

    assert result == DocumentRef(id="doc_1", status="queued")
    client.add.assert_called_once_with(
        "user_alex",
        content="user: I like to meet in the morning.\nBefore 10 if possible.\n\nassistant: Noted, mornings it is.",
        id="session-42",
        metadata={"source": "strands"},
    )


async def test_add_messages_reuses_one_generated_id_per_store(client):
    """Without a conversation_id, every batch from one store goes to one document."""
    first = SupermemoryMemoryStore(namespace="user_alex", client=client)
    second = SupermemoryMemoryStore(namespace="user_alex", client=client)
    message = {"role": "user", "content": [{"text": "hello"}]}

    await first.add_messages([message])
    await first.add_messages([message])
    await second.add_messages([message])

    ids = [call.kwargs["id"] for call in client.add.call_args_list]
    assert ids[0] == ids[1] == first.conversation_id
    assert ids[2] == second.conversation_id
    assert first.conversation_id != second.conversation_id


async def test_add_messages_passes_dreaming(client):
    """The dreaming mode is forwarded when set."""
    store = SupermemoryMemoryStore(
        namespace="user_alex", conversation_id="session-42", dreaming="instant", client=client
    )

    await store.add_messages([{"role": "user", "content": [{"text": "hello"}]}])

    client.add.assert_called_once_with("user_alex", content="user: hello", id="session-42", dreaming="instant")


async def test_add_messages_with_no_text_skips_the_api(store, client):
    """A batch with no text blocks writes nothing."""
    messages = [
        {"role": "assistant", "content": [{"toolUse": {"toolUseId": "t1", "name": "calendar", "input": {}}}]},
        {"role": "user", "content": [{"text": "   "}]},
        {"role": "user", "content": []},
    ]

    assert await store.add_messages(messages) is None
    assert await store.add_messages([]) is None
    client.add.assert_not_called()


async def test_add_messages_error_propagates(store, client):
    """An API failure reaches the caller, so the manager can retry the batch."""
    client.add.side_effect = RuntimeError("backend unavailable")

    with pytest.raises(RuntimeError, match="backend unavailable"):
        await store.add_messages([{"role": "user", "content": [{"text": "hello"}]}])


async def test_profile(store, client):
    """profile returns the namespace profile."""
    client.profile.return_value = ProfileResponse.model_validate(
        {
            "profile": {
                "static": [{"id": "mem_1", "memory": "Prefers morning meetings"}],
                "dynamic": [{"id": "mem_2", "memory": "Planning a trip to Lisbon"}],
                "buckets": {"interests": [{"id": "mem_3", "memory": "Plays tennis"}]},
            }
        }
    )

    profile = await store.profile()

    client.profile.assert_called_once_with("user_alex")
    assert [fact.memory for fact in profile.static] == ["Prefers morning meetings"]
    assert [fact.memory for fact in profile.dynamic] == ["Planning a trip to Lisbon"]
    assert [fact.id for fact in profile.buckets["interests"]] == ["mem_3"]


async def test_forget(store, client):
    """forget passes the memory IDs to the namespace-scoped forget call."""
    client.memories.forget.return_value = ForgetResult.model_validate(
        {
            "count": 1,
            "errors": [{"id": "missing", "error": "Memory not found"}],
            "matches": [{"id": "mem_1", "memory": "x"}],
        }
    )

    result = await store.forget(["mem_1", "missing"])

    client.memories.forget.assert_called_once_with("user_alex", ids=["mem_1", "missing"])
    assert result.count == 1
    assert result.errors[0].id == "missing"


async def test_forget_requires_ids(store, client):
    """An empty ID list is rejected before any request."""
    with pytest.raises(ValueError, match="at least one memory ID"):
        await store.forget([])

    client.memories.forget.assert_not_called()


async def test_memory_manager_searches_and_adds_through_the_store(store, client):
    """A MemoryManager accepts the store and routes search and add to it."""
    client.search.return_value = _search_response(_memory_result())
    manager = MemoryManager(stores=[store])

    entries = await manager.search("meetings", {"max_search_results": 2})
    await manager.add("Alex prefers morning meetings.")

    assert entries[0].content == "Alex prefers morning meetings."
    assert entries[0].store_name == "supermemory"
    client.search.assert_called_once_with("user_alex", query="meetings", limit=2)
    client.add.assert_called_once()


async def test_agent_turn_recalls_and_extracts_through_the_store(client):
    """One agent turn injects recalled memory and sends the raw turn to add_messages."""
    client.search.return_value = _search_response(_memory_result())
    store = SupermemoryMemoryStore(
        namespace="user_alex",
        conversation_id="session-42",
        extraction=ExtractionConfig(trigger=InvocationTrigger()),
        client=client,
    )
    manager = MemoryManager(stores=[store])
    model = _FakeModel()
    agent = Agent(model=model, memory_manager=manager, callback_handler=None)

    await agent.invoke_async("When should we meet?")
    await manager.flush()

    assert client.search.call_args.args == ("user_alex",)
    assert client.search.call_args.kwargs["query"] == "When should we meet?"
    assert any("Alex prefers morning meetings." in text for text in model.requests[0])
    assert len(model.requests) == 1
    client.add.assert_called_once_with(
        "user_alex", content="user: When should we meet?\n\nassistant: Noted.", id="session-42"
    )
