import { afterEach, describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "./client"

const TOKEN = "sm_test_token"
const API_URL = "https://api.supermemory.ai"

/** Stubs the documents endpoint and records the request body. */
function mockDocumentsFetch() {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({
			documents: [],
			pagination: { currentPage: 1, limit: 10, totalItems: 0, totalPages: 0 },
		}),
	})
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

function requestBody(fetchMock: ReturnType<typeof mockDocumentsFetch>) {
	const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
	return JSON.parse(init.body as string) as { containerTags?: string[] }
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("SupermemoryClient.getDocuments container scoping", () => {
	// listMemories, memory-graph and fetch-graph-data all pass `undefined` when no
	// container tag is supplied. Omitting containerTags reads across every project,
	// while createMemory/search stay scoped to the default project — so listings
	// would surface documents that recall can never return.
	it("falls back to the default project when no container tag is given", async () => {
		const fetchMock = mockDocumentsFetch()
		const client = new SupermemoryClient(TOKEN, undefined, API_URL)

		await client.getDocuments(undefined, 1, 10)

		expect(requestBody(fetchMock).containerTags).toEqual(["sm_project_default"])
	})

	it("falls back to the client's container tag when no container tag is given", async () => {
		const fetchMock = mockDocumentsFetch()
		const client = new SupermemoryClient(TOKEN, "sm_project_work", API_URL)

		await client.getDocuments(undefined, 1, 10)

		expect(requestBody(fetchMock).containerTags).toEqual(["sm_project_work"])
	})

	it("uses explicitly supplied container tags", async () => {
		const fetchMock = mockDocumentsFetch()
		const client = new SupermemoryClient(TOKEN, "sm_project_work", API_URL)

		await client.getDocuments(["sm_project_other"], 1, 10)

		expect(requestBody(fetchMock).containerTags).toEqual(["sm_project_other"])
	})

	it("scopes documents to the same project that search reads from", async () => {
		const fetchMock = mockDocumentsFetch()
		const client = new SupermemoryClient(TOKEN, undefined, API_URL)

		await client.getDocuments(undefined, 1, 10)

		// search() passes `containerTag: this.containerTag`, which defaults to
		// sm_project_default — document listings must agree with it.
		expect(requestBody(fetchMock).containerTags).toEqual(["sm_project_default"])
	})
})
