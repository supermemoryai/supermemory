import { generateText } from "ai"
import { describe, expect, it } from "vitest"
import z from "zod"
import {
	createSupermemoryInfiniteChat,
	type SupermemoryInfiniteChatConfig,
} from "./infinite-chat"

import "dotenv/config"

const providers = z.enum([
	"openai",
	"anthropic",
	"openrouter",
	"deepinfra",
	"groq",
	"google",
	"cloudflare",
] satisfies SupermemoryInfiniteChatConfig["providerName"][])

describe("createSupermemoryInfiniteChat", () => {
	// Required API keys - tests will fail if not provided
	const testApiKey = process.env.SUPERMEMORY_API_KEY
	const testProviderApiKey = process.env.PROVIDER_API_KEY

	if (!testApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY environment variable is required for tests",
		)
	}
	if (!testProviderApiKey) {
		throw new Error(
			"PROVIDER_API_KEY environment variable is required for tests",
		)
	}

	// Optional configuration with defaults
	const testProviderName = providers.parse(
		process.env.PROVIDER_NAME ?? "openai",
	)
	const testProviderUrl = process.env.PROVIDER_URL
	const testModelName = process.env.MODEL_NAME || "gpt-5-mini"
	const testHeaders = { "custom-header": "test-value" }

	// Validate provider configuration - either name OR URL, not both
	if (testProviderUrl && process.env.PROVIDER_NAME) {
		throw new Error(
			"Cannot specify both PROVIDER_NAME and PROVIDER_URL - use one or the other",
		)
	}

	// Test prompts and inputs
	const testPrompts = [
		"Hello, how are you?",
		"What is 2 + 2?",
		"Write a short poem about AI",
		"Explain quantum computing in simple terms",
		"What can you help me with today?",
	]

	const testMessages = [
		[{ role: "user" as const, content: "Hello!" }],
		[
			{ role: "system" as const, content: "You are a helpful assistant." },
			{ role: "user" as const, content: "What is AI?" },
		],
		[
			{ role: "user" as const, content: "Tell me a joke" },
			{
				role: "assistant" as const,
				content:
					"Why don't scientists trust atoms? Because they make up everything!",
			},
			{ role: "user" as const, content: "Tell me another one" },
		],
	]

	describe("client creation", () => {
		it("should create client with configured provider", () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: testHeaders,
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: testHeaders,
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
			expect(typeof client).toBe("function")
		})

		it("should create client with openai provider configuration", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: testProviderApiKey,
				headers: testHeaders,
			}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
			expect(typeof client).toBe("function")
		})

		it("should create client with anthropic provider configuration", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "anthropic",
				providerApiKey: testProviderApiKey,
				headers: testHeaders,
			}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
			expect(typeof client).toBe("function")
		})

		it("should create client with custom provider URL", () => {
			const customUrl = "https://custom-provider.com/v1/chat"
			const config: SupermemoryInfiniteChatConfig = {
				providerUrl: customUrl,
				providerApiKey: testProviderApiKey,
				headers: testHeaders,
			}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
			expect(typeof client).toBe("function")
		})
	})

	describe("AI SDK integration", () => {
		it("should generate text with simple prompt", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			console.log(client(testModelName))

			const result = await generateText({
				model: client(testModelName),
				prompt: testPrompts[0], // "Hello, how are you?"
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
			expect(result.text.length).toBeGreaterThan(0)
		})

		it("should generate text with messages array", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			const result = await generateText({
				model: client(testModelName),
				messages: testMessages[1], // System + user messages
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
			expect(result.text.length).toBeGreaterThan(0)
		})

		it("should handle conversation history", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			const result = await generateText({
				model: client(testModelName),
				messages: testMessages[2], // Multi-turn conversation
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
			expect(result.text.length).toBeGreaterThan(0)
		})

		it("should work with different prompt variations", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			// Test multiple prompts
			for (const prompt of testPrompts.slice(0, 3)) {
				const result = await generateText({
					model: client(testModelName),
					prompt,
				})

				expect(result).toBeDefined()
				expect(result.text).toBeDefined()
				expect(typeof result.text).toBe("string")
				expect(result.text.length).toBeGreaterThan(0)
			}
		})

		it("should work with configured and alternate models", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			const modelsToTest = [testModelName]
			// Add alternate model for OpenAI
			if (testProviderName === "openai" && !testProviderUrl) {
				modelsToTest.push("gpt-4o-mini")
			}

			for (const modelName of modelsToTest) {
				const result = await generateText({
					model: client(modelName),
					prompt: "Say hello in one word",
				})

				expect(result).toBeDefined()
				expect(result.text).toBeDefined()
				expect(typeof result.text).toBe("string")
			}
		})

		it("should work with custom headers", async () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {
							"x-custom-header": "test-value",
						},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {
							"x-custom-header": "test-value",
						},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			const result = await generateText({
				model: client(testModelName),
				prompt: "Hello",
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
		})
	})

	describe("configuration validation", () => {
		it("should handle empty headers object", () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: {},
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: {},
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
		})

		it("should handle configuration with custom headers", () => {
			const customHeaders = {
				authorization: "Bearer custom-token",
				"x-custom": "custom-value",
			}
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
						headers: customHeaders,
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
						headers: customHeaders,
					}

			const client = createSupermemoryInfiniteChat(testApiKey, config)

			expect(client).toBeDefined()
		})

		it("should handle different API keys", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: "different-provider-key",
				headers: {},
			}

			const client = createSupermemoryInfiniteChat("different-sm-key", config)

			expect(client).toBeDefined()
		})
	})
})
