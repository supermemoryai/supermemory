import type OpenAI from "openai"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from "vitest"
import { withSupermemory } from "../src/openai"

const originalEnv = process.env.SUPERMEMORY_API_KEY
const originalFetch = globalThis.fetch

const createMockProfileResponse = ({
	staticMemories = [],
	dynamicMemories = [],
	searchResults = [],
}: {
	staticMemories?: string[]
	dynamicMemories?: string[]
	searchResults?: string[]
} = {}) => ({
	profile: {
		static: staticMemories.map((memory) => ({ memory })),
		dynamic: dynamicMemories.map((memory) => ({ memory })),
	},
	searchResults: {
		results: searchResults.map((memory) => ({ memory })),
	},
})

const createMockOpenAIClient = () =>
	({
		chat: {
			completions: {
				create: vi.fn(async (params) => ({ params })),
			},
		},
		responses: {
			create: vi.fn(async (params) => ({ params })),
		},
	}) as unknown as OpenAI & {
		chat: { completions: { create: Mock } }
		responses: { create: Mock }
	}

describe("OpenAI withSupermemory middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		delete process.env.SUPERMEMORY_API_KEY
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
		globalThis.fetch = originalFetch
	})

	it("uses programmatic apiKey and baseUrl without requiring env auth", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json(
				createMockProfileResponse({ searchResults: ["Custom API memory"] }),
			),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const client = createMockOpenAIClient()
		const originalCreate = client.chat.completions.create

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
			baseUrl: "https://api.example.com/",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "what do I prefer?" }],
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		]
		expect(url).toBe("https://api.example.com/v4/profile")
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer programmatic-key",
		})
		expect(originalCreate).toHaveBeenCalledTimes(1)
		const enhancedParams = originalCreate.mock.calls[0]?.[0]
		expect(enhancedParams.messages[0]).toMatchObject({
			role: "system",
			content: expect.stringContaining("Custom API memory"),
		})
	})

	it("uses programmatic apiKey and baseUrl for Responses API", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json(
				createMockProfileResponse({ searchResults: ["Responses API memory"] }),
			),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const client = createMockOpenAIClient()
		const originalResponsesCreate = client.responses.create

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
			baseUrl: "https://api.example.com/",
		})

		await wrapped.responses.create({
			model: "gpt-4o-mini",
			instructions: "Be helpful",
			input: "what do I prefer?",
		})

		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		]
		expect(url).toBe("https://api.example.com/v4/profile")
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer programmatic-key",
		})
		expect(originalResponsesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				instructions: expect.stringContaining("Responses API memory"),
			}),
		)
	})

	it("defaults addMemory to never", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json(
				createMockProfileResponse({ searchResults: ["Retrieved only"] }),
			),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const client = createMockOpenAIClient()

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "hello" }],
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const firstFetchCall = fetchMock.mock.calls[0] as unknown[] | undefined
		expect(String(firstFetchCall?.[0])).toContain("/v4/profile")
	})

	it("fails open when profile retrieval fails", async () => {
		const fetchMock = vi.fn(async () => new Response("down", { status: 503 }))
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const client = createMockOpenAIClient()
		const originalCreate = client.chat.completions.create
		const originalParams = {
			model: "gpt-4o-mini",
			messages: [{ role: "user" as const, content: "hello" }],
		}

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
		})

		await expect(
			wrapped.chat.completions.create(originalParams),
		).resolves.toEqual({
			params: originalParams,
		})
		expect(originalCreate).toHaveBeenCalledWith(originalParams)
	})

	it("fails open for Responses API when profile retrieval fails", async () => {
		globalThis.fetch = vi.fn(
			async () => new Response("down", { status: 503 }),
		) as unknown as typeof fetch
		const client = createMockOpenAIClient()
		const originalResponsesCreate = client.responses.create
		const originalParams = {
			model: "gpt-4o-mini",
			instructions: "Be helpful",
			input: "hello",
		}

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
		})

		await expect(wrapped.responses.create(originalParams)).resolves.toEqual({
			params: originalParams,
		})
		expect(originalResponsesCreate).toHaveBeenCalledWith(originalParams)
	})

	it("keeps query search hits that overlap profile memories", async () => {
		globalThis.fetch = vi.fn(async () =>
			Response.json(
				createMockProfileResponse({
					staticMemories: ["User likes TypeScript"],
					searchResults: ["User likes TypeScript", "User uses Bun"],
				}),
			),
		) as unknown as typeof fetch
		const client = createMockOpenAIClient()
		const originalCreate = client.chat.completions.create

		const wrapped = withSupermemory(client, {
			containerTag: "user-123",
			customId: "conversation-123",
			mode: "query",
			apiKey: "programmatic-key",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "what language do I like?" }],
		})

		const enhancedParams = originalCreate.mock.calls[0]?.[0]
		const systemPrompt = enhancedParams.messages[0].content
		expect(systemPrompt).toContain("- User likes TypeScript")
		expect(systemPrompt).toContain("- User uses Bun")
	})
})
