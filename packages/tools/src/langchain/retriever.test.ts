import { beforeEach, describe, expect, it, vi } from "vitest"

const search = vi.fn()

vi.mock("supermemory", () => ({
	NotFoundError: class NotFoundError extends Error {},
	Supermemory: class MockSupermemory {
		search = search
	},
}))

import { SupermemoryRetriever } from "./retriever"

describe("SupermemoryRetriever", () => {
	beforeEach(() => vi.clearAllMocks())

	it("searches its v5 namespace in hybrid mode", async () => {
		search.mockResolvedValue({ results: [] })
		const retriever = new SupermemoryRetriever("sm_test", {
			namespace: "user_1",
			limit: 5,
		})

		await retriever.invoke("favorite editor")

		expect(search).toHaveBeenCalledWith("user_1", {
			query: "favorite editor",
			limit: 5,
			threshold: 0.6,
			searchMode: "hybrid",
		})
	})

	it("maps memory and chunk results to LangChain documents", async () => {
		search.mockResolvedValue({
			results: [
				{
					id: "mem_1",
					memory: "Uses Neovim",
					metadata: { source: "profile" },
					similarity: 0.9,
					system: { createdAt: "c", updatedAt: "u" },
				},
				{
					id: "chunk_1",
					chunk: "Editor notes",
					metadata: {},
					similarity: 0.8,
					system: { updatedAt: "u" },
				},
			],
		})
		const retriever = new SupermemoryRetriever("sm_test", {
			namespace: "user_1",
		})

		const documents = await retriever.invoke("editor")

		expect(documents.map((document) => document.pageContent)).toEqual([
			"Uses Neovim",
			"Editor notes",
		])
		expect(documents[0]?.metadata).toMatchObject({
			id: "mem_1",
			namespace: "user_1",
			similarity: 0.9,
			source: "profile",
		})
	})
})
