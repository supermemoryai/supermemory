import { describe, it, expect, beforeAll } from "vitest"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"
import { generateText, streamText } from "ai"
import { openai } from "@ai-sdk/openai"

describe("Supermemory AI SDK Integration Tests", () => {
	const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY
	const OPENAI_API_KEY = process.env.OPENAI_API_KEY
	const PROJECT_ID = process.env.SUPERMEMORY_PROJECT_ID || "sm_project_default"
	const MODEL = "gpt-4o-mini"

	beforeAll(() => {
		if (!SUPERMEMORY_API_KEY) {
			throw new Error("SUPERMEMORY_API_KEY environment variable is required")
		}
		if (!OPENAI_API_KEY) {
			throw new Error("OPENAI_API_KEY environment variable is required")
		}
	})

	it("should generate text with supermemory tools", async () => {
		const result = await generateText({
			model: openai(MODEL),
			messages: [
				{ role: "user", content: "What do you remember about my preferences?" },
			],
			tools: {
				...supermemoryTools(SUPERMEMORY_API_KEY as string, {
					containerTags: [PROJECT_ID],
				}),
			},
		})

		// Assertions
		expect(result).toBeDefined()
		expect(result.content).toBeDefined()

		// Check if tools were used
		expect(result.toolResults).toBeDefined()
		expect(Array.isArray(result.toolResults)).toBe(true)
		expect(
			result.toolResults.some((tool) =>
				JSON.stringify(tool.output).includes("pineapple"),
			),
		).toBe(true)
	}, 30000)

	it("should stream text with supermemory tools", async () => {
		const streamResult = streamText({
			model: openai(MODEL),
			messages: [
				{
					role: "user",
					content:
						"Tell me about my preferences",
				},
			],
			tools: {
				...supermemoryTools(SUPERMEMORY_API_KEY as string, {
					containerTags: [PROJECT_ID],
				}),
			},
		})

		let streamedText = ""
		for await (const chunk of streamResult.textStream) {
			streamedText += chunk
		}

		const finalResult = streamResult

		expect(streamedText).toBeDefined()
		expect(finalResult.text).toBeDefined()
		expect(finalResult.toolResults).toBeDefined()
	}, 30000)

	it("should handle memory operations correctly", async () => {
		const result = await generateText({
			model: openai(MODEL),
			messages: [
				{
					role: "user",
					content:
						"Remember that my favorite programming language is TypeScript and I prefer functional programming",
				},
			],
			tools: {
				...supermemoryTools(SUPERMEMORY_API_KEY as string, {
					containerTags: [PROJECT_ID],
				}),
			},
		})

		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(result.toolResults).toBeDefined()
		const toolResults = result.toolResults

		const memoryTools = toolResults.filter(
			(tool) =>
				tool.toolName &&
				(tool.toolName.includes("memory") ||
					tool.toolName.includes("add") ||
					tool.toolName.includes("search")),
		)

		// Verify that memory tools were used
		expect(memoryTools.length).toBeGreaterThan(0)
	}, 30000)

	it("should search and retrieve memories", async () => {
		const result = await generateText({
			model: openai(MODEL),
			messages: [
				{
					role: "user",
					content: "What programming languages do I like?",
				},
			],
			tools: {
				...supermemoryTools(SUPERMEMORY_API_KEY as string, {
					containerTags: [PROJECT_ID],
				}),
			},
		})

		// Assertions
		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(result.toolResults).toBeDefined()
	}, 30000)
})
