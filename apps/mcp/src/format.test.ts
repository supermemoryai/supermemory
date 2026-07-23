import { describe, expect, it } from "vitest"
import type { DocumentsApiResponse } from "./server/client"
import { formatMemoriesList } from "./server/format"

function makeResponse(
	overrides: Partial<DocumentsApiResponse> = {},
): DocumentsApiResponse {
	return {
		documents: [],
		pagination: { currentPage: 1, limit: 10, totalItems: 0, totalPages: 1 },
		...overrides,
	}
}

function makeEntry(memory: string, extra: Record<string, unknown> = {}) {
	return {
		id: `mem_${memory.slice(0, 8)}`,
		memory,
		spaceId: "space_1",
		createdAt: "2026-06-10T12:00:00Z",
		updatedAt: "2026-06-10T12:00:00Z",
		...extra,
	}
}

describe("formatMemoriesList", () => {
	it("reports an empty store", () => {
		expect(formatMemoriesList(makeResponse())).toBe("No memories stored yet.")
	})

	it("reports an out-of-range page distinctly from an empty store", () => {
		const result = formatMemoriesList(
			makeResponse({
				pagination: {
					currentPage: 3,
					limit: 10,
					totalItems: 12,
					totalPages: 2,
				},
			}),
		)
		expect(result).toBe("No documents on page 3 (2 pages total).")
	})

	it("groups memories under their source document with title, type, and date", () => {
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: "Preferences",
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [
							makeEntry("User prefers dark mode"),
							makeEntry("User works in TypeScript"),
						],
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain(
			"2 memories across 1 document (page 1 of 1, 1 documents total), newest first.",
		)
		expect(result).toContain('"Preferences" (text, 2026-06-12)')
		expect(result).toContain("- User prefers dark mode")
		expect(result).toContain("- User works in TypeScript")
		expect(result).not.toContain("More available")
	})

	it("excludes forgotten and superseded memory entries", () => {
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: "Facts",
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [
							makeEntry("Current fact"),
							makeEntry("Forgotten fact", { isForgotten: true }),
							makeEntry("Old version of a fact", { isLatest: false }),
						],
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain("- Current fact")
		expect(result).not.toContain("Forgotten fact")
		expect(result).not.toContain("Old version of a fact")
		expect(result).toContain("1 memory across 1 document")
	})

	it("marks documents whose extraction has not produced memories yet", () => {
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: "Still processing",
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [],
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain(
			'"Still processing" (text, 2026-06-12) - no extracted memories yet',
		)
	})

	it("falls back to (untitled) for documents without a title", () => {
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: null,
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [makeEntry("Some fact")],
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain('"(untitled)" (text, 2026-06-12)')
	})

	it("flattens multi-line memories and truncates oversized ones", () => {
		const longMemory = `start ${"x".repeat(600)}`
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: "Big",
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [
							makeEntry("line one\nline two\ttabbed"),
							makeEntry(longMemory),
						],
					},
				],
				pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
			}),
		)

		expect(result).toContain("- line one line two tabbed")
		expect(result).toContain("... [truncated]")
		const truncatedLine = result
			.split("\n")
			.find((line) => line.includes("[truncated]"))
		expect(truncatedLine).toBeDefined()
		expect((truncatedLine as string).length).toBeLessThan(600)
	})

	it("points at the next page when more documents exist", () => {
		const result = formatMemoriesList(
			makeResponse({
				documents: [
					{
						id: "doc_1",
						title: "Page one doc",
						type: "text",
						createdAt: "2026-06-12T08:00:00Z",
						updatedAt: "2026-06-12T08:00:00Z",
						memoryEntries: [makeEntry("A fact")],
					},
				],
				pagination: { currentPage: 1, limit: 1, totalItems: 3, totalPages: 3 },
			}),
		)

		expect(result).toContain("page 1 of 3, 3 documents total")
		expect(result).toContain("More available - call listMemories with page: 2.")
	})
})
