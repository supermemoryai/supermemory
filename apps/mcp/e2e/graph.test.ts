import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
	textOf,
} from "./helpers"
const describeWithAuth = describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)

describeWithAuth("MCP — graph, resources & prompts", () => {
	let s: Session

	beforeAll(async () => {
		s = await connect()
	})
	afterAll(async () => {
		await s?.close()
	})

	it("memory-graph returns a summary + structured documents", async () => {
		const res = await callTool(s.client, "memory-graph")
		expect(res.isError).toBeFalsy()
		expect(textOf(res)).toMatch(/Memory Graph: \d+ documents/)
		const sc = res.structuredContent as {
			documents?: unknown[]
			totalCount?: number
		}
		expect(Array.isArray(sc?.documents)).toBe(true)
	})

	it("fetch-graph-data returns paginated documents", async () => {
		const res = await callTool(s.client, "fetch-graph-data", {
			page: 1,
			limit: 5,
		})
		expect(res.isError).toBeFalsy()
		const sc = res.structuredContent as {
			documents?: unknown[]
			pagination?: { limit?: number }
		}
		expect(Array.isArray(sc?.documents)).toBe(true)
		expect(sc?.pagination?.limit).toBe(5)
	})

	it("reads the profile resource", async () => {
		const res = await s.client.readResource({ uri: "supermemory://profile" })
		expect(res.contents.length).toBeGreaterThan(0)
		expect(res.contents[0].mimeType).toBe("text/plain")
		expect(typeof res.contents[0].text).toBe("string")
	})

	it("reads the container-tags resource as JSON", async () => {
		const res = await s.client.readResource({
			uri: "supermemory://container-tags",
		})
		const text = res.contents[0].text as string
		const parsed = JSON.parse(text)
		expect(Array.isArray(parsed.containerTags)).toBe(true)
	})

	it("gets the context prompt as a system message", async () => {
		const res = await s.client.getPrompt({ name: "context", arguments: {} })
		expect(res.messages.length).toBeGreaterThan(0)
		const text = res.messages[0].content.text as string
		expect(text).toMatch(/memory|context/i)
	})
})
