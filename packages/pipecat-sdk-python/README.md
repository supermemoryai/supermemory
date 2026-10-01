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
from pipecat.processors.aggregators.llm_context import LLMContext
from supermemory_pipecat import SupermemoryPipecatService

# Create memory service
memory = SupermemoryPipecatService(
    api_key=os.getenv("SUPERMEMORY_API_KEY"),
    user_id="user-123",  # Required: used as container_tag
    session_id="conversation-456",  # Optional: groups memories by session
)

# Use the universal LLM context supported by current Pipecat releases.
context = LLMContext([{"role": "system", "content": "You are a helpful assistant."}])
context_aggregator = llm.create_context_aggregator(context)

# Create pipeline with memory
pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    memory,  # Automatically retrieves and injects relevant memories
    llm,
    transport.output(),
    context_aggregator.assistant(),
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
        inject_mode="auto",        # "auto", "system", or "user"
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

1. **Intercepts context frames** - Listens for Pipecat's universal `LLMContextFrame` (and legacy 0.x frames)
2. **Tracks conversation** - Separates real conversation messages from tagged memory context
3. **Retrieves memories** - Queries `/v4/profile` API with user's message
4. **Injects memories** - Uses a system message for audio/system mode and a tagged user message otherwise
5. **Stores messages** - Serializes newly observed user and assistant messages through a background queue that drains during cleanup

### What Gets Stored

New user and assistant messages are stored as a JSON conversation segment. The
injected `<user_memories>` message is filtered out before storage and does not
advance the storage cursor.

For example, this conversation segment:

```
User: What's the weather like today?
Assistant: It's sunny today.
```

is sent to Supermemory as:

```json
{
  "content": "[{\"role\": \"user\", \"content\": \"What's the weather like today?\"}, {\"role\": \"assistant\", \"content\": \"It's sunny today.\"}]",
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
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.transports.websocket.fastapi import (
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
        params=FastAPIWebsocketParams(audio_in_enabled=True, audio_out_enabled=True),
    )

    # Gemini Live for speech-to-speech
    llm = GeminiLiveLLMService(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="models/gemini-2.5-flash-native-audio-preview-12-2025",
    )

    context = LLMContext([{"role": "system", "content": "You are a helpful assistant."}])
    context_aggregator = llm.create_context_aggregator(context)

    # Supermemory memory service
    memory = SupermemoryPipecatService(
        user_id="alice",
        session_id="session-123",
    )

    pipeline = Pipeline([
        transport.input(),
        context_aggregator.user(),
        memory,
        llm,
        transport.output(),
        context_aggregator.assistant(),
    ])

    runner = PipelineRunner()
    task = PipelineTask(pipeline)
    await runner.run(task)
```

## License

MIT
