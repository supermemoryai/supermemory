import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2StreamPart,
} from "@ai-sdk/provider"
import { afterEach, describe, expect, it, vi } from "vitest"
import { withSupermemory } from "../../src/vercel"

const params: LanguageModelV2CallOptions = {
	prompt: [
		{
			role: "user",
			content: [{ type: "text", text: "Hello" }],
		},
	],
}

const emptyProfile = {
	profile: { static: [], dynamic: [] },
	searchResults: { results: [] },
}

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise
	})
	return { promise, resolve }
}

function createFetchMock(conversationResponse: Promise<Response>) {
	const conversationRequested = deferred<void>()
	const fetchMock = vi.fn((input: string | URL | Request) => {
		const url = input.toString()
		if (url.endsWith("/v4/profile")) {
			return Promise.resolve(Response.json(emptyProfile))
		}
		if (url.endsWith("/v4/conversations")) {
			conversationRequested.resolve()
			return conversationResponse
		}
		throw new Error(`Unexpected request: ${url}`)
	})
	return { fetchMock, conversationRequested: conversationRequested.promise }
}

function wrap(model: LanguageModelV2) {
	return withSupermemory(model, {
		containerTag: "user-123",
		customId: "conversation-123",
		apiKey: "test-key",
	})
}

describe("Vercel persistence lifecycle", () => {
	const originalFetch = globalThis.fetch

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it("waits for conversation persistence before doGenerate resolves", async () => {
		const conversation = deferred<Response>()
		const { fetchMock, conversationRequested } = createFetchMock(
			conversation.promise,
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const model: LanguageModelV2 = {
			specificationVersion: "v2",
			provider: "test",
			modelId: "test-model",
			supportedUrls: {},
			doGenerate: vi.fn(async () => ({
				content: [{ type: "text" as const, text: "Hi" }],
				finishReason: "stop" as const,
				usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
				warnings: [],
			})),
			doStream: vi.fn(),
		}
		const wrapped = wrap(model)
		let completed = false

		const generatePromise = wrapped.doGenerate(params).then((result) => {
			completed = true
			return result
		})

		await conversationRequested
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(completed).toBe(false)

		conversation.resolve(Response.json({ id: "saved-conversation" }))
		await generatePromise
		expect(completed).toBe(true)
	})

	it("waits for conversation persistence before a stream finishes", async () => {
		const conversation = deferred<Response>()
		const { fetchMock, conversationRequested } = createFetchMock(
			conversation.promise,
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const upstream = new ReadableStream<LanguageModelV2StreamPart>({
			start(controller) {
				controller.enqueue({ type: "text-delta", id: "text-1", delta: "Hi" })
				controller.close()
			},
		})
		const model: LanguageModelV2 = {
			specificationVersion: "v2",
			provider: "test",
			modelId: "test-model",
			supportedUrls: {},
			doGenerate: vi.fn(),
			doStream: vi.fn(async () => ({
				stream: upstream,
				warnings: [],
			})),
		}
		const wrapped = wrap(model)
		const { stream } = await wrapped.doStream(params)
		const reader = stream.getReader()

		expect(await reader.read()).toEqual({
			done: false,
			value: { type: "text-delta", id: "text-1", delta: "Hi" },
		})

		let completed = false
		const completionPromise = reader.read().then((result) => {
			completed = true
			return result
		})

		await conversationRequested
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(completed).toBe(false)

		conversation.resolve(Response.json({ id: "saved-conversation" }))
		expect(await completionPromise).toEqual({ done: true, value: undefined })
	})
})
