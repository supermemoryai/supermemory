import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { useEffect, useState } from "react"
import type { ViewMessage } from "../../shared/types"
import { app } from "../lib/app"

function safeLog(
	level: "debug" | "info" | "warning" | "error",
	message: string,
) {
	try {
		void app.sendLog({ level, data: message })
	} catch {
		// host may not support logging — ignore
	}
}

function toolResultText(result: CallToolResult): string | null {
	const item = result.content?.[0]
	return item?.type === "text" ? item.text : null
}

type ViewState =
	| { kind: "loading" }
	| { kind: "view"; message: ViewMessage }
	| { kind: "error"; message: string }
	| { kind: "raw"; structuredContent: unknown }

/**
 * Drives the widget's top-level view state from MCP host events.
 *
 * - `ontoolinput` / `ontoolinputpartial`: shows loading
 * - `ontoolresult`: parses `structuredContent` as `ViewMessage` and renders
 * - `ontoolcancelled`: returns to loading
 * - errors: surfaces via the error variant
 *
 * Note: this only handles MODEL-initiated tool calls. Widget-initiated calls
 * via `useApp().callTool()` return the result directly to the caller; they do
 * not flow through this hook.
 */
export function useViewState(): {
	state: ViewState
	setView: (msg: ViewMessage) => void
	setError: (message: string) => void
} {
	const [state, setState] = useState<ViewState>({ kind: "loading" })

	useEffect(() => {
		app.ontoolinput = (input: unknown) => {
			const name =
				typeof input === "object" && input !== null && "name" in input
					? String((input as { name: unknown }).name)
					: "?"
			safeLog("info", `[host] ontoolinput: ${name}`)
			setState({ kind: "loading" })
		}
		app.ontoolinputpartial = () => setState({ kind: "loading" })
		app.ontoolcancelled = () => {
			safeLog("info", "[host] ontoolcancelled")
			setState({ kind: "loading" })
		}
		app.ontoolresult = (result: CallToolResult) => {
			if (result.isError) {
				const text = toolResultText(result) ?? "Tool returned an error"
				safeLog("error", `[host] ontoolresult: tool error: ${text}`)
				setState({ kind: "error", message: text })
				return
			}
			const sc = (result as { structuredContent?: unknown }).structuredContent
			if (!sc || typeof sc !== "object") {
				const text = toolResultText(result)
				if (text) {
					safeLog("warning", `[host] ontoolresult: text-only result: ${text}`)
					setState({ kind: "error", message: text })
					return
				}
				safeLog("warning", "[host] ontoolresult: no structuredContent")
				setState({ kind: "raw", structuredContent: sc })
				return
			}
			if ("view" in sc) {
				const msg = sc as ViewMessage
				safeLog("info", `[host] ontoolresult: view=${msg.view}`)
				setState({ kind: "view", message: msg })
				return
			}
			safeLog("warning", "[host] ontoolresult: structuredContent without view")
			setState({ kind: "raw", structuredContent: sc })
		}
		app.onerror = (error: unknown) => {
			safeLog("error", `[host] onerror: ${String(error)}`)
			setState({ kind: "error", message: String(error) })
		}

		return () => {
			app.ontoolinput = undefined
			app.ontoolinputpartial = undefined
			app.ontoolcancelled = undefined
			app.ontoolresult = undefined
			app.onerror = undefined
		}
	}, [])

	return {
		state,
		setView: (msg) => setState({ kind: "view", message: msg }),
		setError: (message) => setState({ kind: "error", message }),
	}
}
