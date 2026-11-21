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

// Keep this surface small: tools read deps rather than reach into the agent.
export interface ToolDeps {
	server: Pick<McpServer, "registerTool">
	actor: ActorContext
	getClient: (namespace?: string) => SupermemoryClient
	getSession: () => Promise<SessionInfo>
	resolveNamespace: (explicit?: string) => Promise<string>
	getActiveNamespace: () => Promise<string | undefined>
	setActiveNamespace: (namespace: string) => Promise<void>
	createUploadSession: (namespace: string) => Promise<PreparedUpload>
	getClientInfo: (
		context: ServerContext,
	) => { name: string; version?: string } | null
	errorResult: (error: unknown) => CallToolResult
}

export function textContent(text: string): TextContent {
	return { type: "text", text }
}

export const ERROR_STATUS_META_KEY = "ai.supermemory/error-status"

export function errorResult(error: unknown): CallToolResult {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred"
	const status =
		error instanceof Error ? Reflect.get(error, "status") : undefined
	return {
		content: [textContent(`Error: ${message}`)],
		isError: true,
		...(typeof status === "number"
			? { _meta: { [ERROR_STATUS_META_KEY]: status } }
			: {}),
	}
}
