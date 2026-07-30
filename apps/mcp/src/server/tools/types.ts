import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import type { SessionInfo } from "../../shared/types"
import type { SupermemoryClient } from "../client"
import type { ActorContext } from "../types"

// Dependencies passed to every tool's register() function.
// Keep this surface small — tools should read this rather than reach into the agent.
export interface ToolDeps {
	server: Pick<McpServer, "registerTool">
	actor: ActorContext
	getClient: (containerTag?: string) => SupermemoryClient
	getSession: () => Promise<SessionInfo>
	resolveContainerTag: (explicit?: string) => Promise<string | undefined>
	getActiveContainerTag: () => Promise<string | undefined>
	setActiveContainerTag: (containerTag: string) => Promise<void>
	getClientInfo: (
		context: ServerContext,
	) => { name: string; version?: string } | null
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
