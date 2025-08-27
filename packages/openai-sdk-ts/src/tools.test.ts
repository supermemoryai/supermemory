import { describe, expect, it } from "vitest"
import {
	SupermemoryTools,
	createSupermemoryTools,
	getMemoryToolDefinitions,
	executeMemoryToolCalls,
	createSearchMemoriesTool,
	createAddMemoryTool,
	type SupermemoryToolsConfig,
} from "./tools"
import { SupermemoryOpenAI } from "./infinite-chat"

import "dotenv/config"

describe("SupermemoryTools", () => {
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
	const testBaseUrl = process.env.SUPERMEMORY_BASE_URL ?? undefined
	const testModelName = process.env.MODEL_NAME || "gpt-4o-mini"

	describe("tool initialization", () => {
		it("should create tools with default configuration", () => {
			const config: SupermemoryToolsConfig = {}
			const tools = new SupermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.getToolDefinitions()).toBeDefined()
			expect(tools.getToolDefinitions().length).toBe(3)
		})

		it("should create tools with createSupermemoryTools helper", () => {
			const tools = createSupermemoryTools(testApiKey, {
				projectId: "test-project",
			})

			expect(tools).toBeDefined()
			expect(tools.getToolDefinitions()).toBeDefined()
		})

		it("should create tools with custom baseUrl", () => {
			const config: SupermemoryToolsConfig = {
				baseUrl: testBaseUrl,
			}
			const tools = new SupermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.getToolDefinitions().length).toBe(3)
		})

		it("should create tools with projectId configuration", () => {
			const config: SupermemoryToolsConfig = {
				projectId: "test-project-123",
			}
			const tools = new SupermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.getToolDefinitions().length).toBe(3)
		})

		it("should create tools with custom container tags", () => {
			const config: SupermemoryToolsConfig = {
				containerTags: ["custom-tag-1", "custom-tag-2"],
			}
			const tools = new SupermemoryTools(testApiKey, config)

			expect(tools).toBeDefined()
			expect(tools.getToolDefinitions().length).toBe(3)
		})
	})

	describe("tool definitions", () => {
		it("should return proper OpenAI function definitions", () => {
			const definitions = getMemoryToolDefinitions()

			expect(definitions).toBeDefined()
			expect(definitions.length).toBe(3)

			// Check searchMemories
			const searchTool = definitions.find(
				(d) => d.function.name === "searchMemories",
			)
			expect(searchTool).toBeDefined()
			expect(searchTool!.type).toBe("function")
			expect(searchTool!.function.parameters?.required).toContain(
				"informationToGet",
			)

			// Check addMemory
			const addTool = definitions.find((d) => d.function.name === "addMemory")
			expect(addTool).toBeDefined()
			expect(addTool!.type).toBe("function")
			expect(addTool!.function.parameters?.required).toContain("memory")
		})

		it("should have consistent tool definitions from class and helper", () => {
			const tools = new SupermemoryTools(testApiKey)
			const classDefinitions = tools.getToolDefinitions()
			const helperDefinitions = getMemoryToolDefinitions()

			expect(classDefinitions).toEqual(helperDefinitions)
		})
	})

	describe("memory operations", () => {
		it("should search memories", async () => {
			const tools = new SupermemoryTools(testApiKey, {
				projectId: "test-search",
				baseUrl: testBaseUrl,
			})

			const result = await tools.searchMemories({
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
			const tools = new SupermemoryTools(testApiKey, {
				containerTags: ["test-add-memory"],
				baseUrl: testBaseUrl,
			})

			const result = await tools.addMemory({
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

	describe("individual tool creators", () => {
		it("should create individual search tool", () => {
			const searchTool = createSearchMemoriesTool(testApiKey, {
				projectId: "test-individual",
			})

			expect(searchTool).toBeDefined()
			expect(searchTool.definition).toBeDefined()
			expect(searchTool.execute).toBeDefined()
			expect(searchTool.definition.function.name).toBe("searchMemories")
		})

		it("should create individual add tool", () => {
			const addTool = createAddMemoryTool(testApiKey, {
				projectId: "test-individual",
			})

			expect(addTool).toBeDefined()
			expect(addTool.definition).toBeDefined()
			expect(addTool.execute).toBeDefined()
			expect(addTool.definition.function.name).toBe("addMemory")
		})
	})

	describe("OpenAI integration", () => {
		it("should work with SupermemoryOpenAI for function calling", async () => {
			const client = new SupermemoryOpenAI(testApiKey, {
				providerName: "openai",
				providerApiKey: testProviderApiKey,
			})

			const tools = new SupermemoryTools(testApiKey, {
				projectId: "test-openai-integration",
				baseUrl: testBaseUrl,
			})

			const response = await client.chatCompletion(
				[
					{
						role: "system",
						content:
							"You are a helpful assistant with access to user memories. When the user asks you to remember something, use the addMemory tool.",
					},
					{
						role: "user",
						content: "Please remember that I prefer tea over coffee",
					},
				],
				{
					model: testModelName,
					tools: tools.getToolDefinitions(),
				},
			)

			expect(response).toBeDefined()
			expect("choices" in response).toBe(true)

			if ("choices" in response) {
				const choice = response.choices[0]!
				expect(choice.message).toBeDefined()

				// If the model decided to use function calling, test the execution
				if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
					const toolResults = await executeMemoryToolCalls(
						testApiKey,
						choice.message.tool_calls,
						{
							projectId: "test-openai-integration",
							baseUrl: testBaseUrl,
						},
					)

					expect(toolResults).toBeDefined()
					expect(toolResults.length).toBe(choice.message.tool_calls.length)

					for (const result of toolResults) {
						expect(result.role).toBe("tool")
						expect(result.content).toBeDefined()
						expect(result.tool_call_id).toBeDefined()
					}
				}
			}
		})

		it("should handle multiple tool calls", async () => {
			const tools = new SupermemoryTools(testApiKey, {
				containerTags: ["test-multi-tools"],
				baseUrl: testBaseUrl,
			})

			// Simulate tool calls (normally these would come from OpenAI)
			const mockToolCalls = [
				{
					id: "call_1",
					type: "function" as const,
					function: {
						name: "searchMemories",
						arguments: JSON.stringify({ informationToGet: "preferences" }),
					},
				},
				{
					id: "call_2",
					type: "function" as const,
					function: {
						name: "addMemory",
						arguments: JSON.stringify({
							memory: "Test memory for multiple calls",
						}),
					},
				},
			]

			const results = await executeMemoryToolCalls(testApiKey, mockToolCalls, {
				containerTags: ["test-multi-tools"],
				baseUrl: testBaseUrl,
			})

			expect(results).toBeDefined()
			expect(results.length).toBe(2)

			expect(results[0]!.tool_call_id).toBe("call_1")
			expect(results[1]!.tool_call_id).toBe("call_2")

			for (const result of results) {
				expect(result.role).toBe("tool")
				expect(result.content).toBeDefined()

				const content = JSON.parse(result.content as string)
				expect(content.success).toBeDefined()
			}
		})
	})
})
