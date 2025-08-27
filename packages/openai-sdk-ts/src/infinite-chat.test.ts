import { describe, expect, it } from "vitest"
import z from "zod"
import type OpenAI from "openai"
import {
	SupermemoryOpenAI,
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

describe("SupermemoryOpenAI", () => {
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
	const testModelName = process.env.MODEL_NAME || "gpt-4o-mini"
	const testHeaders = { "custom-header": "test-value" }

	// Validate provider configuration - either name OR URL, not both
	if (testProviderUrl && process.env.PROVIDER_NAME) {
		throw new Error(
			"Cannot specify both PROVIDER_NAME and PROVIDER_URL - use one or the other",
		)
	}

	// Test prompts
	const testMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[][] = [
		[{ role: "user", content: "Hello!" }],
		[
			{ role: "system", content: "You are a helpful assistant." },
			{ role: "user", content: "What is AI?" },
		],
		[
			{ role: "user", content: "Tell me a joke" },
			{
				role: "assistant",
				content:
					"Why don't scientists trust atoms? Because they make up everything!",
			},
			{ role: "user", content: "Tell me another one" },
		],
	]

	describe("client creation", () => {
		it("should create client with SupermemoryOpenAI class", () => {
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			expect(client).toBeDefined()
			expect(client.chat).toBeDefined()
		})

		it("should create client with openai provider configuration", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: testProviderApiKey,
				headers: testHeaders,
			}

			const client = new SupermemoryOpenAI(testApiKey, config)

			expect(client).toBeDefined()
		})

		it("should create client with custom provider URL", () => {
			const customUrl = "https://custom-provider.com/v1"
			const config: SupermemoryInfiniteChatConfig = {
				providerUrl: customUrl,
				providerApiKey: testProviderApiKey,
				headers: testHeaders,
			}

			const client = new SupermemoryOpenAI(testApiKey, config)

			expect(client).toBeDefined()
		})
	})

	describe("chat completions", () => {
		it("should create chat completion with simple message", async () => {
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			const result = await client.createChatCompletion({
				model: testModelName,
				messages: testMessages[0]!, // "Hello!"
			})

			expect(result).toBeDefined()
			expect("choices" in result).toBe(true)
			if ("choices" in result) {
				expect(result.choices).toBeDefined()
				expect(result.choices.length).toBeGreaterThan(0)
				expect(result.choices[0]!.message.content).toBeDefined()
			}
		})

		it("should create chat completion using convenience method", async () => {
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			const result = await client.chatCompletion(testMessages[1]!, {
				model: testModelName,
				temperature: 0.7,
			})

			expect(result).toBeDefined()
			expect("choices" in result).toBe(true)
			if ("choices" in result) {
				expect(result.choices).toBeDefined()
				expect(result.choices.length).toBeGreaterThan(0)
				expect(result.choices[0]!.message.content).toBeDefined()
			}
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			const result = await client.chatCompletion(testMessages[2]!, {
				model: testModelName,
			})

			expect(result).toBeDefined()
			expect("choices" in result).toBe(true)
			if ("choices" in result) {
				expect(result.choices).toBeDefined()
				expect(result.choices.length).toBeGreaterThan(0)
				expect(result.choices[0]!.message.content).toBeDefined()
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			const result = await client.chatCompletion(
				[{ role: "user", content: "Hello" }],
				{
					model: testModelName,
				},
			)

			expect(result).toBeDefined()
			expect("choices" in result).toBe(true)
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

			const client = new SupermemoryOpenAI(testApiKey, config)

			expect(client).toBeDefined()
		})

		it("should handle configuration without headers", () => {
			const config: SupermemoryInfiniteChatConfig = testProviderUrl
				? {
						providerUrl: testProviderUrl,
						providerApiKey: testProviderApiKey,
					}
				: {
						providerName: testProviderName,
						providerApiKey: testProviderApiKey,
					}

			const client = new SupermemoryOpenAI(testApiKey, config)

			expect(client).toBeDefined()
		})

		it("should handle different API keys", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: "different-provider-key",
			}

			const client = new SupermemoryOpenAI("different-sm-key", config)

			expect(client).toBeDefined()
		})
	})

	describe("disabled endpoints", () => {
		it("should throw errors for disabled OpenAI endpoints", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: testProviderApiKey,
			}

			const client = new SupermemoryOpenAI(testApiKey, config)

			// Test that all disabled endpoints throw appropriate errors
			expect(() => client.embeddings).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.fineTuning).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.images).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.audio).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.models).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.moderations).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.files).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.batches).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.uploads).toThrow(
				"Supermemory only supports chat completions",
			)
			expect(() => client.beta).toThrow(
				"Supermemory only supports chat completions",
			)
		})

		it("should still allow chat completions to work", () => {
			const config: SupermemoryInfiniteChatConfig = {
				providerName: "openai",
				providerApiKey: testProviderApiKey,
			}

			const client = new SupermemoryOpenAI(testApiKey, config)

			// Chat completions should still be accessible
			expect(client.chat).toBeDefined()
			expect(client.chat.completions).toBeDefined()
			expect(client.createChatCompletion).toBeDefined()
			expect(client.chatCompletion).toBeDefined()
		})
	})
})
