import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps"
import { useContext } from "react"
import { McpAppContext } from "../McpAppProvider"

/**
 * Returns the provider-owned host context, including updates received after
 * the connection handshake.
 */
export function useHostContext(): McpUiHostContext | null {
	const context = useContext(McpAppContext)
	if (!context) {
		throw new Error("useHostContext must be used within McpAppProvider")
	}
	return context.hostContext
}
