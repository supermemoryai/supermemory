import { describe, expect, it } from "vitest"
import { OAUTH_CREDENTIALS_AVAILABLE, connect } from "./helpers"

type ToolLike = {
	name: string
	inputSchema?: { properties?: Record<string, unknown> }
}

const propsOf = (tools: ToolLike[], name: string): Record<string, unknown> =>
	tools.find((t) => t.name === name)?.inputSchema?.properties ?? {}

const describeWithAuth = describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)

describeWithAuth("MCP - space scoping", () => {
	it("keeps per-call containerTag overrides when an obsolete header is sent", async () => {
		const scoped = await connect({
			headers: { "x-sm-project": "obsolete-root-scope" },
		})
		const plain = await connect()
		try {
			const scopedTools = (await scoped.client.listTools()).tools
			const plainTools = (await plain.client.listTools()).tools

			expect(propsOf(plainTools, "add_memory")).toHaveProperty("containerTag")
			expect(propsOf(plainTools, "search_memory")).toHaveProperty(
				"containerTag",
			)

			expect(propsOf(scopedTools, "add_memory")).toHaveProperty("containerTag")
			expect(propsOf(scopedTools, "search_memory")).toHaveProperty(
				"containerTag",
			)
		} finally {
			await scoped.close()
			await plain.close()
		}
	})
})
