import { useContext, useMemo } from "react"
import type { ZodType } from "zod"
import {
	handoffToModel as performModelHandoff,
	type ModelHandoffRequest,
} from "../lib/modelHandoff"
import { McpAppContext } from "../McpAppProvider"

export interface ToolCallResult<T = unknown> {
	ok: boolean
	error?: string
	data?: T
}

/**
 * Single entry point for all `app.*` SDK calls.
 *
 * Why this exists:
 *   The previous codebase called `app.callTool(...)` which doesn't exist on the
 *   App class — the correct method is `app.callServerTool(...)`. The bug compiled
 *   silently and broke 3 user flows. Routing every call through this hook makes
 *   that class of mistake impossible: there is no `callTool` exposed.
 */
export function useApp() {
	const context = useContext(McpAppContext)
	if (!context) {
		throw new Error("useApp must be used within McpAppProvider")
	}
	const { app, isConnected } = context

	return useMemo(() => {
		return {
			/** Call an MCP server tool and await the result. */
			async callTool<T>(
				name: string,
				args: Record<string, unknown>,
				schema: ZodType<T>,
			): Promise<ToolCallResult<T>> {
				if (!app) {
					return { ok: false, error: "MCP host is not connected" }
				}
				try {
					const result = await app.callServerTool({
						name,
						arguments: args,
					})
					if (result.isError) {
						const text =
							result.content?.[0]?.type === "text"
								? result.content[0].text
								: "Tool returned an error"
						return { ok: false, error: text }
					}
					const parsed = schema.safeParse(result.structuredContent)
					if (!parsed.success) {
						return {
							ok: false,
							error: "Tool returned invalid structured content",
						}
					}
					return {
						ok: true,
						data: parsed.data,
					}
				} catch (err) {
					return { ok: false, error: String(err) }
				}
			},

			isConnected,

			/** Make widget state available to the model on a future turn. */
			async updateModelContext(content: string): Promise<ToolCallResult> {
				if (!app) {
					return { ok: false, error: "MCP host is not connected" }
				}
				try {
					await app.updateModelContext({
						content: [{ type: "text", text: content }],
					})
					return { ok: true }
				} catch (err) {
					return { ok: false, error: String(err) }
				}
			},

			/**
			 * Publish a silent state snapshot, then explicitly return control to
			 * the conversation agent. The message is still attempted when a host
			 * rejects or drops model-context updates.
			 */
			handoffToModel(request: ModelHandoffRequest) {
				if (!app) {
					const error = "MCP host is not connected"
					return Promise.resolve({
						ok: false,
						contextUpdate: { ok: false, error },
						conversationMessage: { ok: false, error },
					})
				}
				return performModelHandoff(app, request)
			},

			/** Request the host to switch display mode. */
			requestDisplayMode(mode: "inline" | "fullscreen" | "pip") {
				return app
					? app.requestDisplayMode({ mode })
					: Promise.resolve({ mode })
			},

			getHostContext() {
				return app?.getHostContext()
			},
		}
	}, [app, isConnected])
}

export type AppApi = ReturnType<typeof useApp>
