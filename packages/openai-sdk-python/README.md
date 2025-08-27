# Supermemory OpenAI Python SDK

Enhanced OpenAI Python SDK with Supermemory infinite context integration.

This package extends the official [OpenAI Python SDK](https://github.com/openai/openai-python) with [Supermemory](https://supermemory.ai) capabilities, enabling infinite context chat completions and memory management tools.

## Features

- 🚀 **Infinite Context**: Chat completions with unlimited conversation history
- 🧠 **Memory Tools**: Search, add, and fetch user memories seamlessly
- 🔌 **Multiple Providers**: Support for OpenAI, Anthropic, Groq, and more
- 🛠 **Function Calling**: Built-in memory tools for OpenAI function calling
- 🔒 **Type Safe**: Full TypeScript-style type hints for Python
- ⚡ **Async Support**: Full async/await support

## Installation

Install using uv (recommended):

```bash
uv add supermemory-openai
```

Or with pip:

```bash
pip install supermemory-openai
```

## Quick Start

### Basic Chat Completion

```python
import asyncio
from supermemory_openai import SupermemoryOpenAI, SupermemoryInfiniteChatConfigWithProviderName

async def main():
    # Initialize client
    client = SupermemoryOpenAI(
        supermemory_api_key="your-supermemory-api-key",
        config=SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai",
            provider_api_key="your-openai-api-key",
        )
    )
    
    # Create chat completion
    response = await client.chat_completion(
        messages=[
            {"role": "user", "content": "Hello, how are you?"}
        ],
        model="gpt-4o"
    )
    
    print(response.choices[0].message.content)

asyncio.run(main())
```

### Using Memory Tools

```python
import asyncio
from supermemory_openai import SupermemoryOpenAI, SupermemoryTools, SupermemoryInfiniteChatConfigWithProviderName

async def main():
    # Initialize client and tools
    client = SupermemoryOpenAI(
        supermemory_api_key="your-supermemory-api-key",
        config=SupermemoryInfiniteChatConfigWithProviderName(
            provider_name="openai", 
            provider_api_key="your-openai-api-key",
        )
    )
    
    tools = SupermemoryTools(
        api_key="your-supermemory-api-key",
        config={"project_id": "my-project"}
    )
    
    # Chat with memory tools
    response = await client.chat_completion(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant with access to user memories."
            },
            {
                "role": "user", 
                "content": "Remember that I prefer tea over coffee"
            }
        ],
        tools=tools.get_tool_definitions(),
        model="gpt-4o"
    )
    
    print(response.choices[0].message.content)

asyncio.run(main())
```

## Configuration

### Provider Configuration

#### Using Provider Names

```python
from supermemory_openai import SupermemoryInfiniteChatConfigWithProviderName

config = SupermemoryInfiniteChatConfigWithProviderName(
    provider_name="openai",  # or "anthropic", "groq", "openrouter", etc.
    provider_api_key="your-provider-api-key",
    headers={"custom-header": "value"}  # optional
)
```

#### Using Custom URLs

```python
from supermemory_openai import SupermemoryInfiniteChatConfigWithProviderUrl

config = SupermemoryInfiniteChatConfigWithProviderUrl(
    provider_url="https://your-custom-endpoint.com/v1",
    provider_api_key="your-provider-api-key",
    headers={"custom-header": "value"}  # optional
)
```

### Supported Providers

- `openai` - OpenAI API
- `anthropic` - Anthropic Claude
- `openrouter` - OpenRouter
- `deepinfra` - DeepInfra
- `groq` - Groq
- `google` - Google AI
- `cloudflare` - Cloudflare Workers AI

## Memory Tools

### SupermemoryTools Class

```python
from supermemory_openai import SupermemoryTools

tools = SupermemoryTools(
    api_key="your-supermemory-api-key",
    config={
        "project_id": "my-project",  # or use container_tags
        "base_url": "https://custom-endpoint.com",  # optional
    }
)

# Search memories
result = await tools.search_memories(
    information_to_get="user preferences",
    limit=10,
    include_full_docs=True
)

# Add memory  
result = await tools.add_memory(
    memory="User prefers tea over coffee"
)

# Fetch specific memory
result = await tools.fetch_memory(
    memory_id="memory-id-here"
)
```

### Individual Tools

```python
from supermemory_openai import (
    create_search_memories_tool,
    create_add_memory_tool, 
    create_fetch_memory_tool
)

search_tool = create_search_memories_tool("your-api-key")
add_tool = create_add_memory_tool("your-api-key")
fetch_tool = create_fetch_memory_tool("your-api-key")
```

### Function Calling Integration

```python
from supermemory_openai import execute_memory_tool_calls

# After getting tool calls from OpenAI
if response.choices[0].message.tool_calls:
    tool_results = await execute_memory_tool_calls(
        api_key="your-supermemory-api-key",
        tool_calls=response.choices[0].message.tool_calls,
        config={"project_id": "my-project"}
    )
    
    # Add tool results to conversation
    messages.append(response.choices[0].message)
    messages.extend(tool_results)
```

## API Reference

### SupermemoryOpenAI

Enhanced OpenAI client with infinite context support.

#### Constructor

```python
SupermemoryOpenAI(
    supermemory_api_key: str,
    config: Optional[SupermemoryInfiniteChatConfig] = None
)
```

#### Methods

- `chat_completion()` - Create chat completion with simplified interface
- `create_chat_completion()` - Create chat completion with full OpenAI parameters

### SupermemoryTools

Memory management tools for function calling.

#### Constructor

```python
SupermemoryTools(
    api_key: str,
    config: Optional[SupermemoryToolsConfig] = None
)
```

#### Methods

- `get_tool_definitions()` - Get OpenAI function definitions
- `search_memories()` - Search user memories
- `add_memory()` - Add new memory
- `fetch_memory()` - Fetch specific memory by ID
- `execute_tool_call()` - Execute individual tool call

## Error Handling

```python
try:
    response = await client.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        model="gpt-4o"
    )
except Exception as e:
    print(f"Error: {e}")
```

## Environment Variables

Set these environment variables for testing:

- `SUPERMEMORY_API_KEY` - Your Supermemory API key
- `PROVIDER_API_KEY` - Your AI provider API key
- `PROVIDER_NAME` - Provider name (default: "openai")  
- `PROVIDER_URL` - Custom provider URL (optional)
- `MODEL_NAME` - Model to use (default: "gpt-4o-mini")
- `SUPERMEMORY_BASE_URL` - Custom Supermemory base URL (optional)

## Development

### Setup

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone and setup
git clone <repository-url>
cd packages/openai-sdk-python
uv sync --dev
```

### Testing

```bash
# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=supermemory_openai

# Run specific test file
uv run pytest tests/test_infinite_chat.py
```

### Type Checking

```bash
uv run mypy src/supermemory_openai
```

### Formatting

```bash
uv run black src/ tests/
uv run isort src/ tests/
```

## License

MIT License - see LICENSE file for details.

## Links

- [Supermemory](https://supermemory.ai) - Infinite context memory platform
- [OpenAI Python SDK](https://github.com/openai/openai-python) - Official OpenAI Python library
- [Documentation](https://docs.supermemory.ai) - Full API documentation
