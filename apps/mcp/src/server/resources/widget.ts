import type { McpServer } from "@modelcontextprotocol/server"
import supermemoryAppHtml from "../../../dist/src/widget/index.html"
import { SUPERMEMORY_RESOURCE_URI } from "../../shared/types"
import { APP_RESOURCE_MIME_TYPE } from "../app-metadata"

const CSP_DOMAINS = [
	"https://esm.sh",
	"https://fonts.googleapis.com",
	"https://fonts.gstatic.com",
] as const

const RESOURCE_UI_META = {
	prefersBorder: true,
	csp: {
		resourceDomains: [...CSP_DOMAINS],
		connectDomains: [...CSP_DOMAINS],
	},
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
			_meta: { ui: RESOURCE_UI_META },
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
					_meta: { ui: RESOURCE_UI_META },
				},
			],
		}),
	)
}
