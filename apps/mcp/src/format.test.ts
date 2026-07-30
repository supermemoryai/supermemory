import { describe, expect, it } from "vitest"
import type {
	DocumentDetails,
	DocumentsListResponse,
	MemoryEntriesResponse,
} from "./server/client"
import {
	formatDocument,
	formatDocumentsList,
	formatMemoryEntriesList,
} from "./server/format"

function makeDocumentsResponse(
	overrides: Partial<DocumentsListResponse> = {},
): DocumentsListResponse {
	return {
		documents: [],
		pagination: { currentPage: 1, limit: 10, totalItems: 0, totalPages: 1 },
		...overrides,
	}
}

function makeMemoryResponse(
	overrides: Partial<MemoryEntriesResponse> = {},
): MemoryEntriesResponse {
	return {
		memoryEntries: [],
		pagination: { currentPage: 1, limit: 10, totalItems: 0, totalPages: 1 },
		...overrides,
	}
}

function makeMemory(memory: string, extra: Record<string, unknown> = {}) {
	return {
		id: `mem_${memory.slice(0, 8)}`,
		memory,
		version: 1,
		isLatest: true,
		isForgotten: false,
		createdAt: "2026-06-10T12:00:00Z",
		updatedAt: "2026-06-10T12:00:00Z",
		...extra,
	}
}

describe("formatDocumentsList", () => {
	it("reports an empty document store", () => {
		expect(formatDocumentsList(makeDocumentsResponse())).toBe(
			"No documents stored yet.",
		)
	})

	it("formats document metadata and stable IDs without content", () => {
		const result = formatDocumentsList(
			makeDocumentsResponse({
				documents: [
					{
						id: "doc_1",
						connectionId: null,
						createdAt: "2026-06-12T08:00:00Z",
						customId: null,
						metadata: null,
						status: "done",
						summary: "A compact summary.",
						title: "Preferences",
						type: "text",
						updatedAt: "2026-06-12T08:00:00Z",
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain(
			"1 document (page 1 of 1, 1 document total), newest first.",
		)
		expect(result).toContain('- [doc_1] "Preferences" (text, done, 2026-06-12)')
		expect(result).toContain("Summary: A compact summary.")
		expect(result).toContain(
			"Use getDocument with a document ID to read its content.",
		)
	})

	it("points to the next document page", () => {
		const result = formatDocumentsList(
			makeDocumentsResponse({
				documents: [
					{
						id: "doc_1",
						connectionId: null,
						createdAt: "2026-06-12T08:00:00Z",
						customId: null,
						metadata: null,
						status: "done",
						summary: null,
						title: null,
						type: "text",
						updatedAt: "2026-06-12T08:00:00Z",
					},
				],
				pagination: { currentPage: 1, limit: 1, totalItems: 3, totalPages: 3 },
			}),
		)

		expect(result).toContain('"(untitled)"')
		expect(result).toContain(
			"More available - call listDocuments with page: 2.",
		)
	})
})

describe("formatMemoryEntriesList", () => {
	it("reports an empty memory store", () => {
		expect(formatMemoryEntriesList(makeMemoryResponse())).toBe(
			"No active memories stored yet.",
		)
	})

	it("formats active memories independently of documents", () => {
		const result = formatMemoryEntriesList(
			makeMemoryResponse({
				memoryEntries: [
					makeMemory("User prefers dark mode", {
						id: "mem_1",
						version: 2,
						documentIds: ["doc_1", "doc_2"],
						history: [
							{
								id: "mem_old",
								memory: "User sometimes uses dark mode",
								version: 1,
								createdAt: "2026-06-01T00:00:00Z",
								updatedAt: "2026-06-01T00:00:00Z",
							},
						],
					}),
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain(
			"1 active memory (page 1 of 1, 1 memory entry total), newest first.",
		)
		expect(result).toContain("- [mem_1] User prefers dark mode")
		expect(result).toContain(
			"version 2 | updated 2026-06-10 | 1 previous version",
		)
		expect(result).toContain("Source documents: doc_1, doc_2")
	})

	it("excludes forgotten and superseded entries", () => {
		const result = formatMemoryEntriesList(
			makeMemoryResponse({
				memoryEntries: [
					makeMemory("Current fact"),
					makeMemory("Forgotten fact", { isForgotten: true }),
					makeMemory("Old fact", { isLatest: false }),
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 3, totalPages: 1 },
			}),
		)

		expect(result).toContain("Current fact")
		expect(result).not.toContain("Forgotten fact")
		expect(result).not.toContain("Old fact")
	})

	it("flattens and truncates oversized memory text", () => {
		const result = formatMemoryEntriesList(
			makeMemoryResponse({
				memoryEntries: [
					makeMemory("line one\nline two"),
					makeMemory(`start ${"x".repeat(600)}`),
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 2, totalPages: 1 },
			}),
		)

		expect(result).toContain("line one line two")
		expect(result).toContain("... [truncated]")
	})
})

describe("formatDocument", () => {
	const document: DocumentDetails = {
		id: "doc_1",
		connectionId: null,
		content: "Original input",
		createdAt: "2026-06-12T08:00:00Z",
		customId: null,
		metadata: null,
		ogImage: null,
		raw: "Full extracted document text",
		source: "text",
		spatialPoint: null,
		status: "done",
		summary: "A compact summary.",
		title: "Preferences",
		type: "text",
		updatedAt: "2026-06-12T09:00:00Z",
		url: null,
	}

	it("returns document metadata, summary, and full available content", () => {
		const result = formatDocument(document)

		expect(result).toContain("# Preferences")
		expect(result).toContain("Document ID: doc_1")
		expect(result).toContain("## Summary\nA compact summary.")
		expect(result).toContain("## Content\nFull extracted document text")
		expect(result).not.toContain("Original input")
	})

	it("falls back to the original content when raw content is absent", () => {
		const result = formatDocument({ ...document, raw: null })
		expect(result).toContain("## Content\nOriginal input")
	})
})
