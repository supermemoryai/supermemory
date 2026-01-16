#!/usr/bin/env bun
/**
 * Manual test script for Claude Memory Tool
 * Run with: bun run src/test-memory-tool.ts
 */

import { createClaudeMemoryTool, type MemoryCommand } from "./claude-memory"
import "dotenv/config"

async function testMemoryTool() {
	console.log("🧪 Testing Claude Memory Tool Operations")
	console.log("=".repeat(50))

	if (!process.env.SUPERMEMORY_API_KEY) {
		console.error("❌ SUPERMEMORY_API_KEY environment variable is required")
		process.exit(1)
	}

	const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY, {
		projectId: "memory-tool-test",
		memoryContainerTag: "claude_memory_test",
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
	})

	const testCases: Array<{
		name: string
		command: MemoryCommand
		expectSuccess: boolean
	}> = [
		{
			name: "Check empty memory directory",
			command: { command: "view", path: "/memories/" },
			expectSuccess: true,
		},
		{
			name: "Create a project notes file",
			command: {
				command: "create",
				path: "/memories/project-notes.md",
				file_text:
					"# Project Notes\\n\\n## Meeting Notes\\n- Discussed requirements\\n- Set timeline\\n- Assigned tasks\\n\\n## Technical Stack\\n- Frontend: React\\n- Backend: Node.js\\n- Database: PostgreSQL",
			},
			expectSuccess: true,
		},
		{
			name: "Create a todo list",
			command: {
				command: "create",
				path: "/memories/todo.txt",
				file_text:
					"TODO List:\\n1. Set up development environment\\n2. Create database schema\\n3. Build authentication system\\n4. Implement user dashboard\\n5. Write documentation",
			},
			expectSuccess: true,
		},
		{
			name: "List directory contents (should show 2 files)",
			command: { command: "view", path: "/memories/" },
			expectSuccess: true,
		},
		{
			name: "Read project notes with line numbers",
			command: { command: "view", path: "/memories/project-notes.md" },
			expectSuccess: true,
		},
		{
			name: "Read specific lines from todo list",
			command: {
				command: "view",
				path: "/memories/todo.txt",
				view_range: [1, 3],
			},
			expectSuccess: true,
		},
		{
			name: "Replace text in project notes",
			command: {
				command: "str_replace",
				path: "/memories/project-notes.md",
				old_str: "Node.js",
				new_str: "Express.js",
			},
			expectSuccess: true,
		},
		{
			name: "Insert new item in todo list at line 3",
			command: {
				command: "insert",
				path: "/memories/todo.txt",
				insert_line: 3,
				insert_text: "2.5. Design database relationships",
			},
			expectSuccess: true,
		},
		{
			name: "Read updated todo list",
			command: { command: "view", path: "/memories/todo.txt" },
			expectSuccess: true,
		},
		{
			name: "Create a personal notes file",
			command: {
				command: "create",
				path: "/memories/personal/preferences.md",
				file_text:
					"# My Preferences\\n\\n- Prefers React over Vue\\n- Uses TypeScript for type safety\\n- Likes clean, readable code\\n- Prefers functional programming style",
			},
			expectSuccess: true,
		},
		{
			name: "List root directory (should show files and personal/ subdirectory)",
			command: { command: "view", path: "/memories/" },
			expectSuccess: true,
		},
		{
			name: "Rename project notes",
			command: {
				command: "rename",
				path: "/memories/project-notes.md",
				new_path: "/memories/project-meeting-notes.md",
			},
			expectSuccess: true,
		},
		{
			name: "List directory after rename",
			command: { command: "view", path: "/memories/" },
			expectSuccess: true,
		},
		{
			name: "Test invalid path (should fail)",
			command: { command: "view", path: "/etc/passwd" },
			expectSuccess: false,
		},
		{
			name: "Test file not found (should fail)",
			command: { command: "view", path: "/memories/nonexistent.txt" },
			expectSuccess: false,
		},
	]

	let passed = 0
	let failed = 0

	for (let i = 0; i < testCases.length; i++) {
		const testCase = testCases[i]
		console.log(`\\n🔄 Test ${i + 1}/${testCases.length}: ${testCase.name}`)

		try {
			const result = await memoryTool.handleCommand(testCase.command)

			if (result.success === testCase.expectSuccess) {
				console.log("✅ PASS")
				if (result.content && result.content.length < 500) {
					console.log("📄 Result:")
					console.log(result.content)
				} else if (result.content) {
					console.log(
						`📄 Result: ${result.content.substring(0, 100)}... (truncated)`,
					)
				}
				passed++
			} else {
				console.log("❌ FAIL")
				console.log(
					`Expected success: ${testCase.expectSuccess}, got: ${result.success}`,
				)
				if (result.error) {
					console.log(`Error: ${result.error}`)
				}
				failed++
			}
		} catch (error) {
			console.log("💥 ERROR")
			console.log(`Exception: ${error}`)
			failed++
		}

		// Add a small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 500))
	}

	console.log("\\n📊 Test Results:")
	console.log(`✅ Passed: ${passed}`)
	console.log(`❌ Failed: ${failed}`)
	console.log(
		`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`,
	)

	if (failed === 0) {
		console.log(
			"\\n🎉 All tests passed! Claude Memory Tool is working perfectly!",
		)
	} else {
		console.log(`\\n⚠️  ${failed} test(s) failed. Check the errors above.`)
	}
}

// Run the tests
testMemoryTool().catch(console.error)
