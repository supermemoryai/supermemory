import type OpenAI from "openai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createOpenAIMiddleware } from "./middleware"

const CONTAINER_TAG = "user-123"
const CUSTOM_ID = "conversation-456"
const API_KEY = "sm_test_key"

const emptyProfile = {
	profile: { static: [], dynamic: [] },
	searchResults: { results: [] },
}

function mockFetch() {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input)
		if (url.includes("/v4/profile")) {
			return new Response(JSON.stringify(emptyProfile), { status: 200 })
		}
		if (url.includes("/v4/conversations")) {
			return new Response(
				JSON.stringify({
					id: "doc-1",
					conversationId: CUSTOM_ID,
					status: "done",
				}),
				{ status: 200 },
			)
		}
		throw new Error(`Unexpected fetch: ${url}`)
	})
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

function createMockClient() {
	const create = vi.fn().mockResolvedValue({ id: "chatcmpl-1", choices: [] })
	const client = {
		chat: { completions: { create } },
	} as unknown as OpenAI
	return { client, create }
}

function wrapClient(
	client: OpenAI,
	overrides?: Partial<Parameters<typeof createOpenAIMiddleware>[2]>,
) {
	return createOpenAIMiddleware(client, CONTAINER_TAG, {
		containerTag: CONTAINER_TAG,
		customId: CUSTOM_ID,
		mode: "query",
		addMemory: "never",
		...overrides,
	})
}

function profileQueries(fetchMock: ReturnType<typeof vi.fn>) {
	return fetchMock.mock.calls
		.filter(([input]) => String(input).includes("/v4/profile"))
		.map(([, init]) => {
			const body = typeof init?.body === "string" ? init.body : ""
			return JSON.parse(body) as { q?: string; containerTag?: string }
		})
}

function conversationBodies(fetchMock: ReturnType<typeof vi.fn>) {
	return fetchMock.mock.calls
		.filter(([input]) => String(input).includes("/v4/conversations"))
		.map(([, init]) => {
			const body = typeof init?.body === "string" ? init.body : ""
			return JSON.parse(body) as {
				messages: Array<{
					role: string
					content: string | Array<{ type: string; text?: string }>
				}>
			}
		})
}

beforeEach(() => {
	vi.stubEnv("SUPERMEMORY_API_KEY", API_KEY)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

describe("createOpenAIMiddleware message content", () => {
	it("searches memories using string user content", async () => {
		const fetchMock = mockFetch()
		const { client, create } = createMockClient()
		const wrapped = wrapClient(client)

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [{ role: "user", content: "What is my favorite language?" }],
		})

		expect(profileQueries(fetchMock)).toEqual([
			{
				q: "What is my favorite language?",
				containerTag: CONTAINER_TAG,
			},
		])
		expect(create).toHaveBeenCalledOnce()
	})

	it("searches memories using text parts from array user content", async () => {
		const fetchMock = mockFetch()
		const { client, create } = createMockClient()
		const wrapped = wrapClient(client)

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "What is my favorite language?" },
						{
							type: "image_url",
							image_url: { url: "https://example.com/code.png" },
						},
					],
				},
			],
		})

		expect(profileQueries(fetchMock)).toEqual([
			{
				q: "What is my favorite language?",
				containerTag: CONTAINER_TAG,
			},
		])
		expect(create).toHaveBeenCalledOnce()
	})

	it("joins multiple text parts from the last user message", async () => {
		const fetchMock = mockFetch()
		const { client } = createMockClient()
		const wrapped = wrapClient(client)

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{ role: "user", content: "ignore the earlier turn" },
				{ role: "assistant", content: "ok" },
				{
					role: "user",
					content: [
						{ type: "text", text: "Remind me" },
						{ type: "text", text: "about TypeScript" },
					],
				},
			],
		})

		expect(profileQueries(fetchMock)[0]?.q).toBe("Remind me about TypeScript")
	})

	it("skips memory search in query mode when the user message has no text", async () => {
		const fetchMock = mockFetch()
		const { client, create } = createMockClient()
		const wrapped = wrapClient(client)

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image_url",
							image_url: { url: "https://example.com/photo.png" },
						},
					],
				},
			],
		})

		expect(profileQueries(fetchMock)).toEqual([])
		expect(create).toHaveBeenCalledOnce()
	})

	it("saves multimodal user turns instead of dropping them", async () => {
		const fetchMock = mockFetch()
		const { client } = createMockClient()
		const wrapped = wrapClient(client, { addMemory: "always" })

		await wrapped.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "Remember that I prefer bun." },
						{
							type: "image_url",
							image_url: { url: "https://example.com/screenshot.png" },
						},
					],
				},
			],
		})

		const saved = conversationBodies(fetchMock)
		expect(saved).toHaveLength(1)
		expect(saved[0]?.messages[0]).toEqual({
			role: "user",
			content: [{ type: "text", text: "Remember that I prefer bun." }],
		})
	})
})
