/**
 * Singleton App instance — one MCP App connection per widget.
 * Imported only via the `useApp()` hook for typed access.
 */
import { App } from "@modelcontextprotocol/ext-apps"

export const app = new App({ name: "Enterprise MCP", version: "1.0.0" })
