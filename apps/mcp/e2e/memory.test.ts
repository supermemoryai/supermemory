import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	AUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	recallUntil,
	type Session,
	textOf,
} from "./helpers"

describe.skipIf(!AUTH_CREDENTIALS_AVAILABLE)("MCP — memory behaviors", () => {
	let s: Session
	const created: Array<{ content: string; containerTag?: string }> = []

	beforeAll(async () => {
		s = await connect()
	})
	afterAll(async () => {
		for (const { content, containerTag } of created) {
			await callTool(s.client, "add_memory", {
				content,
				action: "forget",
				...(containerTag ? { containerTag } : {}),
			}).catch(() => {})
		}
		await s?.close()
	})

	it("save → recall round-trips the saved memory", async () => {
		const marker = `rt-${randomUUID()}`
		const content = `e2e round-trip. token=${marker}. The test fruit is dragonfruit.`
		created.push({ content })

		const save = await callTool(s.client, "add_memory", {
			content,
			action: "save",
		})
		expect(save.isError).toBeFalsy()
		expect(textOf(save)).toMatch(/Memory saved/i)

		const found = await recallUntil(s.client, "test fruit dragonfruit", marker)
		expect(found, `recall never returned marker ${marker}`).not.toBeNull()
	}, 120_000)

	it("recall includeProfile=true returns profile + memories sections", async () => {
		const res = await callTool(s.client, "search_memory", {
			query: "dragonfruit",
			includeProfile: true,
		})
		expect(res.isError).toBeFalsy()
		const txt = textOf(res)
		expect(txt).toMatch(/## (Profile|Recent context|Matching memories)/)
	}, 30_000)

	// Hybrid search returns nearest matches even for unrelated queries — assert it responds gracefully, not empty.
	it("recall responds gracefully for an unmatched query", async () => {
		const res = await callTool(s.client, "search_memory", {
			query: `zzz-no-such-memory-${randomUUID()}`,
			includeProfile: false,
		})
		expect(res.isError).toBeFalsy()
		expect(textOf(res)).toMatch(
			/## Matching memories|No matching memories found/i,
		)
	})

	it("forget accepts a saved-memory request before extraction completes", async () => {
		const marker = `fg-${randomUUID()}`
		const content = `e2e forget target. token=${marker}. Secret animal is axolotl.`
		created.push({ content })

		await callTool(s.client, "add_memory", { content, action: "save" })
		const found = await recallUntil(s.client, "secret animal axolotl", marker)
		expect(found, "memory should exist before forget").not.toBeNull()

		const forgotten = await callTool(s.client, "add_memory", {
			content,
			action: "forget",
		})
		expect(forgotten.isError).toBeFalsy()
		expect(textOf(forgotten)).toMatch(/forgot|No matching memory found/i)
	}, 120_000)

	it("containerTag scopes memories (isolation)", async () => {
		// Fixed tags (not per-run UUIDs) so the test doesn't mint a new project each run.
		const tagA = "sm_e2e_scope_a"
		const tagB = "sm_e2e_scope_b"
		const marker = `sc-${randomUUID()}`
		const content = `e2e scoping. token=${marker}. Project color is teal.`
		created.push({ content, containerTag: tagA })

		await callTool(s.client, "add_memory", {
			content,
			action: "save",
			containerTag: tagA,
		})

		const inA = await recallUntil(s.client, "project color teal", marker, {
			containerTag: tagA,
		})
		expect(inA, "marker should be found in its own container").not.toBeNull()

		// Same query scoped to a different container must NOT see it.
		const leaked = await recallUntil(s.client, "project color teal", marker, {
			containerTag: tagB,
			tries: 3,
			delayMs: 3000,
		})
		expect(leaked, "marker leaked across containers").toBeNull()
	}, 120_000)

	it("returns an error result for a missing required argument", async () => {
		const res = await callTool(s.client, "search_memory", {})
		expect(res.isError).toBe(true)
		expect(textOf(res).length).toBeGreaterThan(0)
	})
})
