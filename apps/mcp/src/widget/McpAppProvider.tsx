import type {
	App as McpApp,
	McpUiHostContext,
} from "@modelcontextprotocol/ext-apps"
import { useApp as useMcpApp } from "@modelcontextprotocol/ext-apps/react"
import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react"
import { viewMessageSchema, type ViewMessage } from "../shared/types"
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
			createdApp.ontoolinput = () => {
				setState({ kind: "loading" })
			}
			createdApp.ontoolinputpartial = () => setState({ kind: "loading" })
			createdApp.ontoolcancelled = () => {
				setState({ kind: "loading" })
			}
			createdApp.ontoolresult = (result) => {
				const structuredContent = result.structuredContent
				const parsedMessage = viewMessageSchema.safeParse(structuredContent)
				if (!parsedMessage.success) {
					setState({ kind: "raw", structuredContent })
					return
				}

				const message = parsedMessage.data
				const checkpoint = loadViewCheckpoint(message.viewId)
				if (checkpoint) {
					setState({ kind: "view", message: checkpoint })
					return
				}

				setState({ kind: "view", message })
			}
			createdApp.onhostcontextchanged = (next) => {
				setHostContext(createdApp.getHostContext() ?? next)
			}
			createdApp.onerror = (nextError: unknown) => {
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
