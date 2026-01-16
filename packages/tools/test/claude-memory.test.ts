import { describe, it, expect, beforeEach } from "vitest"
import { createClaudeMemoryTool, type MemoryCommand } from "./claude-memory"
import "dotenv/config"

// Test configuration
const TEST_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "test-api-key",
	baseUrl: process.env.SUPERMEMORY_BASE_URL,
	projectId: "test-claude-memory",
	memoryContainerTag: "claude_memory_test",
}

describe("Claude Memory Tool", () => {
	let memoryTool: ReturnType<typeof createClaudeMemoryTool>

	beforeEach(() => {
		memoryTool = createClaudeMemoryTool(TEST_CONFIG.apiKey, {
			projectId: TEST_CONFIG.projectId,
			memoryContainerTag: TEST_CONFIG.memoryContainerTag,
			baseUrl: TEST_CONFIG.baseUrl,
		})
	})

	describe("Path validation", () => {
		it("should reject invalid paths", async () => {
			const invalidPaths = [
				"/etc/passwd",
				"/home/user/file.txt",
				"../../../secrets.txt",
				"/memories/../../../secrets.txt",
			]

			for (const path of invalidPaths) {
				const result = await memoryTool.handleCommand({
					command: "view",
					path,
				})
				expect(result.success).toBe(false)
				expect(result.error).toContain("Invalid path")
			}
		})

		it("should accept valid memory paths", async () => {
			const validPaths = [
				"/memories/",
				"/memories/notes.txt",
				"/memories/project/ideas.md",
				"/memories/deep/nested/path/file.txt",
			]

			// These should not fail due to path validation (though they might fail for other reasons like file not found)
			for (const path of validPaths) {
				const result = await memoryTool.handleCommand({
					command: "view",
					path,
				})
				// Should not fail with "Invalid path" error
				if (!result.success) {
					expect(result.error).not.toContain("Invalid path")
				}
			}
		})
	})

	describe("File operations", () => {
		const testFilePath = "/memories/test-file.txt"
		const testContent = "Hello, World!\nThis is a test file.\nLine 3 here."

		it("should create a file", async () => {
			const result = await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			expect(result.success).toBe(true)
			expect(result.content).toContain("File created")
		})

		it("should read a file", async () => {
			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			// Then read it
			const result = await memoryTool.handleCommand({
				command: "view",
				path: testFilePath,
			})

			expect(result.success).toBe(true)
			expect(result.content).toContain("Hello, World!")
			expect(result.content).toContain("This is a test file.")
			// Should include line numbers
			expect(result.content).toMatch(/\s*1\s+Hello, World!/)
		})

		it("should read file with line range", async () => {
			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			// Read only lines 1-2
			const result = await memoryTool.handleCommand({
				command: "view",
				path: testFilePath,
				view_range: [1, 2],
			})

			expect(result.success).toBe(true)
			expect(result.content).toContain("Hello, World!")
			expect(result.content).toContain("This is a test file.")
			expect(result.content).not.toContain("Line 3 here.")
		})

		it("should replace string in file", async () => {
			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			// Replace text
			const result = await memoryTool.handleCommand({
				command: "str_replace",
				path: testFilePath,
				old_str: "Hello, World!",
				new_str: "Greetings, Universe!",
			})

			expect(result.success).toBe(true)

			// Verify the change
			const readResult = await memoryTool.handleCommand({
				command: "view",
				path: testFilePath,
			})
			expect(readResult.content).toContain("Greetings, Universe!")
			expect(readResult.content).not.toContain("Hello, World!")
		})

		it("should insert text at specific line", async () => {
			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			// Insert text at line 2
			const result = await memoryTool.handleCommand({
				command: "insert",
				path: testFilePath,
				insert_line: 2,
				insert_text: "This is an inserted line.",
			})

			expect(result.success).toBe(true)

			// Verify the insertion
			const readResult = await memoryTool.handleCommand({
				command: "view",
				path: testFilePath,
			})
			expect(readResult.content).toContain("This is an inserted line.")
		})

		it("should rename/move file", async () => {
			const oldPath = "/memories/old-name.txt"
			const newPath = "/memories/new-name.txt"

			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: oldPath,
				file_text: testContent,
			})

			// Rename it
			const result = await memoryTool.handleCommand({
				command: "rename",
				path: oldPath,
				new_path: newPath,
			})

			expect(result.success).toBe(true)

			// Verify the file exists at new location
			const readResult = await memoryTool.handleCommand({
				command: "view",
				path: newPath,
			})
			expect(readResult.success).toBe(true)
			expect(readResult.content).toContain("Hello, World!")
		})

		it("should delete file", async () => {
			// First create the file
			await memoryTool.handleCommand({
				command: "create",
				path: testFilePath,
				file_text: testContent,
			})

			// Delete it
			const result = await memoryTool.handleCommand({
				command: "delete",
				path: testFilePath,
			})

			expect(result.success).toBe(true)
		})
	})

	describe("Directory operations", () => {
		it("should list empty directory", async () => {
			const result = await memoryTool.handleCommand({
				command: "view",
				path: "/memories/",
			})

			expect(result.success).toBe(true)
			expect(result.content).toContain("Directory: /memories/")
		})

		it("should list directory with files", async () => {
			// Create some test files
			await memoryTool.handleCommand({
				command: "create",
				path: "/memories/file1.txt",
				file_text: "Content 1",
			})

			await memoryTool.handleCommand({
				command: "create",
				path: "/memories/file2.md",
				file_text: "Content 2",
			})

			await memoryTool.handleCommand({
				command: "create",
				path: "/memories/subdir/file3.txt",
				file_text: "Content 3",
			})

			// List root directory
			const result = await memoryTool.handleCommand({
				command: "view",
				path: "/memories/",
			})

			expect(result.success).toBe(true)
			expect(result.content).toContain("file1.txt")
			expect(result.content).toContain("file2.md")
			expect(result.content).toContain("subdir/")
		})
	})

	describe("Error handling", () => {
		it("should handle missing file", async () => {
			const result = await memoryTool.handleCommand({
				command: "view",
				path: "/memories/nonexistent.txt",
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("File not found")
		})

		it("should handle missing parameters", async () => {
			const commands: MemoryCommand[] = [
				{ command: "create", path: "/memories/test.txt" }, // Missing file_text
				{ command: "str_replace", path: "/memories/test.txt", old_str: "old" }, // Missing new_str
				{ command: "insert", path: "/memories/test.txt", insert_line: 1 }, // Missing insert_text
				{ command: "rename", path: "/memories/test.txt" }, // Missing new_path
			]

			for (const cmd of commands) {
				const result = await memoryTool.handleCommand(cmd)
				expect(result.success).toBe(false)
				expect(result.error).toContain("required")
			}
		})

		it("should handle string not found in str_replace", async () => {
			// Create a file
			await memoryTool.handleCommand({
				command: "create",
				path: "/memories/test.txt",
				file_text: "Some content here",
			})

			// Try to replace non-existent string
			const result = await memoryTool.handleCommand({
				command: "str_replace",
				path: "/memories/test.txt",
				old_str: "This string does not exist",
				new_str: "replacement",
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("String not found")
		})

		it("should handle invalid line number for insert", async () => {
			// Create a 3-line file
			await memoryTool.handleCommand({
				command: "create",
				path: "/memories/test.txt",
				file_text: "Line 1\nLine 2\nLine 3",
			})

			// Try to insert at invalid line number
			const result = await memoryTool.handleCommand({
				command: "insert",
				path: "/memories/test.txt",
				insert_line: 10, // Way beyond file length
				insert_text: "New line",
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("Invalid line number")
		})
	})
})

/**
 * Manual test runner - run this directly to test the memory tool
 * Usage: bun run src/claude-memory.test.ts
 */
async function runManualTests() {
	console.log("🧪 Running Claude Memory Tool Manual Tests")
	console.log("==========================================")

	if (!process.env.SUPERMEMORY_API_KEY) {
		console.error("❌ SUPERMEMORY_API_KEY environment variable is required")
		console.log("Set your API key in .env file or environment variable")
		process.exit(1)
	}

	const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY, {
		projectId: "manual-test-project",
		memoryContainerTag: "claude_memory_manual_test",
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
	})

	const testCases = [
		{
			name: "Create a test file",
			command: {
				command: "create" as const,
				path: "/memories/manual-test.md",
				file_text:
					"# Manual Test File\n\nThis is a test file for manual testing.\n\n- Item 1\n- Item 2\n- Item 3",
			},
		},
		{
			name: "Read the test file",
			command: {
				command: "view" as const,
				path: "/memories/manual-test.md",
			},
		},
		{
			name: "Read specific lines",
			command: {
				command: "view" as const,
				path: "/memories/manual-test.md",
				view_range: [1, 3] as [number, number],
			},
		},
		{
			name: "Replace text in file",
			command: {
				command: "str_replace" as const,
				path: "/memories/manual-test.md",
				old_str: "Manual Test File",
				new_str: "Updated Manual Test File",
			},
		},
		{
			name: "Insert text at line 4",
			command: {
				command: "insert" as const,
				path: "/memories/manual-test.md",
				insert_line: 4,
				insert_text: "This line was inserted!",
			},
		},
		{
			name: "List directory contents",
			command: {
				command: "view" as const,
				path: "/memories/",
			},
		},
		{
			name: "Rename the file",
			command: {
				command: "rename" as const,
				path: "/memories/manual-test.md",
				new_path: "/memories/renamed-manual-test.md",
			},
		},
		{
			name: "Test invalid path (should fail)",
			command: {
				command: "view" as const,
				path: "/etc/passwd",
			},
		},
	]

	for (const testCase of testCases) {
		console.log(`\n🔄 ${testCase.name}`)
		console.log(`Command: ${JSON.stringify(testCase.command, null, 2)}`)

		try {
			const result = await memoryTool.handleCommand(testCase.command)

			if (result.success) {
				console.log("✅ Success")
				if (result.content) {
					console.log("📄 Content:")
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

	console.log("\n✨ Manual tests completed!")
	console.log(
		"Check your supermemory instance to verify the memory files were created correctly.",
	)
}

// If this file is run directly, execute manual tests
if (import.meta.main) {
	runManualTests()
}
