import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	API_URL,
	API_KEY,
	callTool,
	connect,
	deleteDocument,
	documentIdOf,
	recallUntil,
	sleep,
	type Session,
	textOf,
} from "./helpers"

describe.skipIf(!API_KEY)("MCP — memory behaviors", () => {
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

	it("save → recall round-trips the saved memory", async () => {
		const marker = `rt-${randomUUID()}`
		const content = `e2e round-trip. token=${marker}. The test fruit is dragonfruit.`
		const save = await callTool(s.client, "memory", { content, action: "save" })
		expect(save.isError).toBeFalsy()
		expect(textOf(save)).toMatch(/Saved memory/i)
		const documentId = documentIdOf(save)
		expect(documentId).toBeTruthy()
		if (documentId) createdDocumentIds.push(documentId)

		const found = await recallUntil(s.client, "test fruit dragonfruit", marker)
		expect(found, `recall never returned marker ${marker}`).not.toBeNull()
	}, 120_000)

	it("recall includeProfile=true returns profile + memories sections", async () => {
		const res = await callTool(s.client, "recall", {
			query: "dragonfruit",
			includeProfile: true,
		})
		expect(res.isError).toBeFalsy()
		const txt = textOf(res)
		expect(txt).toMatch(/## (User Profile|Relevant Memories)/)
	}, 30_000)

	// Hybrid search returns nearest matches even for unrelated queries — assert it responds gracefully, not empty.
	it("recall responds gracefully for an unmatched query", async () => {
		const res = await callTool(s.client, "recall", {
			query: `zzz-no-such-memory-${randomUUID()}`,
			includeProfile: false,
		})
		expect(res.isError).toBeFalsy()
		expect(textOf(res)).toMatch(/## Relevant Memories|No memories found/i)
	})

	// Hard-asserts forget is accepted; removal is eventually-consistent, so disappearance is best-effort.
	it("forget accepts and removes a saved memory", async () => {
		const marker = `fg-${randomUUID()}`
		const content = `e2e forget target. token=${marker}. Secret animal is axolotl.`
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
		const fixture = (await created.json()) as {
			documentId?: string
			memories?: Array<{ id: string }>
		}
		expect(fixture.documentId).toBeTruthy()
		expect(fixture.memories?.[0]?.id).toBeTruthy()
		if (fixture.documentId) createdDocumentIds.push(fixture.documentId)

		const forgotten = await callTool(s.client, "memory", {
			content,
			action: "forget",
		})
		expect(forgotten.isError).toBeFalsy()
		expect(textOf(forgotten)).toMatch(
			/Successfully forgot memory \(exact match\)/i,
		)

		const verify = await fetch(`${API_URL}/v4/memories`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: fixture.memories?.[0]?.id,
				containerTag: "sm_project_default",
			}),
		})
		expect(verify.status).toBe(404)
	}, 240_000)

	it("forget previews similar memories and requires signed confirmation", async () => {
		const containerTag = "sm_e2e_safe_forget"
		const marker = `safe-fg-${randomUUID()}`
		const content = `e2e safe forget target. token=${marker}. Vault color is marigold.`
		let confirmForget = true
		const scoped = await connect({
			containerTag,
			onElicitation: () =>
				confirmForget
					? { action: "accept", content: { confirm: true } }
					: { action: "decline" },
		})
		let documentId: string | undefined

		try {
			const created = await fetch(`${API_URL}/v4/memories`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					containerTag,
					memories: [{ content }],
				}),
			})
			expect(
				created.ok,
				`memory fixture creation failed: ${created.status}`,
			).toBe(true)
			const body: { documentId?: string } = await created.json()
			documentId = body.documentId
			expect(
				documentId,
				"fixture should return a source document ID",
			).toBeTruthy()
			if (documentId) createdDocumentIds.push(documentId)
			const nearMatch = `${content} please`

			let previewText = ""
			for (let i = 0; i < 18; i++) {
				const preview = await callTool(scoped.client, "memory", {
					content: nearMatch,
					action: "forget",
				})
				expect(preview.isError).toBeFalsy()
				previewText = textOf(preview)
				if (previewText.includes("confirmationToken:")) break
				await sleep(5000)
			}
			expect(previewText).toContain(
				"No exact memory matched. No changes were made.",
			)
			const matchingCandidate = previewText
				.split(/(?=- confirmationToken: )/)
				.find((candidate) => candidate.includes(marker))
			const confirmationToken = matchingCandidate?.match(
				/^- confirmationToken: (\S+)/,
			)?.[1]
			expect(
				confirmationToken,
				"preview should return a signed confirmation token",
			).toBeTruthy()
			expect(
				previewText,
				"preview should identify the intended candidate",
			).toContain(marker)

			const rejected = await callTool(scoped.client, "memory", {
				content: `${nearMatch} altered`,
				action: "forget",
				confirmationToken,
			})
			expect(textOf(rejected)).toContain(
				"Invalid or expired forget confirmation. No changes were made.",
			)

			const wrongContainer = await callTool(s.client, "memory", {
				content: nearMatch,
				action: "forget",
				confirmationToken,
				containerTag: `${containerTag}_other`,
			})
			expect(textOf(wrongContainer)).toContain(
				"Invalid or expired forget confirmation. No changes were made.",
			)

			confirmForget = false
			const declined = await callTool(scoped.client, "memory", {
				content: nearMatch,
				action: "forget",
				confirmationToken,
			})
			expect(declined.isError).toBeFalsy()
			expect(textOf(declined)).toContain(
				"Forget cancelled. No changes were made.",
			)

			const afterPreview = await callTool(scoped.client, "listMemories")
			expect(
				textOf(afterPreview),
				"preview must not delete the candidate",
			).toContain(marker)

			confirmForget = true
			const confirmed = await callTool(scoped.client, "memory", {
				content: nearMatch,
				action: "forget",
				confirmationToken,
			})
			expect(confirmed.isError).toBeFalsy()
			expect(textOf(confirmed)).toMatch(/Successfully forgot memory with ID/i)

			let removed = false
			for (let i = 0; i < 12; i++) {
				const listed = await callTool(scoped.client, "listMemories")
				if (!textOf(listed).includes(marker)) {
					removed = true
					break
				}
				await sleep(3000)
			}
			expect(removed, "confirmed candidate should be removed").toBe(true)
		} finally {
			await scoped.close()
		}
	}, 300_000)

	it("containerTag scopes memories (isolation)", async () => {
		// Fixed tags (not per-run UUIDs) so the test doesn't mint a new project each run.
		const tagA = "sm_e2e_scope_a"
		const tagB = "sm_e2e_scope_b"
		const marker = `sc-${randomUUID()}`
		const content = `e2e scoping. token=${marker}. Project color is teal.`
		const save = await callTool(s.client, "memory", {
			content,
			action: "save",
			containerTag: tagA,
		})
		const documentId = documentIdOf(save)
		expect(documentId).toBeTruthy()
		if (documentId) createdDocumentIds.push(documentId)

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
		const res = await callTool(s.client, "recall", {})
		expect(res.isError).toBe(true)
		expect(textOf(res).length).toBeGreaterThan(0)
	})
})
