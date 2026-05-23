/**
 * Unit tests for createOpenAIMiddleware — no network calls required.
 *
 * These tests verify the double-wrapping protection added to guard against
 * cross-tenant memory leakage when the same OpenAI client is passed to
 * `createOpenAIMiddleware` (or `withSupermemory`) multiple times, which is
 * the common pattern in multi-user server applications.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type OpenAI from "openai"

// The Supermemory SDK client constructor throws when SUPERMEMORY_API_KEY is
// absent. Provide a fake key here — the actual value is irrelevant because
// all network calls are intercepted by a `vi.stubGlobal("fetch", ...)` mock.
process.env.SUPERMEMORY_API_KEY = "sm_test_fake_key_for_unit_tests"

// We import the internal implementation directly to avoid the SUPERMEMORY_API_KEY
// check in the public `withSupermemory` wrapper.
import { createOpenAIMiddleware } from "./middleware"

// ---------------------------------------------------------------------------
// Minimal OpenAI client stub
// ---------------------------------------------------------------------------

/** Number of times the real (innermost) `create` was called. */
let realCreateCallCount = 0

/**
 * Build a minimal mock OpenAI client whose `chat.completions.create` is a
 * spy tracking how many times the underlying SDK method is invoked.
 */
function makeOpenAIStub(): OpenAI {
	realCreateCallCount = 0

	const realCreate = vi.fn(async () => {
		realCreateCallCount++
		return { choices: [{ message: { role: "assistant", content: "ok" } }] }
	})

	const stub = {
		chat: {
			completions: {
				create: realCreate,
			},
		},
		responses: undefined,
	} as unknown as OpenAI

	return stub
}

// ---------------------------------------------------------------------------
// Helper: patch fetch so the profile endpoint returns an empty result
// (prevents actual network calls during the test).
// ---------------------------------------------------------------------------

function mockFetchEmptyProfile() {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({
			ok: true,
			json: async () => ({
				profile: { static: [], dynamic: [] },
				searchResults: { results: [] },
			}),
			text: async () => "",
		})),
	)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createOpenAIMiddleware — double-wrapping protection", () => {
	beforeEach(() => {
		mockFetchEmptyProfile()
		vi.unstubAllGlobals()
		mockFetchEmptyProfile()
	})

	it("calling createOpenAIMiddleware twice on the same client only invokes the real SDK create once per completion", async () => {
		const openai = makeOpenAIStub()

		// First call — simulates request from user-A.
		createOpenAIMiddleware(openai, "user-A", {
			containerTag: "user-A",
			customId: "conv-1",
		})

		// Second call — simulates request from user-B on the same shared client.
		createOpenAIMiddleware(openai, "user-B", {
			containerTag: "user-B",
			customId: "conv-2",
		})

		// Trigger a completion through the (now-wrapped) client.
		await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "hello" }],
		} as Parameters<typeof openai.chat.completions.create>[0])

		// Without the fix the real create would be called twice (once per wrapper layer).
		expect(realCreateCallCount).toBe(1)
	})

	it("calling createOpenAIMiddleware three times still only invokes the real SDK create once", async () => {
		const openai = makeOpenAIStub()

		createOpenAIMiddleware(openai, "user-A", {
			containerTag: "user-A",
			customId: "conv-1",
		})
		createOpenAIMiddleware(openai, "user-B", {
			containerTag: "user-B",
			customId: "conv-2",
		})
		createOpenAIMiddleware(openai, "user-C", {
			containerTag: "user-C",
			customId: "conv-3",
		})

		await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "hello" }],
		} as Parameters<typeof openai.chat.completions.create>[0])

		expect(realCreateCallCount).toBe(1)
	})

	it("the wrapper installed by the second call replaces the first (latest wins)", async () => {
		const openai = makeOpenAIStub()
		const capturedContainerTags: string[] = []

		// Spy on fetch to capture which containerTag was used for memory search.
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init?: RequestInit) => {
				if (typeof init?.body === "string") {
					try {
						const body = JSON.parse(init.body) as { containerTag?: string }
						if (body.containerTag) capturedContainerTags.push(body.containerTag)
					} catch {
						// ignore
					}
				}
				return {
					ok: true,
					json: async () => ({
						profile: { static: [], dynamic: [] },
						searchResults: { results: [] },
					}),
					text: async () => "",
				}
			}),
		)

		createOpenAIMiddleware(openai, "user-A", {
			containerTag: "user-A",
			customId: "conv-1",
			addMemory: "never", // avoid write path for this assertion
		})
		createOpenAIMiddleware(openai, "user-B", {
			containerTag: "user-B",
			customId: "conv-2",
			addMemory: "never",
		})

		await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "hello" }],
		} as Parameters<typeof openai.chat.completions.create>[0])

		// Only user-B's containerTag should appear — user-A's wrapper was replaced,
		// not stacked on top.
		expect(capturedContainerTags).not.toContain("user-A")
		expect(capturedContainerTags).toContain("user-B")
	})
})
