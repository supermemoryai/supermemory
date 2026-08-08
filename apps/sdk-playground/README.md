# SDK Agent Playground

Chat with a **real agent** and switch which Supermemory SDK integration powers it.

## Integrations

| SDK | Style | What happens |
|-----|-------|----------------|
| AI SDK + middleware | automatic | `withSupermemory` injects context + saves chat |
| OpenAI + middleware | automatic | same, via OpenAI client wrapper |
| AI SDK + tools | explicit | model calls 7 memory tools via `generateText` |
| OpenAI + tools | explicit | OpenAI function-calling loop |
| `@supermemory/ai-sdk` | explicit | re-export of tools/ai-sdk |
| Python OpenAI middleware | automatic | `with_supermemory` |
| Python OpenAI tools | explicit | `SupermemoryTools` loop |
| Python supermemory direct | manual | `profile()` + OpenAI + `add()` |

## Setup

```bash
bun install

cp .env.example .env.local
# Required:
# SUPERMEMORY_API_KEY=...
# OPENAI_API_KEY=...
```

## Run

```bash
cd apps/sdk-playground
bun run dev
```

Opens:

- **Chat UI** — http://localhost:3005 (or `sdk.dev.supermemory` via Portless)
- **Python server** — http://127.0.0.1:8791 (for Python SDKs)

Try:

- "Remember that I prefer oat milk in coffee"
- "What do you know about my drink preferences?"
- "Forget that I like tea" (tools mode)

## Env

| Variable | Required |
|----------|----------|
| `SUPERMEMORY_API_KEY` | yes |
| `OPENAI_API_KEY` | yes |
| `SUPERMEMORY_BASE_URL` | optional |
| `MODEL_NAME` | optional (default `gpt-4o-mini`) |
