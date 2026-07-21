import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK (same pattern as tool-operations.test.ts) so the
// middleware can be exercised without network access.
vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			add = vi.fn()
			search = { execute: vi.fn() }
			documents = { add: vi.fn(), delete: vi.fn(), list: vi.fn() }
		},
	}
})

import { withSupermemory } from "./index"

const OPTIONS_API_KEY = "sm_key_from_options"

/** Minimal stand-in for an OpenAI client — the middleware only reassigns `create`. */
function createFakeOpenAIClient() {
	const create = vi.fn().mockResolvedValue({ id: "chatcmpl_1" })
	return {
		chat: { completions: { create } },
	} as never
}

/** Stubs `/v4/profile` and records the requests the middleware makes. */
function mockProfileFetch() {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({
			profile: { static: [{ memory: "User likes TypeScript" }], dynamic: [] },
			searchResults: { results: [] },
		}),
	})
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

let originalEnvKey: string | undefined

beforeEach(() => {
	originalEnvKey = process.env.SUPERMEMORY_API_KEY
	delete process.env.SUPERMEMORY_API_KEY
})

afterEach(() => {
	if (originalEnvKey === undefined) {
		delete process.env.SUPERMEMORY_API_KEY
	} else {
		process.env.SUPERMEMORY_API_KEY = originalEnvKey
	}
	vi.unstubAllGlobals()
})

describe("withSupermemory (openai) API key", () => {
	it("accepts an API key from options when the env var is not set", () => {
		mockProfileFetch()

		expect(() =>
			withSupermemory(createFakeOpenAIClient(), {
				containerTag: "user-123",
				customId: "conversation-456",
				apiKey: OPTIONS_API_KEY,
			}),
		).not.toThrow()
	})

	it("authenticates the profile request with the API key from options", async () => {
		const fetchMock = mockProfileFetch()

		const client = withSupermemory(createFakeOpenAIClient(), {
			containerTag: "user-123",
			customId: "conversation-456",
			apiKey: OPTIONS_API_KEY,
			addMemory: "never",
		})

		await client.chat.completions.create({
			model: "gpt-4",
			messages: [{ role: "user", content: "what do I like?" }],
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toContain("/v4/profile")
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Bearer ${OPTIONS_API_KEY}`,
		)
	})

	it("falls back to the SUPERMEMORY_API_KEY env var", async () => {
		const fetchMock = mockProfileFetch()
		process.env.SUPERMEMORY_API_KEY = "sm_key_from_env"

		const client = withSupermemory(createFakeOpenAIClient(), {
			containerTag: "user-123",
			customId: "conversation-456",
			addMemory: "never",
		})

		await client.chat.completions.create({
			model: "gpt-4",
			messages: [{ role: "user", content: "what do I like?" }],
		})

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer sm_key_from_env",
		)
	})

	it("throws when neither options.apiKey nor the env var is set", () => {
		expect(() =>
			withSupermemory(createFakeOpenAIClient(), {
				containerTag: "user-123",
				customId: "conversation-456",
			}),
		).toThrow("SUPERMEMORY_API_KEY is not set")
	})
})
