import { beforeEach, describe, expect, it, vi } from "vitest"

const clientSearch = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			search = clientSearch
		},
	}
})

import { SupermemoryRetriever } from "./retriever"

const API_KEY = "sm_test_key"

describe("SupermemoryRetriever", () => {
	beforeEach(() => vi.clearAllMocks())

	it("searches the configured container tag in hybrid mode", async () => {
		clientSearch.mockResolvedValue({ results: [] })
		const retriever = new SupermemoryRetriever(API_KEY, {
			containerTag: "user_1",
			limit: 5,
		})

		await retriever.invoke("anything")

		const body = clientSearch.mock.calls[0]?.[0]
		expect(body.q).toBe("anything")
		expect(body.containerTag).toBe("user_1")
		expect(body.limit).toBe(5)
		expect(body.searchMode).toBe("hybrid")
	})

	it("prefers an extracted memory, falling back to the source chunk", async () => {
		clientSearch.mockResolvedValue({
			results: [
				{ id: "a", memory: "learned fact", similarity: 0.9, updatedAt: "t" },
				{ id: "b", chunk: "source chunk", similarity: 0.8, updatedAt: "t" },
				{ id: "c", similarity: 0.7, updatedAt: "t" },
			],
		})
		const retriever = new SupermemoryRetriever(API_KEY, {
			containerTag: "user_1",
		})

		const docs = await retriever.invoke("q")

		expect(docs.map((d) => d.pageContent)).toEqual([
			"learned fact",
			"source chunk",
			"",
		])
		expect(docs[0]?.metadata).toMatchObject({
			id: "a",
			containerTag: "user_1",
			similarity: 0.9,
		})
	})
})
