import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the v5 SDK so document-backed file operations run without network access.
const sdk = vi.hoisted(() => {
	class NotFoundError extends Error {
		statusCode = 404
	}
	return {
		NotFoundError,
		list: vi.fn(),
		get: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		add: vi.fn(),
	}
})
const documentsGetMock = sdk.get
const updateMock = sdk.update

vi.mock("supermemory", () => {
	class Supermemory {
		add = sdk.add
		list = sdk.list
		documents = { get: sdk.get, update: sdk.update, delete: sdk.delete }
	}
	return { default: Supermemory, Supermemory, NotFoundError: sdk.NotFoundError }
})

import { ClaudeMemoryTool } from "./claude-memory"

const FILE_PATH = "/memories/notes.txt"
// 5 distinct lines so an off-by-one at either end is observable.
const FILE_CONTENT = "line1\nline2\nline3\nline4\nline5"
const FILE_DOCUMENT = {
	id: "memories_notes_txt",
	filePath: FILE_PATH,
	content: FILE_CONTENT,
}
const NEIGHBOUR_DOCUMENT = {
	id: "memories_notes_backup_txt",
	filePath: "/memories/notes.backup.txt",
	content: "backup stuff",
}

// v5 resolves caller-defined IDs inside the namespace.
function mockDocuments(documents: (typeof FILE_DOCUMENT)[]) {
	documentsGetMock.mockImplementation(
		async (_namespace: string, id: string) => {
			const document = documents.find((candidate) => candidate.id === id)
			if (!document) throw new sdk.NotFoundError(`Document not found: ${id}`)
			return {
				id: document.id,
				metadata: {
					source: "claude-memory",
					claude_memory_type: "file",
					file_path: document.filePath,
				},
				content: document.content,
				system: { status: "done" },
			}
		},
	)
}

function mockDocument(content: string) {
	mockDocuments([{ ...FILE_DOCUMENT, content }])
}

describe("ClaudeMemoryTool view_range", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		documentsGetMock.mockReset()
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
		documentsGetMock.mockReset()
		updateMock.mockReset().mockResolvedValue({ id: "doc", status: "queued" })
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it("view finds the exact file even when a neighbour is listed first", async () => {
		mockDocuments([NEIGHBOUR_DOCUMENT, FILE_DOCUMENT])

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("line1")
		expect(result.content).not.toContain("backup stuff")
	})

	it("view reports not-found instead of returning a different file", async () => {
		// The document list can contain a similarly-named file; that must not
		// be served as the requested one.
		mockDocuments([NEIGHBOUR_DOCUMENT])

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("File not found")
	})

	it("str_replace refuses to modify a different file than requested", async () => {
		mockDocuments([NEIGHBOUR_DOCUMENT])

		const result = await tool.handleCommand({
			command: "str_replace",
			path: FILE_PATH,
			old_str: "backup",
			new_str: "primary",
		})

		expect(result.success).toBe(false)
		expect(updateMock).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool path collisions", () => {
	it("does not serve a file whose path only normalizes to the same ID", async () => {
		documentsGetMock.mockReset()
		mockDocuments([{ ...FILE_DOCUMENT, filePath: "/memories/notes_txt" }])
		const tool = new ClaudeMemoryTool("test-api-key")

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("File not found")
	})
})

describe("ClaudeMemoryTool str_replace replacement literalness", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		documentsGetMock.mockReset()
		updateMock.mockReset().mockResolvedValue({ id: "doc", status: "queued" })
		mockDocument(FILE_CONTENT)
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
		expect(updateMock).toHaveBeenCalledTimes(1)
		const stored = updateMock.mock.calls[0]?.[2]?.content as string
		expect(stored).toContain(`price is ${dollarSequence} today`)
	})
})

describe("ClaudeMemoryTool path traversal", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		documentsListMock.mockReset()
		documentsGetMock.mockReset()
		addMock.mockReset()
		mockDocument(FILE_CONTENT)
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it.each(["/memories/..", "/memories/foo/..", "/memories/../secrets.txt"])(
		"rejects parent-directory path %s",
		async (path) => {
			const result = await tool.handleCommand({
				command: "view",
				path,
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("Invalid path")
			expect(documentsListMock).not.toHaveBeenCalled()
		},
	)
})
