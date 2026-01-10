# Supermemory Pipecat SDK

Memory-enhanced conversational AI pipelines with [Supermemory](https://supermemory.ai) and [Pipecat](https://github.com/pipecat-ai/pipecat).

## Installation

```bash
pip install supermemory-pipecat
```

## Quick Start

```python
import os
from pipecat.pipeline.pipeline import Pipeline
from pipecat.services.openai import OpenAILLMService, OpenAIUserContextAggregator
from supermemory_pipecat import SupermemoryPipecatService

# Create memory service
memory = SupermemoryPipecatService(
    api_key=os.getenv("SUPERMEMORY_API_KEY"),
    user_id="user-123",  # Required: used as container_tag
    session_id="conversation-456",  # Optional: groups memories by session
)

# Create pipeline with memory
pipeline = Pipeline([
    transport.input(),
    stt,
    user_context,
    memory,  # Automatically retrieves and injects relevant memories
    llm,
    transport.output(),
])
```

## Configuration

### Parameters

| Parameter    | Type        | Required | Description                                                |
| ------------ | ----------- | -------- | ---------------------------------------------------------- |
| `user_id`    | str         | **Yes**  | User identifier - used as container_tag for memory scoping |
| `session_id` | str         | No       | Session/conversation ID for grouping memories              |
| `api_key`    | str         | No       | Supermemory API key (or set `SUPERMEMORY_API_KEY` env var) |
| `params`     | InputParams | No       | Advanced configuration                                     |
| `base_url`   | str         | No       | Custom API endpoint                                        |

### Advanced Configuration

```python
from supermemory_pipecat import SupermemoryPipecatService

memory = SupermemoryPipecatService(
    user_id="user-123",
    session_id="conv-456",
    params=SupermemoryPipecatService.InputParams(
        search_limit=10,           # Max memories to retrieve
        search_threshold=0.1,      # Similarity threshold
        mode="full",               # "profile", "query", or "full"
        add_memory="always",       # "always" or "never"
        add_as_system_message=True,
        system_prompt="Based on previous conversations, I recall:\n\n",
    ),
)
```

### Memory Modes

| Mode        | Static Profile | Dynamic Profile | Search Results |
| ----------- | -------------- | --------------- | -------------- |
| `"profile"` | Yes            | Yes             | No             |
| `"query"`   | No             | No              | Yes            |
| `"full"`    | Yes            | Yes             | Yes            |

## How It Works

1. **Intercepts context frames** - Listens for `LLMContextFrame` in the pipeline
2. **Tracks conversation** - Maintains clean conversation history (no injected memories)
3. **Retrieves memories** - Queries `/v4/profile` API with user's message
4. **Injects memories** - Formats and adds to LLM context as system message
5. **Stores messages** - Sends last user message to Supermemory (background, non-blocking)

### What Gets Stored

Only the last user message is sent to Supermemory:

```
User: What's the weather like today?
```

Stored as:

```json
{
  "content": "User: What's the weather like today?",
  "container_tags": ["user-123"],
  "custom_id": "conversation-456",
  "metadata": { "platform": "pipecat" }
}
```

## Full Example

```python
import asyncio
import os
from fastapi import FastAPI, WebSocket
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.pipeline.runner import PipelineRunner
from pipecat.services.openai import (
    OpenAILLMService,
    OpenAIUserContextAggregator,
)
from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketTransport,
    FastAPIWebsocketParams,
)
from supermemory_pipecat import SupermemoryPipecatService

app = FastAPI()

@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(audio_out_enabled=True),
    )

    user_context = OpenAIUserContextAggregator()

    # Supermemory memory service
    memory = SupermemoryPipecatService(
        user_id="alice",
        session_id="session-123",
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4",
    )

    pipeline = Pipeline([
        transport.input(),
        user_context,
        memory,
        llm,
        transport.output(),
    ])

    runner = PipelineRunner()
    task = PipelineTask(pipeline)
    await runner.run(task)
```

## Conversation History

Access the tracked conversation (without injected memories):

```python
# Get conversation history
history = memory.get_conversation_history()
# [{"role": "user", "content": "Hello"}, {"role": "user", "content": "What's my name?"}]

# Clear history
memory.clear_conversation_history()
```

## License

MIT
