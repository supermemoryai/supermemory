import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { Props } from "../../shared/types"
import type { ViewMessage } from "../../shared/types"
import type { RbacContext } from "../auth/rbac"
import type { SupermemoryClient } from "../client"

// Dependencies passed to every tool's register() function.
// Keep this surface small — tools should read this rather than reach into the agent.
export interface ToolDeps {
	server: McpServer
	props: Props | undefined
	rbac: RbacContext
	getClient: (containerTag?: string) => SupermemoryClient
	resolveContainerTag: (explicit?: string) => Promise<string | undefined>
	storage: {
		get: <T>(key: string) => Promise<T | undefined>
		put: <T>(key: string, value: T) => Promise<void>
	}
	cachedContainerTags: () => string[]
	refreshContainerTags: () => Promise<boolean>
	getClientInfo: () => { name: string; version?: string } | null
	getMcpSessionId: () => string
	errorResult: typeof errorResult
	appErrorResult: typeof appErrorResult
}

export function errorResult(error: unknown) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred"
	return {
		content: [{ type: "text" as const, text: `Error: ${message}` }],
		isError: true as const,
	}
}

/** Like errorResult, but includes structuredContent so app widgets render the message. */
export function appErrorResult(
	error: unknown,
	options?: { kind?: "user" | "system"; title?: string },
) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred"
	const kind = options?.kind ?? "system"
	const text = `Error: ${message}`
	const structuredContent: ViewMessage = {
		view: "error",
		message,
		kind,
		title: options?.title,
	}
	return {
		content: [{ type: "text" as const, text }],
		isError: true as const,
		structuredContent,
	}
}
