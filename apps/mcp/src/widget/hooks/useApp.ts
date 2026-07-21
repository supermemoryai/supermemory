import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { useMemo } from "react"
import type { ViewMessage } from "../../shared/types"
import { app } from "../lib/app"

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
	return useMemo(() => {
		return {
			/** Call an MCP server tool and await the result. */
			async callTool<T = ViewMessage>(
				name: string,
				args: Record<string, unknown>,
			): Promise<ToolCallResult<T>> {
				try {
					const result = (await app.callServerTool({
						name,
						arguments: args,
					})) as CallToolResult & { structuredContent?: unknown }
					if (result.isError) {
						const text =
							result.content?.[0]?.type === "text"
								? result.content[0].text
								: "Tool returned an error"
						return { ok: false, error: text }
					}
					return {
						ok: true,
						data: result.structuredContent as T,
					}
				} catch (err) {
					return { ok: false, error: String(err) }
				}
			},

			/** Inject a user message into the conversation. Triggers a new agent turn. */
			sendMessage(content: string) {
				return app.sendMessage({
					role: "user",
					content: [{ type: "text", text: content }],
				})
			},

			/** Update ambient model context. Model sees on next user message. */
			updateContext(text: string, structuredContent?: Record<string, unknown>) {
				return app.updateModelContext({
					content: [{ type: "text", text }],
					structuredContent,
				})
			},

			/** Send a structured log line to the host. */
			log(level: "debug" | "info" | "warning" | "error", message: string) {
				return app.sendLog({ level, data: message })
			},

			/** Request the host to switch display mode. */
			requestDisplayMode(mode: "inline" | "fullscreen" | "pip") {
				return app.requestDisplayMode({ mode })
			},

			getHostContext() {
				return app.getHostContext()
			},
		}
	}, [])
}

export type AppApi = ReturnType<typeof useApp>
