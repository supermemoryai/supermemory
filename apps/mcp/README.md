# Supermemory MCP Server

The Supermemory MCP server gives authenticated AI clients access to a user's
memories, profile, spaces, and interactive MCP Apps.

## Runtime Model

- MCP SDK v2 with a fresh `McpServer` for every HTTP request
- Modern MCP `2026-07-28` plus stateless compatibility for 2025 clients
- OAuth token validation on every request
- No MCP protocol session or protocol Durable Object
- Active space stored as application state in a dedicated Durable Object
- Space state keyed by authenticated `organizationId + userId`

The space used by an operation resolves in this order:

1. An explicit `containerTag` tool or prompt argument
2. The account's durable active space
3. The Supermemory client default, `sm_project_default`

An explicit override applies only to that call. It does not mutate the active
space.

## Server URL

```text
https://mcp.supermemory.ai/mcp
```

Example client configuration:

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

The client discovers the OAuth authorization server through
`/.well-known/oauth-protected-resource/mcp`.

## Tools

### Model-visible tools

| Tool | Purpose |
| --- | --- |
| `search_memory` | Search memories and optionally include profile context |
| `listDocuments` | List document metadata and summaries in a space |
| `getDocument` | Read one document's available content by ID |
| `listMemories` | List extracted memory entries and their source document IDs |
| `listSpaces` | List spaces visible to the authenticated account |
| `whoAmI` | Return identity, access, and active-space context |
| `add_memory` | Save or forget a memory |

### MCP App launchers

| Tool | Purpose |
| --- | --- |
| `select-space` | Open the interactive space picker |
| `memory-graph` | Open the interactive memory graph |
| `guided-save` | Open the guided memory form |
| `upload-file` | Open the file upload form |

### App-only tools

These tools are available to the embedded MCP App and hidden from the model.

| Tool | Purpose |
| --- | --- |
| `set-active-tag` | Persist the selected active space |
| `save-memory` | Submit the guided save form |
| `prepare-file-upload` | Prepare a secure direct file upload |
| `fetch-graph-data` | Fetch graph documents for the app |

## Resources And Prompt

| Kind | Name or URI | Purpose |
| --- | --- | --- |
| Resource | `supermemory://profile` | Profile facts in the effective space |
| Resource | `supermemory://spaces` | Visible spaces |
| Resource | `ui://supermemory/app-<sha256>.html` | Embedded MCP App bundle |
| Prompt | `context` | Profile and recent context for an optional space |

The App resource and tool metadata include both current nested `ui` metadata and
the legacy flat resource URI key while MCP Apps completes its SDK v2 migration.
The Worker runtime does not import the SDK v1 Apps server helpers.

## Development

Install from the repository root:

```bash
bun install
```

Run the local Worker:

```bash
cd apps/mcp
bun run dev
```

The portless URL is `http://mcp.dev.supermemory`.

Useful commands:

```bash
bun run build
bun run check-types
bun run test:unit
bun run test:e2e
```

Authenticated end-to-end tests use credentials captured by:

```bash
bun e2e/capture-oauth-token.ts
```

Without stored OAuth credentials, authenticated test groups skip. Public OAuth
discovery and rejection tests still run.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `API_URL` | Supermemory API and OAuth issuer | `https://api.supermemory.ai` |
| `MCP_RESOURCE` | Expected OAuth audience | `https://mcp.supermemory.ai/mcp` |
| `ALLOWED_MCP_ORIGIN_HOSTNAMES` | Additional comma-separated browser origins | Built-in host allowlist |
| `POSTHOG_API_KEY` | Server-side MCP tool analytics project key | Disabled |
| `POSTHOG_HOST` | PostHog ingestion host | `https://us.i.posthog.com` |

## Storage And Rollout

`SpaceState` stores only the active space's container tag. It never stores bearer
tokens, MCP client identity, or protocol messages.

The old `SupermemoryMCP` class and binding remain inert for one rollout. This
keeps the migration non-destructive and rollback-safe. A later deployment can
delete the old protocol class after production traffic and rollback windows
have been checked.
