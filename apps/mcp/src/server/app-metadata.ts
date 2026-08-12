import widgetManifest from "../../dist/widget-manifest.json"

export const APP_RESOURCE_MIME_TYPE = "text/html;profile=mcp-app"
export const SUPERMEMORY_RESOURCE_URI = widgetManifest.resourceUri

type AppVisibility = "model" | "app"

export function appToolMeta(
	visibility?: AppVisibility[],
): Record<string, unknown> {
	const ui = {
		resourceUri: SUPERMEMORY_RESOURCE_URI,
		...(visibility ? { visibility } : {}),
	}

	return {
		ui,
		"ui/resourceUri": SUPERMEMORY_RESOURCE_URI,
	}
}

/**
 * ChatGPT keys widget-scoped state by this id. Other MCP Apps hosts safely
 * ignore the namespaced metadata and use the View's own checkpoint fallback.
 */
export function appResultMeta(viewId: string): Record<string, unknown> {
	return {
		"openai/widgetSessionId": viewId,
	}
}
