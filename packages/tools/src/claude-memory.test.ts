import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK so the Claude memory tool's `view`/`readFile` path
// can be exercised deterministically without any network access. We only need
// `search.execute` to return a single document with known multi-line content.
const searchExecute = vi.fn()
const addMock = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			search = { execute: searchExecute }
			add = addMock
			memories = { forget: vi.fn() }
		},
	}
})

import { ClaudeMemoryTool } from "./claude-memory"

const FILE_PATH = "/memories/notes.txt"
// 5 distinct lines so an off-by-one at either end is observable.
const FILE_CONTENT = "line1\nline2\nline3\nline4\nline5"

function mockDocument(content: string) {
	// `readFile` matches by `documentId === normalizePathToCustomId(path)`.
	// normalizePathToCustomId("/memories/notes.txt") -> "memories_notes_txt"
	searchExecute.mockResolvedValue({
		results: [{ documentId: "memories_notes_txt", content }],
	})
}

describe("ClaudeMemoryTool view_range", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		mockDocument(FILE_CONTENT)
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it("returns the final line when end is the -1 'to end of file' sentinel", async () => {
		// Anthropic's text-editor / memory tool convention: an end of -1 means
		// "read to the end of the file". The whole file must come back.
		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
			view_range: [1, -1],
		})

		expect(result.success).toBe(true)
		// Regression guard: the last line must not be dropped.
		expect(result.content).toContain("line5")
		// And every line should be present, in order.
		for (const line of ["line1", "line2", "line3", "line4", "line5"]) {
			expect(result.content).toContain(line)
		}
	})

	it("reads from a start line to the end when end is -1", async () => {
		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
			view_range: [3, -1],
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("line3")
		expect(result.content).toContain("line5")
		expect(result.content).not.toContain("line2")
	})

	it("still honors explicit positive ranges", async () => {
		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
			view_range: [2, 4],
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("line2")
		expect(result.content).toContain("line4")
		expect(result.content).not.toContain("line1")
		expect(result.content).not.toContain("line5")
	})
})

describe("ClaudeMemoryTool exact-file matching", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		addMock.mockReset()
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it("view finds the exact file even when a neighbour ranks first", async () => {
		searchExecute.mockResolvedValue({
			results: [
				{ documentId: "memories_notes_backup_txt", content: "backup stuff" },
				{ documentId: "memories_notes_txt", content: FILE_CONTENT },
			],
		})

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("line1")
		expect(result.content).not.toContain("backup stuff")
	})

	it("view reports not-found instead of returning a different file", async () => {
		// Semantic search can surface a similarly-named file; that must not
		// be served as the requested one.
		searchExecute.mockResolvedValue({
			results: [
				{ documentId: "memories_notes_backup_txt", content: "backup stuff" },
			],
		})

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("File not found")
	})

	it("str_replace refuses to modify a different file than requested", async () => {
		searchExecute.mockResolvedValue({
			results: [
				{ documentId: "memories_notes_backup_txt", content: "backup stuff" },
			],
		})

		const result = await tool.handleCommand({
			command: "str_replace",
			path: FILE_PATH,
			old_str: "backup",
			new_str: "primary",
		})

		expect(result.success).toBe(false)
		expect(addMock).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool insert line semantics", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		addMock.mockReset()
		mockDocument(FILE_CONTENT)
		tool = new ClaudeMemoryTool("test-api-key")
	})

	// The memory_20250818 spec: insert_text is inserted AFTER line insert_line,
	// 0 inserts at the beginning of the file, and the valid range is [0, n_lines].

	it("insert_line: 0 inserts at the beginning of the file", async () => {
		const result = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: 0,
			insert_text: "header",
		})

		expect(result.success).toBe(true)
		const stored = addMock.mock.calls[0]?.[0]?.content as string
		expect(stored).toBe("header\nline1\nline2\nline3\nline4\nline5")
	})

	it("inserts AFTER the given line, not before it", async () => {
		const result = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: 2,
			insert_text: "after2",
		})

		expect(result.success).toBe(true)
		const stored = addMock.mock.calls[0]?.[0]?.content as string
		// Regression guard: the old 1-based insert-BEFORE landed this one line early.
		expect(stored).toBe("line1\nline2\nafter2\nline3\nline4\nline5")
	})

	it("insert_line: n_lines appends at the end of the file", async () => {
		const result = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: 5,
			insert_text: "tail",
		})

		expect(result.success).toBe(true)
		const stored = addMock.mock.calls[0]?.[0]?.content as string
		expect(stored).toBe("line1\nline2\nline3\nline4\nline5\ntail")
	})

	it("rejects insert_line outside [0, n_lines] without writing", async () => {
		const below = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: -1,
			insert_text: "x",
		})
		expect(below.success).toBe(false)
		expect(below.error).toContain("[0, 5]")

		const above = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: 6,
			insert_text: "x",
		})
		expect(above.success).toBe(false)
		expect(addMock).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool str_replace replacement literalness", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		addMock.mockReset()
		searchExecute.mockResolvedValue({
			results: [{ documentId: "memories_notes_txt", content: FILE_CONTENT }],
		})
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it.each([
		"$&",
		"$'",
		"$`",
		"$$",
	])("stores %s literally instead of expanding it as a replacement pattern", async (dollarSequence) => {
		const result = await tool.handleCommand({
			command: "str_replace",
			path: FILE_PATH,
			old_str: "line3",
			new_str: `price is ${dollarSequence} today`,
		})

		expect(result.success).toBe(true)
		expect(addMock).toHaveBeenCalledTimes(1)
		const stored = addMock.mock.calls[0]?.[0]?.content as string
		expect(stored).toContain(`price is ${dollarSequence} today`)
		expect(stored).not.toContain("line3")
	})
})
