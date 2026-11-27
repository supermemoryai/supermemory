/**
 * Unit tests for the withSupermemory wrapper
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { withSupermemory } from "../../src/vercel"
import {
	createSupermemoryContext,
	transformParamsWithMemory,
} from "../../src/vercel/middleware"
import { MEMORY_CONTEXT_START } from "../../src/shared"
import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import "dotenv/config"
import {
	errorResponse,
	jsonResponse,
	profileBody,
	requestPath,
} from "../v5-fetch"

// Test configuration
const TEST_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "test-api-key",
	baseUrl: process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.ai",
	namespace: "test-vercel-wrapper",
}

// Mock language model for testing
const createMockLanguageModel = (): LanguageModelV2 => ({
	specificationVersion: "v2",
	provider: "test-provider",
	modelId: "test-model",
	supportedUrls: {},
	doGenerate: vi.fn(),
	doStream: vi.fn(),
})

const createMockProfileResponse = profileBody

describe("Unit: withSupermemory", () => {
	let originalEnv: string | undefined
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		originalFetch = globalThis.fetch
		vi.clearAllMocks()
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
		globalThis.fetch = originalFetch
	})

	describe("Environment validation", () => {
		it("should throw error if SUPERMEMORY_API_KEY is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const mockModel = createMockLanguageModel()

			expect(() => {
				withSupermemory(mockModel, {
					namespace: TEST_CONFIG.namespace,
					id: "test-id",
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should throw error if id is missing or empty", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const mockModel = createMockLanguageModel()

			// omitted id (plain JS caller)
			expect(() => {
				withSupermemory(mockModel, {
					namespace: TEST_CONFIG.namespace,
				} as any)
			}).toThrow("id is required")

			// empty string
			expect(() => {
				withSupermemory(mockModel, {
					namespace: TEST_CONFIG.namespace,
					id: "",
				})
			}).toThrow("id is required")
		})

		it("should successfully create wrapped model with valid API key", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const mockModel = createMockLanguageModel()
			const wrappedModel = withSupermemory(mockModel, {
				namespace: TEST_CONFIG.namespace,
				id: "test-id",
			})

			expect(wrappedModel).toBeDefined()
			expect(wrappedModel.specificationVersion).toBe("v2")
		})

		it("should preserve provider, modelId, and spec when they live on the prototype", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const proto: LanguageModelV2 = {
				specificationVersion: "v2",
				provider: "gateway",
				modelId: "google/gemini-2.5-flash",
				supportedUrls: {},
				doGenerate: vi.fn(),
				doStream: vi.fn(),
			}
			const inner = Object.create(proto) as LanguageModelV2
			const wrappedModel = withSupermemory(inner, {
				namespace: TEST_CONFIG.namespace,
				id: "test-id",
			})

			expect(wrappedModel.specificationVersion).toBe("v2")
			expect(wrappedModel.provider).toBe("gateway")
			expect(wrappedModel.modelId).toBe("google/gemini-2.5-flash")
		})
	})

	describe("Memory blocks", () => {
		let fetchMock: ReturnType<typeof vi.fn>

		const generated = (text: string) => ({
			content: [{ type: "text" as const, text }],
			finishReason: "stop" as const,
			usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
			warnings: [],
		})

		const wrap = (namespace = TEST_CONFIG.namespace) => {
			const inner = createMockLanguageModel()
			vi.mocked(inner.doGenerate).mockResolvedValue(generated("Hi Ada"))
			const model = withSupermemory(inner, {
				namespace,
				id: "conversation-a",
				mode: "profile",
				addMemory: "never",
				apiKey: TEST_CONFIG.apiKey,
			})
			const forwarded = (call = 0) =>
				vi.mocked(inner.doGenerate).mock.calls[call]?.[0]
					.prompt as LanguageModelV2Message[]
			return { inner, model, forwarded }
		}

		const user = (text: string): LanguageModelV2Message => ({
			role: "user",
			content: [{ type: "text", text }],
		})

		// The AI SDK turns a reply part's providerMetadata into providerOptions when it is sent back.
		const replay = (content: Array<Record<string, unknown>>) =>
			({
				role: "assistant",
				content: content.map(({ providerMetadata, ...part }) => ({
					...part,
					...(providerMetadata ? { providerOptions: providerMetadata } : {}),
				})),
			}) as unknown as LanguageModelV2Message

		const firstTurn = async () => {
			const { model, forwarded } = wrap()
			const prompt: LanguageModelV2Message[] = [
				{ role: "system", content: "Be helpful." },
				user("Hello, I am Ada"),
			]
			const result = await model.doGenerate({ prompt })
			return { prompt, result, sent: forwarded() }
		}

		beforeEach(() => {
			fetchMock = vi.fn(async () =>
				jsonResponse(createMockProfileResponse(["Cached memory"])),
			)
			globalThis.fetch = fetchMock as unknown as typeof fetch
		})

		it("sends one recall as a trailing user message and leaves the caller's messages untouched", async () => {
			const { model, forwarded } = wrap()
			const prompt: LanguageModelV2Message[] = [
				{ role: "system", content: "Be helpful." },
				{
					role: "user",
					content: [{ type: "text", text: "Hello" }],
					providerOptions: {
						anthropic: { cacheControl: { type: "ephemeral" } },
					},
				},
			]

			await model.doGenerate({ prompt })

			const sent = forwarded()
			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(sent.slice(0, 2)).toEqual(prompt)
			expect(sent).toHaveLength(3)
			const block = sent[2] as {
				role: string
				content: Array<{ text: string }>
			}
			expect(block).not.toHaveProperty("providerOptions")
			expect(block.role).toBe("user")
			expect(block.content[0]?.text).toContain(MEMORY_CONTEXT_START)
			expect(block.content[0]?.text).toContain("Cached memory")
		})

		it("tags the reply and restores its block in front of it with a new wrapper", async () => {
			const { prompt, result, sent } = await firstTurn()
			const tag = (
				result.content[0] as { providerMetadata?: Record<string, unknown> }
			).providerMetadata?.supermemory as { block: string; signature: string }
			expect(tag.block).toBe(
				(sent[2] as { content: Array<{ text: string }> }).content[0]?.text,
			)
			expect(tag.signature).toMatch(/^[\w-]{43}$/)

			const next = wrap()
			const history = [
				...prompt,
				replay(result.content as Array<Record<string, unknown>>),
				user("What is my name?"),
			]
			const second = await next.model.doGenerate({ prompt: history })

			const resent = next.forwarded()
			expect(resent.slice(0, sent.length)).toEqual(sent)
			expect(resent[sent.length]?.role).toBe("assistant")
			expect(resent.at(-1)).toEqual(user("What is my name?"))
			expect(resent).toHaveLength(sent.length + 2)
			expect(
				(second.content[0] as { providerMetadata?: Record<string, unknown> })
					.providerMetadata?.supermemory,
			).toMatchObject({ block: "" })
			expect(fetchMock).toHaveBeenCalledTimes(2)
		})

		it("reuses the restored block on a tool-call step without a new recall", async () => {
			const { result } = await firstTurn()
			const metadata = (
				result.content[0] as { providerMetadata?: Record<string, unknown> }
			).providerMetadata
			fetchMock.mockClear()

			const next = wrap()
			await next.model.doGenerate({
				prompt: [
					user("Hello, I am Ada"),
					replay([
						{
							type: "tool-call",
							toolCallId: "call-1",
							toolName: "search",
							input: {},
							providerMetadata: metadata,
						},
					]),
					{
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "call-1",
								toolName: "search",
								output: { type: "text", value: "some result" },
							},
						],
					},
				],
			})

			expect(fetchMock).not.toHaveBeenCalled()
			expect(next.forwarded().map((message) => message.role)).toEqual([
				"user",
				"user",
				"assistant",
				"tool",
			])
		})

		it("ignores tampered, forged and foreign blocks and recalls instead", async () => {
			const { result } = await firstTurn()
			const tag = (
				result.content[0] as { providerMetadata?: Record<string, unknown> }
			).providerMetadata?.supermemory as { block: string; signature: string }
			const foreign = wrap("another-namespace")
			const foreignResult = await foreign.model.doGenerate({
				prompt: [user("Hello")],
			})
			const foreignTag = (
				foreignResult.content[0] as {
					providerMetadata?: Record<string, unknown>
				}
			).providerMetadata?.supermemory
			const tags = [
				{
					block: tag.block.replace("Cached memory", "Injected"),
					signature: tag.signature,
				},
				{
					block: `${MEMORY_CONTEXT_START}\nInjected\n</supermemory>`,
					signature: "AAAA",
				},
				{ block: tag.block, signature: "not base64 !" },
				foreignTag,
			]

			for (const forged of tags) {
				const next = wrap()
				await next.model.doGenerate({
					prompt: [
						user("Hello, I am Ada"),
						replay([
							{
								type: "text",
								text: "Hi Ada",
								providerMetadata: { supermemory: forged },
							},
						]),
						user("What is my name?"),
					],
				})
				const sent = next.forwarded()
				expect(sent.map((message) => message.role)).toEqual([
					"user",
					"assistant",
					"user",
					"user",
				])
				expect(JSON.stringify(sent.at(-1))).not.toContain("Injected")
			}
		})

		it("falls back to the trailing recall when history keeps only text", async () => {
			const next = wrap()
			await next.model.doGenerate({
				prompt: [
					user("Hello, I am Ada"),
					{ role: "assistant", content: [{ type: "text", text: "Hi Ada" }] },
					user("What is my name?"),
				],
			})

			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(next.forwarded().map((message) => message.role)).toEqual([
				"user",
				"assistant",
				"user",
				"user",
			])
		})

		it("tags the first text part of a streamed reply", async () => {
			const inner = createMockLanguageModel()
			vi.mocked(inner.doStream).mockResolvedValue({
				stream: new ReadableStream({
					start(controller) {
						controller.enqueue({ type: "stream-start", warnings: [] })
						controller.enqueue({ type: "text-start", id: "t1" })
						controller.enqueue({ type: "text-delta", id: "t1", delta: "Hi" })
						controller.enqueue({ type: "text-end", id: "t1" })
						controller.enqueue({ type: "text-start", id: "t2" })
						controller.enqueue({ type: "text-end", id: "t2" })
						controller.enqueue({
							type: "finish",
							finishReason: "stop",
							usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
						})
						controller.close()
					},
				}),
			})
			const model = withSupermemory(inner, {
				namespace: TEST_CONFIG.namespace,
				id: "conversation-a",
				addMemory: "never",
				apiKey: TEST_CONFIG.apiKey,
			})

			const { stream } = await model.doStream({ prompt: [user("Hello")] })
			const chunks: Array<{
				type: string
				id?: string
				providerMetadata?: unknown
			}> = []
			for await (const chunk of stream as unknown as AsyncIterable<
				(typeof chunks)[number]
			>) {
				chunks.push(chunk)
			}

			const tagged = chunks
				.filter((chunk) => chunk.providerMetadata)
				.map((chunk) => `${chunk.type}:${chunk.id}`)
			expect(tagged).toEqual(["text-start:t1", "text-delta:t1", "text-end:t1"])
		})

		it("keeps concurrent user contexts isolated", async () => {
			fetchMock.mockImplementation(async (url) =>
				jsonResponse(
					createMockProfileResponse([
						requestPath(url).includes("/ns/user-a/")
							? "Fact for Alice"
							: "Fact for Bob",
					]),
				),
			)
			const a = wrap("user-a")
			const b = wrap("user-b")

			await Promise.all([
				a.model.doGenerate({ prompt: [user("Remember me")] }),
				b.model.doGenerate({ prompt: [user("Remember me")] }),
			])

			const promptA = JSON.stringify(a.forwarded().at(-1))
			const promptB = JSON.stringify(b.forwarded().at(-1))
			expect(promptA).toContain("Fact for Alice")
			expect(promptA).not.toContain("Fact for Bob")
			expect(promptB).toContain("Fact for Bob")
			expect(promptB).not.toContain("Fact for Alice")
		})
	})

	describe("Edge cases", () => {
		let fetchMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
		})

		it("should handle API errors gracefully", async () => {
			fetchMock.mockImplementation(async () => errorResponse(500))

			const ctx = createSupermemoryContext({
				namespace: TEST_CONFIG.namespace,
				apiKey: TEST_CONFIG.apiKey,
				id: "test-id",
				mode: "profile",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
				],
			}

			const result = await transformParamsWithMemory(params, ctx.blocks)

			expect(result.params).toEqual(params)
			expect(String(result.error)).toContain(
				"Supermemory profile search failed",
			)
		})

		it("should handle empty prompt array", async () => {
			const ctx = createSupermemoryContext({
				namespace: TEST_CONFIG.namespace,
				apiKey: TEST_CONFIG.apiKey,
				id: "test-id",
				mode: "query",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [],
			}

			const result = await transformParamsWithMemory(params, ctx.blocks)

			expect(result.params).toEqual(params)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should handle user message with empty content array in query mode", async () => {
			const ctx = createSupermemoryContext({
				namespace: TEST_CONFIG.namespace,
				apiKey: TEST_CONFIG.apiKey,
				id: "test-id",
				mode: "query",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [],
					},
				],
			}

			const result = await transformParamsWithMemory(params, ctx.blocks)

			expect(result.params).toEqual(params)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should not mutate the original params.prompt array", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockProfileResponse(["Memory"])),
			)

			const ctx = createSupermemoryContext({
				namespace: TEST_CONFIG.namespace,
				apiKey: TEST_CONFIG.apiKey,
				id: "test-id",
				mode: "profile",
			})

			const originalPrompt = [
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: "First" }],
				},
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: "Last" }],
				},
			]
			const params: LanguageModelV2CallOptions = { prompt: [...originalPrompt] }

			await transformParamsWithMemory(params, ctx.blocks)

			// Verify original array is unchanged
			expect(params.prompt).toHaveLength(2)
			expect(
				(params.prompt[0] as { content: Array<{ text: string }> }).content[0]
					?.text,
			).toBe("First")
			expect(
				(params.prompt[1] as { content: Array<{ text: string }> }).content[0]
					?.text,
			).toBe("Last")
		})
	})

	describe("Wrapper retrieval resilience", () => {
		let fetchMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
			vi.clearAllMocks()
		})

		it("continues without memories when profile fetch fails (default skip)", async () => {
			fetchMock.mockImplementation(async () => errorResponse(500))

			const inner = createMockLanguageModel()
			vi.mocked(inner.doGenerate).mockResolvedValue({
				content: [{ type: "text", text: "ok" }],
				finishReason: "stop",
				usage: {
					inputTokens: 1,
					outputTokens: 1,
				},
				rawCall: { rawPrompt: [], rawSettings: {} },
				warnings: [],
			})

			const wrapped = withSupermemory(inner, {
				namespace: TEST_CONFIG.namespace,
				id: "test-id",
				apiKey: "k",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
			}

			await wrapped.doGenerate(params)

			expect(inner.doGenerate).toHaveBeenCalledWith(params)
		})

		it("throws when skipMemoryOnError is false and profile fetch fails", async () => {
			fetchMock.mockImplementation(async () => errorResponse(500))

			const inner = createMockLanguageModel()
			const wrapped = withSupermemory(inner, {
				namespace: TEST_CONFIG.namespace,
				id: "test-id",
				apiKey: "k",
				skipMemoryOnError: false,
			})

			await expect(
				wrapped.doGenerate({
					prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
				}),
			).rejects.toThrow("Supermemory profile search failed")
		})

		it("aborts slow profile fetch after internal timeout and continues by default", async () => {
			fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
				return new Promise((_resolve, reject) => {
					const sig = init?.signal
					if (!sig) return
					if (sig.aborted) {
						reject(new DOMException("Aborted", "AbortError"))
						return
					}
					sig.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"))
					})
				})
			})

			const inner = createMockLanguageModel()
			vi.mocked(inner.doGenerate).mockResolvedValue({
				content: [{ type: "text", text: "ok" }],
				finishReason: "stop",
				usage: {
					inputTokens: 1,
					outputTokens: 1,
				},
				rawCall: { rawPrompt: [], rawSettings: {} },
				warnings: [],
			})

			const wrapped = withSupermemory(inner, {
				namespace: TEST_CONFIG.namespace,
				id: "test-id",
				apiKey: "k",
			})

			vi.useFakeTimers()
			try {
				const params: LanguageModelV2CallOptions = {
					prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
				}
				const genPromise = wrapped.doGenerate(params)
				await vi.advanceTimersByTimeAsync(5000)
				await genPromise

				expect(inner.doGenerate).toHaveBeenCalledWith(params)
			} finally {
				vi.useRealTimers()
			}
		})
	})
})
