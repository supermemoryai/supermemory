import { afterEach, describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "."

describe("SupermemoryClient memory listing", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("calls the canonical memory-list endpoint with the selected space", async () => {
		const responseBody = {
			memoryEntries: [
				{
					id: "mem_1",
					memory: "User prefers dark mode",
					version: 1,
					isLatest: true,
					isForgotten: false,
					createdAt: "2026-07-29T00:00:00.000Z",
					updatedAt: "2026-07-29T00:00:00.000Z",
					history: [],
					documentIds: ["doc_1"],
				},
			],
			pagination: {
				currentPage: 2,
				limit: 20,
				totalItems: 21,
				totalPages: 2,
			},
		}
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)
		vi.stubGlobal("fetch", fetchMock)

		const client = new SupermemoryClient(
			"oauth-token",
			"snowcone_grande",
			"https://api.example.com",
		)
		await expect(client.listMemoryEntries(2, 20)).resolves.toEqual(responseBody)

		expect(fetchMock).toHaveBeenCalledOnce()
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe("https://api.example.com/v4/memories/list")
		expect(init.method).toBe("POST")
		expect(init.headers).toMatchObject({
			Authorization: "Bearer oauth-token",
			"Content-Type": "application/json",
			"x-sm-source": "supermemory-mcp",
		})
		expect(JSON.parse(init.body as string)).toEqual({
			containerTags: ["snowcone_grande"],
			page: 2,
			limit: 20,
			sort: "createdAt",
			order: "desc",
		})
	})
})
