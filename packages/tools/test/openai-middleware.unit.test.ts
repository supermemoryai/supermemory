import type OpenAI from "openai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withSupermemory } from "../src/openai"

describe("OpenAI middleware memory context", () => {
	const originalApiKey = process.env.SUPERMEMORY_API_KEY

	beforeEach(() => {
		process.env.SUPERMEMORY_API_KEY = "sm_test_key"
	})

	afterEach(() => {
		if (originalApiKey === undefined) delete process.env.SUPERMEMORY_API_KEY
		else process.env.SUPERMEMORY_API_KEY = originalApiKey
		vi.unstubAllGlobals()
	})

	it("replaces prior SDK context in chat system messages", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					profile: { static: [{ memory: "Fresh profile fact" }], dynamic: [] },
					searchResults: { results: [] },
				}),
			}),
		)
		const originalCreate = vi.fn(() =>
			Object.assign(Promise.resolve({ choices: [] }), {
				asResponse: async () => new Response(),
			}),
		)
		const client = {
			chat: { completions: { create: originalCreate } },
		} as unknown as OpenAI
		const wrapped = withSupermemory(client, {
			containerTag: "user-a",
			customId: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						'Be helpful.\n\n<supermemory context="user-memories" readonly>\nStale profile fact\n</supermemory>',
				},
				{ role: "user", content: "What do you remember?" },
			],
		})

		const forwarded = originalCreate.mock.calls[0]?.[0]
		const content = String(forwarded.messages[0].content)
		expect(content).toContain("Be helpful.")
		expect(content).toContain("Fresh profile fact")
		expect(content).not.toContain("Stale profile fact")
		expect(
			content.match(/<supermemory context="user-memories" readonly>/g),
		).toHaveLength(1)
	})
})

describe("OpenAI Responses middleware instructions", () => {
	const originalApiKey = process.env.SUPERMEMORY_API_KEY

	beforeEach(() => {
		process.env.SUPERMEMORY_API_KEY = "sm_test_key"
	})

	afterEach(() => {
		if (originalApiKey === undefined) delete process.env.SUPERMEMORY_API_KEY
		else process.env.SUPERMEMORY_API_KEY = originalApiKey
		vi.unstubAllGlobals()
	})

	const stubMemoryFetch = (staticMemories: string[]) => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					profile: {
						static: staticMemories.map((memory) => ({ memory })),
						dynamic: [],
					},
					searchResults: { results: [] },
				}),
			}),
		)
	}

	const wrapResponsesClient = () => {
		const originalCreate = vi.fn(() =>
			Object.assign(Promise.resolve({ output: [] }), {
				asResponse: async () => new Response(),
			}),
		)
		const client = {
			chat: { completions: { create: vi.fn() } },
			responses: { create: originalCreate },
		} as unknown as OpenAI
		const wrapped = withSupermemory(client, {
			containerTag: "user-a",
			customId: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})
		return { originalCreate, wrapped }
	}

	it("leaves instructions absent when the caller sent none and there is nothing to inject", async () => {
		stubMemoryFetch([])
		const { originalCreate, wrapped } = wrapResponsesClient()

		await wrapped.responses.create({
			model: "gpt-4o-mini",
			input: "What do you remember?",
			previous_response_id: "resp_123",
		})

		// An empty `instructions` still counts as present, and the Responses API
		// drops the previous turn's instructions whenever the field is sent.
		const forwarded = originalCreate.mock.calls[0]?.[0]
		expect("instructions" in forwarded).toBe(false)
		expect(forwarded.previous_response_id).toBe("resp_123")
	})

	it("still injects memories as instructions when the caller sent none", async () => {
		stubMemoryFetch(["Fresh profile fact"])
		const { originalCreate, wrapped } = wrapResponsesClient()

		await wrapped.responses.create({
			model: "gpt-4o-mini",
			input: "What do you remember?",
		})

		const forwarded = originalCreate.mock.calls[0]?.[0]
		expect(String(forwarded.instructions)).toContain("Fresh profile fact")
	})

	it("keeps caller instructions and strips stale context when there is nothing to inject", async () => {
		stubMemoryFetch([])
		const { originalCreate, wrapped } = wrapResponsesClient()

		await wrapped.responses.create({
			model: "gpt-4o-mini",
			input: "What do you remember?",
			instructions: [
				"Be helpful.",
				'<supermemory context="user-memories" readonly>',
				"Stale profile fact",
				"</supermemory>",
			].join("\n"),
		})

		const forwarded = originalCreate.mock.calls[0]?.[0]
		expect(String(forwarded.instructions)).toBe("Be helpful.")
	})
})
