import type {
	CallToolResult,
	McpServer,
	ServerContext,
	TextContent,
} from "@modelcontextprotocol/server"
import type { SessionInfo } from "../../shared/types"
import type { SupermemoryClient } from "../client"
import type { ActorContext } from "../types"

export interface PreparedUpload {
	uploadUrl: string
	uploadToken: string
	expiresAt: number
}

// Dependencies passed to every tool's register() function.
// Keep this surface small — tools should read this rather than reach into the agent.
export interface ToolDeps {
	server: Pick<McpServer, "registerTool">
	actor: ActorContext
	getClient: (containerTag?: string) => SupermemoryClient
	getSession: () => Promise<SessionInfo>
	resolveContainerTag: (explicit?: string) => Promise<string>
	getActiveContainerTag: () => Promise<string | undefined>
	setActiveContainerTag: (containerTag: string) => Promise<void>
	createUploadSession: () => Promise<PreparedUpload>
	getClientInfo: (
		context: ServerContext,
	) => { name: string; version?: string } | null
	errorResult: (error: unknown) => CallToolResult
}

export function textContent(text: string): TextContent {
	return { type: "text", text }
}

export function errorResult(error: unknown): CallToolResult {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred"
	return {
		content: [textContent(`Error: ${message}`)],
		isError: true,
	}
}
