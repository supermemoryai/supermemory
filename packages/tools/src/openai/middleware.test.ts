import type OpenAI from "openai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOpenAIMiddleware } from "./middleware"

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

// createOpenAIMiddleware always constructs a Supermemory client (used by the
// addMemory="always" fallback path), even though these tests exercise
// addMemory="never" and never touch it. The SDK validates the key eagerly at
// construction time regardless.
process.env.SUPERMEMORY_API_KEY ??= "sm_test_key"

// These are the regression tests that matter: a redacting hook only proves
// the hook ran on the path it ran on. A blocking hook fails loudly the day a
// refactor stops invoking it — that's what makes "governance is installed" a
// guarantee instead of a green light on nothing. openai/middleware.ts has its
// own separate fetch/format implementation (doesn't reuse shared/), so both
// of its call sites need this proven independently.
describe("createOpenAIMiddleware governance hook", () => {
	it("blocks memories from reaching Chat Completions when governanceHook blocks everything", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User's SSN is 123-45-6789" }],
				dynamic: [],
			},
			searchResults: { results: [] },
		})

		const originalCreate = vi.fn().mockResolvedValue({ id: "chatcmpl-1" })
		const fakeClient = {
			chat: { completions: { create: originalCreate } },
		} as unknown as OpenAI

		createOpenAIMiddleware(fakeClient, "user-123", {
			containerTag: "user-123",
			customId: "test-conversation",
			mode: "profile",
			addMemory: "never",
			governanceHook: async () => ({
				profile: {},
				searchResults: { results: [] },
			}),
		})

		// Test double, not a real ChatCompletionCreateParams.
		await (
			fakeClient.chat.completions.create as (
				...args: unknown[]
			) => Promise<unknown>
		)({
			model: "gpt-4o",
			messages: [{ role: "user", content: "what is my SSN?" }],
		})

		expect(originalCreate).toHaveBeenCalledOnce()
		const sentParams = originalCreate.mock.calls[0]?.[0] as {
			messages: Array<{ role: string; content: string }>
		}
		const systemMessage = sentParams.messages.find((m) => m.role === "system")
		expect(systemMessage?.content).not.toContain("123-45-6789")
	})

	it("blocks memories from reaching the Responses API when governanceHook blocks everything", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User's SSN is 123-45-6789" }],
				dynamic: [],
			},
			searchResults: { results: [] },
		})

		const originalCreate = vi.fn().mockResolvedValue({ id: "chatcmpl-1" })
		const originalResponsesCreate = vi.fn().mockResolvedValue({ id: "resp-1" })
		const fakeClient = {
			chat: { completions: { create: originalCreate } },
			responses: { create: originalResponsesCreate },
		} as unknown as OpenAI

		createOpenAIMiddleware(fakeClient, "user-123", {
			containerTag: "user-123",
			customId: "test-conversation",
			mode: "profile",
			addMemory: "never",
			governanceHook: async () => ({
				profile: {},
				searchResults: { results: [] },
			}),
		})

		// Test double, not a real Responses create params type.
		await (
			fakeClient.responses.create as (...args: unknown[]) => Promise<unknown>
		)({
			model: "gpt-4o",
			input: "what is my SSN?",
			instructions: "Be concise.",
		})

		expect(originalResponsesCreate).toHaveBeenCalledOnce()
		const sentParams = originalResponsesCreate.mock.calls[0]?.[0] as {
			instructions?: string
		}
		expect(sentParams.instructions).not.toContain("123-45-6789")
	})
})
