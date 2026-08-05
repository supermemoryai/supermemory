import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK and the conversations client so the middleware's
// memory-save routing can be asserted without network access.
const { clientAddMock, addConversationMock } = vi.hoisted(() => ({
	clientAddMock: vi.fn(),
	addConversationMock: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class MockSupermemory {
		add = clientAddMock
	},
}))

vi.mock("../conversations-client", () => ({
	addConversation: addConversationMock,
}))

import { createOpenAIMiddleware } from "./middleware"

const EMPTY_PROFILE = {
	profile: { static: [], dynamic: [] },
	searchResults: { results: [] },
}

function makeFakeOpenAI() {
	return {
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({ id: "chatcmpl-1" }),
			},
		},
		responses: {
			create: vi.fn().mockResolvedValue({ id: "resp-1" }),
		},
	}
}

describe("createOpenAIMiddleware Responses API memory save", () => {
	beforeEach(() => {
		clientAddMock.mockReset().mockResolvedValue({ id: "mem-1" })
		addConversationMock.mockReset().mockResolvedValue({ id: "conv-doc-1" })
		process.env.SUPERMEMORY_API_KEY = "sm_test_key"
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => EMPTY_PROFILE,
			})),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("routes a customId save through /v4/conversations like the chat path", async () => {
		const openai = makeFakeOpenAI()
		// biome-ignore lint/suspicious/noExplicitAny: minimal OpenAI stub for the wrapped surface
		createOpenAIMiddleware(openai as any, "user-1", {
			containerTag: "user-1",
			customId: "conv-1",
			addMemory: "always",
			mode: "query",
		})

		await openai.responses.create({ input: "I love hiking", instructions: "" })

		expect(addConversationMock).toHaveBeenCalledTimes(1)
		const payload = addConversationMock.mock.calls[0]?.[0]
		expect(payload.conversationId).toBe("conv-1")
		expect(payload.messages).toEqual([
			{ role: "user", content: "I love hiking" },
		])
		// The raw client.add fallback (which would have stored the internal
		// "conversation:" prefix as the customId) must not fire.
		expect(clientAddMock).not.toHaveBeenCalled()
	})

	it("never stores the internal conversation: prefix in the add fallback", async () => {
		const openai = makeFakeOpenAI()
		// biome-ignore lint/suspicious/noExplicitAny: minimal OpenAI stub for the wrapped surface
		createOpenAIMiddleware(openai as any, "user-1", {
			containerTag: "user-1",
			customId: "conv-1",
			addMemory: "always",
			mode: "query",
		})

		// Without an API key the conversation branch cannot run, so the save
		// falls through to client.add — the stored customId must be the
		// user's configured id, not the prefixed routing marker.
		delete process.env.SUPERMEMORY_API_KEY

		await openai.responses.create({ input: "I love hiking", instructions: "" })

		expect(addConversationMock).not.toHaveBeenCalled()
		expect(clientAddMock).toHaveBeenCalledTimes(1)
		expect(clientAddMock.mock.calls[0]?.[0]?.customId).toBe("conv-1")
	})

	it("saves without a customId via plain client.add", async () => {
		const openai = makeFakeOpenAI()
		// biome-ignore lint/suspicious/noExplicitAny: minimal OpenAI stub for the wrapped surface
		createOpenAIMiddleware(openai as any, "user-1", {
			containerTag: "user-1",
			addMemory: "always",
			mode: "query",
			// biome-ignore lint/suspicious/noExplicitAny: exercising the optional-customId path
		} as any)

		await openai.responses.create({ input: "I love hiking", instructions: "" })

		expect(addConversationMock).not.toHaveBeenCalled()
		expect(clientAddMock).toHaveBeenCalledTimes(1)
		const arg = clientAddMock.mock.calls[0]?.[0]
		expect(arg.content).toBe("I love hiking")
		expect(arg.customId).toBeUndefined()
	})
})
