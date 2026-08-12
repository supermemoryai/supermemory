import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { McpAppPreviewProvider } from "../McpAppProvider"
import { Studio } from "./Studio"
import "../design/globals.css"

// Standalone component gallery. No MCP host — pure visual review of every
// primitive and view with mock data. Run with `bun run studio`.
document.documentElement.setAttribute("data-theme", "light")

const rootElement = document.getElementById("studio")
if (!rootElement) throw new Error("Missing studio root")
const root = createRoot(rootElement)
root.render(
	<StrictMode>
		<McpAppPreviewProvider>
			<Studio />
		</McpAppPreviewProvider>
	</StrictMode>,
)
