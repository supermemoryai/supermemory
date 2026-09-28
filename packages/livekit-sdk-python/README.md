# Supermemory LiveKit SDK

Persistent memory for [LiveKit Agents](https://docs.livekit.io/agents/) voice sessions, powered by [Supermemory](https://supermemory.ai).

The plugin recalls the caller's profile and relevant memories before each reply, stores the call as one conversation, and gives the model tools to search, remember, and forget. A Supermemory outage does not end the call.

## Installation

```bash
pip install supermemory-livekit
```

```bash
export SUPERMEMORY_API_KEY=your_supermemory_api_key
```

Create a key at [console.supermemory.ai](https://console.supermemory.ai).

## Quick start

Scope memory with a stable caller id. A LiveKit participant identity works when it is already a container tag (`letters`, `numbers`, `_`, `-`, `:`). Otherwise set the participant attribute `supermemory_container_tag`.

```python
import json
import os

from livekit import agents
from livekit.agents import AgentServer, AgentSession, ChatContext, JobContext
from supermemory_livekit import SupermemoryAgent, SupermemoryLiveKit

server = AgentServer()


@server.rtc_session(agent_name="memory-agent")
async def entrypoint(ctx: JobContext):
    memory = SupermemoryLiveKit(api_key=os.getenv("SUPERMEMORY_API_KEY"))
    metadata = json.loads(ctx.job.metadata or "{}")
    container_tag = metadata.get("container_tag")
    if container_tag:
        memory.bind(container_tag=container_tag, session_id=ctx.room.name)

    chat_ctx = ChatContext()
    if container_tag:
        await memory.preload(chat_ctx)

    await ctx.connect()
    if not container_tag:
        participant = await ctx.wait_for_participant()
        memory.bind(participant=participant, session_id=ctx.room.name)

    session = AgentSession(
        stt="deepgram/nova-3:en",
        llm="openai/gpt-4.1-mini",
        tts="cartesia/sonic-3",
    )
    memory.attach(session)
    await session.start(
        room=ctx.room,
        agent=SupermemoryAgent(
            memory,
            chat_ctx=chat_ctx,
            instructions=(
                "You are a helpful voice assistant. You remember this caller across calls. "
                "Use that naturally, and do not mention the memory system."
            ),
        ),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
```

If you already have an `Agent` subclass, pass `tools=memory.tools()` and recall from `llm_node`:

```python
async def llm_node(self, chat_ctx, tools, model_settings):
    await memory.enrich(chat_ctx)
    return Agent.default.llm_node(self, chat_ctx, tools, model_settings)
```

Recall in `llm_node`, not `on_user_turn_completed`: changing the turn context in that hook makes LiveKit discard its preemptive generation. Realtime models skip `llm_node`, so with one call `await memory.on_user_turn_completed(turn_ctx, new_message)` from `on_user_turn_completed`. `SupermemoryAgent` picks the right hook for you. Call capture listens to `conversation_item_added`.

## Configuration

```python
from supermemory_livekit import InputParams, SupermemoryLiveKit

memory = SupermemoryLiveKit(
    container_tag="user_123",
    session_id="room-123",
    params=InputParams(
        mode="full",            # "profile" | "query" | "full"
        search_limit=10,
        search_threshold=0.1,
        recall_timeout=2.0,     # seconds; a slow recall is skipped
        capture="always",       # "always" | "never"
        capture_dreaming="dynamic",  # "dynamic" | "instant" (ready within a minute, extra operation)
    ),
)
```

| Mode | Profile | Search | Use when |
| --- | --- | --- | --- |
| `profile` | Yes | No | You only need durable facts |
| `query` | No | Yes | You only need memories related to this turn |
| `full` | Yes | Yes | Default |

One call is stored as a single document under custom id `lk-<session_id>`, so a reconnect with the same session id updates that document instead of creating another. Explicit `remember` calls are separate facts, processed right away so the next call can recall them, and are not tied to the call document.

## Links

- [Docs](https://supermemory.ai/docs/integrations/livekit)
- [LiveKit Agents](https://docs.livekit.io/agents/)
