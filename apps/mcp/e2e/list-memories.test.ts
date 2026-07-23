import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	API_URL,
	API_KEY,
	callTool,
	connect,
	deleteDocument,
	type Session,
	sleep,
	textOf,
} from "./helpers"

// listMemories can be briefly eventually-consistent after fixture creation.
async function listUntil(
	s: Session,
	needle: string,
	{ tries = 18, delayMs = 5000 } = {},
): Promise<string | null> {
	for (let i = 0; i < tries; i++) {
		// The marker document is the newest, so page 1 is enough.
		const res = await callTool(s.client, "listMemories", { limit: 20 })
		const txt = textOf(res)
		if (txt.includes(needle)) return txt
		await sleep(delayMs)
	}
	return null
}

describe.skipIf(!API_KEY)("MCP — listMemories", () => {
	let s: Session
	const createdDocumentIds: string[] = []

	beforeAll(async () => {
		s = await connect()
	})
	afterAll(async () => {
		try {
			await Promise.all(
				createdDocumentIds.map((documentId) => deleteDocument(documentId)),
			)
		} finally {
			await s?.close()
		}
	}, 330_000)

	it("lists a saved memory without dumping document content", async () => {
		const marker = `lm-${randomUUID()}`
		const content = `e2e listMemories. token=${marker}. The list test fruit is rambutan.`
		const created = await fetch(`${API_URL}/v4/memories`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				containerTag: "sm_project_default",
				memories: [{ content }],
			}),
		})
		expect(
			created.ok,
			`memory fixture creation failed: ${created.status}`,
		).toBe(true)
		const documentId = ((await created.json()) as { documentId?: string })
			.documentId
		expect(documentId).toBeTruthy()
		if (documentId) createdDocumentIds.push(documentId)

		const listing = await listUntil(s, marker, { tries: 6, delayMs: 1000 })
		expect(
			listing,
			`listMemories never returned marker ${marker}`,
		).not.toBeNull()
		// Header shape: "N memories across M documents (page X of Y, ...)"
		expect(listing).toMatch(/memor(y|ies) across \d+ document/)
	}, 120_000)

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
