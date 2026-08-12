import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App as WidgetApp } from "./App"
import { ErrorBoundary } from "./ErrorBoundary"
import { McpAppProvider } from "./McpAppProvider"
import "./design/globals.css"

const rootElement = document.getElementById("app")
if (!rootElement) throw new Error("Missing app root")
const root = createRoot(rootElement)
root.render(
	<StrictMode>
		<McpAppProvider>
			<ErrorBoundary>
				<WidgetApp />
			</ErrorBoundary>
		</McpAppProvider>
	</StrictMode>,
)
