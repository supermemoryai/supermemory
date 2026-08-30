import { afterEach, describe, expect, it, vi } from "vitest"
import { SearchRequestSchema } from "@repo/validation/api"
import { SupermemoryClient } from "."

type CapturedRequest = {
	url: string
	headers: Headers
	body: unknown
}

function documentResult(
	overrides: Partial<{
		documentId: string
		type: string
		createdAt: string
		source: string
		content: string
	}>,
) {
	const documentId = overrides.documentId ?? "doc_default"
	const content = overrides.content ?? `Content for ${documentId}`
	return {
		documentId,
		chunks: [{ content, isRelevant: true, score: 0.9 }],
		createdAt: overrides.createdAt ?? "2026-01-15T00:00:00.000Z",
		updatedAt: "2026-01-15T00:00:00.000Z",
		metadata: { source: overrides.source ?? "notion" },
		score: 0.9,
		title: `Title for ${documentId}`,
		type: overrides.type ?? "pdf",
	}
}

describe("SupermemoryClient.searchDocuments", () => {
	afterEach(() => vi.unstubAllGlobals())

	it("uses the document API contract for source, type, and created-at filters", async () => {
		let captured: CapturedRequest | undefined
		const fetchMock = vi.fn(
			async (input: string | URL | Request, init?: RequestInit) => {
				const request = new Request(input, init)
				captured = {
					url: request.url,
					headers: request.headers,
					body: await request.clone().json(),
				}

				return Response.json({
					results: [
						documentResult({ documentId: "doc_match" }),
						documentResult({ documentId: "doc_wrong_type", type: "text" }),
						documentResult({
							documentId: "doc_too_old",
							createdAt: "2025-12-31T23:59:59.999Z",
						}),
						documentResult({
							documentId: "doc_wrong_source",
							source: "web",
						}),
					],
					total: 4,
					timing: 12,
				})
			},
		)
		vi.stubGlobal("fetch", fetchMock)

		const client = new SupermemoryClient(
			"sm_search_contract_test_key",
			"space_test",
			"https://api.example.test",
		)
		const result = await client.searchDocuments("quarterly report", 10, {
			types: ["pdf"],
			source: "notion",
			dateFrom: "2026-01-01T00:00:00.000Z",
			dateTo: "2026-01-31T23:59:59.999Z",
		})

		expect(captured?.url).toBe("https://api.example.test/v3/search")
		expect(captured?.headers.get("authorization")).toBe(
			"Bearer sm_search_contract_test_key",
		)
		expect(captured?.body).toEqual({
			q: "quarterly report",
			limit: 100,
			containerTags: ["space_test"],
			onlyMatchingChunks: true,
			filters: {
				AND: [
					{
						key: "source",
						value: "notion",
						filterType: "metadata",
					},
				],
			},
		})

		// The emitted body must satisfy the backend API schema.
		expect(SearchRequestSchema.safeParse(captured?.body).success).toBe(true)

		expect(result).toEqual({
			results: [
				{
					id: "doc_match",
					chunk: "Content for doc_match",
					similarity: 0.9,
					title: "Title for doc_match",
				},
			],
			total: 1,
			timing: 12,
		})
	})

	it("applies type and date filters locally when the backend returns mixed types", async () => {
		let captured: CapturedRequest | undefined
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				const request = new Request(input, init)
				captured = {
					url: request.url,
					headers: request.headers,
					body: await request.clone().json(),
				}
				return Response.json({
					results: [
						documentResult({ documentId: "a", type: "pdf" }),
						documentResult({
							documentId: "b",
							type: "google_doc",
							createdAt: "2026-01-10T00:00:00.000Z",
						}),
						documentResult({
							documentId: "c",
							type: "pdf",
							createdAt: "2025-12-01T00:00:00.000Z",
						}),
					],
					total: 3,
					timing: 7,
				})
			}),
		)

		const client = new SupermemoryClient(
			"sm_search_contract_test_key",
			"space_test",
			"https://api.example.test",
		)

		const result = await client.searchDocuments("notes", 10, {
			types: ["pdf", "google_doc"],
			dateFrom: "2026-01-01T00:00:00.000Z",
			dateTo: "2026-01-31T23:59:59.999Z",
		})

		expect(captured?.body).toMatchObject({
			limit: 100,
			onlyMatchingChunks: true,
		})
		expect(result.results.map((r) => r.id)).toEqual(["a", "b"])
		expect(result.total).toBe(2)
	})

	it("does not over-fetch when no result-level filters are provided", async () => {
		let captured: CapturedRequest | undefined
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				const request = new Request(input, init)
				captured = {
					url: request.url,
					headers: request.headers,
					body: await request.clone().json(),
				}
				return Response.json({
					results: [documentResult({ documentId: "only" })],
					total: 1,
					timing: 3,
				})
			}),
		)

		const client = new SupermemoryClient(
			"sm_search_contract_test_key",
			"space_test",
			"https://api.example.test",
		)
		const result = await client.searchDocuments("hello", 5)

		expect(captured?.body).toMatchObject({ limit: 5, onlyMatchingChunks: true })
		expect(result.results).toHaveLength(1)
	})
})
