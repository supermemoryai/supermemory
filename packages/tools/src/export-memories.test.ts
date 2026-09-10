import { describe, expect, it } from "bun:test"
import {
	exportMemoriesAsJson,
	exportMemoriesAsMarkdown,
	fetchAllMemories,
	listMemoriesRequest,
	type MemoriesListResponse,
} from "./shared/export-memories"

function createMockFetch(responses: MemoriesListResponse[]) {
	let callCount = 0
	const fetchMock = async (url: string | URL | Request, init?: RequestInit) => {
		const pageResponse = responses[callCount] || {
			memoryEntries: [],
			pagination: { currentPage: callCount + 1, limit: 10, totalItems: 0, totalPages: 1 },
		}
		callCount++

		return {
			ok: true,
			status: 200,
			statusText: "OK",
			json: async () => pageResponse,
			text: async () => JSON.stringify(pageResponse),
		} as Response
	}
	return {
		fetchFn: fetchMock as unknown as typeof fetch,
		getCallCount: () => callCount,
	}
}

describe("listMemoriesRequest", () => {
	it("sends correct POST body and headers to /v4/memories/list", async () => {
		let capturedUrl = ""
		let capturedInit: RequestInit | undefined

		const customFetch = async (url: string | URL | Request, init?: RequestInit) => {
			capturedUrl = String(url)
			capturedInit = init
			return {
				ok: true,
				status: 200,
				json: async () => ({
					memoryEntries: [
						{
							id: "mem_1",
							memory: "User prefers TypeScript",
							version: 1,
							isLatest: true,
							isForgotten: false,
							createdAt: "2026-09-01T10:00:00.000Z",
							updatedAt: "2026-09-01T10:00:00.000Z",
						},
					],
					pagination: { currentPage: 1, limit: 10, totalItems: 1, totalPages: 1 },
				}),
			} as Response
		}

		const result = await listMemoriesRequest(
			"sm_test_key",
			{ containerTags: ["user_123"], page: 1, limit: 10 },
			"http://localhost:6767",
			{ fetchFn: customFetch as unknown as typeof fetch },
		)

		expect(capturedUrl).toBe("http://localhost:6767/v4/memories/list")
		expect(capturedInit?.method).toBe("POST")
		expect((capturedInit?.headers as Record<string, string>)?.Authorization).toBe(
			"Bearer sm_test_key",
		)
		const parsedBody = JSON.parse(String(capturedInit?.body))
		expect(parsedBody.containerTags).toEqual(["user_123"])
		expect(parsedBody.page).toBe(1)
		expect(result.memoryEntries).toHaveLength(1)
		expect(result.memoryEntries[0].memory).toBe("User prefers TypeScript")
	})

	it("throws on non-200 responses with descriptive error", async () => {
		const customFetch = async () =>
			({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				text: async () => JSON.stringify({ error: "Container tag is required" }),
			}) as unknown as Response

		expect(
			listMemoriesRequest(
				"sm_key",
				{ containerTags: [] },
				"http://localhost:6767",
				{ fetchFn: customFetch as unknown as typeof fetch },
			),
		).rejects.toThrow("Supermemory list memories failed: 400 Bad Request")
	})
})

describe("fetchAllMemories", () => {
	it("paginates through all pages until totalPages is reached", async () => {
		const page1: MemoriesListResponse = {
			memoryEntries: [
				{
					id: "mem_1",
					memory: "Fact 1",
					version: 1,
					isLatest: true,
					isForgotten: false,
					createdAt: "2026-09-01T10:00:00.000Z",
					updatedAt: "2026-09-01T10:00:00.000Z",
				},
				{
					id: "mem_2",
					memory: "Fact 2 (forgotten)",
					version: 1,
					isLatest: true,
					isForgotten: true,
					createdAt: "2026-09-01T11:00:00.000Z",
					updatedAt: "2026-09-01T11:00:00.000Z",
				},
			],
			pagination: { currentPage: 1, limit: 2, totalItems: 3, totalPages: 2 },
		}

		const page2: MemoriesListResponse = {
			memoryEntries: [
				{
					id: "mem_3",
					memory: "Fact 3",
					version: 1,
					isLatest: true,
					isForgotten: false,
					createdAt: "2026-09-01T12:00:00.000Z",
					updatedAt: "2026-09-01T12:00:00.000Z",
				},
			],
			pagination: { currentPage: 2, limit: 2, totalItems: 3, totalPages: 2 },
		}

		const { fetchFn, getCallCount } = createMockFetch([page1, page2])
		const memories = await fetchAllMemories("user_123", {
			baseUrl: "http://localhost:6767",
			apiKey: "sm_key",
			fetchFn,
		})

		expect(getCallCount()).toBe(2)
		// By default forgotten memories are excluded
		expect(memories).toHaveLength(2)
		expect(memories[0].id).toBe("mem_1")
		expect(memories[1].id).toBe("mem_3")
	})

	it("includes forgotten memories when includeForgotten is true", async () => {
		const page1: MemoriesListResponse = {
			memoryEntries: [
				{
					id: "mem_1",
					memory: "Fact 1",
					version: 1,
					isLatest: true,
					isForgotten: false,
					createdAt: "2026-09-01T10:00:00.000Z",
					updatedAt: "2026-09-01T10:00:00.000Z",
				},
				{
					id: "mem_2",
					memory: "Fact 2 (forgotten)",
					version: 1,
					isLatest: true,
					isForgotten: true,
					createdAt: "2026-09-01T11:00:00.000Z",
					updatedAt: "2026-09-01T11:00:00.000Z",
				},
			],
			pagination: { currentPage: 1, limit: 2, totalItems: 2, totalPages: 1 },
		}

		const { fetchFn } = createMockFetch([page1])
		const memories = await fetchAllMemories("user_123", {
			includeForgotten: true,
			fetchFn,
		})

		expect(memories).toHaveLength(2)
		expect(memories[1].id).toBe("mem_2")
		expect(memories[1].isForgotten).toBe(true)
	})
})

describe("exportMemoriesAsJson and exportMemoriesAsMarkdown", () => {
	const sampleData: MemoriesListResponse = {
		memoryEntries: [
			{
				id: "mem_abc123",
				memory: "User works at Acme Corp",
				version: 2,
				isLatest: true,
				isForgotten: false,
				isStatic: true,
				createdAt: "2026-08-01T00:00:00.000Z",
				updatedAt: "2026-08-10T00:00:00.000Z",
				documentIds: ["doc_1", "doc_2"],
				history: [
					{
						id: "mem_abc122",
						memory: "User works at Startup",
						version: 1,
						createdAt: "2026-07-01T00:00:00.000Z",
						updatedAt: "2026-07-01T00:00:00.000Z",
					},
				],
			},
		],
		pagination: { currentPage: 1, limit: 50, totalItems: 1, totalPages: 1 },
	}

	it("exports memories as valid JSON with backup metadata", async () => {
		const { fetchFn } = createMockFetch([sampleData])
		const jsonString = await exportMemoriesAsJson("user_123", {
			baseUrl: "http://localhost:6767",
			fetchFn,
		})

		const parsed = JSON.parse(jsonString)
		expect(parsed.containerTag).toBe("user_123")
		expect(parsed.totalCount).toBe(1)
		expect(parsed.baseUrl).toBe("http://localhost:6767")
		expect(parsed.memories).toHaveLength(1)
		expect(parsed.memories[0].id).toBe("mem_abc123")
		expect(parsed.memories[0].memory).toBe("User works at Acme Corp")
	})

	it("exports memories as clean Markdown format", async () => {
		const { fetchFn } = createMockFetch([sampleData])
		const markdown = await exportMemoriesAsMarkdown("user_123", {
			baseUrl: "http://localhost:6767",
			fetchFn,
		})

		expect(markdown).toContain("# Supermemory Backup: user_123")
		expect(markdown).toContain("Total Memories:** 1")
		expect(markdown).toContain("### 1. User works at Acme Corp")
		expect(markdown).toContain("- **ID:** `mem_abc123`")
		expect(markdown).toContain("- **Type:** Static")
		expect(markdown).toContain("- **Source Documents:** `doc_1`, `doc_2`")
		expect(markdown).toContain("- **Previous Revisions:** 1")
	})
})
