import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import ReactDOM from "react-dom/client"
import { queryClient } from "../../utils/query-client"
import Welcome from "./Welcome"
import "./welcome.css"

const rootElement = document.getElementById("root")
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<Welcome />
			</QueryClientProvider>
		</React.StrictMode>,
	)
}
