# Supermemory Pipecat SDK

Memory-enhanced conversational AI pipelines with [Supermemory](https://supermemory.ai) and [Pipecat](https://github.com/pipecat-ai/pipecat).

## Installation

```bash
pip install supermemory-pipecat
```

Version 0.2.0 requires the Supermemory Python SDK v5. Keep using `user_id=`;
the service passes that value as the namespace for profile, search, and writes.
`session_id` is passed as the v5 document `id` (previously `custom_id`).

## Quick Start

```python
import os
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.aggregators.llm_context import LLMContext
from supermemory_pipecat import SupermemoryPipecatService

# Create memory service
memory = SupermemoryPipecatService(
    api_key=os.getenv("SUPERMEMORY_API_KEY"),
    user_id="user-123",  # Required: scopes all memory calls
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
| `user_id`    | str         | **Yes**  | User identifier passed as the v5 namespace for memory scoping |
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
        inject_mode="auto",        # "auto", "user", or "system"
        storage_drain_timeout=3.0, # Seconds cleanup waits for pending writes
        system_prompt="Based on previous conversations, I recall:\n\n",
    ),
)
```

### Memory Modes

| Mode        | Profile block (system message) | Search block (user message) |
| ----------- | ------------------------------ | --------------------------- |
| `"profile"` | Yes                            | No                          |
| `"query"`   | No                             | Yes                         |
| `"full"`    | Yes                            | Yes                         |

### Where memories go

- **Profile:** fetched once per conversation, on the first context frame (even
  before the first user message), and appended as a `<user_memories>` block to the
  first system message, or sent as a new leading system message when there is
  none. It is never refreshed, so it stays byte-identical on every later request,
  and it never appears in a user message.
- **Search results:** each user turn is searched once, and the results are
  appended as a `<user_memories>` block to the user message they were retrieved
  for. Earlier user messages keep the block they first received. Results the
  profile already covers are skipped.
- **Tool calls:** steps inside a turn reuse that turn's block and never search again.
- **Turn identity:** a turn is keyed by its text plus the assistant reply before it,
  so a repeated question after a new reply is a new turn with its own search, and
  trimming old history from the front keeps every kept message's block.
- **Dates:** search results carry absolute dates (`[2026-03-04]`), never relative
  times, so the text does not change as time passes.

The system prompt and earlier turns therefore never change, and provider prompt
caches keep hitting. The only exception is a profile that loads late (its first
fetch failed), which changes the system prefix once.

### Injection modes

| Mode       | Behavior |
| ---------- | -------- |
| `"auto"`   | Default. Same as `"user"`. |
| `"user"`   | Appends each turn's search results to that turn's user message (cache-safe). |
| `"system"` | Rewrites this integration's search block in the system message every user turn, next to the profile block. Prompt caching does not apply. |

### Speech-to-speech models

Gemini Live and OpenAI Realtime read only the first context they receive from
Pipecat (0.0.98 through 1.7.0): apart from reconnects, later context frames only
forward new tool results, so neither a changed system message nor a new text user message reaches
the model mid-session, in any `inject_mode`. The default still gives these models
the profile, because it is fetched on the first context frame and is part of the
system instruction they start with. Per-turn search results do not reach them.
If you pass `system_instruction=` to `GeminiLiveLLMService`, Pipecat 1.x uses that
instead of the context's system message, so the profile is not included.

### Timeouts and failures

Recall waits at most 3 seconds (`RECALL_TIMEOUT_SECONDS`). Profile and search run
in parallel with no SDK retries; if either fails or times out, the turn continues
without it. A failed profile is fetched again on the next new user turn, and a
failed search is not cached as a result for later turns.

Every request to Supermemory sends `x-sm-source: pipecat-python` and
`x-sm-plugin-version` (this package's installed version).

## How It Works

1. **Intercepts context frames** - Listens for Pipecat's universal `LLMContextFrame` (and legacy 0.x frames)
2. **Keys turns** - Identifies each user turn by its text and the reply before it, ignoring tagged memory blocks
3. **Retrieves memories** - Reads the v5 profile once and, in `query` or `full` mode, searches the same namespace for each new user message
4. **Injects memories** - Puts the profile block in the system message and each turn's search block on its user message
5. **Stores messages** - Saves each finished turn, including its final reply, through a background queue

### What Gets Stored

Each finished turn (the user message, any tool calls and results, and the final
assistant reply) is stored as a JSON conversation segment once the next user turn
starts, and the last turn is stored during cleanup. System messages and the
injected `<user_memories>` blocks are left out. Saves never block the LLM call;
on cleanup the service waits at most `storage_drain_timeout` for pending writes.

For example, this conversation segment:

```
User: What's the weather like today?
Assistant: It's sunny today.
```

is added to the `user-123` namespace as:

```json
{
  "content": "[{\"role\": \"user\", \"content\": \"What's the weather like today?\"}, {\"role\": \"assistant\", \"content\": \"It's sunny today.\"}]",
  "id": "conversation-456",
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

    # The profile reaches Gemini Live through the opening system instruction
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
