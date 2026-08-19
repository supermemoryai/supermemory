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
	// normalizePathToCustomId("/memories/notes.txt") -> "memories_snotes_dtxt"
	searchExecute.mockResolvedValue({
		results: [{ documentId: "memories_snotes_dtxt", content }],
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
				{ documentId: "memories_snotes__backup_dtxt", content: "backup stuff" },
				{ documentId: "memories_snotes_dtxt", content: FILE_CONTENT },
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
				{ documentId: "memories_snotes__backup_dtxt", content: "backup stuff" },
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
				{ documentId: "memories_snotes__backup_dtxt", content: "backup stuff" },
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

describe("ClaudeMemoryTool str_replace replacement literalness", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		addMock.mockReset()
		searchExecute.mockResolvedValue({
			results: [{ documentId: "memories_snotes_dtxt", content: FILE_CONTENT }],
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

describe("ClaudeMemoryTool customId encoding", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		searchExecute.mockReset()
		addMock.mockReset()
		tool = new ClaudeMemoryTool("test-api-key")
	})

	async function customIdFor(path: string) {
		addMock.mockReset()
		const result = await tool.handleCommand({
			command: "create",
			path,
			file_text: "contents",
		})
		expect(result.success).toBe(true)
		return addMock.mock.calls[0]?.[0]?.customId as string
	}

	it("gives paths that differ only in their separators distinct customIds", async () => {
		// All three collapsed to `memories_notes_txt` under the old encoding,
		// so creating one silently overwrote the others.
		const ids = [
			await customIdFor("/memories/notes.txt"),
			await customIdFor("/memories/notes_txt"),
			await customIdFor("/memories/notes/txt"),
			await customIdFor("/memories/project/a.md"),
			await customIdFor("/memories/project_a.md"),
		]

		expect(new Set(ids).size).toBe(ids.length)
	})

	it("still finds documents written under the legacy customId", async () => {
		searchExecute.mockResolvedValue({
			results: [
				{
					documentId: "memories_notes_txt",
					content: FILE_CONTENT,
					metadata: { file_path: FILE_PATH },
				},
			],
		})

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("line1")
	})

	it("does not serve a legacy document whose stored path differs", async () => {
		// `memories_notes_txt` is ambiguous: it could be /memories/notes.txt,
		// /memories/notes_txt or /memories/notes/txt. Only the stored path decides.
		searchExecute.mockResolvedValue({
			results: [
				{
					documentId: "memories_notes_txt",
					content: "someone else's file",
					metadata: { file_path: "/memories/notes/txt" },
				},
			],
		})

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("File not found")
	})
})
