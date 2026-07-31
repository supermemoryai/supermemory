import type { McpServer } from "@modelcontextprotocol/server"
import supermemoryAppHtml from "../../../dist/src/widget/index.html"
import { SUPERMEMORY_RESOURCE_URI } from "../../shared/types"
import { APP_RESOURCE_MIME_TYPE } from "../app-metadata"

const CSP_DOMAINS = [
	"https://esm.sh",
	"https://fonts.googleapis.com",
	"https://fonts.gstatic.com",
]

const WIDGET_DESCRIPTION =
	"Interactive Supermemory view. The tool result identifies whether the mounted app is a memory graph, space picker, save form, upload form, or confirmation. When rendered is true, the interface is already visible to the user."

const RESOURCE_UI_META = {
	prefersBorder: true,
	csp: {
		resourceDomains: [...CSP_DOMAINS],
		connectDomains: [...CSP_DOMAINS],
	},
}

const RESOURCE_META = {
	ui: RESOURCE_UI_META,
	"openai/widgetDescription": WIDGET_DESCRIPTION,
}

export function registerWidgetResource(server: McpServer) {
	server.registerResource(
		"Supermemory MCP UI",
		SUPERMEMORY_RESOURCE_URI,
		// Listing-level metadata: hosts use this when discovering resources
		// before invoking the read callback. Mirrors the read response below
		// so prefetch/connect-time decisions match what the host will get.
		{
			mimeType: APP_RESOURCE_MIME_TYPE,
			description: WIDGET_DESCRIPTION,
			_meta: RESOURCE_META,
		},
		// Read response: per spec, content-item `_meta.ui` takes precedence
		// over the listing-level value. Set both to the same object so behavior
		// is consistent regardless of which path the host inspects.
		async () => ({
			contents: [
				{
					uri: SUPERMEMORY_RESOURCE_URI,
					mimeType: APP_RESOURCE_MIME_TYPE,
					text: supermemoryAppHtml,
					_meta: RESOURCE_META,
				},
			],
		}),
	)
}
