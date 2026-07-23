import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App as WidgetApp } from "./App"
import { ErrorBoundary } from "./ErrorBoundary"
import { app } from "./lib/app"
import "./design/globals.css"

const root = createRoot(document.getElementById("app") as HTMLElement)
root.render(
	<StrictMode>
		<ErrorBoundary>
			<WidgetApp />
		</ErrorBoundary>
	</StrictMode>,
)

// Establish the postMessage channel with the MCP host.
app.connect()
