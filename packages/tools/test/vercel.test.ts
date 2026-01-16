import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { withSupermemory } from "../src/vercel"
import { createSupermemoryMiddleware } from "../src/vercel/middleware"
import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
} from "@ai-sdk/provider"
import Supermemory from "supermemory"
import "dotenv/config"

// Test configuration
const TEST_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "test-api-key",
	baseURL: process.env.SUPERMEMORY_BASE_URL,
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

// Mock supermemory search response
const createMockSearchResponse = (contents: string[]) => ({
	results: contents.map((content) => ({
		chunks: [{ content }],
	})),
})

// Helper to call transformParams with proper signature
const callTransformParams = async (
	middleware: ReturnType<typeof createSupermemoryMiddleware>,
	params: LanguageModelV2CallOptions,
) => {
	const mockModel = createMockLanguageModel()
	return middleware.transformParams?.({
		type: "generate",
		params,
		model: mockModel,
	})
}

describe("withSupermemory / wrapVercelLanguageModel", () => {
	let originalEnv: string | undefined

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		vi.clearAllMocks()
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
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

	describe("createSupermemoryMiddleware", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
		let mockSupermemory: any

		beforeEach(() => {
			mockSupermemory = {
				search: {
					execute: vi.fn(),
				},
			}
		})

		it("should return params unchanged when there is no user message", async () => {
			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "system",
						content: "You are a helpful assistant",
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			expect(result).toEqual(params)
			expect(mockSupermemory.search.execute).not.toHaveBeenCalled()
		})

		it("should extract last user message with text content", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello, how are you?" }],
					},
				],
			}

			await callTransformParams(middleware, params)

			expect(mockSupermemory.search.execute).toHaveBeenCalledWith({
				q: "Hello, how are you?",
				containerTags: [TEST_CONFIG.containerTag],
			})
		})

		it("should handle multiple user messages and extract the last one", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "First message" }],
					},
					{
						role: "assistant",
						content: [{ type: "text", text: "Response" }],
					},
					{
						role: "user",
						content: [{ type: "text", text: "Last message" }],
					},
				],
			}

			await callTransformParams(middleware, params)

			expect(mockSupermemory.search.execute).toHaveBeenCalledWith({
				q: "Last message",
				containerTags: [TEST_CONFIG.containerTag],
			})
		})

		it("should concatenate multiple text parts in user message", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [
							{ type: "text", text: "Part 1" },
							{ type: "text", text: "Part 2" },
							{ type: "text", text: "Part 3" },
						],
					},
				],
			}

			await callTransformParams(middleware, params)

			expect(mockSupermemory.search.execute).toHaveBeenCalledWith({
				q: "Part 1 Part 2 Part 3",
				containerTags: [TEST_CONFIG.containerTag],
			})
		})

		it("should create new system prompt when none exists", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([
					"Memory 1: User likes TypeScript",
					"Memory 2: User prefers clean code",
				]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Tell me about TypeScript" }],
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			expect(result?.prompt).toHaveLength(2)
			expect(result?.prompt[0]?.role).toBe("system")
			expect(result?.prompt[0]?.content).toContain(
				"Memory 1: User likes TypeScript Memory 2: User prefers clean code",
			)
			expect(result?.prompt[1]?.role).toBe("user")
		})

		it("should append memories to existing system prompt", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse(["Memory: User is an expert developer"]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "system",
						content: "You are a helpful coding assistant",
					},
					{
						role: "user",
						content: [{ type: "text", text: "Help me code" }],
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			expect(result?.prompt).toHaveLength(2)
			expect(result?.prompt[0]?.role).toBe("system")
			expect(result?.prompt[0]?.content).toContain(
				"You are a helpful coding assistant",
			)
			expect(result?.prompt[0]?.content).toContain(
				"Memory: User is an expert developer",
			)
		})

		it("should handle empty memory results", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			// Should still create system prompt even if memories are empty
			expect(result?.prompt).toHaveLength(2)
			expect(result?.prompt[0]?.role).toBe("system")
		})

		it("should filter out non-text content from user message", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [
							{ type: "text", text: "Text part" },
							// File part is non-text content
							{ type: "file", data: "base64...", mimeType: "image/png" },
							{ type: "text", text: "Another text part" },
						],
					},
				],
			}

			await callTransformParams(middleware, params)

			// Should only extract text content
			expect(mockSupermemory.search.execute).toHaveBeenCalledWith({
				q: "Text part Another text part",
				containerTags: [TEST_CONFIG.containerTag],
			})
		})

		it("should handle multiple memory chunks correctly", async () => {
			mockSupermemory.search.execute.mockResolvedValue({
				results: [
					{
						chunks: [
							{ content: "Chunk 1" },
							{ content: "Chunk 2" },
							{ content: "Chunk 3" },
						],
					},
					{
						chunks: [{ content: "Chunk 4" }, { content: "Chunk 5" }],
					},
				],
			})

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Query" }],
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			const systemContent = result?.prompt[0]?.content as string
			// Chunks from same result should be joined with space
			expect(systemContent).toContain("Chunk 1 Chunk 2 Chunk 3")
			// Results should be joined with newline
			expect(systemContent).toContain("Chunk 4 Chunk 5")
		})
	})

	describe("Integration with real Supermemory", () => {
		// Skip these tests if no API key is available
		const shouldRunIntegration = !!process.env.SUPERMEMORY_API_KEY

		it.skipIf(!shouldRunIntegration)(
			"should work with real Supermemory API",
			async () => {
				const supermemory = new Supermemory({
					apiKey: process.env.SUPERMEMORY_API_KEY ?? "",
					baseURL: TEST_CONFIG.baseURL,
				})

				const middleware = createSupermemoryMiddleware(
					supermemory,
					TEST_CONFIG.containerTag,
				)

				const params: LanguageModelV2CallOptions = {
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Tell me about programming" }],
						},
					],
				}

				const result = await callTransformParams(middleware, params)

				expect(result?.prompt).toBeDefined()
				expect(result?.prompt.length).toBeGreaterThanOrEqual(1)
			},
		)

		it.skipIf(!shouldRunIntegration)(
			"should create wrapped model and use it",
			async () => {
				process.env.SUPERMEMORY_API_KEY = TEST_CONFIG.apiKey

				const mockModel = createMockLanguageModel()
				const wrappedModel = withSupermemory(
					mockModel,
					TEST_CONFIG.containerTag,
				)

				expect(wrappedModel).toBeDefined()
				expect(wrappedModel.provider).toBe("test-provider")
				expect(wrappedModel.modelId).toBe("test-model")
			},
		)
	})

	describe("Edge cases", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
		let mockSupermemory: any

		beforeEach(() => {
			mockSupermemory = {
				search: {
					execute: vi.fn(),
				},
			}
		})

		it("should handle Supermemory API errors gracefully", async () => {
			mockSupermemory.search.execute.mockRejectedValue(new Error("API Error"))

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Hello" }],
					},
				],
			}

			await expect(callTransformParams(middleware, params)).rejects.toThrow(
				"API Error",
			)
		})

		it("should handle empty prompt array", async () => {
			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [],
			}

			const result = await callTransformParams(middleware, params)

			expect(result).toEqual(params)
			expect(mockSupermemory.search.execute).not.toHaveBeenCalled()
		})

		it("should handle user message with empty content array", async () => {
			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [],
					},
				],
			}

			const result = await callTransformParams(middleware, params)

			expect(result).toEqual(params)
			expect(mockSupermemory.search.execute).not.toHaveBeenCalled()
		})

		it("should use correct container tag", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const customTag = "my-custom-project"
			const middleware = createSupermemoryMiddleware(mockSupermemory, customTag)

			const params: LanguageModelV2CallOptions = {
				prompt: [
					{
						role: "user",
						content: [{ type: "text", text: "Query" }],
					},
				],
			}

			await callTransformParams(middleware, params)

			expect(mockSupermemory.search.execute).toHaveBeenCalledWith({
				q: "Query",
				containerTags: [customTag],
			})
		})

		it("should not mutate the original params.prompt array", async () => {
			mockSupermemory.search.execute.mockResolvedValue(
				createMockSearchResponse([]),
			)

			const middleware = createSupermemoryMiddleware(
				mockSupermemory,
				TEST_CONFIG.containerTag,
			)

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

			await callTransformParams(middleware, params)

			// Verify order is unchanged
			expect(params.prompt[0]?.content[0]).toBe("First")
			expect(params.prompt[1]?.content[0]).toBe("Last")
		})
	})
})
