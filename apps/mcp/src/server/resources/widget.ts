import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
} from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import enterpriseAppHtml from "../../../dist/src/widget/index.html"
import { ENTERPRISE_RESOURCE_URI } from "../../shared/types"

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
	registerAppResource(
		server,
		"Enterprise MCP UI",
		ENTERPRISE_RESOURCE_URI,
		// Listing-level metadata: hosts use this when discovering resources
		// before invoking the read callback. Mirrors the read response below
		// so prefetch/connect-time decisions match what the host will get.
		{
			mimeType: RESOURCE_MIME_TYPE,
			_meta: { ui: RESOURCE_UI_META },
		},
		// Read response: per spec, content-item `_meta.ui` takes precedence
		// over the listing-level value. Set both to the same object so behavior
		// is consistent regardless of which path the host inspects.
		async () => ({
			contents: [
				{
					uri: ENTERPRISE_RESOURCE_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: enterpriseAppHtml,
					_meta: { ui: RESOURCE_UI_META },
				},
			],
		}),
	)
}
