# supermemory-strands

A [Supermemory](https://supermemory.ai) memory store for [Strands Agents](https://strandsagents.com/).

Supermemory is a hosted memory API for AI agents. It stores content, extracts memories from it, keeps a per-user profile, and returns relevant context on search. `SupermemoryMemoryStore` implements the Strands `MemoryStore` interface on top of it, so a `MemoryManager` can recall context from Supermemory and write new content to it.

## Installation

```bash
pip install supermemory-strands
```

Requires Python 3.10 or later, `strands-agents>=1.45.0` and the Supermemory SDK v5 (`supermemory>=5,<6`). Both are installed as dependencies.

Create an API key at https://console.supermemory.ai and export it:

```bash
export SUPERMEMORY_API_KEY="sm_..."
```

## Quick start

```python
from strands import Agent
from strands.memory import MemoryManager
from supermemory_strands import SupermemoryMemoryStore

store = SupermemoryMemoryStore(namespace="user_alex", extraction=True)
agent = Agent(memory_manager=MemoryManager(stores=[store]))

agent("I prefer morning meetings, ideally before 10.")
agent("When should we schedule the review?")
```

The `namespace` isolates one user's (or one project's) memories from another's. Use a user ID, a project ID, or any other string. Create one store per namespace.

With the defaults, the manager searches the store before each model call and injects the results into the prompt, and registers a `search_memory` tool. With `extraction=True` it also sends the conversation to Supermemory every few turns. See the [Strands memory documentation](https://strandsagents.com/docs/user-guide/sdk/memory/overview/) for the manager's own options, such as the `add_memory` tool, injection settings and extraction triggers.

## How the store maps to Supermemory

| `MemoryStore` method | Supermemory SDK call | Notes |
|----------------------|----------------------|-------|
| `search(query, options)` | `client.search(namespace, query=...)` | Returns one `MemoryEntry` per result. Entry metadata carries the result's metadata plus `id`, `type` (`memory` or `chunk`), `similarity` and `updated_at`. |
| `add(content, metadata)` | `client.add(namespace, content=..., id=...)` | Used by the `add_memory` tool and by client-side extractors. The document ID is derived from the namespace and content, so a repeated write of the same content addresses the same document. |
| `add_messages(messages, context)` | `client.add(namespace, content=..., id=conversation_id)` | Used by automatic extraction. Text blocks are rendered as `role: text` and appended to one document per conversation. Supermemory extracts the memories, so no extra model call is made. |
| `initialize()` | none | Not implemented. The store needs no setup call. |
| `get_tools()` | none | Not implemented. The store adds no tools of its own. |

Two extra methods are available to your own code. They are not part of the `MemoryStore` interface, so the manager never calls them:

```python
profile = await store.profile()          # profile.static, profile.dynamic, profile.buckets
result = await store.forget(["memory-id"])  # forget memories by ID
```

## Configuration

```python
store = SupermemoryMemoryStore(
    namespace="user_alex",
    name="supermemory",
    max_search_results=5,
    writable=True,
    extraction=True,
    conversation_id="session-42",
    metadata={"source": "support-agent"},
    search_mode="memories",
    threshold=0.5,
    dreaming="instant",
)
```

| Argument | Default | Description |
|----------|---------|-------------|
| `namespace` | required | Supermemory namespace that scopes every call. |
| `name` | `"supermemory"` | Store name, used to target the store in the manager's tools. |
| `description` | `"Long-term memory backed by Supermemory."` | Shown to the model in tool descriptions. |
| `max_search_results` | API default | Default number of results per search (1 to 100). |
| `writable` | `True` | Whether the manager may write to the store. |
| `extraction` | `None` | `True` or an `ExtractionConfig` to send conversation turns to Supermemory automatically. |
| `conversation_id` | random per store instance | Document ID that `add_messages` writes to. Pass your session ID to keep one document per conversation across processes. |
| `metadata` | `None` | Default metadata for every write. Flat mapping of string, number, boolean or list-of-string values. |
| `search_mode` | API default (`hybrid`) | `hybrid`, `memories` or `chunks`. |
| `threshold` | API default | Minimum relevance score from 0 to 1. |
| `dreaming` | API default (`dynamic`) | `dynamic` or `instant`. See the limitations below. |
| `api_key` | `$SUPERMEMORY_API_KEY` | Supermemory API key. |
| `base_url` | SDK default | Supermemory API base URL. |
| `client` | `None` | A pre-built synchronous `supermemory.Supermemory` client. |

## Limitations

- Writes are processed asynchronously. With the default `dynamic` dreaming mode, memories can take a few minutes to appear in search results. `dreaming="instant"` skips the batching, so a new memory is usually searchable within about a minute. Instant mode bills one extra operation per document.
- Supermemory has no call that writes a memory verbatim. `add` stores the text as a document and Supermemory extracts memories from it, so the recalled wording can differ from what was written.
- The `MemoryStore` interface has no delete operation, so the manager never removes memories. Use `store.forget(...)` from your own code.
- `add_messages` stores text blocks only. Tool calls, tool results, images and other block types are dropped.
- The store uses the synchronous `Supermemory` client in a worker thread. `AsyncSupermemory` clients are rejected.

## Development

```bash
pip install -e . pytest pytest-asyncio ruff mypy
ruff check src tests
mypy src
pytest
```

The tests mock the Supermemory client and make no network calls.

## License

MIT. See [LICENSE](LICENSE).
