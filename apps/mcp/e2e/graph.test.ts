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
		expect(res.contents[0].text).toMatch(/# Active Workspace Profile/)
		expect(res.contents[0].text).toMatch(/Workspace:/)
		expect(res.contents[0].text).toMatch(
			/Use `listSpaces` to find the relevant workspace key/,
		)
	})

	it("reads all workspaces in a compact human-readable format", async () => {
		const res = await s.client.readResource({
			uri: "supermemory://container-tags",
		})
		const text = res.contents[0].text as string
		expect(res.contents[0].mimeType).toBe("text/plain")
		expect(text).toMatch(/# My Workspaces/)
		expect(text).toMatch(/Active:/)
		expect(text).not.toMatch(/"containerTags":/)
	})

	it("gets compact active-workspace context without prompt arguments", async () => {
		const prompts = await s.client.listPrompts()
		const contextPrompt = prompts.prompts.find(
			(prompt) => prompt.name === "context",
		)
		expect(contextPrompt?.arguments ?? []).toHaveLength(0)

		const res = await s.client.getPrompt({ name: "context", arguments: {} })
		expect(res.messages.length).toBeGreaterThan(0)
		const text = res.messages[0].content.text as string
		expect(text).toMatch(/# Supermemory Context/)
		expect(text).toMatch(/Active workspace:/)
	})
})
