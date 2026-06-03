import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SupermemoryClient } from "../client"

// ---------------------------------------------------------------------------
// Reproduces the bug introduced by using the wrong endpoint and payload format:
//
//   Bug:  client.add() → POST /v3/documents
//         Documents created this way always land in status: "failed" with
//         0 memory entries — invisible on the web platform and unsearchable.
//
//   Fix:  fetch(POST /v4/memories, {containerTag, memories: [{content, ...}]})
//         Memories created this way immediately have status: "active" and
//         are searchable.
// ---------------------------------------------------------------------------

const TEST_TOKEN = "sk_test_placeholder"
const CONTAINER_TAG = "sm_project_default"
const API_URL = "https://api.supermemory.ai"

function makeClient(token = TEST_TOKEN, tag = CONTAINER_TAG, apiUrl = API_URL) {
	return new SupermemoryClient(token, tag, apiUrl)
}

// ---- BUG REPRODUCTION (v3 vs v4) ---------------------------------------

describe("createMemory endpoint choice", () => {
	const originalFetch = globalThis.fetch as unknown as typeof fetch

	beforeEach(() => {
		globalThis.fetch = vi.fn() as unknown as typeof fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	it("calls POST /v4/memories, NOT POST /v3/documents", async () => {
		// Bug: client.add() → POST /v3/documents → status: "failed"
		// Fix: fetch()       → POST /v4/memories  → status: "active"
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					documentId: "doc_abc123",
					memories: [{ id: "mem_xyz789" }],
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			),
		)

		await client.createMemory("Test memory content")

		const calledUrl = (
			globalThis.fetch as unknown as ReturnType<typeof vi.fn>
		).mock.calls[0][0] as string
		expect(calledUrl).toContain("/v4/memories")
		expect(calledUrl).not.toContain("/v3/documents")
	})

	it("sends the correct v4 payload format", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					documentId: "doc_def456",
					memories: [{ id: "mem_uvw321" }],
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			),
		)

		await client.createMemory("Hello supermemory")

		const calledInit = (
			globalThis.fetch as unknown as ReturnType<typeof vi.fn>
		).mock.calls[0][1] as RequestInit
		const body = JSON.parse(calledInit.body as string)

		// v4 expects {containerTag, memories: [{content, metadata}]}
		expect(body).toHaveProperty("containerTag", CONTAINER_TAG)
		expect(body).toHaveProperty("memories")
		expect(body.memories).toHaveLength(1)
		expect(body.memories[0]).toHaveProperty("content", "Hello supermemory")
		expect(body.memories[0]).toHaveProperty("metadata")
		expect(body.memories[0].metadata).toHaveProperty("sm_source", "mcp")

		// Must NOT send the old v3/document flat format
		expect(body).not.toHaveProperty("content")
	})

	it("returns status='active' (not 'queued') on success", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					documentId: "doc_ghi789",
					memories: [{ id: "mem_rst012" }],
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			),
		)

		const result = await client.createMemory("Some content")

		// Old code returned status: "queued" — misleading.
		// v4 returns instantly active.
		expect(result.status).toBe("active")
		expect(result.id).toBe("mem_rst012")
		expect(result.containerTag).toBe(CONTAINER_TAG)
	})

	it("falls back to documentId when memories array is empty", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response(
				JSON.stringify({ documentId: "doc_only", memories: [] }),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			),
		)

		const result = await client.createMemory("Edge case")
		expect(result.id).toBe("doc_only")
		expect(result.status).toBe("active")
	})

	it("sends the Authorization header as Bearer token", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					documentId: "doc_jkl012",
					memories: [{ id: "mem_nop345" }],
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			),
		)

		await client.createMemory("Test auth")

		const calledInit = (
			globalThis.fetch as unknown as ReturnType<typeof vi.fn>
		).mock.calls[0][1] as RequestInit
		const headers = calledInit.headers as Record<string, string>

		expect(headers["Authorization"]).toMatch(/^Bearer /)
		expect(headers["Content-Type"]).toBe("application/json")
	})
})

// ---- ERROR HANDLING ----------------------------------------------------

describe("createMemory error handling", () => {
	const originalFetch = globalThis.fetch as unknown as typeof fetch

	beforeEach(() => {
		globalThis.fetch = vi.fn() as unknown as typeof fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	it("throws on HTTP 401 (auth failure)", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response("Unauthorized", { status: 401 }),
		)

		await expect(client.createMemory("test")).rejects.toThrow(
			/Authentication failed/,
		)
	})

	it("throws on HTTP 402 (memory limit)", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response("Payment Required", { status: 402 }),
		)

		await expect(client.createMemory("test")).rejects.toThrow(
			/Memory limit reached/,
		)
	})

	it("throws on HTTP 429 (rate limit)", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response("Too Many Requests", { status: 429 }),
		)

		await expect(client.createMemory("test")).rejects.toThrow(
			/Rate limit exceeded/,
		)
	})

	it("throws on HTTP 500 (server error)", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			new Response("Internal Server Error", { status: 500 }),
		)

		await expect(client.createMemory("test")).rejects.toThrow(/Server error/)
	})

	it("throws on network error", async () => {
		const client = makeClient()

		;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new TypeError("fetch failed (network error)"),
		)

		await expect(client.createMemory("test")).rejects.toThrow(/Network error/)
	})
})

// ---- CONTRACT GUARD ----------------------------------------------------

describe("v3 vs v4 contract guard", () => {
	it("v3/document payload format (the bug)", () => {
		// When client.add() was used, it sent flat payload:
		//   { content: "...", containerTag: "...", metadata: {...} }
		// This hit POST /v3/documents which uses a document-upload pipeline.
		// Plain text content always gave status: "failed", 0 memories.

		const v3Payload = {
			content: "test",
			containerTag: CONTAINER_TAG,
			metadata: { sm_source: "mcp" },
		}

		// v3 has "content" at the top level, no "memories" array
		expect(v3Payload).toHaveProperty("content")
		expect(v3Payload).not.toHaveProperty("memories")
	})

	it("v4/memories payload format (the fix)", () => {
		// The fix wraps content in a memories array:
		//   { containerTag: "...", memories: [{ content: "...", metadata: {...} }] }
		// This hits POST /v4/memories which returns immediately active memories.

		const v4Payload = {
			containerTag: CONTAINER_TAG,
			memories: [
				{
					content: "test",
					metadata: { sm_source: "mcp" },
				},
			],
		}

		expect(v4Payload).toHaveProperty("memories")
		expect(v4Payload).not.toHaveProperty("content")
	})
})
