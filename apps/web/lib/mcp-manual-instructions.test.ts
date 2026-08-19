import { describe, expect, test } from "bun:test"
import {
	buildCursorMcpDeeplink,
	CHATGPT_REMOTE_MCP_URL,
} from "./mcp-manual-instructions"

describe("buildCursorMcpDeeplink", () => {
	test("encodes the canonical remote MCP URL", () => {
		const deeplink = new URL(buildCursorMcpDeeplink())

		expect(deeplink.protocol).toBe("cursor:")
		expect(deeplink.hostname).toBe("anysphere.cursor-deeplink")
		expect(deeplink.pathname).toBe("/mcp/install")
		expect(deeplink.searchParams.get("name")).toBe("supermemory")

		const encodedConfig = deeplink.searchParams.get("config")
		expect(encodedConfig).not.toBeNull()
		expect(JSON.parse(atob(encodedConfig ?? ""))).toEqual({
			url: CHATGPT_REMOTE_MCP_URL,
		})
	})
})
