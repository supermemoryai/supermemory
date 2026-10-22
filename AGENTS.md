# AGENTS.md

Context for AI coding agents (Claude Code, Cursor, Codex, OpenCode, Copilot and others) working with supermemory.

**supermemory** is context infrastructure for AI agents: memory, retrieval and user profiles through one API.
[Documentation](https://supermemory.ai/docs) · [Docs index for agents](https://supermemory.ai/docs/llms.txt) ·
[Console and API keys](https://console.supermemory.ai)

Two jobs, two sections:

- **Adding supermemory to another project?** Read [Use supermemory in an app](#use-supermemory-in-an-app).
- **Changing code in this repository?** Read [Work in this repository](#work-in-this-repository).

## Use supermemory in an app

### Start here

- Check the [docs index](https://supermemory.ai/docs/llms.txt) or the docs MCP (below) before writing any endpoint.
- `npx supermemory setup --prompt` prints the integration prompt for the current project. Plain `npx supermemory setup`
  launches a separate coding agent, so use `--prompt` when you are already an agent.
- `npx supermemory help --json` lists every CLI command in a machine-readable form.
- The official skill teaches the current (v5) API surface:

```bash
npx skills add https://github.com/supermemoryai/skills --skill supermemory
```

### Install and first calls

Set `SUPERMEMORY_API_KEY` (create a key in the [console](https://console.supermemory.ai)), then install SDK version 5
or later:

```bash
npm i supermemory        # TypeScript / JavaScript
pip install supermemory  # Python (3.10 or later)
```

Every memory call (add, search, profile, list, documents) takes a **namespace** first: one user, workspace or tenant.

```typescript
import { Supermemory } from "supermemory";

const supermemory = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

await supermemory.add("user_123", {
  content: "User prefers TypeScript",
  dreaming: "instant", // processed right away (one extra operation per document); the default "dynamic" batches extraction
});

const { results } = await supermemory.search("user_123", { query: "language preference" });
const { profile } = await supermemory.profile("user_123");
```

```python
import os
from supermemory import Supermemory

client = Supermemory(api_key=os.environ.get("SUPERMEMORY_API_KEY"))

client.add("user_123", content="User prefers TypeScript", dreaming="instant")
response = client.search("user_123", query="language preference")
profile = client.profile("user_123").profile
```

### API rules

- **Auth:** `Authorization: Bearer $SUPERMEMORY_API_KEY` is the only supported header.
- **Write:** `POST https://api.supermemory.ai/ns/{namespace}/document`
- **Search:** `POST https://api.supermemory.ai/ns/{namespace}/search`
- **Profile:** `POST https://api.supermemory.ai/ns/{namespace}/profile`
- **Scoping:** every write and every search names exactly one namespace, in the URL path. Never in the body or a
  header.
- **Search modes:** `"chunks"` for RAG, `"memories"` for extracted memories, `"hybrid"` (default) for both. The option is
  `searchMode` in the API and TypeScript, `search_mode` in Python.
- **Readiness:** processing is async. Wait until `system.status` is `done` before searching chunks, and until
  `system.dreamingStatus` is `done` before reading memories or the profile.

### Do NOT use

These are deprecated, undocumented or made up:

- **Endpoints:** `/v1/...`, `/v3/documents`, `/v3/search`, `/v4/search`, `/v4/profile`, `/v4/memories`
- **Headers:** `x-supermemory-api-key`, `x-api-key`, `x-sm-user-id`
- **Body keys:** `containerTag`, `containerTags`, `customId` (use `id`), `entityContext` (use `supportingContext`),
  `filterByMetadata` (use `group`), `documentDate` (use `date`), `q` (use `query`), `filters` (use `filter`), `userId`,
  `spaces`. One exception: scoped-key creation (`POST /v3/auth/scoped-key`) still takes `containerTag` or
  `containerTags` ([API keys & auth](https://supermemory.ai/docs/authentication)).
- **SDK calls:** `client.add({ containerTag })`, `client.search.execute`, `client.memories.add`,
  `client.memories.updateMemory`, `client.profile({ q })`

Code on v3/v4 moves with `npx supermemory@latest migrate --prompt`, which prints the migration prompt for you to follow
([migration guide](https://supermemory.ai/docs/migration/api-v5)).

### Docs MCP

Searches these docs while you code. Server: `https://supermemory.ai/docs/mcp`

```bash
claude mcp add --transport http supermemory-docs https://supermemory.ai/docs/mcp   # Claude Code
codex mcp add supermemory-docs --url https://supermemory.ai/docs/mcp               # Codex
```

Cursor (`~/.cursor/mcp.json`) and most other clients:

```json
{ "mcpServers": { "supermemory-docs": { "url": "https://supermemory.ai/docs/mcp" } } }
```

This is not the memory MCP. The docs MCP only searches documentation.

### Memory for the coding agent itself

| Agent | Install | Guide |
| --- | --- | --- |
| Claude Code | `/plugin marketplace add supermemoryai/claude-supermemory`, then `/plugin install supermemory` | [docs](https://supermemory.ai/docs/integrations/claude-code) |
| Cursor | `/add-plugin cursor-supermemory`, or Supermemory in the Cursor Marketplace | [docs](https://supermemory.ai/docs/integrations/cursor) |
| Codex | `npx codex-supermemory@latest install`, then restart Codex CLI | [docs](https://supermemory.ai/docs/integrations/codex) |
| OpenCode | `bunx opencode-supermemory@latest install --no-tui` | [docs](https://supermemory.ai/docs/integrations/opencode) |
| Hermes | `hermes plugins install supermemoryai/hermes-supermemory`, `hermes plugins enable supermemory`, then `hermes memory setup` | [repo](https://github.com/supermemoryai/hermes-supermemory) |
| OpenClaw | `openclaw plugins install @supermemory/openclaw-supermemory` | [docs](https://supermemory.ai/docs/integrations/openclaw) |
| Any MCP client | Remote server `https://mcp.supermemory.ai/mcp` (OAuth sign-in, no API key) | [docs](https://supermemory.ai/docs/supermemory-mcp/mcp) |

Each plugin handles its own sign-in (browser login or its own key variable), so follow its guide rather than assuming
`SUPERMEMORY_API_KEY`.

Framework guides (Vercel AI SDK, OpenAI SDK, OpenAI Agents SDK, LangChain, LangGraph, Mastra, CrewAI, Agno, Microsoft
Agent Framework, VoltAgent, Convex, Pipecat, LiveKit and more) are listed in the
[docs index](https://supermemory.ai/docs/llms.txt).

### Self-hosted

`npx supermemory local` runs a local server, at `http://localhost:6767` by default. Point the SDK at it with
`baseUrl: "http://localhost:6767"` (TypeScript) or `base_url="http://localhost:6767"` (Python). The v5 SDKs need
`supermemory-server` v0.0.9 or later. [Guide](https://supermemory.ai/docs/self-hosting/overview)

## Work in this repository

A Bun + Turbo monorepo. The `supermemory` SDKs on npm and PyPI are built in separate repositories, not here.

### Requirements

- Bun 1.3.6 (the `packageManager` field). Use Bun only; the lockfile is `bun.lock`.
- Node 20 or later.
- Python 3.10 or later, plus `uv` for `packages/openai-sdk-python` and `apps/sdk-playground`.

### Do NOT

- Use npm, yarn or pnpm in this repo.
- Bump versions in `packages/tools/package.json`, `packages/memory-graph/package.json` or
  `packages/*-python/pyproject.toml` unless asked. The `publish-*.yml` workflows publish when those change on `main`.
- Edit the workflows in `.github/workflows/` unless asked.
- Migrate the Python packages to the v5 SDK unless asked. Most of them still target supermemory 3.x/4.x and use
  `container_tag` on purpose.
- Commit `.env` files, API keys or credentials.

### Repository map

| Path | What it is |
| --- | --- |
| `apps/web/` | Redirects to the console (needs no env) |
| `apps/mcp/` | The MCP server (workspace `supermemory-mcp`; not the npm package of that name). Hosted at `https://mcp.supermemory.ai/mcp` |
| `apps/docs/` | Documentation site |
| `apps/memory-graph-playground/` | Demo app for the memory graph component |
| `apps/sdk-playground/` | Playground for the SDK integrations |
| `packages/tools/` | `@supermemory/tools`: memory tools for the AI SDK, OpenAI, VoltAgent and Mastra |
| `packages/memory-graph/` | `@supermemory/memory-graph`: interactive memory graph component |
| `packages/openai-sdk-python/` | `supermemory-openai-sdk`: memory tools for OpenAI function calling |
| `packages/agent-framework-python/` | `supermemory-agent-framework`: Microsoft Agent Framework integration |
| `packages/pipecat-sdk-python/` | `supermemory-pipecat`: Pipecat integration |
| `packages/cartesia-sdk-python/` | `supermemory-cartesia`: Cartesia Line integration |
| `packages/livekit-sdk-python/` | LiveKit Agents integration |
| `packages/ui/` | Shared UI components |
| `packages/lib/` | Shared utilities and logic |
| `packages/hooks/` | Shared React hooks |
| `packages/validation/` | Zod schemas and validation |
| `packages/docs-test/` | Runs the code samples from the docs |
| `skills/` | Older copy of the supermemory skill, still on the v3/v4 API. The current skill is [supermemoryai/skills](https://github.com/supermemoryai/skills) |

`CLAUDE.md` in this repo predates the v5 API. Where it differs from this file, follow this file.

### Setup and commands

```bash
bun install
bun run dev:local      # every app on localhost: web 3000, mcp 8788, docs 3003, graph playground 3004, sdk playground 3005
bun run check-types    # TypeScript across the monorepo
bunx turbo run build   # build everything
```

`dev:local` also needs Python and `uv` (the sdk playground runs `uv run server.py`) and network access (the docs run
Mintlify). Use `bunx turbo run build` rather than `bun run build`: the root `postbuild` step uploads Sentry sourcemaps.

Checks that CI runs:

```bash
bunx biome ci --changed --since=origin/main --no-errors-on-unmatched   # lint and format, changed files only
bun run --cwd packages/tools test:unit
bun run --cwd packages/tools build
bun run --cwd packages/tools test:compat
bun run --cwd apps/sdk-playground check-types:app
bun run --cwd apps/sdk-playground build:app
bun run --cwd packages/memory-graph check-types
bun run --cwd packages/memory-graph test
```

`bun run format-lint` rewrites the whole repo with Biome and already reports errors on a clean `main`, so prefer the
changed-files check above.

Python packages: CI builds each package's wheel, installs it with a pinned `supermemory` version and runs its pytest
suite from the package folder (`packages/openai-sdk-python` uses `uv` and its `uv.lock`).

### Before a pull request

- Branch from `main` (`feature/...` or `fix/...`) and keep it up to date with `main`.
- Run the CI checks above for the areas you touched, plus `bun run check-types`.
- Add tests if applicable, and update the docs if needed.
- More in [CONTRIBUTING.md](CONTRIBUTING.md).
