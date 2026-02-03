/**
 * Claude Memory Tool Examples
 *
 * This file contains examples showing how to use the Claude Memory Tool with:
 * 1. Direct TypeScript/fetch integration
 * 2. Anthropic SDK integration
 */

import { createClaudeMemoryTool, type MemoryCommand } from "./claude-memory"

// =====================================================
// Example 1: Direct TypeScript/fetch Integration
// =====================================================

/**
 * Example: Direct usage with fetch calls
 */
export async function directFetchExample() {
	console.log("🚀 Direct Fetch Example - Claude Memory Tool")
	console.log("=".repeat(50))

	// Initialize the memory tool
	const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
		projectId: "claude-memory-demo",
		memoryContainerTag: "claude_memory_demo",
	})

	// Example memory commands that Claude might send
	const commands: MemoryCommand[] = [
		{
			command: "create",
			path: "/memories/project-notes.md",
			file_text:
				"# Project Notes\n\n## Meeting with Client\n- Discussed requirements\n- Set deadline for next week\n- Need to follow up on budget\n\n## Technical Notes\n- Use React for frontend\n- Node.js backend\n- PostgreSQL database",
		},
		{
			command: "view",
			path: "/memories/",
		},
		{
			command: "view",
			path: "/memories/project-notes.md",
			view_range: [1, 5],
		},
		{
			command: "str_replace",
			path: "/memories/project-notes.md",
			old_str: "next week",
			new_str: "Friday",
		},
		{
			command: "insert",
			path: "/memories/project-notes.md",
			insert_line: 7,
			insert_text: "- Client prefers TypeScript",
		},
		{
			command: "create",
			path: "/memories/todo.txt",
			file_text:
				"TODO List:\n1. Set up development environment\n2. Create project structure\n3. Implement authentication\n4. Build user dashboard",
		},
		{
			command: "view",
			path: "/memories/",
		},
	]

	// Execute each command
	for (let i = 0; i < commands.length; i++) {
		const command = commands[i]
		console.log(
			`\n📝 Step ${i + 1}: ${command.command.toUpperCase()} ${command.path}`,
		)

		try {
			const result = await memoryTool.handleCommand(command)

			if (result.success) {
				console.log("✅ Success")
				if (result.content) {
					console.log("📄 Response:")
					console.log(result.content)
				}
			} else {
				console.log("❌ Failed")
				console.log("Error:", result.error)
			}
		} catch (error) {
			console.log("💥 Exception:", error)
		}
	}
}

// =====================================================
// Example 2: Anthropic SDK Integration
// =====================================================

/**
 * Mock Anthropic SDK integration example
 * In a real implementation, you'd install @anthropic-ai/sdk
 */
export async function anthropicSdkExample() {
	console.log("🤖 Anthropic SDK Example - Claude Memory Tool")
	console.log("=".repeat(50))

	// Initialize memory tool
	const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
		projectId: "claude-chat-session",
		memoryContainerTag: "claude_memory_chat",
	})

	// Simulate Claude's memory tool usage in a conversation
	console.log("🗣️  Simulating Claude conversation with memory tool access...")

	// Scenario: User asks Claude to remember something
	console.log(
		"\nUser: 'Remember that I prefer React over Vue for frontend development'",
	)

	const rememberResult = await memoryTool.handleCommand({
		command: "create",
		path: "/memories/user-preferences.md",
		file_text:
			"# User Preferences\n\n## Frontend Development\n- Prefers React over Vue\n- Likes TypeScript for type safety",
	})

	console.log("🤖 Claude: 'I'll remember that preference for you.'")
	console.log(
		"Memory operation result:",
		rememberResult.success ? "✅ Stored" : "❌ Failed",
	)

	// Scenario: User asks about their preferences later
	console.log("\nUser: 'What frontend framework do I prefer?'")
	console.log(
		"🤖 Claude: 'Let me check what I remember about your preferences...'",
	)

	const recallResult = await memoryTool.handleCommand({
		command: "view",
		path: "/memories/user-preferences.md",
	})

	if (recallResult.success) {
		console.log("📚 Claude retrieved from memory:")
		console.log(recallResult.content)
		console.log(
			"\n🤖 Claude: 'Based on what I remember, you prefer React over Vue for frontend development!'",
		)
	}

	// Scenario: User provides additional context
	console.log(
		"\nUser: 'Actually, also add that I like using Tailwind CSS for styling'",
	)

	await memoryTool.handleCommand({
		command: "str_replace",
		path: "/memories/user-preferences.md",
		old_str: "- Likes TypeScript for type safety",
		new_str:
			"- Likes TypeScript for type safety\n- Prefers Tailwind CSS for styling",
	})

	console.log(
		"🤖 Claude: 'I've updated my memory with your Tailwind CSS preference!'",
	)

	// Scenario: Show current memory directory
	console.log("\n🤖 Claude: 'Here's what I currently remember about you:'")
	const directoryResult = await memoryTool.handleCommand({
		command: "view",
		path: "/memories/",
	})

	if (directoryResult.success) {
		console.log(directoryResult.content)
	}
}

// =====================================================
// Example 3: Real Anthropic SDK Integration Template
// =====================================================

/**
 * This is what the actual integration would look like with @anthropic-ai/sdk
 */
export const anthropicIntegrationTemplate = `
// Install: npm install @anthropic-ai/sdk @supermemory/tools

import Anthropic from '@anthropic-ai/sdk';
import { createClaudeMemoryTool } from '@supermemory/tools/claude-memory';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
  projectId: 'my-chat-app',
  memoryContainerTag: 'claude_memory'
});

// Memory tool definition for Claude
const memoryToolDefinition = {
  type: 'memory_20250818' as const,
  name: 'memory'
};

async function chatWithMemory(userMessage: string) {
  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
    tools: [memoryToolDefinition],
    betas: ['context-management-2025-06-27']
  });

  // Handle tool calls if Claude wants to use memory
  if (response.content.some(block => block.type === 'tool_use')) {
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'memory') {
        const memoryCommand = block.input as any;
        const result = await memoryTool.handleCommand(memoryCommand);

        // You would typically send this result back to Claude
        console.log('Memory operation result:', result);
      }
    }
  }

  return response;
}

// Example usage:
// await chatWithMemory("Remember that I'm working on a React project with TypeScript");
// await chatWithMemory("What programming languages am I using in my current project?");
`

// =====================================================
// Example 4: cURL Commands for Testing
// =====================================================

export const curlExamples = `
# Test the memory tool using cURL commands against your supermemory API

# 1. Create a memory file
curl -X POST "https://api.supermemory.ai/v3/documents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "# My Notes\\n\\nThis is a test note for Claude memory tool.",
    "customId": "/memories/test-note.md",
    "containerTags": ["claude_memory", "sm_project_test"],
    "metadata": {
      "claude_memory_type": "file",
      "file_path": "/memories/test-note.md",
      "line_count": 3,
      "created_by": "claude_memory_tool"
    }
  }'

# 2. Search/read the memory file
curl -X POST "https://api.supermemory.ai/v3/search" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "q": "/memories/test-note.md",
    "containerTags": ["claude_memory", "sm_project_test"],
    "limit": 1,
    "includeFullDocs": true
  }'

# 3. List all memory files (directory listing)
curl -X POST "https://api.supermemory.ai/v3/search" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "q": "*",
    "containerTags": ["claude_memory", "sm_project_test"],
    "limit": 100,
    "includeFullDocs": false
  }'

# 4. Update a memory file (str_replace operation)
curl -X PATCH "https://api.supermemory.ai/v3/documents/DOCUMENT_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "# My Updated Notes\\n\\nThis note has been updated using str_replace.",
    "metadata": {
      "claude_memory_type": "file",
      "file_path": "/memories/test-note.md",
      "line_count": 3,
      "last_modified": "2025-01-15T10:30:00Z"
    }
  }'

# 5. Delete a memory file
curl -X DELETE "https://api.supermemory.ai/v3/documents/DOCUMENT_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"
`

// =====================================================
// Main runner function
// =====================================================

export async function runAllExamples() {
	if (!process.env.SUPERMEMORY_API_KEY) {
		console.error("❌ SUPERMEMORY_API_KEY environment variable is required")
		console.log("Set your API key in .env file or environment variable")
		return
	}

	try {
		await directFetchExample()
		console.log(`\\n${"=".repeat(70)}\\n`)
		await anthropicSdkExample()

		console.log(`\\n${"=".repeat(70)}`)
		console.log("📋 Real Anthropic SDK Integration Template:")
		console.log(anthropicIntegrationTemplate)

		console.log(`\\n${"=".repeat(70)}`)
		console.log("🔧 cURL Examples for Direct API Testing:")
		console.log(curlExamples)
	} catch (error) {
		console.error("💥 Error running examples:", error)
	}
}

// Run examples if this file is executed directly
if (import.meta.main) {
	runAllExamples()
}
