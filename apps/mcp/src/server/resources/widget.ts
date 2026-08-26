import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server"
import supermemoryAppHtml from "../../../dist/src/widget/index.html"
import {
	APP_RESOURCE_MIME_TYPE,
	SUPERMEMORY_RESOURCE_URI,
} from "../app-metadata"
import {
	WIDGET_DESCRIPTION,
	widgetResourceMeta,
} from "../widget-resource-metadata"

export function registerWidgetResource(
	server: McpServer,
	connectOrigin: string,
) {
	const resourceMeta = widgetResourceMeta(connectOrigin)
	const resourceConfig = {
		mimeType: APP_RESOURCE_MIME_TYPE,
		description: WIDGET_DESCRIPTION,
		_meta: resourceMeta,
	}
	const readWidgetResource = (uri: string) => ({
		contents: [
			{
				uri,
				mimeType: APP_RESOURCE_MIME_TYPE,
				text: supermemoryAppHtml,
				_meta: resourceMeta,
			},
		],
	})

	server.registerResource(
		"Supermemory MCP UI",
		SUPERMEMORY_RESOURCE_URI,
		resourceConfig,
		async () => readWidgetResource(SUPERMEMORY_RESOURCE_URI),
	)
	// Hosts cache the widget under the resource URI they saw at review time and
	// may re-fetch it long after a release changed the hash. Serving the current
	// bundle for any historical URI is only sound while the bundle stays
	// compatible with every published catalog (see "Storage And Rollout" in the
	// README): app-only tools it calls, like upload-file-submit, must remain
	// registered until those catalogs are retired.
	server.registerResource(
		"Supermemory MCP UI compatibility",
		new ResourceTemplate("ui://supermemory/app-{version}.html", {
			list: undefined,
		}),
		resourceConfig,
		async (uri) => readWidgetResource(uri.href),
	)
}
