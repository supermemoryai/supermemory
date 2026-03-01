# Supermemory Cartesia SDK

Memory-enhanced voice agents with [Supermemory](https://supermemory.ai) and [Cartesia Line](https://cartesia.ai/agents).

## Installation

```bash
pip install supermemory-cartesia
```

## Quick Start

```python
import os
from line.llm_agent import LlmAgent, LlmConfig
from line.voice_agent_app import VoiceAgentApp
from supermemory_cartesia import SupermemoryCartesiaAgent

async def get_agent(env, call_request):
    # Extract container_tag from call metadata (typically user ID)
    container_tag = call_request.metadata.get("user_id", "default-user")

    # Create base LLM agent
    base_agent = LlmAgent(
        model="gemini/gemini-2.5-flash-preview-09-2025",
        config=LlmConfig(
            system_prompt="You are a helpful voice assistant with memory.",
            introduction="Hello! Great to talk with you again!"
        )
    )

    # Wrap with Supermemory
    memory_agent = SupermemoryCartesiaAgent(
        agent=base_agent,
        api_key=os.getenv("SUPERMEMORY_API_KEY"),
        container_tag=container_tag,
        session_id=call_request.call_id,
    )

    return memory_agent

# Create voice agent app
app = VoiceAgentApp(get_agent=get_agent)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

## Configuration

### Parameters

| Parameter       | Type         | Required | Description                                                        |
| --------------- | ------------ | -------- | ------------------------------------------------------------------ |
| `agent`         | LlmAgent     | **Yes**  | The Cartesia Line agent to wrap                                    |
| `container_tag` | str          | **Yes**  | Primary container tag for memory scoping (e.g., user ID)           |
| `session_id`    | str          | No       | Session/conversation ID for grouping memories                      |
| `container_tags`| List[str]    | No       | Additional container tags for organization (e.g., ["org", "prod"]) |
| `api_key`       | str          | No       | Supermemory API key (or set `SUPERMEMORY_API_KEY` env var)         |
| `config`        | MemoryConfig | No       | Advanced configuration                                             |
| `base_url`      | str          | No       | Custom API endpoint                                                |

### Advanced Configuration

```python
from supermemory_cartesia import SupermemoryCartesiaAgent

memory_agent = SupermemoryCartesiaAgent(
    agent=base_agent,
    container_tag="user-123",
    session_id="session-456",
    container_tags=["org-acme", "prod"],  # Optional: additional tags
    config=SupermemoryCartesiaAgent.MemoryConfig(
        search_limit=10,           # Max memories to retrieve
        search_threshold=0.1,      # Similarity threshold
        mode="full",               # "profile", "query", or "full"
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

1. **Intercepts events** - Listens for `UserTurnEnded` events from Cartesia Line
2. **Retrieves memories** - Queries Supermemory `/v4/profile` API with user's message
3. **Enriches context** - Adds memories to event history as system message
4. **Stores messages** - Sends conversation to Supermemory (background, non-blocking)
5. **Passes to agent** - Forwards enriched event to wrapped LlmAgent

### What Gets Stored

User and assistant messages are sent to Supermemory:

```json
{
  "content": "User: What's the weather?\nAssistant: It's sunny today!",
  "container_tags": ["user-123", "org-acme", "prod"],
  "metadata": { "platform": "cartesia" }
}
```

## Architecture

Cartesia Line uses an event-driven architecture:

```
User Speaks (Audio)
    ↓
[Ink STT] → Automatic speech recognition
    ↓
UserTurnEnded Event {content: "user message", history: [...]}
    ↓
┌──────────────────────────────────────────────┐
│   SUPERMEMORY CARTESIA AGENT (Wrapper)       │
│                                              │
│  process(env, event):                        │
│    1. Intercept UserTurnEnded                │
│    2. Extract user message                   │
│    3. Query Supermemory API                  │
│    4. Enrich event.history with memories     │
│    5. Pass to wrapped LlmAgent               │
│    6. Store conversation (async background)  │
└──────────────────────────────────────────────┘
    ↓
AgentSendText Event {text: "response"}
    ↓
[Sonic TTS] → Ultra-fast speech synthesis
    ↓
Audio Output
```

## Comparison with Pipecat SDK

| Aspect                  | Pipecat                        | Cartesia Line                |
| ----------------------- | ------------------------------ | ---------------------------- |
| **Integration Pattern** | Extends `FrameProcessor`       | Wrapper around `LlmAgent`    |
| **Event Handling**      | `process_frame()` method       | `process()` method           |
| **Events**              | `LLMContextFrame`, `LLMMessagesFrame` | `UserTurnEnded`, `CallStarted` |
| **Context Object**      | `LLMContext.get_messages()`    | `event.history`              |
| **Memory Injection**    | Modify `context.add_message()` | Modify `event.history`       |

## Full Example with Tools

```python
import os
from line.llm_agent import LlmAgent, LlmConfig
from line.tools import LoopbackTool
from line.voice_agent_app import VoiceAgentApp
from supermemory_cartesia import SupermemoryCartesiaAgent

# Define custom tools
async def get_weather(location: str) -> str:
    return f"The weather in {location} is sunny, 72°F"

weather_tool = LoopbackTool(
    name="get_weather",
    description="Get current weather for a location",
    function=get_weather
)

async def get_agent(env, call_request):
    container_tag = call_request.metadata.get("user_id", "default-user")
    org_id = call_request.metadata.get("org_id")

    # Create LLM agent with tools
    base_agent = LlmAgent(
        model="gemini/gemini-2.5-flash-preview-09-2025",
        tools=[weather_tool],
        config=LlmConfig(
            system_prompt="You are a personal assistant with memory and tools.",
            introduction="Hi! How can I help you today?"
        )
    )

    # Wrap with Supermemory
    memory_agent = SupermemoryCartesiaAgent(
        agent=base_agent,
        api_key=os.getenv("SUPERMEMORY_API_KEY"),
        container_tag=container_tag,
        session_id=call_request.call_id,
        container_tags=[org_id] if org_id else None,
        config=SupermemoryCartesiaAgent.MemoryConfig(
            mode="full",
            search_limit=15,
            search_threshold=0.15,
        )
    )

    return memory_agent

app = VoiceAgentApp(get_agent=get_agent)
```

## Development

```bash
# Clone repository
git clone https://github.com/supermemoryai/supermemory
cd supermemory/packages/cartesia-sdk-python

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .
isort .
```

## License

MIT
