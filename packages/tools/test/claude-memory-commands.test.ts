import { beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => {
	class NotFoundError extends Error {
		statusCode = 404
	}
	return {
		NotFoundError,
		get: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		add: vi.fn(),
	}
})

vi.mock("supermemory", () => {
	class Supermemory {
		add = sdk.add
		list = vi.fn()
		documents = { get: sdk.get, update: sdk.update, delete: sdk.delete }
	}
	return { default: Supermemory, Supermemory, NotFoundError: sdk.NotFoundError }
})

import { createClaudeMemoryTool } from "../src/claude-memory"

function stubFile(path: string, content: string) {
	const fileId = `cm_${path.slice(1).replace(/_/g, "__").replace(/\//g, "_s_").replace(/\./g, "_d_")}`
	sdk.get.mockImplementation(async (_ns: string, id: string) => {
		if (id !== fileId) throw new sdk.NotFoundError("missing")
		return {
			id: "doc_src",
			metadata: {
				source: "claude-memory",
				claude_memory_type: "file",
				file_path: path,
			},
			content,
		}
	})
}

describe("ClaudeMemoryTool rename", () => {
	let tool: ReturnType<typeof createClaudeMemoryTool>

	beforeEach(() => {
		vi.clearAllMocks()
		sdk.update.mockResolvedValue({ id: "doc", status: "queued" })
		sdk.delete.mockResolvedValue({ count: 1 })
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
		expect(sdk.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(String),
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
