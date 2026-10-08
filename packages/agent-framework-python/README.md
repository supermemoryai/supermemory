# Supermemory Microsoft Agent Framework SDK

Memory tools and middleware for [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) with [Supermemory](https://supermemory.ai) integration.

This package provides both **automatic memory injection middleware** and **manual memory tools** for the Microsoft Agent Framework.

## Installation

This source supports the Supermemory Python SDK `>=5.0.0,<6`. The published adapter `1.0.3` still requires the legacy SDK; until a v5-compatible adapter release is published, install from a checkout of this repository:

```bash
pip install -e packages/agent-framework-python agent-framework-openai
```

The OpenAI client is a separate Agent Framework package. Include `agent-framework-openai` when using the OpenAI examples below, which target its current `OpenAIChatClient` Responses API client. The adapter also supports older framework cores, but their OpenAI client names and model arguments can differ.

After a v5-compatible adapter release is published, install using the package index:

Install using uv (recommended):

```bash
uv add supermemory-agent-framework agent-framework-openai
```

Or with pip:

```bash
pip install supermemory-agent-framework agent-framework-openai
```

## Quick Start

### Automatic Memory Injection (Recommended)

The easiest way to add memory capabilities is using the `SupermemoryChatMiddleware`:

```python
import asyncio
from agent_framework.openai import OpenAIChatClient
from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
)

async def main():
    connection = AgentSupermemory(
        api_key="your-supermemory-api-key",
        container_tag="user-123",
    )

    middleware = SupermemoryChatMiddleware(
        connection,
        options=SupermemoryMiddlewareOptions(
            mode="full",        # "profile", "query", or "full"
            verbose=True,       # Enable logging
            add_memory="always" # Automatically save conversations
        ),
    )

    # Create agent with middleware
    agent = OpenAIChatClient(model="gpt-4o-mini").as_agent(
        name="MemoryAgent",
        instructions="You are a helpful assistant with memory.",
        middleware=[middleware],
    )

    # Use normally - memories are automatically injected!
    response = await agent.run(
        "What's my favorite programming language?"
    )
    await middleware.wait_for_background_tasks()
    print(response.text)

asyncio.run(main())
```

### Context Provider (Recommended for Sessions)

The most idiomatic way to add memory in Agent Framework, using the same pattern as the built-in Mem0 integration:

```python
import asyncio
from agent_framework import AgentSession
from agent_framework.openai import OpenAIChatClient
from supermemory_agent_framework import AgentSupermemory, SupermemoryContextProvider

async def main():
    connection = AgentSupermemory(
        api_key="your-supermemory-api-key",
        container_tag="user-123",
    )

    provider = SupermemoryContextProvider(
        connection,
        mode="full",
        store_conversations=True,
    )

    # Create agent with context provider
    agent = OpenAIChatClient(model="gpt-4o-mini").as_agent(
        name="MemoryAgent",
        instructions="You are a helpful assistant with memory.",
        context_providers=[provider],
    )

    # Use with a session - memories are automatically fetched and injected
    session = AgentSession()
    response = await agent.run(
        "What's my favorite programming language?",
        session=session,
    )
    print(response.text)

asyncio.run(main())
```

### Using Memory Tools

For explicit tool-based memory access:

```python
import asyncio
from agent_framework.openai import OpenAIChatClient
from supermemory_agent_framework import AgentSupermemory, SupermemoryTools

async def main():
    connection = AgentSupermemory(
        api_key="your-supermemory-api-key",
        container_tag="user-123",
    )
    tools = SupermemoryTools(connection)

    # Create agent
    agent = OpenAIChatClient(model="gpt-4o-mini").as_agent(
        name="MemoryAgent",
        instructions="You are a helpful assistant with access to user memories.",
    )

    # Run with memory tools
    response = await agent.run(
        "Remember that I prefer tea over coffee",
        tools=tools.get_tools(),
    )
    print(response.text)

asyncio.run(main())
```

### Combining Middleware and Tools

For maximum flexibility, use both middleware (automatic context injection) and tools (explicit memory operations):

```python
import asyncio
from agent_framework.openai import OpenAIChatClient
from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
    SupermemoryTools,
)

async def main():
    api_key = "your-supermemory-api-key"
    connection = AgentSupermemory(
        api_key=api_key,
        container_tag="user-123",
    )

    middleware = SupermemoryChatMiddleware(
        connection,
        options=SupermemoryMiddlewareOptions(mode="full"),
    )

    tools = SupermemoryTools(connection)

    agent = OpenAIChatClient(model="gpt-4o-mini").as_agent(
        name="MemoryAgent",
        instructions="You are a helpful assistant with memory.",
        middleware=[middleware],
    )

    # Middleware injects context automatically,
    # tools let the agent explicitly search/add memories
    response = await agent.run(
        "What do you remember about me?",
        tools=tools.get_tools(),
    )
    print(response.text)

asyncio.run(main())
```

## Middleware Configuration

### Memory Modes

#### `"profile"` mode (default)
Injects all static and dynamic profile memories into every request.

```python
SupermemoryMiddlewareOptions(mode="profile")
```

#### `"query"` mode
Searches for memories relevant to the current user message.

```python
SupermemoryMiddlewareOptions(mode="query")
```

#### `"full"` mode
Combines both profile and query modes.

```python
SupermemoryMiddlewareOptions(mode="full")
```

### Memory Storage

```python
# Always save conversations as memories
SupermemoryMiddlewareOptions(add_memory="always")

# Never save conversations (default)
SupermemoryMiddlewareOptions(add_memory="never")
```

### Complete Configuration

```python
connection = AgentSupermemory(
    api_key="your-supermemory-api-key",
    container_tag="user-123",               # Memory scope
    conversation_id="chat-session-456",     # Groups stored conversations
    entity_context="User is on the pro plan", # Optional fixed context
)

middleware = SupermemoryChatMiddleware(
    connection,
    options=SupermemoryMiddlewareOptions(
        verbose=True,
        mode="full",
        add_memory="always",
    ),
)
```

## API Reference

### SupermemoryTools

Memory tools that integrate with Agent Framework's tool system.

```python
connection = AgentSupermemory(
    api_key="your-api-key",
    container_tag="user-123",
)
tools = SupermemoryTools(connection)

# Get FunctionTool instances for Agent.run()
agent_tools = tools.get_tools()

# Or use directly
result = await tools.search_memories("user preferences")
result = await tools.add_memory("User prefers dark mode")
result = await tools.get_profile()
```

`search_memories` uses v5 hybrid search, so results can contain either a
structured memory or a source chunk. The old Python-only `include_full_docs`
argument remains deprecated and ignored; this tool does not request full
source documents, and the argument is not exposed to the model.

### V5 compatibility

- Keep passing `container_tag` and `conversation_id`. The adapter passes the container tag as the v5 namespace and uses the unchanged `conversation_<conversation_id>` value as the document `id`. Choose a separate container tag for each tenant; the default `msft_agent_chat` is shared, not tenant-specific.
- All writes still use add/append, including tool writes and automatic conversation storage. Reusing a conversation ID adds or diffs new content into its document; it does not replace earlier turns. No document update or replacement operation is used.
- `entity_context` remains display context prepended to retrieved memories; this migration does not start sending it as ingestion `supporting_context`.
- Profile mode makes one profile request, query mode makes one search request, and full mode makes both when there is a user query. V5 profiles no longer accept a query. Profile-associated search keeps the legacy memory-only mode and `0.6` threshold rather than adopting v5's broader defaults; the explicit search tool keeps its hybrid mode and `0.6` threshold. Provider and middleware context still contains fact text rather than `{id, memory}` objects and deduplicates facts across profile/search results.
- Tool JSON envelopes remain unchanged: search returns `success`, `results`, and `count`; add returns `success` and `memory`; profile returns `success`, `profile`, and `search_results`. Profile static/dynamic/bucket values remain strings. Profile search results retain `results`, `timing`, and `total` (the number returned). Search results retain a top-level `updated_at` mapped from v5 `system.updated_at`, along with v5 fields. Legacy optional fields that v5 does not return, such as version numbers and file paths, remain present as `null`; their values cannot be reconstructed.
- The provider has no adapter-owned persisted state schema and leaves its scoped session state unchanged. Existing framework session exports remain loadable; keep using the same container tag and conversation ID when reconstructing the connection. The API client's credentials are not serialized into session state.

This maps requests but does not move server-side data. If existing v3/v4 data has not been migrated into the corresponding v5 namespace, follow the [v5 migration guide](https://supermemory.ai/docs/migration/api-v5) before relying on historical recall. The adapter does not delete or rewrite the old data.

Writes are accepted asynchronously; `queued` is not a guarantee that a later search already contains the new memory. The SDK's default processing mode is unchanged. Enabling both provider storage and middleware storage can submit overlapping conversation content, so use one automatic storage path unless that is intentional.

### SupermemoryChatMiddleware

Chat middleware for automatic memory injection.

```python
middleware = SupermemoryChatMiddleware(
    connection,                           # Shared AgentSupermemory connection
    options=SupermemoryMiddlewareOptions(...),
)
```

### SupermemoryContextProvider

Context provider for the Agent Framework session pipeline (like Mem0):

```python
provider = SupermemoryContextProvider(
    connection,                        # Shared AgentSupermemory connection
    mode="full",                      # "profile", "query", or "full"
    store_conversations=True,         # Save conversations after each run
    context_prompt="## Memories\n...",  # Custom header for injected memories
    verbose=True,                     # Enable logging
)
```

## Error Handling

```python
from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryConfigurationError,
    SupermemoryAPIError,
    SupermemoryNetworkError,
    SupermemoryMemoryOperationError,
)

try:
    connection = AgentSupermemory(container_tag="user-123")
except SupermemoryConfigurationError as e:
    print(f"Configuration issue: {e}")
```

### Exception Types

Tools return failures as JSON with `success: false` and `error`. Provider retrieval/storage and middleware retrieval failures are logged and do not abort the agent run. Middleware background write failures are logged; `wait_for_background_tasks()` waits for those tasks but does not re-raise their operation errors (its own wait timeout still raises `asyncio.TimeoutError`). SDK connection and request timeout failures are classified separately for background writes.

- **`SupermemoryError`** - Base class for all Supermemory exceptions
- **`SupermemoryConfigurationError`** - Missing API keys, invalid configuration
- **`SupermemoryAPIError`** - API request failures (includes status codes)
- **`SupermemoryNetworkError`** - Network connectivity issues
- **`SupermemoryMemoryOperationError`** - Memory search/add operation failures
- **`SupermemoryTimeoutError`** - Operation timeouts

## Environment Variables

- `SUPERMEMORY_API_KEY` - Your Supermemory API key (required)
- `OPENAI_API_KEY` - Your OpenAI API key (required for OpenAI-based agents)

## Dependencies

### Required
- `agent-framework-core>=1.0.0rc3` - Microsoft Agent Framework
- `supermemory>=5.0.0,<6` - Namespace-first Supermemory v5 client
- `typing-extensions>=4.0.0` - Typing compatibility helpers

## Development

```bash
# Setup
cd packages/agent-framework-python
uv sync --dev

# Run tests
uv run pytest

# Type checking
uv run mypy src/supermemory_agent_framework

# Formatting
uv run black src/ tests/
uv run isort src/ tests/
uv run flake8 src/ tests/ --ignore=E501,W503,E704
```

The HTTP-transport regression suite uses the actual Supermemory SDK and runs a real Agent Framework agent/tool loop without API credentials or a live model. It is verified against both `agent-framework-core==1.0.0rc3` and `1.21.0`.

## License

MIT License - see LICENSE file for details.

## Links

- [Supermemory](https://supermemory.ai) - Infinite context memory platform
- [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) - AI agent framework
- [Documentation](https://docs.supermemory.ai) - Full API documentation
