import { afterEach, describe, expect, it, vi } from "vitest"
import { buildMemoriesText } from "./memory-client"
import { createLogger } from "./logger"
import { profileBody, searchBody, v5Router } from "../../test/v5-fetch"

const API_KEY = "sm_test_key"
const BASE_URL = "https://api.supermemory.ai"
const NAMESPACE = "user-123"

const logger = createLogger(false)

// Stubs the v5 profile and search routes so the injected prompt can be asserted offline.
function mockV5(profile: string[], search: string[]) {
	const fetchMock = vi.fn(
		v5Router({
			profile: () => profileBody(profile),
			search: () => searchBody(search),
		}),
	)
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
		const fetchMock = mockV5(
			["User is allergic to peanuts"],
			["User is allergic to peanuts"],
		)

		const memories = await buildMemoriesText({
			namespace: NAMESPACE,
			queryText: "what should I avoid eating?",
			mode: "query",
			baseUrl: BASE_URL,
			apiKey: API_KEY,
			logger,
		})

		expect(memories).toContain("User is allergic to peanuts")
		// Query mode never shows the profile, so it is not fetched.
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("does not repeat a profile memory in the search results in full mode", async () => {
		mockV5(
			["User is allergic to peanuts"],
			["User is allergic to peanuts", "User prefers async/await"],
		)

		const memories = await buildMemoriesText({
			namespace: NAMESPACE,
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
