# AGENTS.md

## Overview

This package adds persistent memory to Pipecat voice AI pipelines using Supermemory.

**Tech Stack:** Python >=3.10, Pipecat, Supermemory SDK

## Commands

```bash
pip install supermemory-pipecat
```

## Integration Pattern

Place `SupermemoryPipecatService` between context aggregator and LLM in the pipeline:

```python
from supermemory_pipecat import SupermemoryPipecatService

memory = SupermemoryPipecatService(
    user_id="user-123",       # Required: identifies the user
    session_id="session-456", # Optional: groups conversations
)

pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    memory,                    # <- Memory service here
    llm,
    tts,
    transport.output(),
    context_aggregator.assistant(),
])
```

## Configuration

```python
memory = SupermemoryPipecatService(
    api_key="...",             # Or use SUPERMEMORY_API_KEY env var
    user_id="user-123",
    session_id="session-456",
    params=SupermemoryPipecatService.InputParams(
        search_limit=10,       # Max memories to retrieve
        search_threshold=0.1,  # Similarity threshold 0.0-1.0
        mode="full",           # "profile" | "query" | "full"
        system_prompt="Based on previous conversations:\n\n",
    ),
)
```

## Memory Modes

| Mode | Retrieves | Use When |
|------|-----------|----------|
| `"profile"` | User profile only | Personalization without search |
| `"query"` | Search results only | Finding relevant past context |
| `"full"` | Profile + search | Complete memory (default) |

## Environment Variables

- `SUPERMEMORY_API_KEY` - Supermemory API key
- `OPENAI_API_KEY` - For OpenAI services (STT/LLM/TTS)

## Boundaries

- Always place memory service after `context_aggregator.user()` and before `llm`
- Always provide `user_id` - it's required
- Never hardcode API keys in code - use environment variables
