import { beforeEach, describe, expect, it, vi } from "vitest"

const {
	add,
	documentsDelete,
	documentsGet,
	documentsUpdate,
	list,
	namespacesList,
	search,
	MockNotFoundError,
} = vi.hoisted(() => ({
	add: vi.fn(),
	documentsDelete: vi.fn(),
	documentsGet: vi.fn(),
	documentsUpdate: vi.fn(),
	list: vi.fn(),
	namespacesList: vi.fn(),
	search: vi.fn(),
	MockNotFoundError: class MockNotFoundError extends Error {},
}))

vi.mock("supermemory", () => ({
	NotFoundError: MockNotFoundError,
	Supermemory: class MockSupermemory {
		add = add
		documents = {
			delete: documentsDelete,
			get: documentsGet,
			update: documentsUpdate,
		}
		list = list
		namespaces = { list: namespacesList }
		search = search
	},
}))

import { SupermemoryStore } from "./store"

const timestamps = {
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-02T00:00:00Z",
}

function document(id: string, key: string, value: Record<string, unknown>) {
	return {
		id,
		content: JSON.stringify(value),
		metadata: { langgraphKey: key },
		system: { status: "done", ...timestamps },
	}
}

describe("SupermemoryStore", () => {
	let store: SupermemoryStore

	beforeEach(() => {
		vi.clearAllMocks()
		documentsGet.mockRejectedValue(new MockNotFoundError())
		namespacesList.mockResolvedValue({
			namespaces: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
		})
		store = new SupermemoryStore("sm_test")
	})

	it("creates an item with a scoped v5 namespace and caller ID", async () => {
		await store.put(["users", "ada"], "profile", { theme: "dark" })

		expect(add).toHaveBeenCalledWith("langgraph:users:ada", {
			content: JSON.stringify({ theme: "dark" }),
			id: "profile",
			metadata: { langgraphKey: "profile" },
			taskType: "superrag",
		})
	})

	it("reads and replaces an existing item directly by namespace and key", async () => {
		documentsGet.mockResolvedValue(
			document("doc_1", "profile", { theme: "light" }),
		)

		const item = await store.get(["users", "ada"], "profile")
		await store.put(["users", "ada"], "profile", { theme: "dark" })

		expect(item).toMatchObject({
			key: "profile",
			namespace: ["users", "ada"],
			value: { theme: "light" },
		})
		expect(documentsUpdate).toHaveBeenCalledWith(
			"langgraph:users:ada",
			"doc_1",
			{ content: JSON.stringify({ theme: "dark" }) },
		)
	})

	it("deletes an existing item", async () => {
		documentsGet.mockResolvedValue(document("doc_1", "profile", {}))
		documentsDelete.mockResolvedValue({ count: 1, errors: [] })

		await store.delete(["users", "ada"], "profile")

		expect(documentsDelete).toHaveBeenCalledWith("langgraph:users:ada", {
			ids: ["doc_1"],
		})
	})

	it("searches every managed namespace under the requested prefix", async () => {
		namespacesList.mockResolvedValue({
			namespaces: [
				{ namespace: "langgraph:users:ada" },
				{ namespace: "langgraph:users:grace" },
				{ namespace: "unrelated" },
			],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 3 },
		})
		search
			.mockResolvedValueOnce({
				results: [
					{
						metadata: { langgraphKey: "profile" },
						similarity: 0.7,
					},
				],
			})
			.mockResolvedValueOnce({
				results: [
					{
						metadata: { langgraphKey: "profile" },
						similarity: 0.9,
					},
				],
			})
		documentsGet
			.mockResolvedValueOnce(document("ada", "profile", { active: true }))
			.mockResolvedValueOnce(document("grace", "profile", { active: true }))

		const results = await store.search(["users"], {
			query: "active profile",
			filter: { active: true },
		})

		expect(search).toHaveBeenCalledTimes(2)
		expect(search).toHaveBeenCalledWith("langgraph:users:ada", {
			query: "active profile",
			searchMode: "chunks",
			limit: 50,
			threshold: 0,
		})
		expect(results.map((item) => item.namespace)).toEqual([
			["users", "grace"],
			["users", "ada"],
		])
	})

	it("lists and filters items when search has no semantic query", async () => {
		namespacesList.mockResolvedValue({
			namespaces: [{ namespace: "langgraph:users:ada" }],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
		})
		list.mockResolvedValue({
			documents: [{ id: "profile" }],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
		})
		documentsGet.mockResolvedValue(
			document("doc_1", "profile", { theme: "dark" }),
		)

		const results = await store.search(["users"], {
			filter: { theme: "dark" },
		})

		expect(list).toHaveBeenCalledWith("langgraph:users:ada", "documents", {
			page: 1,
			limit: 100,
		})
		expect(results).toHaveLength(1)
		expect(results[0]?.value).toEqual({ theme: "dark" })
	})

	it("lists only store-owned namespaces with LangGraph matching", async () => {
		namespacesList.mockResolvedValue({
			namespaces: [
				{ namespace: "langgraph:users:ada" },
				{ namespace: "langgraph:users:grace" },
				{ namespace: "langgraph:projects:demo" },
				{ namespace: "user_alex" },
			],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 4 },
		})

		const namespaces = await store.listNamespaces({
			prefix: ["users"],
		})

		expect(namespaces).toEqual([
			["users", "ada"],
			["users", "grace"],
		])
	})
})
