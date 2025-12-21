# Supermemory MCP Server 3.0

MCP server for Supermemory - gives AI assistants persistent memory across conversations.

## Setup

Add to your MCP client config:

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Get your API key at [supermemory.ai](https://supermemory.ai).

## Tools

### `memory`

Save or forget information about the user.

```json
{
  "content": "User prefers dark mode",
  "action": "save",
  "containerTag": "optional-tag"
}
```

### `recall`

Search memories and get user profile.

```json
{
  "query": "What are the user's preferences?",
  "includeProfile": true,
  "containerTag": "optional-tag"
}
```

## Resources

- `supermemory://profile` - User profile with stable preferences and recent activity
- `supermemory://projects` - List of memory projects

## Prompts

- `supermemory_context` - User profile for system context injection

## Development

```bash
bun install
bun run dev
```
