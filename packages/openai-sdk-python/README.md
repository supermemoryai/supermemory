# Supermemory OpenAI Python SDK

Memory tools for OpenAI function calling with Supermemory integration.

This package provides memory management tools for the official [OpenAI Python SDK](https://github.com/openai/openai-python) using [Supermemory](https://supermemory.ai) capabilities.

## Installation

Install using uv (recommended):

```bash
uv add supermemory-openai-sdk
```

Or with pip:

```bash
pip install supermemory-openai-sdk
```

## Quick Start

### Using Memory Tools with OpenAI

```python
import asyncio
import openai
from supermemory_openai import SupermemoryTools, execute_memory_tool_calls

async def main():
    # Initialize OpenAI client
    client = openai.AsyncOpenAI(api_key="your-openai-api-key")
    
    # Initialize Supermemory tools
    tools = SupermemoryTools(
        api_key="your-supermemory-api-key",
        config={"project_id": "my-project"}
    )
    
    # Chat with memory tools
    response = await client.chat.completions.create(
        model="gpt-4o",
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
        tools=tools.get_tool_definitions()
    )
    
    # Handle tool calls if present
    if response.choices[0].message.tool_calls:
        tool_results = await execute_memory_tool_calls(
            api_key="your-supermemory-api-key",
            tool_calls=response.choices[0].message.tool_calls,
            config={"project_id": "my-project"}
        )
        print("Tool results:", tool_results)
    
    print(response.choices[0].message.content)

asyncio.run(main())
```

## Configuration

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
- `OPENAI_API_KEY` - Your OpenAI API key
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
