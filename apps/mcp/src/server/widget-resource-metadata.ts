export const WIDGET_DESCRIPTION =
	"Interactive Supermemory view for memory graphs, space selection, guided saves, file uploads, and confirmations."

const WIDGET_DOMAIN = "https://mcp.supermemory.ai"

export const WIDGET_RESOURCE_UI_META = {
	prefersBorder: true,
	csp: {
		resourceDomains: [
			"https://fonts.googleapis.com",
			"https://fonts.gstatic.com",
		],
		connectDomains: [
			"https://fonts.googleapis.com",
			"https://fonts.gstatic.com",
		],
	},
}

export const WIDGET_RESOURCE_META = {
	ui: WIDGET_RESOURCE_UI_META,
	"openai/widgetDescription": WIDGET_DESCRIPTION,
	"openai/widgetDomain": WIDGET_DOMAIN,
}
