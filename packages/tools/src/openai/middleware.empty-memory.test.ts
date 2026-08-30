import type OpenAI from "openai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withSupermemory } from "./index"

const emptyProfile = {
	profile: { static: [], dynamic: [] },
	searchResults: { results: [] },
}
const originalApiKey = process.env.SUPERMEMORY_API_KEY

function createClient() {
	const chatCreate = vi.fn(async () => ({}))
	const responsesCreate = vi.fn(async () => ({}))
	const client = {
		chat: { completions: { create: chatCreate } },
		responses: { create: responsesCreate },
	} as unknown as OpenAI

	return { client, chatCreate, responsesCreate }
}

function mockProfileResponse(body: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () => body,
		}),
	)
}

beforeEach(() => {
	process.env.SUPERMEMORY_API_KEY = "test-api-key"
})

afterEach(() => {
	if (originalApiKey === undefined) {
		delete process.env.SUPERMEMORY_API_KEY
	} else {
		process.env.SUPERMEMORY_API_KEY = originalApiKey
	}
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe("OpenAI middleware memory injection", () => {
	it.each([
		"profile",
		"query",
		"full",
	] as const)("leaves chat messages unchanged for empty %s results", async (mode) => {
		mockProfileResponse(emptyProfile)
		const { client, chatCreate } = createClient()
		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
			{ role: "user", content: "Hello" },
		]
		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode,
			addMemory: "never",
		})

		await wrapped.chat.completions.create({ model: "gpt-4o", messages })

		expect(chatCreate).toHaveBeenCalledWith({ model: "gpt-4o", messages })
	})

	it("does not append whitespace to an existing system message", async () => {
		mockProfileResponse(emptyProfile)
		const { client, chatCreate } = createClient()
		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
			{ role: "system", content: "You are helpful." },
			{ role: "user", content: "Hello" },
		]
		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "full",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({ model: "gpt-4o", messages })

		expect(chatCreate).toHaveBeenCalledWith({ model: "gpt-4o", messages })
	})

	it.each([
		"query",
		"full",
	] as const)("keeps Responses API instructions unchanged for empty %s results", async (mode) => {
		mockProfileResponse(emptyProfile)
		const { client, responsesCreate } = createClient()
		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode,
			addMemory: "never",
		})

		await wrapped.responses.create({
			model: "gpt-4o",
			input: "Hello",
			instructions: "You are helpful.",
		})

		expect(responsesCreate).toHaveBeenCalledWith({
			model: "gpt-4o",
			input: "Hello",
			instructions: "You are helpful.",
		})
	})

	it("still injects non-empty memories", async () => {
		mockProfileResponse({
			profile: {
				static: [{ memory: "User likes TypeScript" }],
				dynamic: [],
			},
			searchResults: { results: [] },
		})
		const { client, chatCreate } = createClient()
		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "profile",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [{ role: "user", content: "Hello" }],
		})

		expect(chatCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: "system",
						content: expect.stringContaining("User likes TypeScript"),
					}),
				]),
			}),
		)
	})
})
