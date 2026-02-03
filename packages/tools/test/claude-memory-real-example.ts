/**
 * Real Claude Memory Tool Integration Examples
 *
 * This shows actual tool call handling based on real Claude API responses
 */

import { createClaudeMemoryTool, type MemoryCommand } from "./claude-memory"

// =====================================================
// Real Claude API Integration
// =====================================================

/**
 * Handle actual Claude memory tool calls from the API response
 */
export async function handleClaudeMemoryToolCall(
	toolUseBlock: {
		type: "tool_use"
		id: string
		name: "memory"
		input: MemoryCommand
	},
	supermemoryApiKey: string,
	config?: {
		projectId?: string
		memoryContainerTag?: string
		baseUrl?: string
	},
) {
	console.log(
		`🔧 Handling Claude memory tool call: ${toolUseBlock.input.command}`,
	)
	console.log(`📁 Path: ${toolUseBlock.input.path}`)

	// Initialize memory tool
	const memoryTool = createClaudeMemoryTool(supermemoryApiKey, {
		projectId: config?.projectId || "claude-chat",
		memoryContainerTag: config?.memoryContainerTag || "claude_memory",
		baseUrl: config?.baseUrl,
	})

	// Execute the memory command
	const result = await memoryTool.handleCommand(toolUseBlock.input)

	// Format response for Claude
	const toolResult = {
		type: "tool_result" as const,
		tool_use_id: toolUseBlock.id,
		content: result.success
			? result.content || "Operation completed successfully"
			: `Error: ${result.error}`,
		is_error: !result.success,
	}

	console.log(
		`${result.success ? "✅" : "❌"} Result:`,
		result.content || result.error,
	)

	return toolResult
}

/**
 * Complete example with real Claude API call and memory tool handling
 */
export async function realClaudeMemoryExample() {
	console.log("🤖 Real Claude Memory Tool Integration")
	console.log("=".repeat(50))

	// Your API keys
	const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
	const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY

	if (!ANTHROPIC_API_KEY || !SUPERMEMORY_API_KEY) {
		console.error("❌ Missing API keys:")
		console.error("- Set ANTHROPIC_API_KEY for Claude")
		console.error("- Set SUPERMEMORY_API_KEY for Supermemory")
		return
	}

	// Step 1: Make initial request to Claude
	console.log("📤 Making request to Claude API...")

	const initialRequest = {
		model: "claude-sonnet-4-5",
		max_tokens: 2048,
		messages: [
			{
				role: "user" as const,
				content:
					"I'm working on a Python web scraper that keeps crashing with a timeout error. Here's the problematic function:\\n\\n```python\\ndef fetch_page(url, retries=3):\\n    for i in range(retries):\\n        try:\\n            response = requests.get(url, timeout=5)\\n            return response.text\\n        except requests.exceptions.Timeout:\\n            if i == retries - 1:\\n                raise\\n            time.sleep(1)\\n```\\n\\nPlease help me debug this.",
			},
		],
		tools: [
			{
				type: "memory_20250818" as const,
				name: "memory",
			},
		],
	}

	// Make the API call
	const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
			"anthropic-beta": "context-management-2025-06-27",
		},
		body: JSON.stringify(initialRequest),
	})

	const responseData = await claudeResponse.json()
	console.log("📥 Claude's response:")
	console.log(JSON.stringify(responseData, null, 2))

	// Step 2: Handle any tool calls
	const toolResults = []

	if (responseData.content) {
		for (const block of responseData.content) {
			if (block.type === "tool_use" && block.name === "memory") {
				console.log("\\n🔧 Processing memory tool call:")
				console.log(`Command: ${block.input.command}`)
				console.log(`Path: ${block.input.path}`)

				// Handle the memory tool call
				const toolResult = await handleClaudeMemoryToolCall(
					block,
					SUPERMEMORY_API_KEY,
					{
						projectId: "python-scraper-help",
						memoryContainerTag: "claude_memory_debug",
					},
				)

				toolResults.push(toolResult)
			}
		}
	}

	// Step 3: Send tool results back to Claude if there were any
	if (toolResults.length > 0) {
		console.log("\\n📤 Sending tool results back to Claude...")

		const followUpRequest = {
			model: "claude-sonnet-4-5",
			max_tokens: 2048,
			messages: [
				...initialRequest.messages,
				{
					role: "assistant" as const,
					content: responseData.content,
				},
				{
					role: "user" as const,
					content: toolResults,
				},
			],
			tools: initialRequest.tools,
		}

		const followUpResponse = await fetch(
			"https://api.anthropic.com/v1/messages",
			{
				method: "POST",
				headers: {
					"x-api-key": ANTHROPIC_API_KEY,
					"anthropic-version": "2023-06-01",
					"content-type": "application/json",
					"anthropic-beta": "context-management-2025-06-27",
				},
				body: JSON.stringify(followUpRequest),
			},
		)

		const followUpData = await followUpResponse.json()
		console.log("📥 Claude's final response:")
		console.log(JSON.stringify(followUpData, null, 2))
	}
}

/**
 * Simplified function to process Claude tool calls
 */
export async function processClaudeResponse(
	claudeResponseData: any,
	supermemoryApiKey: string,
	config?: {
		projectId?: string
		memoryContainerTag?: string
		baseUrl?: string
	},
): Promise<any[]> {
	const toolResults = []

	if (claudeResponseData.content) {
		for (const block of claudeResponseData.content) {
			if (block.type === "tool_use" && block.name === "memory") {
				const toolResult = await handleClaudeMemoryToolCall(
					block,
					supermemoryApiKey,
					config,
				)
				toolResults.push(toolResult)
			}
		}
	}

	return toolResults
}

// =====================================================
// Express.js / Web Framework Integration Example
// =====================================================

export const webIntegrationExample = `
// Example: Express.js endpoint that handles Claude memory tool calls

import express from 'express';
import { processClaudeResponse } from './claude-memory-real-example';

const app = express();
app.use(express.json());

app.post('/chat-with-memory', async (req, res) => {
  const { message, conversationId } = req.body;

  try {
    // 1. Send message to Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-beta': 'context-management-2025-06-27'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: message }],
        tools: [{ type: 'memory_20250818', name: 'memory' }]
      })
    });

    const claudeData = await claudeResponse.json();

    // 2. Handle any memory tool calls
    const toolResults = await processClaudeResponse(
      claudeData,
      process.env.SUPERMEMORY_API_KEY!,
      {
        projectId: conversationId || 'default-chat',
        memoryContainerTag: 'claude_memory_chat'
      }
    );

    // 3. Send tool results back to Claude if needed
    if (toolResults.length > 0) {
      const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
        // ... send tool results back to Claude
      });
      const finalData = await followUpResponse.json();
      res.json({ response: finalData, memoryOperations: toolResults.length });
    } else {
      res.json({ response: claudeData, memoryOperations: 0 });
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat with memory' });
  }
});
`

// =====================================================
// Test with actual tool call from your example
// =====================================================

export async function testWithRealToolCall() {
	console.log("🧪 Testing with Real Tool Call from Your Example")
	console.log("=".repeat(50))

	// This is the actual tool call Claude made in your example
	const realToolCall = {
		type: "tool_use" as const,
		id: "toolu_01BjWuUZXUfie6ey5Vz3xvth",
		name: "memory" as const,
		input: {
			command: "view" as const,
			path: "/memories",
		},
	}

	console.log("🔍 Tool call from Claude:")
	console.log(JSON.stringify(realToolCall, null, 2))

	if (!process.env.SUPERMEMORY_API_KEY) {
		console.error("❌ SUPERMEMORY_API_KEY required for testing")
		return
	}

	// Process the tool call
	const result = await handleClaudeMemoryToolCall(
		realToolCall,
		process.env.SUPERMEMORY_API_KEY,
		{
			projectId: "python-scraper-debug",
			memoryContainerTag: "claude_memory_test",
		},
	)

	console.log("\\n📋 Tool Result to send back to Claude:")
	console.log(JSON.stringify(result, null, 2))
}

// =====================================================
// Main runner
// =====================================================

export async function runRealExamples() {
	console.log("🚀 Running Real Claude Memory Tool Examples")
	console.log("=".repeat(70))

	// Test with the actual tool call first
	await testWithRealToolCall()

	console.log(`\\n${"=".repeat(70)}\\n`)

	// Show web integration example
	console.log("🌐 Web Framework Integration Example:")
	console.log(webIntegrationExample)

	// Only run full API example if both keys are present
	if (process.env.ANTHROPIC_API_KEY && process.env.SUPERMEMORY_API_KEY) {
		console.log(`\\n${"=".repeat(70)}\\n`)
		await realClaudeMemoryExample()
	} else {
		console.log(
			"\\n⚠️  Set ANTHROPIC_API_KEY and SUPERMEMORY_API_KEY to run full API example",
		)
	}
}

// Run if executed directly
if (import.meta.main) {
	runRealExamples()
}
