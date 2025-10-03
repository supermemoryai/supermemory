import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { describe, expect, it } from "vitest"
import { type SupermemoryToolsConfig, supermemoryTools } from "./tools"

import "dotenv/config"

describe("supermemoryTools", () => {
	// Required API keys - tests will fail if not provided
	const testApiKey = process.env.SUPERMEMORY_API_KEY
	const testOpenAIKey = process.env.OPENAI_API_KEY

	if (!testApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY environment variable is required for tests",
		)
	}
	if (!testOpenAIKey) {
		throw new Error("OPENAI_API_KEY environment variable is required for tests")
	}

	// Optional configuration with defaults
	const testBaseUrl = process.env.SUPERMEMORY_BASE_URL ?? undefined
	const testModelName = process.env.MODEL_NAME || "gpt-5-nano"

	const testPrompts = [
		"What do you remember about my preferences?",
		"Help me plan my day based on what you know about me",
		"What are my current projects?",
		"Remind me of my interests and hobbies",
		"What should I focus on today?",
	]

	describe("client initialization", () => {
		it("should create tools with default configuration", () => {
			const config: SupermemoryToolsConfig = {}
			const tools = supermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.searchMemories).toBeDefined()
			expect(tools.addMemory).toBeDefined()
		})

		it("should create tools with custom baseUrl", () => {
			const config: SupermemoryToolsConfig = {
				baseUrl: testBaseUrl,
			}
			const tools = supermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.searchMemories).toBeDefined()
			expect(tools.addMemory).toBeDefined()
		})

		it("should create tools with projectId configuration", () => {
			const config: SupermemoryToolsConfig = {
				projectId: "test-project-123",
			}
			const tools = supermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.searchMemories).toBeDefined()
			expect(tools.addMemory).toBeDefined()
		})

		it("should create tools with custom container tags", () => {
			const config: SupermemoryToolsConfig = {
				containerTags: ["custom-tag-1", "custom-tag-2"],
			}
			const tools = supermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.searchMemories).toBeDefined()
			expect(tools.addMemory).toBeDefined()
		})
	})

	describe("AI SDK integration", () => {
		it("should work with AI SDK generateText", async () => {
			const openai = createOpenAI({
				apiKey: testOpenAIKey,
			})

			const result = await generateText({
				model: openai(testModelName),
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant with access to user memories. Use the search tool when the user asks about preferences or past information.",
					},
					{
						role: "user",
						content: testPrompts[0]!,
					},
				],
				tools: {
					...supermemoryTools(testApiKey, {
						projectId: "test-ai-integration",
						baseUrl: testBaseUrl,
					}),
				},
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
		})

		it("should use tools when prompted", async () => {
			const openai = createOpenAI({
				apiKey: testOpenAIKey,
			})

			const tools = supermemoryTools(testApiKey, {
				projectId: "test-tool-usage",
				baseUrl: testBaseUrl,
			})

			const result = await generateText({
				model: openai(testModelName),
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant. When the user asks you to remember something, use the addMemory tool.",
					},
					{
						role: "user",
						content: "Please remember that I prefer dark roast coffee",
					},
				],
				tools: {
					addMemory: tools.addMemory,
				},
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(result.toolCalls).toBeDefined()

			if (result.toolCalls && result.toolCalls.length > 0) {
				const addMemoryCall = result.toolCalls.find(
					(call) => call.toolName === "addMemory",
				)
				expect(addMemoryCall).toBeDefined()
			}
		})

		it("should handle multiple tool types", async () => {
			const openai = createOpenAI({
				apiKey: testOpenAIKey,
			})

			const result = await generateText({
				model: openai(testModelName),
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant with access to user memories. Use search when asked about preferences, and addMemory when told to remember something.",
					},
					{
						role: "user",
						content:
							"Search for my preferences and then remember that I also like green tea",
					},
				],
				tools: {
					...supermemoryTools(testApiKey, {
						containerTags: ["test-multi-tools"],
					}),
				},
			})

			expect(result).toBeDefined()
			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe("string")
		})
	})
})
