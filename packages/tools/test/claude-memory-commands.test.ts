import { beforeEach, describe, expect, it, vi } from "vitest"

const { addMock, listMock, getMock, deleteBulkMock } = vi.hoisted(() => ({
	addMock: vi.fn(),
	listMock: vi.fn(),
	getMock: vi.fn(),
	deleteBulkMock: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class MockSupermemory {
		add = addMock
		memories = { forget: vi.fn() }
		documents = { list: listMock, get: getMock, deleteBulk: deleteBulkMock }
	},
}))

import { createClaudeMemoryTool } from "../src/claude-memory"

function stubFile(path: string, content: string) {
	const customId = createClaudeMemoryTool("k").normalizePathToCustomId(path)
	const metadata = { claude_memory_type: "file", file_path: path }
	listMock.mockResolvedValue({
		memories: [
			{
				id: "doc_src",
				customId,
				containerTags: ["claude_memory"],
				metadata,
			},
		],
		pagination: { totalPages: 1 },
	})
	getMock.mockResolvedValue({
		id: "doc_src",
		customId,
		containerTags: ["sm_project_default", "claude_memory"],
		metadata,
		content,
	})
}

describe("ClaudeMemoryTool rename", () => {
	let tool: ReturnType<typeof createClaudeMemoryTool>

	beforeEach(() => {
		vi.clearAllMocks()
		addMock.mockResolvedValue({ id: "doc_1" })
		deleteBulkMock.mockResolvedValue({ success: true, deletedCount: 1 })
		listMock.mockResolvedValue({ memories: [], pagination: { totalPages: 1 } })
		tool = createClaudeMemoryTool("test-api-key")
	})

	it("handles the old_path/new_path shape Claude actually sends", async () => {
		stubFile("/memories/draft.txt", "file body")

		const result = await tool.handleCommand({
			command: "rename",
			old_path: "/memories/draft.txt",
			new_path: "/memories/final.txt",
		})

		expect(result.success).toBe(true)
		expect(addMock).toHaveBeenCalledWith(
			expect.objectContaining({ content: "file body" }),
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
