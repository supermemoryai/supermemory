#!/usr/bin/env bun
/**
 * Simple Claude Memory Tool Example
 * Shows the cleanest way to integrate Claude's memory tool with supermemory
 */

import Anthropic from "@anthropic-ai/sdk"
import { createClaudeMemoryTool } from "./claude-memory"

const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY!,
})

const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
	projectId: "my-app",
})

async function chatWithMemory(userMessage: string) {
	// Send message to Claude with memory tool
	const response = await anthropic.beta.messages.create({
		model: "claude-sonnet-4-5",
		max_tokens: 2048,
		messages: [{ role: "user", content: userMessage }],
		tools: [{ type: "memory_20250818", name: "memory" }],
		betas: ["context-management-2025-06-27"],
	})

	// Handle any memory tool calls
	const toolResults = []
	for (const block of response.content) {
		if (block.type === "tool_use" && block.name === "memory") {
			const toolResult = await memoryTool.handleCommandForToolResult(
				block.input as any,
				block.id,
			)
			toolResults.push(toolResult)
		}
	}

	// Send tool results back to Claude if needed
	if (toolResults.length > 0) {
		const finalResponse = await anthropic.beta.messages.create({
			model: "claude-sonnet-4-5",
			max_tokens: 2048,
			messages: [
				{ role: "user", content: userMessage },
				{ role: "assistant", content: response.content },
				{ role: "user", content: toolResults },
			],
			tools: [{ type: "memory_20250818", name: "memory" }],
			betas: ["context-management-2025-06-27"],
		})

		return finalResponse
	}

	return response
}

// Example usage
async function example() {
	const response = await chatWithMemory(
		"Remember that I prefer React with TypeScript for my projects",
	)

	console.log(response.content[0])
}

if (import.meta.main) {
	example()
}
