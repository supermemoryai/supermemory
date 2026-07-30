import { useContext } from "react"
import { McpAppContext, type McpAppContextValue } from "../McpAppProvider"

/**
 * Exposes the top-level view state owned by McpAppProvider.
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
	state: McpAppContextValue["state"]
	setView: McpAppContextValue["setView"]
	setError: (message: string) => void
} {
	const context = useContext(McpAppContext)
	if (!context) {
		throw new Error("useViewState must be used within McpAppProvider")
	}
	return {
		state: context.state,
		setView: context.setView,
		setError: context.setError,
	}
}
