import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_PROJECT_ID, getMemoryText, SupermemoryClient } from "./index"

const { sdk, sdkOptions } = vi.hoisted(() => ({
	sdk: {
		add: vi.fn(),
		profile: vi.fn(),
		memories: { forget: vi.fn() },
		search: { memories: vi.fn() },
		documents: { list: vi.fn(), get: vi.fn() },
	},
	sdkOptions: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class {
		constructor(options: unknown) {
			sdkOptions(options)
			Object.assign(this, sdk)
		}
	},
}))

const API_URL = "https://api.example.com"
const TOKEN = "sm_test_token"
const FORBIDDEN_FALLBACK = "read-only or scoped to specific spaces"

const pagination = {
	currentPage: 1,
	limit: 50,
	totalItems: 1,
	totalPages: 1,
}

const documentsPayload = {
	documents: [
		{
			id: "doc_1",
			title: "Notes",
			summary: null,
			type: "text",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-02T00:00:00.000Z",
			memoryEntries: [],
		},
	],
	pagination,
}

function client(containerTag?: string) {
	return new SupermemoryClient(TOKEN, containerTag, API_URL)
}

function apiError(message: string, status: number) {
	return Object.assign(new Error(message), { status })
}

describe("SupermemoryClient", () => {
	let fetchMock = vi.fn()

	beforeEach(() => {
		fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	describe("configuration", () => {
		it("identifies itself to the API with a source header and a timeout", () => {
			client("work")

			expect(sdkOptions).toHaveBeenCalledWith({
				apiKey: TOKEN,
				baseURL: API_URL,
				timeout: 30_000,
				defaultHeaders: { "x-sm-source": "supermemory-mcp" },
			})
		})

		it("writes to the default project when no space is configured", async () => {
			sdk.add.mockResolvedValue({ id: "doc_1" })

			await expect(client().createMemory("remember this")).resolves.toEqual({
				id: "doc_1",
				status: "queued",
				containerTag: DEFAULT_PROJECT_ID,
			})
			expect(sdk.add).toHaveBeenCalledWith({
				content: "remember this",
				containerTag: DEFAULT_PROJECT_ID,
				metadata: { sm_source: "supermemory-mcp" },
			})
		})

		it("treats an empty space string as an unscoped connection", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [],
				total: 0,
				timing: 1,
			})

			await client("").search("query")

			expect(sdk.search.memories.mock.calls[0][0]).not.toHaveProperty(
				"containerTag",
			)
		})
	})

	describe("search", () => {
		it("omits the space filter when the connection is unscoped", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [],
				total: 0,
				timing: 1,
			})

			await client().search("query")

			expect(sdk.search.memories.mock.calls[0][0]).not.toHaveProperty(
				"containerTag",
			)
		})

		it("sends the configured space and honours an explicit override", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [],
				total: 0,
				timing: 1,
			})

			await client("work").search("query")
			expect(sdk.search.memories).toHaveBeenLastCalledWith({
				q: "query",
				limit: 10,
				containerTag: "work",
				searchMode: "hybrid",
				threshold: undefined,
			})

			await client("work").search("query", 3, 0.5, "personal")
			expect(sdk.search.memories).toHaveBeenLastCalledWith({
				q: "query",
				limit: 3,
				containerTag: "personal",
				searchMode: "hybrid",
				threshold: 0.5,
			})

			await client().search("query", 10, undefined, "personal")
			expect(sdk.search.memories.mock.calls[2][0]).toMatchObject({
				containerTag: "personal",
			})
		})

		it("normalises every result shape the API can return", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [
					{ id: "a", memory: "remembered", similarity: 0.9, title: "Title" },
					{ id: "b", chunk: "chunked", similarity: 0.8 },
					{ id: "c", context: "context only", similarity: 0.7 },
					{ id: "d", similarity: 0.6 },
					{ id: "e", content: "full body", chunk: "excerpt", similarity: 0.5 },
				],
				total: 5,
				timing: 12,
			})

			await expect(client("work").search("query")).resolves.toEqual({
				results: [
					{ id: "a", memory: "remembered", similarity: 0.9, title: "Title" },
					{ id: "b", chunk: "chunked", similarity: 0.8 },
					{ id: "c", memory: "context only", similarity: 0.7 },
					{ id: "d", memory: "", similarity: 0.6 },
					{
						id: "e",
						chunk: "full body",
						content: "full body",
						similarity: 0.5,
					},
				],
				total: 5,
				timing: 12,
			})
		})

		it("truncates oversized memory text", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [{ id: "a", memory: "x".repeat(200_001), similarity: 1 }],
				total: 1,
				timing: 1,
			})

			const { results } = await client("work").search("query")
			const text = getMemoryText(results[0])

			expect(text).toHaveLength(200_003)
			expect(text.endsWith("...")).toBe(true)
		})

		it("rejects results that do not match the API contract", async () => {
			sdk.search.memories.mockResolvedValue({
				results: [{ id: "a", memory: "no similarity" }],
				total: 1,
				timing: 1,
			})

			await expect(client("work").search("query")).rejects.toThrow(
				"Search request failed",
			)
		})
	})

	describe("profile", () => {
		it("returns an empty profile without calling the API when unscoped", async () => {
			await expect(client().getProfile("who am i")).resolves.toEqual({
				profile: { static: [], dynamic: [] },
			})
			expect(sdk.profile).not.toHaveBeenCalled()
		})

		it("maps profile search results when the API returns them", async () => {
			sdk.profile.mockResolvedValue({
				profile: { static: ["vegetarian"], dynamic: ["lives in Berlin"] },
				searchResults: {
					results: [{ id: "a", memory: "likes pizza", similarity: 0.4 }],
					total: 1,
					timing: 3,
				},
			})

			await expect(client("work").getProfile("who am i")).resolves.toEqual({
				profile: { static: ["vegetarian"], dynamic: ["lives in Berlin"] },
				searchResults: {
					results: [{ id: "a", memory: "likes pizza", similarity: 0.4 }],
					total: 1,
					timing: 3,
				},
			})
			expect(sdk.profile).toHaveBeenCalledWith({
				containerTag: "work",
				q: "who am i",
			})
		})

		it("defaults missing profile sections to empty lists", async () => {
			sdk.profile.mockResolvedValue({ profile: { static: null } })

			await expect(client("work").getProfile()).resolves.toEqual({
				profile: { static: [], dynamic: [] },
			})
		})

		it("unwraps the API message from a forbidden profile request", async () => {
			sdk.profile.mockRejectedValue(
				apiError(JSON.stringify({ error: "Profile is disabled" }), 403),
			)

			await expect(client("work").getProfile()).rejects.toThrow(
				"Profile request failed: Profile is disabled",
			)
		})
	})

	describe("forgetMemory", () => {
		it("forgets an exact match without searching", async () => {
			sdk.memories.forget.mockResolvedValue({ id: "mem_1" })

			await expect(client("work").forgetMemory("likes pizza")).resolves.toEqual(
				{
					success: true,
					message: "Successfully forgot memory (exact match) with ID: mem_1",
					containerTag: "work",
				},
			)
			expect(sdk.search.memories).not.toHaveBeenCalled()
		})

		it("falls back to a similarity search when there is no exact match", async () => {
			sdk.memories.forget
				.mockRejectedValueOnce(apiError("not found", 404))
				.mockResolvedValueOnce({ id: "mem_2" })
			sdk.search.memories.mockResolvedValue({
				results: [{ id: "mem_2", memory: "likes pizza", similarity: 0.912 }],
				total: 1,
				timing: 2,
			})

			await expect(client("work").forgetMemory("pizza")).resolves.toEqual({
				success: true,
				message: 'Forgot similar memory (similarity: 0.91): "likes pizza"',
				containerTag: "work",
			})
			expect(sdk.search.memories).toHaveBeenCalledWith({
				q: "pizza",
				limit: 5,
				containerTag: "work",
				searchMode: "hybrid",
				threshold: 0.85,
			})
			expect(sdk.memories.forget).toHaveBeenLastCalledWith({
				id: "mem_2",
				containerTag: "work",
			})
		})

		it("truncates the memory text quoted back in the confirmation", async () => {
			sdk.memories.forget
				.mockRejectedValueOnce(apiError("not found", 404))
				.mockResolvedValueOnce({ id: "mem_2" })
			sdk.search.memories.mockResolvedValue({
				results: [{ id: "mem_2", memory: "y".repeat(150), similarity: 0.9 }],
				total: 1,
				timing: 2,
			})

			const result = await client("work").forgetMemory("pizza")

			expect(result.message).toBe(
				`Forgot similar memory (similarity: 0.90): "${"y".repeat(100)}..."`,
			)
		})

		it("reports when nothing matches", async () => {
			sdk.memories.forget.mockRejectedValue(apiError("not found", 404))
			sdk.search.memories.mockResolvedValue({
				results: [],
				total: 0,
				timing: 1,
			})

			await expect(client("work").forgetMemory("pizza")).resolves.toEqual({
				success: false,
				message: "No matching memory found to forget.",
				containerTag: "work",
			})
		})

		it("refuses to delete when only chunks matched", async () => {
			sdk.memories.forget.mockRejectedValue(apiError("not found", 404))
			sdk.search.memories.mockResolvedValue({
				results: [{ id: "chunk_1", chunk: "pizza night", similarity: 0.9 }],
				total: 1,
				timing: 1,
			})

			await expect(client("work").forgetMemory("pizza")).resolves.toEqual({
				success: false,
				message: "No matching memory found (only chunks matched).",
				containerTag: "work",
			})
			expect(sdk.memories.forget).toHaveBeenCalledOnce()
		})

		it("does not fall back when the failure is not a missing memory", async () => {
			sdk.memories.forget.mockRejectedValue(apiError("Key is read-only", 403))

			await expect(client("work").forgetMemory("pizza")).rejects.toThrow(
				"Forget memory request failed: Key is read-only",
			)
			expect(sdk.search.memories).not.toHaveBeenCalled()
		})
	})

	describe("documents", () => {
		it("posts the space filter and pagination", async () => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify(documentsPayload)),
			)

			await expect(client("work").getDocuments(["work"])).resolves.toEqual(
				documentsPayload,
			)

			const [url, init] = fetchMock.mock.calls[0]
			expect(url).toBe(`${API_URL}/v3/documents/documents`)
			expect(init.method).toBe("POST")
			expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
			expect(init.headers["x-sm-source"]).toBe("supermemory-mcp")
			expect(JSON.parse(init.body)).toEqual({
				page: 1,
				limit: 200,
				sort: "createdAt",
				order: "desc",
				containerTags: ["work"],
			})
		})

		it("uses a caller supplied abort signal and pagination", async () => {
			const controller = new AbortController()
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify(documentsPayload)),
			)

			await client("work").getDocuments(undefined, 2, 10, {
				signal: controller.signal,
			})

			const init = fetchMock.mock.calls[0][1]
			expect(init.signal).toBe(controller.signal)
			expect(JSON.parse(init.body)).toEqual({
				page: 2,
				limit: 10,
				sort: "createdAt",
				order: "desc",
			})
		})

		it("rejects a payload that does not match the API contract", async () => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify({ documents: [], pagination: {} })),
			)

			await expect(client("work").getDocuments()).rejects.toThrow()
		})

		it("lists SDK documents for the active space without content", async () => {
			sdk.documents.list.mockResolvedValue({
				memories: [{ id: "doc_1" }],
				pagination,
			})

			await expect(client("work").listDocuments()).resolves.toEqual({
				documents: [{ id: "doc_1" }],
				pagination,
			})
			expect(sdk.documents.list).toHaveBeenCalledWith({
				containerTags: ["work"],
				page: 1,
				limit: 50,
				sort: "createdAt",
				order: "desc",
				includeContent: false,
			})
		})

		it("defaults to an empty list when the API omits memories", async () => {
			sdk.documents.list.mockResolvedValue({ pagination })

			await expect(client("work").listDocuments()).resolves.toEqual({
				documents: [],
				pagination,
			})
		})

		it("translates a missing document without an operation prefix", async () => {
			sdk.documents.get.mockRejectedValue(apiError("gone", 404))

			await expect(client("work").getDocument("doc_1")).rejects.toThrow(
				"Not found.",
			)
		})
	})

	describe("memory entries", () => {
		it("lists memory entries for the active space", async () => {
			const payload = {
				memoryEntries: [
					{
						id: "mem_1",
						memory: "likes pizza",
						version: 1,
						isLatest: true,
						isForgotten: false,
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-02T00:00:00.000Z",
					},
				],
				pagination,
			}
			fetchMock.mockResolvedValue(new Response(JSON.stringify(payload)))

			await expect(client("work").listMemoryEntries()).resolves.toEqual(payload)

			const [url, init] = fetchMock.mock.calls[0]
			expect(url).toBe(`${API_URL}/v4/memories/list`)
			expect(JSON.parse(init.body)).toEqual({
				containerTags: ["work"],
				page: 1,
				limit: 50,
				sort: "createdAt",
				order: "desc",
			})
		})

		it("surfaces the API message when the space is forbidden", async () => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify({ error: "Space is read-only" }), {
					status: 403,
				}),
			)

			await expect(client("work").listMemoryEntries()).rejects.toThrow(
				"Space is read-only",
			)
		})

		it("falls back to scope guidance when the forbidden body is empty", async () => {
			fetchMock.mockResolvedValue(new Response("", { status: 403 }))

			await expect(client("work").listMemoryEntries()).rejects.toThrow(
				FORBIDDEN_FALLBACK,
			)
		})
	})

	describe("container tags", () => {
		it("requests the list with auth and source headers", async () => {
			const tag = {
				id: "ct_1",
				name: "Work",
				containerTag: "work",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-02T00:00:00.000Z",
				isExperimental: false,
				isNova: false,
				documentCount: 2,
				memoryCount: 3,
			}
			fetchMock.mockResolvedValue(new Response(JSON.stringify([tag])))

			await expect(client("work").listContainerTags()).resolves.toEqual([tag])

			const [url, init] = fetchMock.mock.calls[0]
			expect(url).toBe(`${API_URL}/v3/container-tags/list`)
			expect(init.method).toBe("GET")
			expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
			expect(init.headers["x-sm-source"]).toBe("supermemory-mcp")
		})

		it("asks the user to re-authenticate on 401", async () => {
			fetchMock.mockResolvedValue(new Response("", { status: 401 }))

			await expect(client().listContainerTags()).rejects.toThrow(
				"Authentication failed. Please re-authenticate.",
			)
		})

		it("reports the status text for other failures", async () => {
			fetchMock.mockResolvedValue(
				new Response("", { status: 500, statusText: "Internal Server Error" }),
			)

			await expect(client().listContainerTags()).rejects.toThrow(
				"Failed to fetch container tags: Internal Server Error",
			)
		})

		it("rejects a malformed payload", async () => {
			fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 1 }])))

			await expect(client().listContainerTags()).rejects.toThrow()
		})
	})

	describe("error translation", () => {
		const cases: [number, string, string][] = [
			[400, "", "Invalid request. Check your input."],
			[
				400,
				JSON.stringify({ error: "page must be positive" }),
				"page must be positive",
			],
			[
				401,
				JSON.stringify({ error: "expired" }),
				"Authentication failed. Please re-authenticate.",
			],
			[402, "", "Memory limit reached. Upgrade at supermemory.ai"],
			[403, "", FORBIDDEN_FALLBACK],
			[403, JSON.stringify({ error: "Key is read-only" }), "Key is read-only"],
			[
				403,
				JSON.stringify({ message: "Scoped to sm_project_x" }),
				"Scoped to sm_project_x",
			],
			[403, "plain text refusal", "plain text refusal"],
			[403, JSON.stringify({ error: "" }), FORBIDDEN_FALLBACK],
			[404, JSON.stringify({ error: "no such space" }), "Not found."],
			[
				422,
				JSON.stringify({ error: "limit must be <= 200" }),
				"limit must be <= 200",
			],
			[429, "", "Rate limit exceeded. Please wait and try again."],
			[500, "", "Server error. Please try again later."],
			[
				503,
				JSON.stringify({ error: "upstream down" }),
				"Server error. Please try again later.",
			],
			[409, "", "Request failed with status 409."],
			[409, JSON.stringify({ error: "already queued" }), "already queued"],
		]

		it.each(
			cases,
		)("maps HTTP %i with body '%s'", async (status, body, expected) => {
			fetchMock.mockResolvedValue(new Response(body, { status }))

			await expect(client("work").getDocuments()).rejects.toThrow(expected)
		})

		it("reports an aborted or timed out request", async () => {
			for (const name of ["AbortError", "TimeoutError"]) {
				fetchMock.mockRejectedValue(
					Object.assign(new Error("aborted"), { name }),
				)

				await expect(client().listContainerTags()).rejects.toThrow(
					"Request to Supermemory API timed out",
				)
			}
		})

		it("reports a failed network call", async () => {
			fetchMock.mockRejectedValue(new TypeError("fetch failed"))

			await expect(client().listContainerTags()).rejects.toThrow(
				"Network error. Please check your connection.",
			)
		})

		it("keeps unrelated type errors intact", async () => {
			fetchMock.mockRejectedValue(new TypeError("value is not iterable"))

			await expect(client().listContainerTags()).rejects.toThrow(
				"value is not iterable",
			)
		})

		it("wraps a thrown non-error value", async () => {
			fetchMock.mockRejectedValue("kaboom")

			await expect(client().listContainerTags()).rejects.toThrow(
				"Unexpected error: kaboom",
			)
		})

		it("labels failures with the operation that caused them", async () => {
			sdk.add.mockRejectedValue(apiError("over quota", 402))
			await expect(client("work").createMemory("hi")).rejects.toThrow(
				"Create memory request failed: Memory limit reached. Upgrade at supermemory.ai",
			)

			sdk.search.memories.mockRejectedValue(apiError("slow down", 429))
			await expect(client("work").search("query")).rejects.toThrow(
				"Search request failed: Rate limit exceeded. Please wait and try again.",
			)
		})
	})

	describe("memory text", () => {
		it("reads whichever text field the API returned", () => {
			expect(
				getMemoryText({ id: "a", memory: "remembered", similarity: 1 }),
			).toBe("remembered")
			expect(getMemoryText({ id: "b", chunk: "chunked", similarity: 1 })).toBe(
				"chunked",
			)
		})
	})
})
