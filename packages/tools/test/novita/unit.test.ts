import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
	withSupermemory,
	wrapNovitaClient,
	createNovita,
	NOVITA_MODELS,
	NOVITA_ENDPOINTS,
} from "../../src/novita"
import OpenAI from "openai"
import "dotenv/config"

const TEST_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "test-api-key",
	novitaApiKey: process.env.NOVITA_API_KEY || "test-novita-key",
	baseURL: process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.ai",
	containerTag: "test-novita-wrapper",
}

describe("Unit: Novita Integration", () => {
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

	describe("Constants and Exports", () => {
		it("should export NOVITA_MODELS with correct model IDs", () => {
			expect(NOVITA_MODELS.DEFAULT).toBe("moonshotai/kimi-k2.5")
			expect(NOVITA_MODELS.GLM_5).toBe("zai-org/glm-5")
			expect(NOVITA_MODELS.MINIMAX_M2_5).toBe("minimax/minimax-m2.5")
		})

		it("should export NOVITA_ENDPOINTS with correct URLs", () => {
			expect(NOVITA_ENDPOINTS.OPENAI).toBe("https://api.novita.ai/openai")
			expect(NOVITA_ENDPOINTS.ANTHROPIC).toBe("https://api.novita.ai/anthropic")
		})
	})

	describe("Environment validation", () => {
		it("should throw error if SUPERMEMORY_API_KEY is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			expect(() => {
				withSupermemory(TEST_CONFIG.containerTag)
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should throw error if NOVITA_API_KEY is not set when creating client", () => {
			delete process.env.NOVITA_API_KEY

			expect(() => {
				createNovita()
			}).toThrow("NOVITA_API_KEY is not set")
		})

		it("should successfully create client with valid API keys", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-novita-key"

			const client = createNovita()
			expect(client).toBeDefined()
			expect(client).toBeInstanceOf(OpenAI)
		})

		it("should successfully wrap client with supermemory", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-novita-key"

			const client = createNovita()
			const wrappedClient = wrapNovitaClient(client, TEST_CONFIG.containerTag)
			expect(wrappedClient).toBeDefined()
		})

		it("should successfully create wrapped client in one call", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-novita-key"

			const wrappedClient = withSupermemory(TEST_CONFIG.containerTag)
			expect(wrappedClient).toBeDefined()
		})
	})

	describe("Client configuration", () => {
		it("should use custom baseURL when provided", () => {
			process.env.NOVITA_API_KEY = "test-key"

			const client = createNovita({ baseURL: "https://custom.api.com" })
			expect(client).toBeDefined()
		})

		it("should use default Novita endpoint when baseURL not provided", () => {
			process.env.NOVITA_API_KEY = "test-key"

			const client = createNovita()
			expect(client.baseURL).toBe(NOVITA_ENDPOINTS.OPENAI)
		})

		it("should accept apiKey in options", () => {
			const client = createNovita({ apiKey: "custom-key" })
			expect(client).toBeDefined()
		})
	})

	describe("withSupermemory options", () => {
		it("should accept verbose option", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-key"

			const wrappedClient = withSupermemory(TEST_CONFIG.containerTag, {
				verbose: true,
			})
			expect(wrappedClient).toBeDefined()
		})

		it("should accept mode option", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-key"

			const modes = ["profile", "query", "full"] as const
			for (const mode of modes) {
				const wrappedClient = withSupermemory(TEST_CONFIG.containerTag, {
					mode,
				})
				expect(wrappedClient).toBeDefined()
			}
		})

		it("should accept addMemory option", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-key"

			const wrappedClient = withSupermemory(TEST_CONFIG.containerTag, {
				addMemory: "always",
			})
			expect(wrappedClient).toBeDefined()
		})

		it("should accept conversationId option", () => {
			process.env.SUPERMEMORY_API_KEY = "test-key"
			process.env.NOVITA_API_KEY = "test-key"

			const wrappedClient = withSupermemory(TEST_CONFIG.containerTag, {
				conversationId: "conv-123",
			})
			expect(wrappedClient).toBeDefined()
		})
	})
})
