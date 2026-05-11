/**
 * Unit tests for the withSupermemory wrapper
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { withSupermemory } from "../../src/vercel"
import {
	createSupermemoryContext,
	transformParamsWithMemory,
} from "../../src/vercel/middleware"
import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import "dotenv/config"

// Test configuration
const TEST_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "test-api-key",
	baseURL: process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.ai",
	containerTag: "test-vercel-wrapper",
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

// Mock profile API response
const createMockProfileResponse = (
	staticMemories: string[] = [],
	dynamicMemories: string[] = [],
	searchResults: string[] = [],
) => ({
	profile: {
		static: staticMemories.map((memory) => ({ memory })),
		dynamic: dynamicMemories.map((memory) => ({ memory })),
	},
	searchResults: {
		results: searchResults.map((memory) => ({ memory })),
	},
})

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
					containerTag: TEST_CONFIG.containerTag,
					customId: "test-id",
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should throw error if customId is missing or empty", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const mockModel = createMockLanguageModel()

			// omitted customId (plain JS caller)
			expect(() => {
				withSupermemory(mockModel, {
					containerTag: TEST_CONFIG.containerTag,
				} as any)
			}).toThrow("customId is required")

			// empty string
			expect(() => {
				withSupermemory(mockModel, {
					containerTag: TEST_CONFIG.containerTag,
					customId: "",
				})
			}).toThrow("customId is required")
		})

		it("should successfully create wrapped model with valid API key", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const mockModel = createMockLanguageModel()
			const wrappedModel = withSupermemory(mockModel, {
				containerTag: TEST_CONFIG.containerTag,
				customId: "test-id",
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
				containerTag: TEST_CONFIG.containerTag,
				customId: "test-id",
			})

			expect(wrappedModel.specificationVersion).toBe("v2")
			expect(wrappedModel.provider).toBe("gateway")
			expect(wrappedModel.modelId).toBe("google/gemini-2.5-flash")
		})
	})

	describe("Memory caching", () => {
		let fetchMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
		})

		it("should cache memories on first call (new turn)", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(createMockProfileResponse(["Cached memory"])),
			})

			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
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

			await transformParamsWithMemory(params, ctx)

			expect(ctx.memoryCache).toBeDefined()
			const turnKey = `${TEST_CONFIG.containerTag}:test-id:profile:Hello`
			const cachedMemories = ctx.memoryCache.get(turnKey)
			expect(cachedMemories).toBeDefined()
			expect(cachedMemories).toContain("Cached memory")
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it("should use cached memories on continuation step (no new fetch)", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(createMockProfileResponse(["Cached memory"])),
			})

			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
				mode: "profile",
			})

			// Step 1: New turn (user message last)
			const step1Params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
				],
			}
			await transformParamsWithMemory(step1Params, ctx)
			expect(fetchMock).toHaveBeenCalledTimes(1)

			// Step 2: Continuation (assistant/tool after user)
			const step2Params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
					{
						role: "assistant",
						content: [
							{
								type: "tool-call",
								toolCallId: "call-1",
								toolName: "search",
								input: {},
							},
						],
					} as unknown as LanguageModelV2Message,
					{
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "call-1",
								toolName: "search",
								output: [{ type: "text", text: "some result" }],
							},
						],
					} as unknown as LanguageModelV2Message,
				],
			}

			const result = await transformParamsWithMemory(step2Params, ctx)

			// Should NOT have called fetch again
			expect(fetchMock).toHaveBeenCalledTimes(1)
			// But should still have injected memories
			expect(result.prompt[0]?.role).toBe("system")
			expect(result.prompt[0]?.content).toContain("Cached memory")
		})

		it("should refetch memories on new user turn", async () => {
			let callCount = 0
			fetchMock.mockImplementation(() => {
				callCount++
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve(
							createMockProfileResponse([`Memory from call ${callCount}`]),
						),
				})
			})

			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
				mode: "profile",
			})

			// First turn
			const turn1Params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
				],
			}
			const result1 = await transformParamsWithMemory(turn1Params, ctx)
			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(result1.prompt[0]?.content).toContain("Memory from call 1")

			// Second turn (different user message)
			const turn2Params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
					{
						role: "assistant",
						content: [{ type: "text", text: "Hi there!" }],
					},
					{
						role: "user",
						content: [{ type: "text", text: "What is my name?" }],
					},
				],
			}
			const result2 = await transformParamsWithMemory(turn2Params, ctx)

			// Should have called fetch again for new turn
			expect(fetchMock).toHaveBeenCalledTimes(2)
			expect(result2.prompt[0]?.content).toContain("Memory from call 2")
		})
	})

	describe("Edge cases", () => {
		let fetchMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
		})

		it("should handle API errors gracefully", async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("Server error"),
			})

			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
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

			await expect(transformParamsWithMemory(params, ctx)).rejects.toThrow(
				"Supermemory profile search failed",
			)
		})

		it("should handle empty prompt array", async () => {
			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
				mode: "query",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [],
			}

			const result = await transformParamsWithMemory(params, ctx)

			expect(result).toEqual(params)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should handle user message with empty content array in query mode", async () => {
			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
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

			const result = await transformParamsWithMemory(params, ctx)

			expect(result).toEqual(params)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should not mutate the original params.prompt array", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse(["Memory"])),
			})

			const ctx = createSupermemoryContext({
				containerTag: TEST_CONFIG.containerTag,
				apiKey: TEST_CONFIG.apiKey,
				customId: "test-id",
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

			await transformParamsWithMemory(params, ctx)

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
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("err"),
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
				containerTag: TEST_CONFIG.containerTag,
				customId: "test-id",
				apiKey: "k",
			})

			const params: LanguageModelV2CallOptions = {
				prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
			}

			await wrapped.doGenerate(params)

			expect(inner.doGenerate).toHaveBeenCalledWith(params)
		})

		it("throws when skipMemoryOnError is false and profile fetch fails", async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("err"),
			})

			const inner = createMockLanguageModel()
			const wrapped = withSupermemory(inner, {
				containerTag: TEST_CONFIG.containerTag,
				customId: "test-id",
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
				containerTag: TEST_CONFIG.containerTag,
				customId: "test-id",
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
