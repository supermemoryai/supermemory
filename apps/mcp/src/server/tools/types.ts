import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { Props, SessionInfo } from "../../shared/types"
import type { SupermemoryClient } from "../client"

// Dependencies passed to every tool's register() function.
// Keep this surface small — tools should read this rather than reach into the agent.
export interface ToolDeps {
	server: McpServer
	props: Props | undefined
	getClient: (containerTag?: string) => SupermemoryClient
	getSession: () => Promise<SessionInfo>
	resolveContainerTag: (explicit?: string) => Promise<string | undefined>
	storage: {
		get: <T>(key: string) => Promise<T | undefined>
		put: <T>(key: string, value: T) => Promise<void>
	}
	getClientInfo: () => { name: string; version?: string } | null
	getMcpSessionId: () => string
	errorResult: (error: unknown) => {
		content: { type: "text"; text: string }[]
		isError: true
	}
}

export function errorResult(error: unknown) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred"
	return {
		content: [{ type: "text" as const, text: `Error: ${message}` }],
		isError: true as const,
	}
}
