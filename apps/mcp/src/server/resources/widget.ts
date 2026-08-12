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
	server.registerResource(
		"Supermemory MCP UI compatibility",
		new ResourceTemplate("ui://supermemory/app-{version}.html", {
			list: undefined,
		}),
		resourceConfig,
		async (uri) => readWidgetResource(uri.href),
	)
}
