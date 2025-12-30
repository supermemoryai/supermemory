# Supermemory MCP Server 4.0

A standalone MCP (Model Context Protocol) server for Supermemory that gives AI assistants persistent memory across conversations. Built on Cloudflare Workers with Durable Objects for scalable, persistent connections.

## Features

- **Authentication** - Supports both API keys and OAuth authentication
- **Persistent Memory** - Save and recall information across sessions
- **User Profiles** - Auto-generated profiles from stored memories
- **Project Scoping** - Organize memories by project with `x-sm-project` header
- **Analytics** - PostHog integration for usage tracking

## Setup

### MCP Client Configuration

Add to your MCP client config (Claude Desktop, Cursor, Windsurf, etc.):

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

If you prefer to use an API key instead of OAuth, you can pass it directly in the `Authorization` header. Get your API key from [console.supermemory.ai](https://console.supermemory.ai):

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

### `whoAmI`

Get the current logged-in user's information.

```json
{}
```

Returns: `{ userId, email, name, client, sessionId }`

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
│         (mcp.supermemory.ai/mcp)                   │
│  ┌─────────────────────────────────────────────┐   │
│  │           Cloudflare Durable Object          │   │
│  │  • Session state                             │   │
│  │  • Client info persistence                   │   │
│  │  • MCP protocol handling                     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime:** Cloudflare Workers
- **State:** Durable Objects with SQLite
- **Framework:** Hono
- **MCP SDK:** @modelcontextprotocol/sdk + agents
- **API Client:** supermemory SDK
- **Analytics:** PostHog

