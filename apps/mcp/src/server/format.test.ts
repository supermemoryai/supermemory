import { describe, expect, it } from "vitest"
import type { MemoryEntriesResponse, MemoryEntry } from "./client"
import { formatMemoryEntriesList } from "./format"

function memoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
	return {
		id: "memory-1",
		memory: "Current fact",
		version: 1,
		isLatest: true,
		isForgotten: false,
		createdAt: "2026-08-15T10:00:00.000Z",
		updatedAt: "2026-08-15T10:00:00.000Z",
		...overrides,
	}
}

function memoryResponse(
	overrides: Partial<MemoryEntriesResponse> = {},
): MemoryEntriesResponse {
	return {
		memoryEntries: [],
		pagination: {
			currentPage: 1,
			limit: 10,
			totalItems: 0,
			totalPages: 1,
		},
		...overrides,
	}
}

describe("formatMemoryEntriesList", () => {
	it("reports a truly empty store", () => {
		expect(formatMemoryEntriesList(memoryResponse())).toBe(
			"No active memories stored yet.",
		)
	})

	it("continues past a filtered-empty page when a later page has active data", () => {
		const firstPage = formatMemoryEntriesList(
			memoryResponse({
				memoryEntries: [
					memoryEntry({ id: "forgotten", isForgotten: true }),
					memoryEntry({ id: "superseded", isLatest: false }),
				],
				pagination: {
					currentPage: 1,
					limit: 2,
					totalItems: 3,
					totalPages: 2,
				},
			}),
		)
		const secondPage = formatMemoryEntriesList(
			memoryResponse({
				memoryEntries: [memoryEntry({ id: "still-active" })],
				pagination: {
					currentPage: 2,
					limit: 2,
					totalItems: 3,
					totalPages: 2,
				},
			}),
		)

		expect(firstPage).toBe(
			"No active memories on page 1 (2 pages total).\n\nMore available - call listMemories with page: 2.",
		)
		expect(secondPage).toContain("[still-active] Current fact")
	})

	it("does not offer another page from a filtered-empty last page", () => {
		const result = formatMemoryEntriesList(
			memoryResponse({
				memoryEntries: [memoryEntry({ isForgotten: true })],
				pagination: {
					currentPage: 2,
					limit: 10,
					totalItems: 11,
					totalPages: 2,
				},
			}),
		)

		expect(result).toBe("No active memories on page 2 (2 pages total).")
		expect(result).not.toContain("More available")
	})

	it("keeps active-memory output unchanged", () => {
		const result = formatMemoryEntriesList(
			memoryResponse({
				memoryEntries: [memoryEntry()],
				pagination: {
					currentPage: 1,
					limit: 10,
					totalItems: 1,
					totalPages: 1,
				},
			}),
		)

		expect(result).toBe(
			"1 active memory (page 1 of 1, 1 memory entry total), newest first.\n\n- [memory-1] Current fact\n  version 1 | updated 2026-08-15",
		)
	})
})
