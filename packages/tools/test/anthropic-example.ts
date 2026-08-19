#!/usr/bin/env bun
/**
 * Anthropic SDK Example with Claude Memory Tool
 * Shows how to use the memory tool with the official Anthropic SDK
 */

import Anthropic from "@anthropic-ai/sdk"
import {
	createClaudeMemoryTool,
	type MemoryCommand,
} from "../src/claude-memory"
import "dotenv/config"

/**
 * Handle Claude's memory tool calls using the Anthropic SDK
 */
async function chatWithMemoryTool() {
	console.log("🤖 Anthropic SDK Example - Claude with Memory Tool")
	console.log("=".repeat(50))

	const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
	const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY

	if (!ANTHROPIC_API_KEY || !SUPERMEMORY_API_KEY) {
		console.error("❌ Missing required API keys:")
		console.error("- ANTHROPIC_API_KEY")
		console.error("- SUPERMEMORY_API_KEY")
		return
	}

	// Initialize Anthropic client
	const anthropic = new Anthropic({
		apiKey: ANTHROPIC_API_KEY,
	})

	// Initialize memory tool
	const memoryTool = createClaudeMemoryTool(SUPERMEMORY_API_KEY, {
		projectId: "anthropic-sdk-demo",
		memoryContainerTag: "claude_memory_anthropic",
	})

	// Conversation messages
	const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
		{
			role: "user",
			content:
				"Hi Claude! I'm working on a new React project using TypeScript and I want you to remember my preferences. Can you help me debug some code later?",
		},
	]

	console.log("💬 User:", messages[0]?.content)
	console.log("\n🔄 Sending to Claude with memory tool...")

	try {
		// Make initial request to Claude with memory tool
		const response = await anthropic.beta.messages.create({
			model: "claude-sonnet-4-5",
			max_tokens: 2048,
			messages: messages,
			tools: [
				{
					type: "memory_20250818",
					name: "memory",
				},
			],
			betas: ["context-management-2025-06-27"],
		})

		console.log("📥 Claude responded:")

		// Process the response
		const toolResults: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = []

		for (const block of response.content) {
			if (block.type === "text") {
				console.log("💭", block.text)
			} else if (block.type === "tool_use" && block.name === "memory") {
				const command = block.input as MemoryCommand
				console.log("🔧 Claude is using memory tool:")
				console.log("   Command:", command.command)
				console.log("   Path:", command.path)

				// Handle the memory tool call
				const memoryResult = await memoryTool.handleCommand(command)

				const toolResult: Anthropic.Beta.Messages.BetaToolResultBlockParam = {
					type: "tool_result",
					tool_use_id: block.id,
					content: memoryResult.success
						? memoryResult.content || "Operation completed successfully"
						: `Error: ${memoryResult.error}`,
					is_error: !memoryResult.success,
				}

				toolResults.push(toolResult)

				console.log(
					"📊 Memory operation result:",
					memoryResult.success ? "✅ Success" : "❌ Failed",
				)
				if (memoryResult.content) {
					console.log(
						"📄 Content preview:",
						`${memoryResult.content.substring(0, 100)}...`,
					)
				}
			}
		}

		// If Claude used memory tools, send the results back
		if (toolResults.length > 0) {
			console.log("\n🔄 Sending tool results back to Claude...")

			// Add Claude's response to conversation
			messages.push({
				role: "assistant",
				content: response.content,
			})

			// Add tool results
			messages.push({
				role: "user",
				content: toolResults,
			})

			const finalResponse = await anthropic.beta.messages.create({
				model: "claude-sonnet-4-5",
				max_tokens: 2048,
				messages: messages,
				tools: [
					{
						type: "memory_20250818",
						name: "memory",
					},
				],
				betas: ["context-management-2025-06-27"],
			})

			console.log("📥 Claude's final response:")

			for (const block of finalResponse.content) {
				if (block.type === "text") {
					console.log("💭", block.text)
				} else if (block.type === "tool_use" && block.name === "memory") {
					const command = block.input as MemoryCommand
					console.log("🔧 Claude is using memory tool again:")
					console.log("   Command:", command.command)
					console.log("   Path:", command.path)

					// Handle additional memory tool calls
					const memoryResult = await memoryTool.handleCommand(command)
					console.log(
						"📊 Memory operation result:",
						memoryResult.success ? "✅ Success" : "❌ Failed",
					)
				}
			}
		}

		console.log("\n✨ Conversation completed!")
		console.log("\n📋 Usage statistics:")
		console.log("- Input tokens:", response.usage.input_tokens)
		console.log("- Output tokens:", response.usage.output_tokens)
		console.log("- Memory operations:", toolResults.length)
	} catch (error) {
		console.error("❌ Error:", error)
	}
}

/**
 * Test memory tool operations directly
 */
async function testMemoryOperations() {
	console.log("\n🧪 Testing Memory Operations Directly")
	console.log("=".repeat(50))

	if (!process.env.SUPERMEMORY_API_KEY) {
		console.error("❌ SUPERMEMORY_API_KEY is required")
		return
	}

	const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY, {
		projectId: "direct-test",
		memoryContainerTag: "claude_memory_direct",
	})

	const testCases = [
		{
			name: "View empty memory directory",
			command: { command: "view" as const, path: "/memories" },
		},
		{
			name: "Create user preferences file",
			command: {
				command: "create" as const,
				path: "/memories/user-preferences.md",
				file_text:
					"# User Preferences\n\n- Prefers React with TypeScript\n- Likes clean, readable code\n- Uses functional programming style\n- Prefers ESLint and Prettier for code formatting",
			},
		},
		{
			name: "Create project notes",
			command: {
				command: "create" as const,
				path: "/memories/project-notes.txt",
				file_text:
					"Current Project: React TypeScript App\n\nFeatures to implement:\n1. User authentication\n2. Dashboard with widgets\n3. Data visualization\n4. Export functionality\n\nTech stack:\n- React 18\n- TypeScript\n- Vite\n- Tailwind CSS",
			},
		},
		{
			name: "List directory contents",
			command: { command: "view" as const, path: "/memories/" },
		},
		{
			name: "Read user preferences",
			command: {
				command: "view" as const,
				path: "/memories/user-preferences.md",
			},
		},
		{
			name: "Update preferences (add VS Code)",
			command: {
				command: "str_replace" as const,
				path: "/memories/user-preferences.md",
				old_str: "- Prefers ESLint and Prettier for code formatting",
				new_str:
					"- Prefers ESLint and Prettier for code formatting\n- Uses VS Code as primary editor\n- Likes GitHub Copilot for code completion",
			},
		},
		{
			name: "Insert new task in project notes",
			command: {
				command: "insert" as const,
				path: "/memories/project-notes.txt",
				insert_line: 6,
				insert_text: "5. Unit testing with Jest and React Testing Library",
			},
		},
		{
			name: "Read updated project notes",
			command: {
				command: "view" as const,
				path: "/memories/project-notes.txt",
				view_range: [4, 8] as [number, number],
			},
		},
	]

	for (const testCase of testCases) {
		console.log(`\n🔍 ${testCase.name}`)
		try {
			const result = await memoryTool.handleCommand(testCase.command)

			if (result.success) {
				console.log("✅ Success")
				if (result.content && result.content.length <= 200) {
					console.log("📄 Result:", result.content)
				} else if (result.content) {
					console.log(
						"📄 Result:",
						`${result.content.substring(0, 150)}... (truncated)`,
					)
				}
			} else {
				console.log("❌ Failed")
				console.log("📄 Error:", result.error)
			}
		} catch (error) {
			console.log("💥 Exception:", error)
		}

		// Small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 300))
	}
}

// Run the examples
async function main() {
	await testMemoryOperations()
	console.log(`\n${"=".repeat(70)}\n`)
	await chatWithMemoryTool()
}

if (import.meta.main) {
	main().catch(console.error)
}
