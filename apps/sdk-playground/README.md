# SDK Agent Playground

Chat with a **real agent** and switch which Supermemory SDK integration powers it.

> [!WARNING]
> This is a local, single-user development tool. It makes real API calls, stores
> browser-entered keys only in memory unless you opt into tab-scoped
> `sessionStorage`, and exposes tools that can permanently delete documents. Use
> disposable development credentials and a test container; do not deploy it or
> point it at production data.

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

Prerequisites: Bun 1.3.6, Python 3.11+, and
[`uv`](https://docs.astral.sh/uv/). Portless is required only for the HTTPS
development hostname; the direct localhost commands below work without it.

From the repository root:

```bash
bun install --frozen-lockfile

cp apps/sdk-playground/.env.example apps/sdk-playground/.env.local
# Required:
# SUPERMEMORY_API_KEY=...
# OPENAI_API_KEY=...
```

The playground scripts build `@supermemory/tools` first and
`@supermemory/ai-sdk` second before starting, type-checking, or building the
Next.js app. Development mode also watches both workspace packages.

## Run

```bash
bun run --cwd apps/sdk-playground dev
```

Opens:

- **Chat UI** — https://sdk.dev.supermemory.ai via Portless
- **Next.js server** — http://127.0.0.1:3005
- **Python server** — http://127.0.0.1:8792

To run without Portless, use two terminals:

```bash
bun run --cwd apps/sdk-playground dev:next
bun run --cwd apps/sdk-playground dev:python
```

For a production-mode local smoke check, build first and then start. `start`
runs both the built Next.js app and the Python server, and remains intended for
local use only.

```bash
bun run --cwd apps/sdk-playground build
bun run --cwd apps/sdk-playground start
```

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
| `SDK_PLAYGROUND_PYTHON_URL` | optional (default `http://127.0.0.1:8792`) |
| `SDK_PLAYGROUND_PYTHON_PORT` | optional (default `8792`) |
| `SDK_PLAYGROUND_ALLOW_ENV_KEYS` | optional; set `true` only when a trusted non-local hostname must use server env keys |

Server environment keys are exposed to the playground routes only on loopback
hosts and `sdk.dev.supermemory.ai` by default. Browser-provided keys remain
request-scoped and are never copied into process-global environment variables.
