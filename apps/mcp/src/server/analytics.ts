import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import { PostHog } from "posthog-node"
import type { ActorContext, ServerEnv } from "./types"

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"

export type McpToolSurface =
	| "model_tool"
	| "app_launcher"
	| "app_action"
	| "app_internal"

export type McpToolOutcome = "success" | "error"

export interface McpToolExecution {
	toolName: string
	surface: McpToolSurface
	outcome: McpToolOutcome
	durationMs: number
	spaceExplicit: boolean
	client?: { name: string; version?: string }
	errorType?: string
}

export interface McpToolAnalytics {
	record(execution: McpToolExecution): void
}

export type WaitUntil = (promise: Promise<unknown>) => void

type ClientInfoResolver = (
	context: ServerContext,
) => { name: string; version?: string } | null

const TOOL_SURFACES: Record<string, McpToolSurface> = {
	search_memory: "model_tool",
	listDocuments: "model_tool",
	getDocument: "model_tool",
	listMemories: "model_tool",
	listSpaces: "model_tool",
	whoAmI: "model_tool",
	add_memory: "model_tool",
	"select-space": "app_launcher",
	"memory-graph": "app_launcher",
	"guided-save": "app_launcher",
	"upload-file": "app_launcher",
	"set-active-tag": "app_action",
	"save-memory": "app_action",
	"prepare-file-upload": "app_action",
	"fetch-graph-data": "app_internal",
}

let posthogConfig:
	| {
			apiKey: string
			host: string
			client: PostHog
	  }
	| undefined

function posthogClient(apiKey: string, host: string): PostHog {
	if (posthogConfig?.apiKey === apiKey && posthogConfig.host === host) {
		return posthogConfig.client
	}

	const client = new PostHog(apiKey, {
		host,
		flushAt: 1,
		flushInterval: 0,
	})
	posthogConfig = { apiKey, host, client }
	return client
}

export function posthogEventForToolExecution(
	actor: Pick<ActorContext, "userId" | "organizationId" | "oauthClientId">,
	execution: McpToolExecution,
) {
	return {
		distinctId: actor.userId,
		event: "mcp_tool_executed",
		groups: { company: actor.organizationId },
		properties: {
			app: "mcp",
			tool_name: execution.toolName,
			outcome: execution.outcome,
			duration_ms: execution.durationMs,
			mcp_runtime: "stateless",
			mcp_surface: execution.surface,
			space_explicit: execution.spaceExplicit,
			...(execution.client
				? {
						mcp_client_name: execution.client.name,
						...(execution.client.version
							? { mcp_client_version: execution.client.version }
							: {}),
					}
				: {}),
			...(actor.oauthClientId ? { oauth_client_id: actor.oauthClientId } : {}),
			...(execution.errorType ? { error_type: execution.errorType } : {}),
		},
	}
}

export function createPosthogAnalytics(
	env: ServerEnv,
	actor: ActorContext,
	waitUntil: WaitUntil,
): McpToolAnalytics {
	const apiKey = env.POSTHOG_API_KEY
	if (!apiKey) return { record: () => undefined }

	const client = posthogClient(apiKey, env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST)

	return {
		record(execution) {
			try {
				const capture = client
					.captureImmediate(posthogEventForToolExecution(actor, execution))
					.catch((error) => console.error("PostHog MCP tracking error:", error))
				waitUntil(capture)
			} catch (error) {
				console.error("PostHog MCP tracking error:", error)
			}
		},
	}
}

function spaceWasExplicit(value: unknown): boolean {
	if (!value || typeof value !== "object") return false
	const containerTag = Reflect.get(value, "containerTag")
	return typeof containerTag === "string" && containerTag.trim().length > 0
}

function isErrorResult(value: unknown): boolean {
	return (
		!!value &&
		typeof value === "object" &&
		Reflect.get(value, "isError") === true
	)
}

function thrownErrorType(error: unknown): string {
	if (error instanceof Error && error.name) return error.name
	if (error && typeof error === "object") {
		const status = Reflect.get(error, "status")
		if (typeof status === "number") return `http_${status}`
	}
	return "unknown"
}

function safeRecord(analytics: McpToolAnalytics, execution: McpToolExecution) {
	try {
		analytics.record(execution)
	} catch (error) {
		console.error("MCP analytics recording error:", error)
	}
}

export function createTrackedToolServer(
	server: McpServer,
	analytics: McpToolAnalytics,
	getClientInfo: ClientInfoResolver,
): Pick<McpServer, "registerTool"> {
	const registerTool = ((
		name: string,
		config: unknown,
		handler: (...args: unknown[]) => unknown,
	) => {
		const trackedHandler = async (...callbackArgs: unknown[]) => {
			const startedAt = performance.now()
			const input = callbackArgs.length > 1 ? callbackArgs[0] : undefined
			const context = callbackArgs.at(-1) as ServerContext

			const finish = (outcome: McpToolOutcome, errorType?: string) => {
				let client: ReturnType<ClientInfoResolver> = null
				try {
					client = getClientInfo(context)
				} catch {
					// Client metadata is optional and must never affect a tool call.
				}

				safeRecord(analytics, {
					toolName: name,
					surface: TOOL_SURFACES[name] ?? "model_tool",
					outcome,
					durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
					spaceExplicit: spaceWasExplicit(input),
					...(client ? { client } : {}),
					...(errorType ? { errorType } : {}),
				})
			}

			try {
				const result = await handler(...callbackArgs)
				if (isErrorResult(result)) {
					finish("error", "tool_result")
				} else {
					finish("success")
				}
				return result
			} catch (error) {
				finish("error", thrownErrorType(error))
				throw error
			}
		}

		return Reflect.apply(server.registerTool, server, [
			name,
			config,
			trackedHandler,
		])
	}) as McpServer["registerTool"]

	return { registerTool }
}
