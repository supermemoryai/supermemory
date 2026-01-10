# agents.md

Agent knowledge file for Supermemory Pipecat SDK. This describes how Supermemory integrates with Pipecat for memory-enhanced voice AI.

## What This Package Does

Supermemory Pipecat SDK provides a `FrameProcessor` that intercepts conversation frames, retrieves relevant memories from Supermemory, injects them into the LLM context, and stores new messages.

## Package Structure

```
packages/pipecat-sdk-python/
├── src/supermemory_pipecat/
│   ├── __init__.py        # Exports: SupermemoryPipecatService
│   ├── service.py         # Main FrameProcessor class
│   ├── exceptions.py      # Error hierarchy
│   └── utils.py           # Helpers: get_last_user_message, deduplicate_memories
├── pyproject.toml         # Package: supermemory-pipecat
└── README.md
```

## Core Class: SupermemoryPipecatService

Extends `pipecat.processors.frame_processor.FrameProcessor`.

### Constructor Parameters

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `user_id` | str | Yes | - |
| `session_id` | str | No | None |
| `api_key` | str | No | `SUPERMEMORY_API_KEY` env |
| `params` | InputParams | No | defaults |
| `base_url` | str | No | `https://api.supermemory.ai` |

### InputParams Configuration

```python
InputParams(
    search_limit=10,           # Max memories to retrieve
    search_threshold=0.1,      # Similarity threshold (0.0-1.0)
    mode="full",               # "profile" | "query" | "full"
    add_memory="always",       # "always" | "never"
    add_as_system_message=True,
    system_prompt="Based on previous conversations, I recall:\n\n",
    position=1,
)
```

### Key Mappings

- `user_id` → `container_tag` (direct, no transformation)
- `session_id` → `custom_id` (in Supermemory API)

## How It Works

### Pipeline Position

```
[Transport] → [STT] → [UserContext] → [SupermemoryPipecatService] → [LLM] → [TTS] → [Output]
```

### Frame Processing Flow

1. **Intercept**: Catches `LLMContextFrame`, `OpenAILLMContextFrame`, `LLMMessagesFrame`
2. **Extract**: Gets last user message from context
3. **Track**: Stores message in `_conversation_history` (clean, no injections)
4. **Retrieve**: Calls Supermemory `/v4/profile` API
5. **Inject**: Adds formatted memories to context as system message
6. **Store**: Sends last user message to Supermemory (background, non-blocking)
7. **Push**: Forwards enhanced frame downstream

### Supermemory API Integration

**Retrieval** - `POST /v4/profile`:
```json
{
  "containerTag": "user-123",
  "q": "What's the weather?",
  "limit": 10,
  "threshold": 0.1
}
```

**Response**:
```json
{
  "profile": {
    "static": ["User lives in SF", "Prefers Celsius"],
    "dynamic": ["Recently asked about weather"]
  },
  "searchResults": {
    "results": [{"memory": "User likes sunny weather"}]
  }
}
```

**Storage** - via `supermemory.memories.add()`:
```python
{
    "content": "User: What's the weather?",
    "container_tags": ["user-123"],
    "custom_id": "session-456",
    "metadata": {"platform": "pipecat"}
}
```

## Memory Modes

| Mode | Static Profile | Dynamic Profile | Search Results |
|------|----------------|-----------------|----------------|
| `profile` | Yes | Yes | No |
| `query` | No | No | Yes |
| `full` | Yes | Yes | Yes |

## Instance State

```python
self.user_id: str                          # User identifier
self.container_tag: str                    # Same as user_id
self.session_id: Optional[str]             # Session grouping
self._conversation_history: List[Dict]     # Clean message history
self._last_query: Optional[str]            # Dedup tracking
self._supermemory_client                   # Supermemory SDK client
```

## Error Handling

- Memory retrieval failures: Log warning, continue without memories
- Memory storage failures: Log error, don't crash pipeline
- Frame processing errors: Log error, pass original frame through

## Sample Usage

```python
from supermemory_pipecat import SupermemoryPipecatService

# Create service
memory = SupermemoryPipecatService(
    api_key=os.getenv("SUPERMEMORY_API_KEY"),
    user_id="user-123",
    session_id="conv-456",
    params=SupermemoryPipecatService.InputParams(
        mode="full",
        add_memory="always",
    ),
)

# Add to pipeline
pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    memory,  # ← Intercepts here, retrieves/injects/stores
    llm,
    tts,
    transport.output(),
    context_aggregator.assistant(),
])
```

## Full Working Example

```python
"""Pipecat + Supermemory Voice Bot"""

import os
from fastapi import FastAPI, WebSocket
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.serializers.protobuf import ProtobufFrameSerializer

from supermemory_pipecat import SupermemoryPipecatService

app = FastAPI()

SYSTEM_PROMPT = """You are a helpful voice assistant with memory.
Keep responses brief. Your output will be converted to audio."""

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
            serializer=ProtobufFrameSerializer(),
        ),
    )

    stt = OpenAISTTService(api_key=os.getenv("OPENAI_API_KEY"))
    llm = OpenAILLMService(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4o-mini")
    tts = OpenAITTSService(api_key=os.getenv("OPENAI_API_KEY"), voice="alloy")

    # Supermemory integration
    memory = SupermemoryPipecatService(
        user_id="test-user",
        session_id="voice-session",
    )

    context = OpenAILLMContext([{"role": "system", "content": SYSTEM_PROMPT}])
    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        memory,
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))
    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

## Key Files Reference

- `service.py:46` - `SupermemoryPipecatService` class definition
- `service.py:96` - `__init__()` constructor
- `service.py:157` - `_retrieve_memories()` API call
- `service.py:218` - `_store_message()` storage logic
- `service.py:264` - `_enhance_context_with_memories()` injection
- `service.py:328` - `process_frame()` main entry point

## Differences from Mem0

| Aspect | Mem0 | Supermemory |
|--------|------|-------------|
| Identity | `user_id`, `agent_id`, `run_id` | `user_id` only (= container_tag) |
| Retrieval | `memory.search()` | `/v4/profile` (static + dynamic + search) |
| Storage | Full conversation | Last user message only |
| Metadata | `{"platform": "pipecat"}` | `{"platform": "pipecat"}` |
| Session | N/A | `session_id` → `custom_id` |
