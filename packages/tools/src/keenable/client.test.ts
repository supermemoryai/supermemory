import { afterEach, describe, expect, it, vi } from "vitest"
import { createKeenableClient } from "./client"
import { KeenableError } from "./types"

afterEach(() => {
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	})
}

describe("createKeenableClient", () => {
	it("searches the public endpoint with X-Keenable-Title when no key is set", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				query: "typescript best practices",
				results: [
					{
						title: "TS handbook",
						url: "https://www.typescriptlang.org/docs/",
						snippet: "Learn TypeScript",
					},
				],
			}),
		)

		const client = createKeenableClient({
			fetch: fetchMock,
			appTitle: "supermemory-tests",
		})
		const result = await client.search({
			query: "typescript best practices",
			site: "typescriptlang.org",
			maxResults: 5,
			mode: "realtime",
		})

		expect(result.results).toHaveLength(1)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe("https://api.keenable.ai/v1/search/public")
		expect(init.method).toBe("POST")
		expect(init.headers).toMatchObject({
			"Content-Type": "application/json",
			"X-Keenable-Title": "supermemory-tests",
		})
		expect(JSON.parse(String(init.body))).toEqual({
			query: "typescript best practices",
			site: "typescriptlang.org",
			max_results: 5,
			mode: "realtime",
		})
	})

	it("uses the keyed search path when an API key is provided", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({ query: "q", results: [] }))

		const client = createKeenableClient({
			apiKey: "keen_test",
			fetch: fetchMock,
		})
		await client.search({ query: "q" })

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe("https://api.keenable.ai/v1/search")
		expect(init.headers).toMatchObject({ "X-API-Key": "keen_test" })
		expect(init.headers).not.toHaveProperty("X-Keenable-Title")
	})

	it("fetches pages live by default so unindexed URLs still resolve", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				url: "https://example.com/docs",
				title: "Docs",
				content: "# Hello",
			}),
		)

		const client = createKeenableClient({
			apiKey: "keen_test",
			fetch: fetchMock,
		})
		const page = await client.fetchPage({
			url: "https://example.com/docs",
			maxChars: 1000,
			prompt: "List headings",
		})

		expect(page.content).toBe("# Hello")
		const [url] = fetchMock.mock.calls[0] as [string]
		const parsed = new URL(url)
		expect(parsed.pathname).toBe("/v1/fetch")
		expect(parsed.searchParams.get("url")).toBe("https://example.com/docs")
		expect(parsed.searchParams.get("live")).toBe("true")
		expect(parsed.searchParams.get("max_chars")).toBe("1000")
		expect(parsed.searchParams.get("prompt")).toBe("List headings")
	})

	it("omits live=true only when the caller asks for the indexed copy", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				url: "https://example.com",
				content: "indexed",
			}),
		)

		const client = createKeenableClient({ fetch: fetchMock })
		await client.fetchPage({ url: "https://example.com", live: false })

		const [url] = fetchMock.mock.calls[0] as [string]
		expect(new URL(url).searchParams.get("live")).toBeNull()
		expect(new URL(url).pathname).toBe("/v1/fetch/public")
	})

	it("throws KeenableError with status on non-OK responses", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response("missing app identifier", { status: 400 }),
			)

		const client = createKeenableClient({ fetch: fetchMock })
		const error = await client
			.search({ query: "q" })
			.catch((caught: unknown) => caught)

		expect(error).toBeInstanceOf(KeenableError)
		expect(error).toMatchObject({
			status: 400,
			body: "missing app identifier",
		})
	})
})
