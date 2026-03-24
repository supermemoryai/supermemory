/**
 * Unit tests for the MiniMax integration module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
	withSupermemory,
	clampTemperature,
	MINIMAX_MODELS,
	MINIMAX_BASE_URL,
	supermemoryTools,
	getToolDefinitions,
	memoryToolSchemas,
} from "../../src/minimax"
import type OpenAI from "openai"
import "dotenv/config"

// Mock OpenAI client
const createMockOpenAIClient = (): OpenAI => {
	const originalCreate = vi.fn()
	const responsesCreate = vi.fn()
	return {
		chat: {
			completions: {
				create: originalCreate,
			},
		},
		responses: {
			create: responsesCreate,
		},
	} as unknown as OpenAI
}

describe("Unit: MiniMax integration", () => {
	let originalEnv: string | undefined
	let originalSupermemoryKey: string | undefined

	beforeEach(() => {
		originalEnv = process.env.MINIMAX_API_KEY
		originalSupermemoryKey = process.env.SUPERMEMORY_API_KEY
		vi.clearAllMocks()
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.MINIMAX_API_KEY = originalEnv
		} else {
			delete process.env.MINIMAX_API_KEY
		}
		if (originalSupermemoryKey) {
			process.env.SUPERMEMORY_API_KEY = originalSupermemoryKey
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
	})

	describe("MINIMAX_MODELS", () => {
		it("should contain MiniMax-M2.7", () => {
			expect(MINIMAX_MODELS.some((m) => m.id === "MiniMax-M2.7")).toBe(true)
		})

		it("should contain MiniMax-M2.7-highspeed", () => {
			expect(
				MINIMAX_MODELS.some((m) => m.id === "MiniMax-M2.7-highspeed"),
			).toBe(true)
		})

		it("should have exactly 2 models", () => {
			expect(MINIMAX_MODELS).toHaveLength(2)
		})
	})

	describe("MINIMAX_BASE_URL", () => {
		it("should use api.minimax.io", () => {
			expect(MINIMAX_BASE_URL).toBe("https://api.minimax.io/v1")
		})

		it("should not use api.minimax.chat", () => {
			expect(MINIMAX_BASE_URL).not.toContain("minimax.chat")
		})
	})

	describe("clampTemperature", () => {
		it("should return 1.0 for undefined", () => {
			expect(clampTemperature(undefined)).toBe(1.0)
		})

		it("should return 1.0 for null", () => {
			expect(clampTemperature(null as unknown as number)).toBe(1.0)
		})

		it("should clamp 0 to 0.01", () => {
			expect(clampTemperature(0)).toBe(0.01)
		})

		it("should clamp negative values to 0.01", () => {
			expect(clampTemperature(-0.5)).toBe(0.01)
		})

		it("should clamp values above 1.0 to 1.0", () => {
			expect(clampTemperature(1.5)).toBe(1.0)
			expect(clampTemperature(2.0)).toBe(1.0)
		})

		it("should pass through valid values", () => {
			expect(clampTemperature(0.5)).toBe(0.5)
			expect(clampTemperature(0.7)).toBe(0.7)
			expect(clampTemperature(1.0)).toBe(1.0)
			expect(clampTemperature(0.01)).toBe(0.01)
		})
	})

	describe("withSupermemory", () => {
		it("should throw error if SUPERMEMORY_API_KEY is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const mockClient = createMockOpenAIClient()

			expect(() => {
				withSupermemory(mockClient, "test-container")
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should successfully wrap OpenAI client with valid keys", () => {
			process.env.SUPERMEMORY_API_KEY = "test-supermemory-key"

			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, "test-container")

			expect(wrapped).toBeDefined()
			expect(wrapped.chat).toBeDefined()
			expect(wrapped.chat.completions).toBeDefined()
			expect(wrapped.chat.completions.create).toBeDefined()
		})

		it("should accept all middleware options", () => {
			process.env.SUPERMEMORY_API_KEY = "test-supermemory-key"

			const mockClient = createMockOpenAIClient()

			expect(() => {
				withSupermemory(mockClient, "test-container", {
					conversationId: "conv-123",
					verbose: true,
					mode: "full",
					addMemory: "always",
					baseUrl: "https://custom.supermemory.ai",
				})
			}).not.toThrow()
		})
	})

	describe("Tool re-exports", () => {
		it("should export supermemoryTools function", () => {
			expect(typeof supermemoryTools).toBe("function")
		})

		it("should export getToolDefinitions function", () => {
			expect(typeof getToolDefinitions).toBe("function")
		})

		it("should export memoryToolSchemas", () => {
			expect(memoryToolSchemas).toBeDefined()
			expect(memoryToolSchemas.searchMemories).toBeDefined()
			expect(memoryToolSchemas.addMemory).toBeDefined()
			expect(memoryToolSchemas.getProfile).toBeDefined()
			expect(memoryToolSchemas.documentList).toBeDefined()
			expect(memoryToolSchemas.documentDelete).toBeDefined()
			expect(memoryToolSchemas.documentAdd).toBeDefined()
			expect(memoryToolSchemas.memoryForget).toBeDefined()
		})

		it("should create tools with API key", () => {
			const tools = supermemoryTools("test-api-key")
			expect(tools.searchMemories).toBeDefined()
			expect(tools.addMemory).toBeDefined()
			expect(tools.getProfile).toBeDefined()
			expect(tools.documentList).toBeDefined()
			expect(tools.documentDelete).toBeDefined()
			expect(tools.documentAdd).toBeDefined()
			expect(tools.memoryForget).toBeDefined()
		})

		it("should return 7 tool definitions", () => {
			const definitions = getToolDefinitions()
			expect(definitions).toHaveLength(7)
			expect(definitions.every((d) => d.type === "function")).toBe(true)
		})
	})
})
