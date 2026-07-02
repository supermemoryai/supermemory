import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps"
import { useEffect, useState } from "react"
import { app } from "../lib/app"

/**
 * Subscribes to host context changes (theme, dimensions, displayMode, fonts).
 * Returns the latest context, or null until the connection is established.
 */
export function useHostContext(): McpUiHostContext | null {
	const [ctx, setCtx] = useState<McpUiHostContext | null>(
		() => app.getHostContext() ?? null,
	)

	useEffect(() => {
		const handler = (next: McpUiHostContext) => setCtx(next)
		app.onhostcontextchanged = handler
		return () => {
			if (app.onhostcontextchanged === handler) {
				app.onhostcontextchanged = undefined
			}
		}
	}, [])

	return ctx
}
