import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
	textOf,
} from "./helpers"

describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)("MCP — listMemories", () => {
	let s: Session

	beforeAll(async () => {
		s = await connect()
	})
	afterAll(async () => {
		await s?.close()
	})

	it("appears in tool discovery", async () => {
		const tools = await s.client.listTools()
		const names = tools.tools.map((t) => t.name)
		expect(names).toContain("listMemories")
	})

	it("lists extracted memories without requiring ingestion timing", async () => {
		const result = await callTool(s.client, "listMemories", { limit: 20 })
		expect(result.isError).toBeFalsy()
		expect(textOf(result)).toMatch(
			/memor(y|ies) across \d+ document|No memories stored yet/i,
		)
	})

	it("paginates with a bounded page size", async () => {
		const res = await callTool(s.client, "listMemories", { page: 1, limit: 1 })
		expect(res.isError).toBeFalsy()
		const txt = textOf(res)
		// With the memory saved above there is at least one document.
		expect(txt).toMatch(/page 1 of \d+/)
	}, 30_000)

	it("rejects an out-of-range limit", async () => {
		const res = await callTool(s.client, "listMemories", { limit: 500 })
		// Zod schema caps limit at 50 — the SDK surfaces this as a tool error.
		expect(res.isError).toBeTruthy()
	}, 30_000)
})
