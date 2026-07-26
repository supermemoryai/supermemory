import { afterEach, describe, expect, it, vi } from "vitest"
import { buildMemoriesText } from "./memory-client"
import { createLogger } from "./logger"
import type { ProfileStructure } from "./types"

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

	it("applies a governanceHook to the raw profile before formatting", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User's SSN is 123-45-6789" }],
				dynamic: [],
			},
			searchResults: { results: [] },
		})

		const governanceHook = vi.fn(async (profile: ProfileStructure) => ({
			...profile,
			profile: {
				...profile.profile,
				static: profile.profile.static?.map((entry) => ({
					...entry,
					memory: entry.memory.replace(/\d{3}-\d{2}-\d{4}/, "[REDACTED]"),
				})),
			},
		}))

		const memories = await buildMemoriesText({
			containerTag: CONTAINER_TAG,
			queryText: "",
			mode: "profile",
			baseUrl: BASE_URL,
			apiKey: API_KEY,
			logger,
			governanceHook,
		})

		expect(governanceHook).toHaveBeenCalledWith(
			expect.objectContaining({
				profile: expect.objectContaining({
					static: [{ memory: "User's SSN is 123-45-6789" }],
				}),
			}),
			{ containerTag: CONTAINER_TAG, queryText: "", mode: "profile" },
		)
		expect(memories).toContain("[REDACTED]")
		expect(memories).not.toContain("123-45-6789")
	})
})
