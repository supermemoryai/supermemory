# Supermemory MCP Server 4.0

A standalone MCP (Model Context Protocol) server for Supermemory that gives AI assistants persistent memory across conversations. Built on Cloudflare Workers with the stateless MCP TypeScript SDK v2 HTTP handler.

## Features

- **Authentication** - Supports both API keys and OAuth authentication
- **Persistent Memory** - Save and recall information across sessions
- **User Profiles** - Auto-generated profiles from stored memories
- **Project Scoping** - Organize memories by project with `x-sm-project` header
- **Analytics** - PostHog integration for usage tracking

## Setup

### Server URL

```text
https://mcp.supermemory.ai/mcp
```

Add to your MCP client config (Claude, Cursor, Windsurf, VS Code, etc.):

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

The server uses OAuth authentication by default. Your MCP client will automatically discover the authorization server via `/.well-known/oauth-protected-resource` and prompt you to authenticate.

### API Key Authentication (Alternative)

If you prefer to use an API key instead of OAuth, you can pass it directly in the `Authorization` header. Get your API key from [app.supermemory.ai](https://app.supermemory.ai):

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "Authorization": "Bearer sm_your_api_key_here"
      }
    }
  }
}
```

API keys start with `sm_` and are automatically detected. When an API key is provided, OAuth authentication is skipped.

### Project Scoping (Optional)

To scope all operations to a specific project, add the `x-sm-project` header:

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "your-project-id"
      }
    }
  }
}
```

## Tools

### `memory`

Save or forget information about the user.

```json
{
  "content": "User prefers dark mode and uses TypeScript",
  "action": "save",
  "containerTag": "optional-project-tag"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The memory content to save or forget |
| `action` | `"save"` \| `"forget"` | No | Default: `"save"` |
| `containerTag` | string | No | Project tag to scope the memory |

### `recall`

Search memories and get user profile.

```json
{
  "query": "What are the user's programming preferences?",
  "includeProfile": true,
  "containerTag": "optional-project-tag"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query to find relevant memories |
| `includeProfile` | boolean | No | Include user profile summary. Default: `true` |
| `containerTag` | string | No | Project tag to scope the search |

### `listMemories`

Enumerate stored memories grouped by their source document, newest first. Returns only the extracted memory facts — never document content — so responses stay small enough for client output limits. Use it to audit what is on file (e.g. before forgetting stale memories); use `recall` for topic-based search.

```json
{
  "page": 1,
  "limit": 10,
  "containerTag": "optional-project-tag"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (1-based). Default: `1` |
| `limit` | integer | No | Documents per page, each grouping its extracted memories. Default: `10`, max: `50` |
| `containerTag` | string | No | Project tag to scope the listing |

### `whoAmI`

Get the current logged-in user's information.

```json
{}
```

Returns: `{ userId, email, name, client, sessionId }`. `sessionId` is `null` on the stateless HTTP transport.

## Resources

| URI | Description |
|-----|-------------|
| `supermemory://profile` | User profile with stable preferences and recent activity |
| `supermemory://projects` | List of available memory projects |

## Prompts

| Name | Description |
|------|-------------|
| `context` | User profile and preferences for system context injection |

## Development

### Prerequisites

- [Bun](https://bun.sh/) or Node.js
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Install Dependencies

```bash
bun install
```

### Environment Variables

Create a `.dev.vars` file:

```env
API_URL=http://localhost:8787
or 
API_URL=https://api.supermemory.ai
```

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Main Supermemory API URL for OAuth validation | `https://api.supermemory.ai` |

### Run Locally

```bash
bun run dev
```

The server will start at `http://localhost:8788`.

**Note:** For local development, you also need the main Supermemory API running at the `API_URL` for OAuth token validation.

### Tests

Run the local unit and protocol-wire suite:

```bash
bun run test
```

The `e2e/` suite drives a real MCP server over streamable HTTP (no mocks) and asserts the
core journey: handshake → tool/resource/prompt discovery → `whoAmI` → `listProjects` →
`memory` save → `recall` round-trip, plus `memory-graph`/`fetch-graph-data`, resource reads,
the `context` prompt, container-tag isolation, and auth rejections.

```bash
export SUPERMEMORY_API_KEY=sm_...                          # staging key (required; tests skip without it)
export SUPERMEMORY_MCP_URL=https://mcp.supermemory.ai/mcp  # optional, this is the default
export SUPERMEMORY_API_URL=https://api.supermemory.ai      # optional, OAuth authorization server
bun run test:e2e
```

| File | Covers |
|------|--------|
| `e2e/auth.test.ts` | `GET /` info, OAuth discovery, 401 on missing/invalid token (runs without a key) |
| `e2e/oauth.test.ts` | OAuth discovery chain, dynamic client registration, token-endpoint negatives, real refresh→access token round-trip |
| `e2e/discovery.test.ts` | handshake, tools/resources/prompts listing, `whoAmI`, `listProjects` |
| `e2e/memory.test.ts` | save→recall round-trip, profile variants, `forget`, container scoping, bad args |
| `e2e/list-memories.test.ts` | `listMemories` discovery, save→list round-trip, pagination, arg validation |
| `e2e/root-scope.test.ts` | `x-sm-project` header strips the `containerTag` param and scopes the whole client transport |
| `e2e/graph.test.ts` | `memory-graph`, `fetch-graph-data`, resource reads, `context` prompt |

#### OAuth flow tests

`mcp.supermemory.ai` is an OAuth **resource server**; the **authorization server** is the main
API (`api.supermemory.ai`, better-auth). `oauth.test.ts` covers the real flow in tiers:

- **A–C (no secrets)** — discovery chain, dynamic client registration, and token/authorize
  negatives. These exercise the protocol wiring with no key and no browser, so they always run.
- **D (real token)** — exchanges a seeded `refresh_token` for an `access_token` and connects to
  `/mcp` with it, exercising the OAuth-token validation path (not the `sm_` API-key path). It
  **skips** unless both env vars below are set.

```bash
# One-time capture (opens a browser for login + consent, prints the env vars):
bun e2e/capture-oauth-token.ts
export SUPERMEMORY_MCP_CLIENT_ID=...
export SUPERMEMORY_MCP_REFRESH_TOKEN=...
```

Notes:
- Tests **skip** (not fail) without `SUPERMEMORY_API_KEY`; Tier D OAuth tests skip without the
  refresh-token env vars — so CI is safe without secrets.
- `recall` is eventually-consistent (save → ingestion pipeline → memories), so the round-trip
  **polls up to ~90s**. `forget` removal is slower still and is asserted as best-effort.
- The suite uses unique per-run markers and forgets them in teardown to avoid polluting the account.

### Deploy

```bash
bun run deploy
```

## Architecture

```
┌─────────────────┐  OAuth/API Key ┌──────────────────┐
│   MCP Client    │◄──────────────►│  Supermemory API │
│ (Claude, Cursor)│                │  (api.supermemory.ai)
└────────┬────────┘                └──────────────────┘
         │                                   ▲
         │ MCP Protocol                      │ Auth Validation
         ▼                                   │
┌─────────────────────────────────────────────────────┐
│            Supermemory MCP Server                   │
│         (mcp.supermemory.ai/mcp)                    │
│  ┌─────────────────────────────────────────────┐   │
│  │       Stateless MCP SDK v2 HTTP handler      │   │
│  │  • Fresh request-local server instances      │   │
│  │  • 2026-07-28 + stateless 2025 protocols     │   │
│  │  • MCP protocol validation and dispatch      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime:** Cloudflare Workers
- **State:** Stateless MCP transport; memories live in the Supermemory API
- **Framework:** Hono
- **MCP SDK:** @modelcontextprotocol/server v2 (currently `2.0.0-beta.5`)
- **MCP App UI:** @modelcontextprotocol/ext-apps `1.7.5`; its published browser package still peers on SDK v1, but that build-only dependency is not bundled into the Worker runtime
- **API Client:** supermemory SDK
- **Analytics:** PostHog

