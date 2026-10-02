import { afterEach, describe, expect, it, vi } from "vitest"
import { buildMemoriesText, supermemoryProfileSearch } from "./memory-client"
import { createLogger } from "./logger"

const API_KEY = "sm_test_key"
const BASE_URL = "https://api.supermemory.ai"
const CONTAINER_TAG = "user-123"

const logger = createLogger(false)

/** Stubs `/v4/profile` so the injected prompt can be asserted without network access. */
function mockProfileResponse(body: unknown) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => body,
	})
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("buildMemoriesText", () => {
	// The profile is not injected in "query" mode. Deduplicating the search
	// results against it would drop a fact present in both, leaving the model
	// with nothing.
	it("injects a search result that also exists in the profile in query mode", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User is allergic to peanuts" }],
				dynamic: [],
			},
			searchResults: { results: [{ memory: "User is allergic to peanuts" }] },
		})

		const memories = await buildMemoriesText({
			containerTag: CONTAINER_TAG,
			queryText: "what should I avoid eating?",
			mode: "query",
			baseUrl: BASE_URL,
			apiKey: API_KEY,
			logger,
		})

		expect(memories).toContain("User is allergic to peanuts")
	})

	it("does not repeat a profile memory in the search results in full mode", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User is allergic to peanuts" }],
				dynamic: [],
			},
			searchResults: {
				results: [
					{ memory: "User is allergic to peanuts" },
					{ memory: "User prefers async/await" },
				],
			},
		})

		const memories = await buildMemoriesText({
			containerTag: CONTAINER_TAG,
			queryText: "what should I avoid eating?",
			mode: "full",
			baseUrl: BASE_URL,
			apiKey: API_KEY,
			logger,
		})

		expect(memories).toContain("## Static Profile")
		expect(memories).toContain("User prefers async/await")
		// Present once, under the profile — not duplicated into the search results.
		expect(memories.match(/User is allergic to peanuts/g)).toHaveLength(1)
	})
})

describe("supermemoryProfileSearch request hardening", () => {
	/** Captures the `fetch` init so the request options can be asserted. */
	function captureRequestInit() {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ profile: { static: [], dynamic: [] } }),
		})
		vi.stubGlobal("fetch", fetchMock)
		return () => fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
	}

	// The request carries the API key in an Authorization header. Following a
	// redirect would replay it against a host the caller never configured.
	it("refuses to follow redirects", async () => {
		const getInit = captureRequestInit()

		await supermemoryProfileSearch(CONTAINER_TAG, "", BASE_URL, API_KEY)

		expect(getInit()?.redirect).toBe("error")
	})

	// Mastra, VoltAgent and the exported helpers call this with no signal, so
	// without an unconditional timeout a hung socket blocks the turn forever.
	it("bounds the request even when the caller passes no signal", async () => {
		const getInit = captureRequestInit()

		await supermemoryProfileSearch(CONTAINER_TAG, "", BASE_URL, API_KEY)

		const signal = getInit()?.signal
		expect(signal).toBeInstanceOf(AbortSignal)
		expect(signal?.aborted).toBe(false)
	})

	// The caller signal is composed with the timeout rather than replacing it,
	// so a caller-side budget still shortens the request.
	it("still aborts when the caller's signal fires", async () => {
		const getInit = captureRequestInit()
		const controller = new AbortController()

		await supermemoryProfileSearch(
			CONTAINER_TAG,
			"",
			BASE_URL,
			API_KEY,
			controller.signal,
		)

		const signal = getInit()?.signal
		expect(signal?.aborted).toBe(false)
		controller.abort(new Error("caller budget exhausted"))
		expect(signal?.aborted).toBe(true)
		expect((signal?.reason as Error).message).toBe("caller budget exhausted")
	})

	it("passes an already-aborted caller signal straight through", async () => {
		const getInit = captureRequestInit()

		await supermemoryProfileSearch(
			CONTAINER_TAG,
			"",
			BASE_URL,
			API_KEY,
			AbortSignal.abort(new Error("already cancelled")),
		)

		expect(getInit()?.signal?.aborted).toBe(true)
	})
})
