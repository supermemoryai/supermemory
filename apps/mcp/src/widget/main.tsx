import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App as WidgetApp } from "./App"
import { ErrorBoundary } from "./ErrorBoundary"
import { McpAppProvider } from "./McpAppProvider"
import "./design/globals.css"

const root = createRoot(document.getElementById("app") as HTMLElement)
root.render(
	<StrictMode>
		<McpAppProvider>
			<ErrorBoundary>
				<WidgetApp />
			</ErrorBoundary>
		</McpAppProvider>
	</StrictMode>,
)
