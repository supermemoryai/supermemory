import type { McpServer } from "@modelcontextprotocol/server"
import supermemoryAppHtml from "../../../dist/src/widget/index.html"
import {
	APP_RESOURCE_MIME_TYPE,
	SUPERMEMORY_RESOURCE_URI,
} from "../app-metadata"
import {
	WIDGET_DESCRIPTION,
	WIDGET_RESOURCE_META,
} from "../widget-resource-metadata"

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
			_meta: WIDGET_RESOURCE_META,
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
					_meta: WIDGET_RESOURCE_META,
				},
			],
		}),
	)
}
