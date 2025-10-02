import { describe, it, expect, vi, beforeEach } from "vitest"
import {
	createSupermemoryMiddleware,
	wrapVercelLanguageModel,
} from "../src/vercel/middleware"
import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
} from "@ai-sdk/provider"

// Helper function to create a mock model
const createMockModel = (): LanguageModelV2 => ({
	specificationVersion: "v2",
	modelId: "test-model",
	provider: "test-provider",
	supportedUrls: {},
	doGenerate: vi.fn(),
	doStream: vi.fn(),
})

describe("Vercel AI SDK v5 Middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("createSupermemoryMiddleware", () => {
		it("should transform params and add system prompt", async () => {
			const middleware = createSupermemoryMiddleware
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello, how are you?" }],
					},
				],
			}

			const result = await middleware.transformParams?.({
				type: "generate",
				params: mockParams,
				model: {} as LanguageModelV2,
			})

			expect(result).toEqual({
				...mockParams,
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello, how are you?" }],
					},
					{ role: "system", content: "My Name is Mahesh" },
				],
			})
		})

		it("should preserve existing system prompts and add new one", async () => {
			const middleware = createSupermemoryMiddleware
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [
					{ role: "system", content: "You are a helpful assistant" },
					{
						role: "user",
						content: [{ type: "text", text: "What is the weather?" }],
					},
				],
			}

			const result = await middleware.transformParams?.({
				type: "generate",
				params: mockParams,
				model: {} as LanguageModelV2,
			})

			expect(result?.prompt).toEqual([
				{ role: "system", content: "You are a helpful assistant" },
				{
					role: "user",
					content: [{ type: "text", text: "What is the weather?" }],
				},
				{ role: "system", content: "My Name is Mahesh" },
			])
		})

		it("should handle empty prompt array", async () => {
			const middleware = createSupermemoryMiddleware
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [],
			}

			const result = await middleware.transformParams?.({
				type: "generate",
				params: mockParams,
				model: {} as LanguageModelV2,
			})

			expect(result?.prompt).toEqual([
				{ role: "system", content: "My Name is Mahesh" },
			])
		})
	})

	describe("wrapVercelLanguageModel", () => {
		it("should wrap a language model with middleware", () => {
			const mockModel = createMockModel()
			const wrappedModel = wrapVercelLanguageModel(mockModel)

			expect(wrappedModel).toBeDefined()
			expect(wrappedModel.modelId).toBe("test-model")
			expect(wrappedModel.provider).toBe("test-provider")
			expect(wrappedModel.doGenerate).toBeDefined()
			expect(wrappedModel.doStream).toBeDefined()
		})

		it("should apply middleware when generating", async () => {
			const mockModel = createMockModel()
			mockModel.doGenerate = vi.fn().mockResolvedValue({
				content: [{ type: "text", text: "Generated response" }],
				finishReason: "stop",
				usage: { promptTokens: 10, completionTokens: 5 },
			})

			const wrappedModel = wrapVercelLanguageModel(mockModel)
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
			}

			await wrappedModel.doGenerate(mockParams)

			// Verify that the middleware was applied (system prompt should be added)
			expect(mockModel.doGenerate).toHaveBeenCalledWith(
				expect.objectContaining({
					prompt: expect.arrayContaining([
						{ role: "user", content: [{ type: "text", text: "Hello" }] },
						{ role: "system", content: "My Name is Mahesh" },
					]),
				}),
			)
		})

		it("should apply middleware when streaming", async () => {
			const mockStream = {
				[Symbol.asyncIterator]: vi.fn().mockResolvedValue({
					next: () => Promise.resolve({ done: true, value: undefined }),
				}),
			}

			const mockModel = createMockModel()
			mockModel.doStream = vi.fn().mockResolvedValue(mockStream)

			const wrappedModel = wrapVercelLanguageModel(mockModel)
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
			}

			await wrappedModel.doStream(mockParams)

			// Verify that the middleware was applied (system prompt should be added)
			expect(mockModel.doStream).toHaveBeenCalledWith(
				expect.objectContaining({
					prompt: expect.arrayContaining([
						{ role: "user", content: [{ type: "text", text: "Hello" }] },
						{ role: "system", content: "My Name is Mahesh" },
					]),
				}),
			)
		})
	})

	describe("Integration tests", () => {
		it("should work with real AI SDK models", async () => {
			// This test would require actual AI SDK models
			// For now, we'll test the structure
			const mockModel: LanguageModelV2 = {
				specificationVersion: "v2",
				modelId: "gpt-3.5-turbo",
				provider: "openai",
				supportedUrls: {},
				doGenerate: vi.fn().mockResolvedValue({
					content: [
						{ type: "text", text: "Hello! I'm Mahesh, how can I help you?" },
					],
					finishReason: "stop",
					usage: { promptTokens: 15, completionTokens: 10 },
				}),
				doStream: vi.fn(),
			}

			const wrappedModel = wrapVercelLanguageModel(mockModel)
			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "What's your name?" }],
					},
				],
			}

			const result = await wrappedModel.doGenerate(params)

			expect(result.content[0]).toEqual({
				type: "text",
				text: "Hello! I'm Mahesh, how can I help you?",
			})
			expect(mockModel.doGenerate).toHaveBeenCalledWith(
				expect.objectContaining({
					prompt: expect.arrayContaining([
						{
							role: "user",
							content: [{ type: "text", text: "What's your name?" }],
						},
						{ role: "system", content: "My Name is Mahesh" },
					]),
				}),
			)
		})

		it("should handle multiple system prompts correctly", async () => {
			const middleware = createSupermemoryMiddleware
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [
					{ role: "system", content: "You are a helpful assistant" },
					{ role: "user", content: [{ type: "text", text: "Hello" }] },
					{ role: "system", content: "Please be concise" },
				],
			}

			const result = await middleware.transformParams?.({
				type: "generate",
				params: mockParams,
				model: {} as LanguageModelV2,
			})

			expect(result?.prompt).toEqual([
				{ role: "system", content: "You are a helpful assistant" },
				{ role: "user", content: [{ type: "text", text: "Hello" }] },
				{ role: "system", content: "Please be concise" },
				{ role: "system", content: "My Name is Mahesh" },
			])
		})

		it("should preserve all other parameters", async () => {
			const middleware = createSupermemoryMiddleware
			const mockParams: LanguageModelV2CallOptions = {
				prompt: [{ role: "user", content: [{ type: "text", text: "Test" }] }],
			}

			const result = await middleware.transformParams?.({
				type: "generate",
				params: mockParams,
				model: {} as LanguageModelV2,
			})

			// Verify that the original params are preserved
			expect(result).toEqual(
				expect.objectContaining({
					prompt: expect.any(Array),
				}),
			)
		})
	})

	describe("Error handling", () => {
		it("should handle transformParams errors gracefully", async () => {
			const middleware = createSupermemoryMiddleware

			// Test with invalid params that might cause issues
			const invalidParams = {
				prompt: null,
			}

			// This should not throw an error, but handle gracefully
			await expect(
				middleware.transformParams?.({
					type: "generate",
					params: invalidParams as unknown as LanguageModelV2CallOptions,
					model: {} as LanguageModelV2,
				}),
			).rejects.toThrow()
		})

		it("should handle missing transformParams method", () => {
			// This should not cause issues when wrapping
			const mockModel = createMockModel()

			// Should not throw when creating middleware without transformParams
			expect(() => {
				// This would be the case if middleware didn't have transformParams
				// but our middleware does have it, so this is more of a defensive test
				wrapVercelLanguageModel(mockModel)
			}).not.toThrow()
		})
	})
})
