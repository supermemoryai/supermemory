import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the v5 SDK so document-backed file operations run without network access.
const sdk = vi.hoisted(() => {
	class NotFoundError extends Error {
		statusCode = 404
	}
	return {
		NotFoundError,
		// An empty store unless a test lists files.
		list: vi.fn(
			async (): Promise<unknown> => ({
				documents: [],
				pagination: { currentPage: 1, totalItems: 0, totalPages: 0 },
			}),
		),
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

import { ClaudeMemoryTool, type MemoryCommand } from "./claude-memory"

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

describe("ClaudeMemoryTool insert line semantics", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		documentsGetMock.mockReset()
		updateMock.mockReset().mockResolvedValue({ id: "doc", status: "queued" })
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
		const stored = updateMock.mock.calls[0]?.[2]?.content as string
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
		const stored = updateMock.mock.calls[0]?.[2]?.content as string
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
		const stored = updateMock.mock.calls[0]?.[2]?.content as string
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
		expect(updateMock).not.toHaveBeenCalled()
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
		documentsGetMock.mockReset()
		mockDocument(FILE_CONTENT)
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it.each([
		"/memories/..",
		"/memories/foo/..",
		"/memories/../secrets.txt",
	])("rejects parent-directory path %s", async (path) => {
		const result = await tool.handleCommand({
			command: "view",
			path,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("Invalid path")
		expect(documentsGetMock).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool path IDs", () => {
	let tool: ClaudeMemoryTool

	beforeEach(() => {
		documentsGetMock.mockReset()
		updateMock.mockReset().mockResolvedValue({ id: "doc", status: "queued" })
		mockDocuments([])
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it("gives paths that used to collide distinct IDs", async () => {
		const paths = [
			"/memories/notes.txt",
			"/memories/notes_txt",
			"/memories/notes/txt",
		]
		for (const path of paths) {
			await tool.handleCommand({ command: "create", path, file_text: "x" })
		}

		const ids = updateMock.mock.calls.map((call) => call[1])
		expect(new Set(ids).size).toBe(paths.length)
	})

	it("reads and overwrites a file stored under its legacy ID", async () => {
		mockDocuments([
			{ id: "memories_notes_txt", filePath: FILE_PATH, content: "legacy" },
		])

		const view = await tool.handleCommand({ command: "view", path: FILE_PATH })
		expect(view.success).toBe(true)
		expect(view.content).toContain("legacy")

		await tool.handleCommand({
			command: "create",
			path: FILE_PATH,
			file_text: "fresh",
		})
		expect(updateMock).toHaveBeenCalledWith(
			expect.anything(),
			"memories_notes_txt",
			expect.objectContaining({ content: "fresh" }),
		)
	})

	it("overwrites a legacy file whose content is still processing", async () => {
		mockDocuments([
			{
				id: "memories_notes_txt",
				filePath: FILE_PATH,
				content: null as unknown as string,
			},
		])

		await tool.handleCommand({
			command: "create",
			path: FILE_PATH,
			file_text: "fresh",
		})
		expect(updateMock).toHaveBeenCalledWith(
			expect.anything(),
			"memories_notes_txt",
			expect.objectContaining({ content: "fresh" }),
		)
	})

	it("never writes /memories/a into the legacy ID of /memories/s/a", async () => {
		mockDocuments([
			{ id: "memories_s_a", filePath: "/memories/s/a", content: "legacy" },
		])

		const result = await tool.handleCommand({
			command: "create",
			path: "/memories/a",
			file_text: "new",
		})

		expect(result.success).toBe(true)
		expect(updateMock).toHaveBeenCalledTimes(1)
		expect(updateMock.mock.calls[0]?.[1]).toBe("cm_memories_s_a")
	})

	it("refuses to overwrite a foreign document holding the file's ID", async () => {
		mockDocuments([
			{ id: "cm_memories_s_a", filePath: "/memories/other", content: "x" },
		])

		const result = await tool.handleCommand({
			command: "create",
			path: "/memories/a",
			file_text: "new",
		})

		expect(result.success).toBe(false)
		expect(updateMock).not.toHaveBeenCalled()
	})

	it("renames onto a legacy destination in place", async () => {
		mockDocuments([
			{
				id: "cm_memories_s_src_d_txt",
				filePath: "/memories/src.txt",
				content: "moved",
			},
			{
				id: "memories_dst_txt",
				filePath: "/memories/dst.txt",
				content: "stale",
			},
		])
		sdk.delete.mockResolvedValue({ count: 1 })

		const result = await tool.handleCommand({
			command: "rename",
			old_path: "/memories/src.txt",
			new_path: "/memories/dst.txt",
		})

		expect(result.success).toBe(true)
		expect(updateMock).toHaveBeenCalledWith(
			expect.anything(),
			"memories_dst_txt",
			expect.objectContaining({ content: "moved" }),
		)
		expect(sdk.delete).toHaveBeenCalledWith(expect.anything(), {
			ids: ["cm_memories_s_src_d_txt"],
		})
	})

	it("does not write when the lookup fails with a non-404 error", async () => {
		documentsGetMock.mockRejectedValue(
			Object.assign(new Error("upstream down"), { status: 500 }),
		)

		const result = await tool.handleCommand({
			command: "create",
			path: FILE_PATH,
			file_text: "fresh",
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("upstream down")
		expect(updateMock).not.toHaveBeenCalled()
		expect(sdk.add).not.toHaveBeenCalled()
	})

	it("keeps path required for every command except rename", () => {
		// @ts-expect-error view needs a path
		const view: MemoryCommand = { command: "view" }
		const rename: MemoryCommand = {
			command: "rename",
			old_path: "/memories/a",
			new_path: "/memories/b",
		}
		expect([view, rename]).toHaveLength(2)
	})

	it("ignores a legacy ID that belongs to a different path", async () => {
		mockDocuments([
			{ id: "memories_notes_txt", filePath: FILE_PATH, content: "other" },
		])

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories/notes_txt",
		})
		expect(result.success).toBe(false)
	})
})

describe("ClaudeMemoryTool directory paths", () => {
	let tool: ClaudeMemoryTool

	// The real API applies the `contains` filter; returning every file here
	// also exercises the client-side prefix check.
	function mockListedFiles(pages: { id: string; filePath: string }[][]): void {
		sdk.list.mockReset()
		pages.forEach((files, index) => {
			sdk.list.mockResolvedValueOnce({
				documents: files.map((file) => ({
					id: file.id,
					metadata: {
						source: "claude-memory",
						claude_memory_type: "file",
						file_path: file.filePath,
					},
				})),
				pagination: {
					currentPage: index + 1,
					totalItems: pages.flat().length,
					totalPages: pages.length,
				},
			})
		})
	}

	const PROJECT_FILES = [
		{ id: "cm_a", filePath: "/memories/projects/a.txt" },
		{ id: "cm_b", filePath: "/memories/projects/nested/b.txt" },
		// Shares the "projects" prefix but is not inside the directory.
		{ id: "cm_c", filePath: "/memories/projectsX/c.txt" },
	]

	beforeEach(() => {
		documentsGetMock.mockReset()
		updateMock.mockReset()
		sdk.list.mockReset()
		sdk.delete.mockReset()
		sdk.add.mockReset()
		mockDocuments([])
		tool = new ClaudeMemoryTool("test-api-key")
	})

	it("view lists a directory given without a trailing slash", async () => {
		mockListedFiles([PROJECT_FILES])

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories/projects",
		})

		expect(result).toEqual({
			success: true,
			content: "Directory: /memories/projects/\n- nested/\n- a.txt",
		})
	})

	it("view of an empty memory root returns only the public response fields", async () => {
		const result = await tool.handleCommand({
			command: "view",
			path: "/memories",
		})

		expect(result).toEqual({
			success: true,
			content: "Directory: /memories/\n(empty)",
		})
	})

	it("view still reports a path that is neither a file nor a directory", async () => {
		mockListedFiles([[]])

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories/missing",
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe("File not found: /memories/missing")
	})

	it("view prefers a file over a directory at the same path", async () => {
		mockDocuments([
			{
				id: "cm_memories_s_projects",
				filePath: "/memories/projects",
				content: "a file",
			},
		])
		mockListedFiles([PROJECT_FILES])

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories/projects",
		})

		expect(result.success).toBe(true)
		expect(result.content).toContain("a file")
		expect(sdk.list).not.toHaveBeenCalled()
	})

	it("view does not fall back to a listing when the file lookup fails", async () => {
		documentsGetMock.mockRejectedValue(
			Object.assign(new Error("upstream down"), { status: 500 }),
		)

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories/projects",
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("upstream down")
		expect(sdk.list).not.toHaveBeenCalled()
	})

	it.each([
		"/memories/projects",
		"/memories/projects/",
	])("delete %s removes every file in the directory and nothing outside it", async (path) => {
		mockListedFiles([PROJECT_FILES])
		sdk.delete.mockResolvedValue({ count: 2, errors: [] })

		const result = await tool.handleCommand({ command: "delete", path })

		expect(result).toEqual({
			success: true,
			content: "Directory deleted: /memories/projects/ (2 files)",
		})
		expect(sdk.delete).toHaveBeenCalledTimes(1)
		expect(sdk.delete).toHaveBeenCalledWith(expect.anything(), {
			ids: ["cm_a", "cm_b"],
		})
	})

	it("delete lists every page before deleting, then deletes in chunks", async () => {
		const files = Array.from({ length: 150 }, (_, index) => ({
			id: `cm_${index}`,
			filePath: `/memories/bulk/${index}.txt`,
		}))
		mockListedFiles([files.slice(0, 100), files.slice(100)])
		sdk.delete.mockImplementation(async (_namespace, { ids }) => ({
			count: ids.length,
			errors: [],
		}))

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/bulk",
		})

		expect(result.success).toBe(true)
		expect(sdk.list).toHaveBeenCalledTimes(2)
		expect(
			sdk.delete.mock.calls.map(([, request]) => request.ids.length),
		).toEqual([100, 50])
		// Deleting while paging would shift later pages and skip files.
		const lastList = Math.max(...sdk.list.mock.invocationCallOrder)
		expect(Math.min(...sdk.delete.mock.invocationCallOrder)).toBeGreaterThan(
			lastList,
		)
	})

	it("delete reports the files a directory delete could not remove", async () => {
		mockListedFiles([PROJECT_FILES])
		sdk.delete.mockResolvedValue({
			count: 1,
			errors: [{ id: "cm_b", error: "Document is still processing" }],
		})

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/projects",
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe(
			"Deleted 1 of 2 files in /memories/projects/. Not deleted: /memories/projects/nested/b.txt (Document is still processing)",
		)
	})

	it("delete says how many files went before a batch failed", async () => {
		const files = Array.from({ length: 150 }, (_, index) => ({
			id: `cm_${index}`,
			filePath: `/memories/bulk/${index}.txt`,
		}))
		mockListedFiles([files.slice(0, 100), files.slice(100)])
		sdk.delete
			.mockResolvedValueOnce({ count: 100, errors: [] })
			.mockRejectedValueOnce(new Error("upstream down"))

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/bulk",
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe(
			"Deleted 100 of 150 files in /memories/bulk/ before failing: upstream down",
		)
	})

	it.each([
		"/memories",
		"/memories/",
	])("delete refuses the memory root %s", async (path) => {
		const result = await tool.handleCommand({ command: "delete", path })

		expect(result.success).toBe(false)
		expect(result.error).toBe("Cannot delete the /memories directory")
		expect(sdk.list).not.toHaveBeenCalled()
		expect(sdk.delete).not.toHaveBeenCalled()
	})

	it("delete of a path that is neither a file nor a directory deletes nothing", async () => {
		mockListedFiles([[]])

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/missing",
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe("File not found: /memories/missing")
		expect(sdk.delete).not.toHaveBeenCalled()
	})

	it("delete removes only the file when a file and directory share a path", async () => {
		mockDocuments([
			{
				id: "cm_memories_s_projects",
				filePath: "/memories/projects",
				content: "a file",
			},
		])
		mockListedFiles([PROJECT_FILES])
		sdk.delete.mockResolvedValue({ count: 1, errors: [] })

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/projects",
		})

		expect(result.success).toBe(true)
		expect(sdk.delete).toHaveBeenCalledWith(expect.anything(), {
			ids: ["cm_memories_s_projects"],
		})
		expect(sdk.list).not.toHaveBeenCalled()
	})

	it("delete does nothing when the file lookup fails", async () => {
		documentsGetMock.mockRejectedValue(
			Object.assign(new Error("upstream down"), { status: 500 }),
		)

		const result = await tool.handleCommand({
			command: "delete",
			path: "/memories/projects",
		})

		expect(result.success).toBe(false)
		expect(sdk.list).not.toHaveBeenCalled()
		expect(sdk.delete).not.toHaveBeenCalled()
	})
})
