import { describe, expect, it } from "vitest"
import {
	GRAPH_PAGE_LIMIT,
	createMemoryGraphStructuredContent,
	summarizeMemoryGraphResult,
} from "./memory-graph-data"
import type { DocumentsApiResponse } from "./client"

const baseDocument = {
	id: "doc-1",
	title: "Doc",
	summary: null,
	type: "text",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	memoryEntries: [
		{
			id: "mem-1",
			memory: "first memory",
			isStatic: true,
			spaceId: "space-1",
			isLatest: true,
			isForgotten: false,
			forgetAfter: null,
			forgetReason: null,
			version: 1,
			parentMemoryId: null,
			rootMemoryId: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	],
}

function documentsResponse(
	overrides: Partial<DocumentsApiResponse["pagination"]>,
): DocumentsApiResponse {
	return {
		documents: [baseDocument],
		pagination: {
			currentPage: 1,
			limit: GRAPH_PAGE_LIMIT,
			totalItems: 23,
			totalPages: 3,
			...overrides,
		},
	}
}

describe("memory graph data", () => {
	it("preserves pagination metadata in structured content", () => {
		const response = documentsResponse({})

		expect(createMemoryGraphStructuredContent(response, "project-a")).toEqual({
			containerTag: "project-a",
			documents: response.documents,
			totalCount: 23,
			loadedCount: 1,
			pagination: response.pagination,
		})
	})

	it("summarizes loaded versus total document counts", () => {
		expect(summarizeMemoryGraphResult(documentsResponse({}), "project-a")).toBe(
			"Memory Graph: showing 1 of 23 documents, 1 loaded memories. More documents available (3 pages total). Project: project-a",
		)
		expect(
			summarizeMemoryGraphResult(
				documentsResponse({ totalItems: 1, totalPages: 1 }),
			),
		).toBe("Memory Graph: showing 1 of 1 documents, 1 loaded memories")
	})
})
