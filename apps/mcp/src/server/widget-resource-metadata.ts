export const WIDGET_DESCRIPTION =
	"Interactive Supermemory view for memory graphs, space selection, guided saves, file uploads, and confirmations."

const WIDGET_DOMAIN = "https://mcp.supermemory.ai"

function widgetResourceUiMeta(connectOrigin = WIDGET_DOMAIN) {
	return {
		prefersBorder: true,
		csp: {
			resourceDomains: [
				"https://fonts.googleapis.com",
				"https://fonts.gstatic.com",
			],
			connectDomains: [
				"https://fonts.googleapis.com",
				"https://fonts.gstatic.com",
				...new Set([WIDGET_DOMAIN, connectOrigin]),
			],
		},
	}
}

export function widgetResourceMeta(connectOrigin = WIDGET_DOMAIN) {
	return {
		ui: widgetResourceUiMeta(connectOrigin),
		"openai/widgetDescription": WIDGET_DESCRIPTION,
		"openai/widgetDomain": WIDGET_DOMAIN,
	}
}

export const WIDGET_RESOURCE_UI_META = widgetResourceUiMeta()
export const WIDGET_RESOURCE_META = widgetResourceMeta()
