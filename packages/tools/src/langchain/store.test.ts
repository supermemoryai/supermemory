import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK (same pattern as tool-operations.test.ts) so store
// operations can be verified deterministically without network access.
const documentsAdd = vi.fn()
const documentsList = vi.fn()
const documentsDelete = vi.fn()
const searchDocuments = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			documents = {
				add: documentsAdd,
				list: documentsList,
				delete: documentsDelete,
			}
			search = { documents: searchDocuments }
		},
	}
})

import { SupermemoryStore } from "./store"

const API_KEY = "sm_test_key"

/** One page of documents, short enough to end pagination. */
function listPage(memories: unknown[]) {
	return { memories, pagination: {} }
}

describe("SupermemoryStore", () => {
	let store: SupermemoryStore

	beforeEach(() => {
		vi.clearAllMocks()
		store = new SupermemoryStore(API_KEY)
	})

	it("writes the namespace as a container tag and the key as customId", async () => {
		documentsAdd.mockResolvedValue({ id: "doc_1" })

		await store.put(["memories", "user1"], "profile", { name: "Ada" })

		expect(documentsAdd).toHaveBeenCalledTimes(1)
		const body = documentsAdd.mock.calls[0]?.[0]
		expect(body.containerTags).toEqual(["memories/user1"])
		expect(body.customId).toBe("profile")
		expect(JSON.parse(body.content)).toEqual({ name: "Ada" })
	})

	it("round-trips a stored value through get", async () => {
		documentsList.mockResolvedValue(
			listPage([
				{
					id: "doc_1",
					customId: "profile",
					content: JSON.stringify({ name: "Ada" }),
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-02T00:00:00Z",
				},
			]),
		)

		const item = await store.get(["memories", "user1"], "profile")

		expect(item?.value).toEqual({ name: "Ada" })
		expect(item?.key).toBe("profile")
		expect(item?.namespace).toEqual(["memories", "user1"])
		expect(documentsList.mock.calls[0]?.[0].containerTags).toEqual([
			"memories/user1",
		])
	})

	it("returns null when the key is absent", async () => {
		documentsList.mockResolvedValue(
			listPage([{ id: "doc_2", customId: "other", content: "{}" }]),
		)

		expect(await store.get(["memories"], "missing")).toBeNull()
	})

	it("deletes by resolving the key to a document id", async () => {
		documentsList.mockResolvedValue(
			listPage([{ id: "doc_1", customId: "profile", content: "{}" }]),
		)

		await store.delete(["memories"], "profile")

		expect(documentsDelete).toHaveBeenCalledWith("doc_1")
	})

	it("does not delete anything when the key is absent", async () => {
		documentsList.mockResolvedValue(listPage([]))

		await store.delete(["memories"], "missing")

		expect(documentsDelete).not.toHaveBeenCalled()
	})

	it("maps search results back to namespace and key via metadata", async () => {
		searchDocuments.mockResolvedValue({
			results: [
				{
					documentId: "doc_1",
					score: 0.87,
					content: JSON.stringify({ name: "Ada" }),
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-02T00:00:00Z",
					metadata: {
						langgraphKey: "profile",
						langgraphNamespace: "memories/user1",
					},
				},
			],
		})

		const [hit] = await store.search(["memories", "user1"], { query: "ada" })

		expect(hit?.key).toBe("profile")
		expect(hit?.namespace).toEqual(["memories", "user1"])
		expect(hit?.value).toEqual({ name: "Ada" })
		expect(hit?.score).toBe(0.87)
	})

	it("applies offset client-side and widens the fetch to cover it", async () => {
		const result = (id: string) => ({
			documentId: id,
			score: 0.5,
			content: "{}",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
			metadata: null,
		})
		searchDocuments.mockResolvedValue({
			results: [result("a"), result("b"), result("c")],
		})

		const hits = await store.search(["memories"], {
			query: "x",
			limit: 2,
			offset: 1,
		})

		expect(searchDocuments.mock.calls[0]?.[0].limit).toBe(3)
		expect(hits.map((hit) => hit.key)).toEqual(["b", "c"])
	})

	it("lists namespaces from container tags, filtered by prefix", async () => {
		documentsList.mockResolvedValue(
			listPage([
				{ id: "1", containerTags: ["memories/user1"], content: "{}" },
				{ id: "2", containerTags: ["memories/user2"], content: "{}" },
				{ id: "3", containerTags: ["other/user3"], content: "{}" },
			]),
		)

		const namespaces = await store.listNamespaces({ prefix: ["memories"] })

		expect(namespaces).toEqual([
			["memories", "user1"],
			["memories", "user2"],
		])
	})

	it('treats "*" as a single-segment wildcard when matching namespaces', async () => {
		documentsList.mockResolvedValue(
			listPage([
				{ id: "1", containerTags: ["memories/user1"], content: "{}" },
				{ id: "2", containerTags: ["other/user1"], content: "{}" },
				{ id: "3", containerTags: ["other/user2"], content: "{}" },
			]),
		)

		const namespaces = await store.listNamespaces({ suffix: ["user1"] })
		expect(namespaces).toEqual([
			["memories", "user1"],
			["other", "user1"],
		])

		const wildcard = await store.listNamespaces({ prefix: ["*", "user2"] })
		expect(wildcard).toEqual([["other", "user2"]])
	})

	it("surfaces non-JSON content instead of throwing", async () => {
		documentsList.mockResolvedValue(
			listPage([
				{
					id: "doc_1",
					customId: "notes",
					content: "plain text, not JSON",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
				},
			]),
		)

		const item = await store.get(["memories"], "notes")

		expect(item?.value).toEqual({ content: "plain text, not JSON" })
	})
})
