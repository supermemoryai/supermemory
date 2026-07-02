import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Studio } from "./Studio"
import "../design/globals.css"

// Standalone component gallery. No MCP host — pure visual review of every
// primitive and view with mock data. Run with `bun run studio`.
document.documentElement.setAttribute("data-theme", "light")

const root = createRoot(document.getElementById("studio") as HTMLElement)
root.render(
	<StrictMode>
		<Studio />
	</StrictMode>,
)
