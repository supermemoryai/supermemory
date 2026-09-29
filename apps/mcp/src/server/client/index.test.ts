import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = {
	add: vi.fn(),
	memories: { forget: vi.fn() },
	search: { memories: vi.fn() },
	profile: vi.fn(),
	documents: { list: vi.fn(), get: vi.fn() },
}

vi.mock("supermemory", () => ({
	default: class {
		add = sdk.add
		memories = sdk.memories
		search = sdk.search
		profile = sdk.profile
		documents = sdk.documents
	},
}))

const { DEFAULT_PROJECT_ID, SupermemoryClient, getMemoryText } = await import(
	"./index"
)

const API_URL = "https://api.test"
const realFetch = globalThis.fetch

function newClient(containerTag?: string) {
	return new SupermemoryClient("sm_test_key", containerTag, API_URL)
}

function respondWith(status: number, body = "", statusText = "") {
	const fetchMock = vi.fn(
		async (_input: unknown, _init?: RequestInit) =>
			new Response(body, { status, statusText }),
	)
	globalThis.fetch = fetchMock as unknown as typeof fetch
	return fetchMock
}

function apiError(status: number, message = "") {
	return Object.assign(new Error(message), { status })
}

beforeEach(() => {
	for (const fn of [
		sdk.add,
		sdk.memories.forget,
		sdk.search.memories,
		sdk.profile,
		sdk.documents.list,
		sdk.documents.get,
	]) {
		fn.mockReset()
	}
})

afterEach(() => {
	globalThis.fetch = realFetch
})

describe("outbound request shape", () => {
	it("tags every direct fetch as the MCP source and authenticates it", async () => {
		const fetchMock = respondWith(200, "[]")

		await newClient("sm_project_docs").listContainerTags()

		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe(`${API_URL}/v3/container-tags/list`)
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer sm_test_key",
			"x-sm-source": "supermemory-mcp",
		})
	})

	it("falls back to the default project when no container tag is given", async () => {
		sdk.documents.list.mockResolvedValue({ memories: [], pagination: {} })

		await newClient().listDocuments()

		expect(sdk.documents.list).toHaveBeenCalledWith(
			expect.objectContaining({ containerTags: [DEFAULT_PROJECT_ID] }),
		)
	})
})

// Regression guard: listContainerTags used to discard the response body and
// report `response.statusText`, which is empty on Workers' fetch. Every status
// below reached the caller as "Failed to fetch container tags: ".
describe("listContainerTags error reporting", () => {
	it("surfaces the API's own message on a 403", async () => {
		respondWith(403, JSON.stringify({ error: "This connection is read-only" }))

		await expect(newClient().listContainerTags()).rejects.toThrow(
			"This connection is read-only",
		)
	})

	it("falls back to scope-aware guidance when a 403 has no body", async () => {
		respondWith(403, "")

		await expect(newClient().listContainerTags()).rejects.toThrow(
			/read-only or scoped to specific spaces/,
		)
	})

	it("keeps the re-authentication prompt on a 401", async () => {
		respondWith(401, "")

		await expect(newClient().listContainerTags()).rejects.toThrow(
			"Authentication failed. Please re-authenticate.",
		)
	})

	it("reports quota and rate limits instead of a bare failure", async () => {
		respondWith(402, "")
		await expect(newClient().listContainerTags()).rejects.toThrow(
			"Memory limit reached. Upgrade at supermemory.ai",
		)

		respondWith(429, "")
		await expect(newClient().listContainerTags()).rejects.toThrow(
			"Rate limit exceeded. Please wait and try again.",
		)
	})

	it("never reports an empty message for an unmapped status", async () => {
		respondWith(418, "")

		await expect(newClient().listContainerTags()).rejects.toThrow(
			"Supermemory API request failed with status 418",
		)
	})
})

describe("API error bodies", () => {
	it("unwraps both `error` and `message` envelopes", async () => {
		respondWith(400, JSON.stringify({ error: "containerTag is required" }))
		await expect(newClient().getDocuments()).rejects.toThrow(
			"containerTag is required",
		)

		respondWith(400, JSON.stringify({ message: "page must be positive" }))
		await expect(newClient().getDocuments()).rejects.toThrow(
			"page must be positive",
		)
	})

	it("passes a non-JSON body through verbatim", async () => {
		respondWith(400, "upstream rejected the request")

		await expect(newClient().listMemoryEntries()).rejects.toThrow(
			"upstream rejected the request",
		)
	})

	it("uses the status fallback when the body is empty", async () => {
		respondWith(400, "")

		await expect(newClient().listMemoryEntries()).rejects.toThrow(
			"Invalid request. Check your input.",
		)
	})
})

describe("status mapping for SDK-backed calls", () => {
	it.each([
		[401, "Authentication failed. Please re-authenticate."],
		[402, "Memory limit reached. Upgrade at supermemory.ai"],
		[429, "Rate limit exceeded. Please wait and try again."],
		[503, "Server error. Please try again later."],
	])("maps %i to an actionable message", async (status, expected) => {
		sdk.add.mockRejectedValue(apiError(status))

		await expect(newClient().createMemory("hello")).rejects.toThrow(
			`Create memory request failed: ${expected}`,
		)
	})

	it("reports timeouts and network failures distinctly", async () => {
		sdk.search.memories.mockRejectedValue(
			Object.assign(new Error("The operation timed out"), {
				name: "TimeoutError",
			}),
		)
		await expect(newClient().search("anything")).rejects.toThrow(
			"Search request failed: Request to Supermemory API timed out",
		)

		sdk.search.memories.mockRejectedValue(new TypeError("fetch failed"))
		await expect(newClient().search("anything")).rejects.toThrow(
			"Search request failed: Network error. Please check your connection.",
		)
	})
})

describe("search result mapping", () => {
	it("keeps chunk results distinct from memory results", async () => {
		sdk.search.memories.mockResolvedValue({
			results: [
				{ id: "mem_1", memory: "learned this", similarity: 0.9 },
				{ id: "chunk_1", chunk: "raw passage", similarity: 0.7 },
			],
			total: 2,
			timing: 12,
		})

		const { results } = await newClient("sm_project_docs").search("query")

		expect(results.map(getMemoryText)).toEqual(["learned this", "raw passage"])
		expect("chunk" in results[0]).toBe(false)
		expect("chunk" in results[1]).toBe(true)
	})

	it("scopes the search only when a container tag was configured", async () => {
		sdk.search.memories.mockResolvedValue({ results: [], total: 0, timing: 1 })

		await newClient().search("query")
		expect(sdk.search.memories.mock.calls[0][0]).not.toHaveProperty(
			"containerTag",
		)

		await newClient("sm_project_docs").search("query")
		expect(sdk.search.memories.mock.calls[1][0]).toMatchObject({
			containerTag: "sm_project_docs",
		})
	})
})

describe("forgetMemory", () => {
	it("falls back to similarity search when no exact match exists", async () => {
		sdk.memories.forget
			.mockRejectedValueOnce(apiError(404))
			.mockResolvedValueOnce({ id: "mem_1" })
		sdk.search.memories.mockResolvedValue({
			results: [{ id: "mem_1", memory: "learned this", similarity: 0.91 }],
			total: 1,
			timing: 4,
		})

		const result = await newClient("sm_project_docs").forgetMemory("learned")

		expect(result.success).toBe(true)
		expect(sdk.memories.forget).toHaveBeenLastCalledWith({
			id: "mem_1",
			containerTag: "sm_project_docs",
		})
	})

	it("reports failure rather than deleting when only chunks match", async () => {
		sdk.memories.forget.mockRejectedValueOnce(apiError(404))
		sdk.search.memories.mockResolvedValue({
			results: [{ id: "chunk_1", chunk: "raw passage", similarity: 0.88 }],
			total: 1,
			timing: 4,
		})

		const result = await newClient("sm_project_docs").forgetMemory("passage")

		expect(result.success).toBe(false)
		expect(sdk.memories.forget).toHaveBeenCalledTimes(1)
	})

	it("does not search when the exact delete fails for another reason", async () => {
		sdk.memories.forget.mockRejectedValue(apiError(403, "read-only connection"))

		await expect(
			newClient("sm_project_docs").forgetMemory("learned"),
		).rejects.toThrow("Forget memory request failed: read-only connection")
		expect(sdk.search.memories).not.toHaveBeenCalled()
	})
})

describe("getProfile", () => {
	it("returns an empty profile without calling the API when unscoped", async () => {
		const result = await newClient().getProfile()

		expect(result).toEqual({ profile: { static: [], dynamic: [] } })
		expect(sdk.profile).not.toHaveBeenCalled()
	})

	it("tolerates a response with no profile payload", async () => {
		sdk.profile.mockResolvedValue({})

		await expect(newClient("sm_project_docs").getProfile()).resolves.toEqual({
			profile: { static: [], dynamic: [] },
		})
	})
})
