import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { describe, expect, it } from "vitest"
import * as aiSdk from "./ai-sdk"
import * as openAi from "./openai"
import type { SupermemoryToolsConfig } from "./types"

import "dotenv/config"

describe("@supermemory/tools", () => {
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

	describe("aiSdk module", () => {
		describe("client initialization", () => {
			it("should create tools with default configuration", () => {
				const config: SupermemoryToolsConfig = {}
				const tools = aiSdk.supermemoryTools(testApiKey, config)

				expect(tools).toBeDefined()
				expect(tools.searchMemories).toBeDefined()
				expect(tools.addMemory).toBeDefined()
				expect(tools.getProfile).toBeDefined()
				expect(tools.documentList).toBeDefined()
				expect(tools.documentDelete).toBeDefined()
				expect(tools.documentAdd).toBeDefined()
				expect(tools.memoryForget).toBeDefined()
			})

			it("should create tools with custom baseUrl", () => {
				const config: SupermemoryToolsConfig = {
					baseUrl: testBaseUrl,
				}
				const tools = aiSdk.supermemoryTools(testApiKey, config)

				expect(tools).toBeDefined()
				expect(tools.searchMemories).toBeDefined()
				expect(tools.addMemory).toBeDefined()
				expect(tools.getProfile).toBeDefined()
				expect(tools.documentList).toBeDefined()
				expect(tools.documentDelete).toBeDefined()
				expect(tools.documentAdd).toBeDefined()
				expect(tools.memoryForget).toBeDefined()
			})

			it("should create individual tools", () => {
				const searchTool = aiSdk.searchMemoriesTool(testApiKey, {
					projectId: "test-project-123",
				})
				const addTool = aiSdk.addMemoryTool(testApiKey, {
					projectId: "test-project-123",
				})
				const profileTool = aiSdk.getProfileTool(testApiKey, {
					projectId: "test-project-123",
				})
				const listTool = aiSdk.documentListTool(testApiKey, {
					projectId: "test-project-123",
				})
				const deleteTool = aiSdk.documentDeleteTool(testApiKey, {
					projectId: "test-project-123",
				})
				const addDocTool = aiSdk.documentAddTool(testApiKey, {
					projectId: "test-project-123",
				})
				const forgetTool = aiSdk.memoryForgetTool(testApiKey, {
					projectId: "test-project-123",
				})

				expect(searchTool).toBeDefined()
				expect(addTool).toBeDefined()
				expect(profileTool).toBeDefined()
				expect(listTool).toBeDefined()
				expect(deleteTool).toBeDefined()
				expect(addDocTool).toBeDefined()
				expect(forgetTool).toBeDefined()
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
							content: "What do you remember about my preferences?",
						},
					],
					tools: {
						...aiSdk.supermemoryTools(testApiKey, {
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

				const tools = aiSdk.supermemoryTools(testApiKey, {
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
			})

			it("should work with new profile tool", async () => {
				const openai = createOpenAI({
					apiKey: testOpenAIKey,
				})

				const tools = aiSdk.supermemoryTools(testApiKey, {
					projectId: "test-profile-tool",
					baseUrl: testBaseUrl,
				})

				const result = await generateText({
					model: openai(testModelName),
					messages: [
						{
							role: "system",
							content:
								"You are a helpful assistant. When asked about user profile or preferences, use the getProfile tool.",
						},
						{
							role: "user",
							content: "What do you know about me?",
						},
					],
					tools: {
						getProfile: tools.getProfile,
					},
				})

				expect(result).toBeDefined()
				expect(result.text).toBeDefined()
			})

			it("should work with new document tools", async () => {
				const openai = createOpenAI({
					apiKey: testOpenAIKey,
				})

				const tools = aiSdk.supermemoryTools(testApiKey, {
					projectId: "test-document-tools",
					baseUrl: testBaseUrl,
				})

				const result = await generateText({
					model: openai(testModelName),
					messages: [
						{
							role: "system",
							content:
								"You are a helpful assistant. When asked to list documents, use the documentList tool.",
						},
						{
							role: "user",
							content: "Show me my saved documents",
						},
					],
					tools: {
						documentList: tools.documentList,
					},
				})

				expect(result).toBeDefined()
				expect(result.text).toBeDefined()
			})
		})

		describe("new tool operations", () => {
			it("should get profile with getProfileTool", async () => {
				const profileTool = aiSdk.getProfileTool(testApiKey, {
					projectId: "test-profile",
					baseUrl: testBaseUrl,
				})

				// Verify tool is a valid CoreTool from AI SDK
				expect(profileTool).toBeDefined()
				expect(profileTool.description).toBeDefined()
				expect(typeof profileTool.description).toBe("string")
			})

			it("should list documents with documentListTool", async () => {
				const listTool = aiSdk.documentListTool(testApiKey, {
					projectId: "test-list",
					baseUrl: testBaseUrl,
				})

				expect(listTool).toBeDefined()
				expect(listTool.description).toBeDefined()
				expect(typeof listTool.description).toBe("string")
			})

			it("should create documentDeleteTool", async () => {
				const deleteTool = aiSdk.documentDeleteTool(testApiKey, {
					projectId: "test-delete",
					baseUrl: testBaseUrl,
				})

				expect(deleteTool).toBeDefined()
				expect(deleteTool.description).toBeDefined()
				expect(typeof deleteTool.description).toBe("string")
			})

			it("should create documentAddTool", async () => {
				const addDocTool = aiSdk.documentAddTool(testApiKey, {
					projectId: "test-add-doc",
					baseUrl: testBaseUrl,
				})

				expect(addDocTool).toBeDefined()
				expect(addDocTool.description).toBeDefined()
				expect(typeof addDocTool.description).toBe("string")
			})

			it("should create memoryForgetTool", async () => {
				const forgetTool = aiSdk.memoryForgetTool(testApiKey, {
					projectId: "test-forget",
					baseUrl: testBaseUrl,
				})

				expect(forgetTool).toBeDefined()
				expect(forgetTool.description).toBeDefined()
				expect(typeof forgetTool.description).toBe("string")
			})
		})
	})

	describe("openAi module", () => {
		describe("function-based tools", () => {
			it("should create function-based tools", () => {
				const tools = openAi.supermemoryTools(testApiKey, {
					projectId: "test-openai-functions",
				})

				expect(tools).toBeDefined()
				expect(tools.searchMemories).toBeDefined()
				expect(tools.addMemory).toBeDefined()
			})

			it("should create individual tool functions", () => {
				const searchFunction = openAi.createSearchMemoriesFunction(testApiKey, {
					projectId: "test-individual",
				})
				const addFunction = openAi.createAddMemoryFunction(testApiKey, {
					projectId: "test-individual",
				})

				expect(searchFunction).toBeDefined()
				expect(addFunction).toBeDefined()
				expect(typeof searchFunction).toBe("function")
				expect(typeof addFunction).toBe("function")
			})
		})

		describe("tool definitions", () => {
			it("should return proper OpenAI function definitions", () => {
				const definitions = openAi.getToolDefinitions()

				expect(definitions).toBeDefined()
				expect(definitions.length).toBe(2)

				// Check searchMemories
				const searchTool = definitions.find(
					(d) => d.function.name === "searchMemories",
				)
				expect(searchTool).toBeDefined()
				expect(searchTool?.type).toBe("function")
				expect(searchTool?.function.parameters?.required).toContain(
					"informationToGet",
				)

				// Check addMemory
				const addTool = definitions.find((d) => d.function.name === "addMemory")
				expect(addTool).toBeDefined()
				expect(addTool?.type).toBe("function")
				expect(addTool?.function.parameters?.required).toContain("memory")
			})
		})

		describe("tool execution", () => {
			it("should create tool call executor", () => {
				const executor = openAi.createToolCallExecutor(testApiKey, {
					containerTags: ["test-executor"],
					baseUrl: testBaseUrl,
				})

				expect(executor).toBeDefined()
				expect(typeof executor).toBe("function")
			})

			it("should create tool calls executor", () => {
				const executor = openAi.createToolCallsExecutor(testApiKey, {
					containerTags: ["test-executors"],
					baseUrl: testBaseUrl,
				})

				expect(executor).toBeDefined()
				expect(typeof executor).toBe("function")
			})
		})

		describe("individual tool creators", () => {
			it("should create individual search tool", () => {
				const searchTool = openAi.createSearchMemoriesTool(testApiKey, {
					projectId: "test-individual",
				})

				expect(searchTool).toBeDefined()
				expect(searchTool.definition).toBeDefined()
				expect(searchTool.execute).toBeDefined()
				expect(searchTool.definition.function.name).toBe("searchMemories")
			})

			it("should create individual add tool", () => {
				const addTool = openAi.createAddMemoryTool(testApiKey, {
					projectId: "test-individual",
				})

				expect(addTool).toBeDefined()
				expect(addTool.definition).toBeDefined()
				expect(addTool.execute).toBeDefined()
				expect(addTool.definition.function.name).toBe("addMemory")
			})
		})

		describe("memory operations", () => {
			it("should search memories", async () => {
				const searchFunction = openAi.createSearchMemoriesFunction(testApiKey, {
					projectId: "test-search",
					baseUrl: testBaseUrl,
				})

				const result = await searchFunction({
					informationToGet: "test preferences",
					limit: 5,
				})

				expect(result).toBeDefined()
				expect(result.success).toBeDefined()
				expect(typeof result.success).toBe("boolean")

				if (result.success) {
					expect(result.results).toBeDefined()
					expect(result.count).toBeDefined()
					expect(typeof result.count).toBe("number")
				} else {
					expect(result.error).toBeDefined()
				}
			})

			it("should add memory", async () => {
				const addFunction = openAi.createAddMemoryFunction(testApiKey, {
					containerTags: ["test-add-memory"],
					baseUrl: testBaseUrl,
				})

				const result = await addFunction({
					memory: "User prefers dark roast coffee in the morning - test memory",
				})

				expect(result).toBeDefined()
				expect(result.success).toBeDefined()
				expect(typeof result.success).toBe("boolean")

				if (result.success) {
					expect(result.memory).toBeDefined()
				} else {
					expect(result.error).toBeDefined()
				}
			})
		})
	})
})
