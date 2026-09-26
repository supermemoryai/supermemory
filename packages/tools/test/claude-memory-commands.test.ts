import { beforeEach, describe, expect, it, vi } from "vitest"

// Unit tests for the command handling in ClaudeMemoryTool, with the
// supermemory client mocked out so they run without an API key. They pin the
// wire format documented at
// https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
// (rename uses old_path/new_path, insert_line means "insert after this line"
// with 0 = top of file, str_replace without new_str deletes old_str).

const { addMock, deleteMock, executeMock } = vi.hoisted(() => ({
	addMock: vi.fn(),
	deleteMock: vi.fn(),
	executeMock: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class MockSupermemory {
		add = addMock
		search = { execute: executeMock }
		documents = { delete: deleteMock }
	},
}))

import { createClaudeMemoryTool } from "../src/claude-memory"

// Matches ClaudeMemoryTool's normalizePathToCustomId
function customIdFor(path: string): string {
	return path.replace(/^\//, "").replace(/\//g, "_").replace(/\./g, "_")
}

function stubFile(path: string, content: string) {
	executeMock.mockResolvedValue({
		results: [
			{
				documentId: customIdFor(path),
				raw: content,
				metadata: { file_path: path },
			},
		],
	})
}

describe("ClaudeMemoryTool command handling", () => {
	let tool: ReturnType<typeof createClaudeMemoryTool>

	beforeEach(() => {
		vi.clearAllMocks()
		addMock.mockResolvedValue({ id: "doc_1" })
		deleteMock.mockResolvedValue({})
		executeMock.mockResolvedValue({ results: [] })
		tool = createClaudeMemoryTool("test-api-key")
	})

	describe("rename", () => {
		it("handles the old_path/new_path shape Claude actually sends", async () => {
			stubFile("/memories/draft.txt", "file body")

			const result = await tool.handleCommand({
				command: "rename",
				old_path: "/memories/draft.txt",
				new_path: "/memories/final.txt",
			})

			expect(result.success).toBe(true)
			expect(addMock).toHaveBeenCalledWith(
				expect.objectContaining({
					customId: customIdFor("/memories/final.txt"),
					content: "file body",
				}),
			)
			expect(deleteMock).toHaveBeenCalledWith(
				customIdFor("/memories/draft.txt"),
			)
		})

		it("still accepts path as the source for older callers", async () => {
			stubFile("/memories/draft.txt", "file body")

			const result = await tool.handleCommand({
				command: "rename",
				path: "/memories/draft.txt",
				new_path: "/memories/final.txt",
			})

			expect(result.success).toBe(true)
		})

		it("validates old_path like any other path", async () => {
			const result = await tool.handleCommand({
				command: "rename",
				old_path: "/etc/passwd",
				new_path: "/memories/final.txt",
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("Invalid path")
		})
	})

	describe("insert", () => {
		const path = "/memories/notes.txt"

		async function insertAt(line: number, text: string) {
			stubFile(path, "one\ntwo\nthree")
			return await tool.handleCommand({
				command: "insert",
				path,
				insert_line: line,
				insert_text: text,
			})
		}

		function savedContent(): string {
			return addMock.mock.calls[0]?.[0]?.content
		}

		it("inserts at the top of the file for insert_line 0", async () => {
			const result = await insertAt(0, "zero")

			expect(result.success).toBe(true)
			expect(savedContent()).toBe("zero\none\ntwo\nthree")
		})

		it("inserts after the given line, not before it", async () => {
			const result = await insertAt(2, "new")

			expect(result.success).toBe(true)
			expect(savedContent()).toBe("one\ntwo\nnew\nthree")
		})

		it("appends when insert_line equals the line count", async () => {
			const result = await insertAt(3, "four")

			expect(result.success).toBe(true)
			expect(savedContent()).toBe("one\ntwo\nthree\nfour")
		})

		it("rejects insert_line past the end of the file", async () => {
			const result = await insertAt(4, "too far")

			expect(result.success).toBe(false)
			expect(result.error).toContain("Invalid line number")
		})
	})

	describe("str_replace", () => {
		it("deletes old_str when new_str is omitted", async () => {
			stubFile("/memories/prefs.txt", "keep this remove this")

			const result = await tool.handleCommand({
				command: "str_replace",
				path: "/memories/prefs.txt",
				old_str: " remove this",
			})

			expect(result.success).toBe(true)
			expect(addMock).toHaveBeenCalledWith(
				expect.objectContaining({ content: "keep this" }),
			)
		})
	})
})
