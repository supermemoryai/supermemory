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
				withSupermemory(mockModel, TEST_CONFIG.containerTag)
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should successfully create wrapped model with valid API key", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"

			const mockModel = createMockLanguageModel()
			const wrappedModel = withSupermemory(mockModel, TEST_CONFIG.containerTag)

			expect(wrappedModel).toBeDefined()
			expect(wrappedModel.specificationVersion).toBe("v2")
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
			const turnKey = `${TEST_CONFIG.containerTag}::profile:Hello`
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
})
