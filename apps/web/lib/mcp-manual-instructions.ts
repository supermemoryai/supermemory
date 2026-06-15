export const CHATGPT_REMOTE_MCP_URL = "https://mcp.supermemory.ai/mcp"

export const SUPERMEMORY_MCP_OAUTH_JSON = `{
  "mcpServers": {
    "supermemory": {
      "url": "${CHATGPT_REMOTE_MCP_URL}"
    }
  }
}`

export const ANTIGRAVITY_MCP_SNIPPET = `{
    "mcpServers": {
        "supermemory": {
            "serverUrl": "${CHATGPT_REMOTE_MCP_URL}"
        }
    }
}`

export function buildMcpUrlRemoteJson(apiKeyPlaceholder: string) {
	return `{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.supermemory.ai/mcp"],
    "env": {},
    "headers": {
      "Authorization": "Bearer ${apiKeyPlaceholder}"
    }
  }
}`
}

export const CODEX_MCP_TOML = `[mcp_servers.supermemory]
command = "npx"
args = ["-y", "mcp-remote@latest", "https://mcp.supermemory.ai/mcp"]
`

/** Full file merge target: Claude Desktop `claude_desktop_config.json` → `mcpServers`. */
export const CLAUDE_DESKTOP_MCP_SNIPPET = `{
  "mcpServers": {
    "supermemory": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.supermemory.ai/mcp"
      ]
    }
  }
}`

export type ManualInstallEntry =
	| { kind: "file"; paths: string; snippet: string; format: "json" | "toml" }
	| { kind: "chatgpt" }
	| { kind: "generic-remote" }
	| { kind: "claude-desktop-timeline" }

export function getManualInstallEntry(clientKey: string): ManualInstallEntry {
	switch (clientKey) {
		case "chatgpt":
			return { kind: "chatgpt" }
		case "mcp-url":
			return { kind: "generic-remote" }
		case "antigravity":
			return {
				kind: "file",
				paths:
					"Antigravity: open your Antigravity MCP configuration and merge this server entry.",
				snippet: ANTIGRAVITY_MCP_SNIPPET,
				format: "json",
			}
		case "codex":
			return {
				kind: "file",
				paths:
					"Codex: ~/.codex/config.toml (or $CODEX_HOME/config.toml). Merge the block into your existing [mcp_servers] section.",
				snippet: CODEX_MCP_TOML,
				format: "toml",
			}
		case "cursor":
			return {
				kind: "file",
				paths:
					"Cursor: ~/.cursor/mcp.json globally, or .cursor/mcp.json in your project.",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
		case "vscode":
			return {
				kind: "file",
				paths:
					"VS Code: macOS ~/Library/Application Support/Code/User/mcp.json · Windows %APPDATA%\\Code\\User\\mcp.json · Linux ~/.config/Code/User/mcp.json.",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
		case "cline":
			return {
				kind: "file",
				paths:
					"Cline: VS Code user folder → globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json.",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
		case "claude":
			return { kind: "claude-desktop-timeline" }
		case "claude-code":
			return {
				kind: "file",
				paths:
					"Claude Code: ~/.claude.json (user) or .mcp.json in the project root.",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
		case "gemini-cli":
			return {
				kind: "file",
				paths:
					"Gemini CLI: ~/.gemini/settings.json (or project .gemini/settings.json).",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
		default:
			return {
				kind: "file",
				paths: "Open your client's MCP settings file (see its documentation).",
				snippet: SUPERMEMORY_MCP_OAUTH_JSON,
				format: "json",
			}
	}
}
