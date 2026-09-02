import { describe, expect, it } from "vitest"
import type { DocumentDetails, DocumentsListResponse } from "./client"
import { formatDocument, formatDocumentsList } from "./format"

function list(document: Record<string, unknown>): DocumentsListResponse {
	return {
		documents: [
			{
				id: "doc_1",
				type: "text",
				status: "done",
				createdAt: "2026-08-07T12:53:00.000Z",
				...document,
			},
		],
		pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 50 },
	} as unknown as DocumentsListResponse
}

function details(document: Record<string, unknown>): DocumentDetails {
	return {
		id: "doc_1",
		type: "text",
		status: "done",
		createdAt: "2026-08-07T12:53:00.000Z",
		updatedAt: "2026-08-07T12:53:00.000Z",
		content: "body",
		...document,
	} as unknown as DocumentDetails
}

describe("document titles in MCP output", () => {
	it("prefers a pinned metadata title over the stored one", () => {
		expect(
			formatDocumentsList(
				list({ title: "Paraphrase", metadata: { title: "Pinned" } }),
			),
		).toContain('"Pinned"')
		expect(
			formatDocument(
				details({ title: "Paraphrase", metadata: { title: "Pinned" } }),
			),
		).toContain("# Pinned")
	})

	it("uses the pinned title when titling produced nothing", () => {
		expect(
			formatDocumentsList(list({ title: null, metadata: { title: "Pinned" } })),
		).toContain('"Pinned"')
	})

	it("falls back to the stored title, then to a placeholder", () => {
		expect(formatDocumentsList(list({ title: "Stored" }))).toContain('"Stored"')
		expect(formatDocumentsList(list({ title: null }))).toContain("(untitled)")
		expect(formatDocument(details({ title: null }))).toContain("# (untitled)")
	})

	it("ignores metadata that is blank or not a string", () => {
		expect(
			formatDocumentsList(
				list({ title: "Stored", metadata: { title: "   " } }),
			),
		).toContain('"Stored"')
		expect(
			formatDocumentsList(list({ title: "Stored", metadata: { title: 42 } })),
		).toContain('"Stored"')
	})

	it("survives non-object metadata", () => {
		for (const metadata of [null, "raw", 7, true, ["a"]]) {
			expect(
				formatDocumentsList(list({ title: "Stored", metadata })),
			).toContain('"Stored"')
		}
	})
})
