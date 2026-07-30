import type {
	App as McpApp,
	McpUiHostContext,
} from "@modelcontextprotocol/ext-apps"
import { useApp as useMcpApp } from "@modelcontextprotocol/ext-apps/react"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react"
import type { ViewMessage } from "../shared/types"
import { loadViewCheckpoint, saveViewCheckpoint } from "./lib/viewCheckpoint"

export type ViewState =
	| { kind: "loading" }
	| { kind: "view"; message: ViewMessage }
	| { kind: "error"; message: string }
	| { kind: "raw"; structuredContent: unknown }

export interface McpAppContextValue {
	app: McpApp | null
	hostContext: McpUiHostContext | null
	isConnected: boolean
	state: ViewState
	setView: (message: ViewMessage) => void
	setError: (message: string) => void
}

export const McpAppContext = createContext<McpAppContextValue | null>(null)

function safeLog(
	app: McpApp,
	level: "debug" | "info" | "warning" | "error",
	message: string,
) {
	try {
		void app.sendLog({ level, data: message }).catch(() => {
			// Host logging is optional.
		})
	} catch {
		// The transport may not be ready yet.
	}
}

function initialViewState(): ViewState {
	const checkpoint = loadViewCheckpoint()
	return checkpoint
		? { kind: "view", message: checkpoint }
		: { kind: "loading" }
}

export function McpAppProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<ViewState>(initialViewState)
	const [hostContext, setHostContext] = useState<McpUiHostContext | null>(null)

	const { app, isConnected, error } = useMcpApp({
		appInfo: { name: "Supermemory MCP", version: "1.0.0" },
		capabilities: {},
		strict: true,
		onAppCreated: (createdApp) => {
			createdApp.ontoolinput = (input: unknown) => {
				const name =
					typeof input === "object" && input !== null && "name" in input
						? String((input as { name: unknown }).name)
						: "?"
				safeLog(createdApp, "info", `[host] ontoolinput: ${name}`)
				setState({ kind: "loading" })
			}
			createdApp.ontoolinputpartial = () => setState({ kind: "loading" })
			createdApp.ontoolcancelled = () => {
				safeLog(createdApp, "info", "[host] ontoolcancelled")
				setState({ kind: "loading" })
			}
			createdApp.ontoolresult = (result: CallToolResult) => {
				const structuredContent = (result as { structuredContent?: unknown })
					.structuredContent
				if (!structuredContent || typeof structuredContent !== "object") {
					safeLog(
						createdApp,
						"warning",
						"[host] ontoolresult: no structuredContent",
					)
					setState({ kind: "raw", structuredContent })
					return
				}
				if ("view" in structuredContent) {
					const message = structuredContent as ViewMessage
					safeLog(
						createdApp,
						"info",
						`[host] ontoolresult: view=${message.view}`,
					)
					const checkpoint = loadViewCheckpoint(message.viewId)
					setState({ kind: "view", message: checkpoint ?? message })
					return
				}
				safeLog(
					createdApp,
					"warning",
					"[host] ontoolresult: structuredContent without view",
				)
				setState({ kind: "raw", structuredContent })
			}
			createdApp.onhostcontextchanged = (next) => {
				setHostContext(createdApp.getHostContext() ?? next)
			}
			createdApp.onerror = (nextError: unknown) => {
				safeLog(createdApp, "error", `[host] onerror: ${String(nextError)}`)
				setState({ kind: "error", message: String(nextError) })
			}
		},
	})

	const setView = useCallback((message: ViewMessage) => {
		saveViewCheckpoint(message)
		setState({ kind: "view", message })
	}, [])
	const setError = useCallback((message: string) => {
		setState({ kind: "error", message })
	}, [])

	const value = useMemo<McpAppContextValue>(
		() => ({
			app,
			hostContext: hostContext ?? app?.getHostContext() ?? null,
			isConnected,
			state: error ? { kind: "error", message: error.message } : state,
			setView,
			setError,
		}),
		[app, error, hostContext, isConnected, setError, setView, state],
	)

	return (
		<McpAppContext.Provider value={value}>{children}</McpAppContext.Provider>
	)
}

const previewValue: McpAppContextValue = {
	app: null,
	hostContext: null,
	isConnected: false,
	state: { kind: "loading" },
	setView: () => {},
	setError: () => {},
}

export function McpAppPreviewProvider({ children }: { children: ReactNode }) {
	return (
		<McpAppContext.Provider value={previewValue}>
			{children}
		</McpAppContext.Provider>
	)
}
