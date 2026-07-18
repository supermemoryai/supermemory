import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the v5 SDK so tool executions are verified without network access.
const sdk = vi.hoisted(() => {
	class NotFoundError extends Error {
		statusCode = 404
	}
	return {
		NotFoundError,
		add: vi.fn(),
		search: vi.fn(),
		profile: vi.fn(),
		list: vi.fn(),
		documentsGet: vi.fn(),
		documentsUpdate: vi.fn(),
		documentsDelete: vi.fn(),
		forget: vi.fn(),
		forgetMatching: vi.fn(),
		clientOptions: [] as unknown[],
	}
})

vi.mock("supermemory", () => {
	class Supermemory {
		constructor(options: unknown) {
			sdk.clientOptions.push(options)
		}
		add = sdk.add
		search = sdk.search
		profile = sdk.profile
		list = sdk.list
		documents = {
			get: sdk.documentsGet,
			update: sdk.documentsUpdate,
			delete: sdk.documentsDelete,
		}
		memories = { forget: sdk.forget, forgetMatching: sdk.forgetMatching }
	}
	return {
		default: Supermemory,
		Supermemory,
		NotFoundError: sdk.NotFoundError,
		SupermemoryError: Error,
	}
})

import * as aiSdk from "./ai-sdk"
import { ClaudeMemoryTool } from "./claude-memory"
import * as openAi from "./openai/tools"

const API_KEY = "sm_test_key"
const DEFAULT_NS = "sm_project_default"

type ToolWithExecute = { execute: (args: Record<string, unknown>) => unknown }

function executeTool(tool: unknown, args: Record<string, unknown>) {
	return (tool as ToolWithExecute).execute(args)
}

beforeEach(() => {
	sdk.add.mockReset().mockResolvedValue({ id: "doc_new", status: "queued" })
	sdk.search.mockReset().mockResolvedValue({ results: [], searchTime: 1 })
	sdk.profile.mockReset().mockResolvedValue({
		profile: {
			static: [{ id: "mem_s", memory: "Likes tea" }],
			dynamic: [],
			buckets: {},
		},
	})
	sdk.list.mockReset().mockResolvedValue({
		documents: [{ id: "doc_1", title: "Doc one" }],
		chunks: [],
		memories: [],
		pagination: { currentPage: 1, totalItems: 1, totalPages: 1 },
	})
	sdk.documentsGet.mockReset().mockResolvedValue({
		id: "doc_123",
		metadata: {},
		system: { status: "done" },
	})
	sdk.documentsUpdate
		.mockReset()
		.mockResolvedValue({ id: "doc", status: "queued" })
	sdk.documentsDelete.mockReset().mockResolvedValue({ count: 1, errors: [] })
	sdk.forget
		.mockReset()
		.mockResolvedValue({ count: 1, matches: [], errors: [] })
	sdk.forgetMatching.mockReset()
	sdk.clientOptions.length = 0
})

describe("searchMemories", () => {
	it("ai-sdk variant clamps an oversized limit and keeps v4 search defaults", async () => {
		const tool = aiSdk.searchMemoriesTool(API_KEY)
		const result = (await executeTool(tool, {
			informationToGet: "coffee order",
			limit: 999,
		})) as { success: boolean }

		expect(result.success).toBe(true)
		expect(sdk.search).toHaveBeenCalledWith(DEFAULT_NS, {
			query: "coffee order",
			limit: 50,
			threshold: 0.6,
			searchMode: "hybrid",
		})
	})

	it("ai-sdk schema rejects out-of-range limits", () => {
		const tool = aiSdk.searchMemoriesTool(API_KEY) as unknown as {
			inputSchema: { safeParse: (v: unknown) => { success: boolean } }
		}
		expect(
			tool.inputSchema.safeParse({ informationToGet: "x", limit: 0 }).success,
		).toBe(false)
		expect(
			tool.inputSchema.safeParse({ informationToGet: "x", limit: 51 }).success,
		).toBe(false)
		expect(
			tool.inputSchema.safeParse({ informationToGet: "x", limit: 50 }).success,
		).toBe(true)
	})

	it("openai variant clamps a non-positive limit and uses the configured namespace", async () => {
		const search = openAi.createSearchMemoriesFunction(API_KEY, {
			namespace: "user_1",
		})
		await search({ informationToGet: "coffee order", limit: 0 })

		expect(sdk.search).toHaveBeenCalledWith(
			"user_1",
			expect.objectContaining({ limit: 1 }),
		)
	})

	it("creates SDK clients with a bounded timeout and retry budget", () => {
		aiSdk.searchMemoriesTool(API_KEY, { baseUrl: "https://example.test" })
		openAi.createSearchMemoriesFunction(API_KEY)

		expect(sdk.clientOptions).toHaveLength(2)
		expect(sdk.clientOptions[0]).toEqual(
			expect.objectContaining({
				timeoutInSeconds: 30,
				maxRetries: 2,
				baseUrl: "https://example.test",
			}),
		)
		expect(sdk.clientOptions[1]).toEqual(
			expect.objectContaining({ timeoutInSeconds: 30, maxRetries: 2 }),
		)
	})
})

describe("addMemory and documentAdd", () => {
	it("addMemory writes one instant document to the namespace", async () => {
		const tool = aiSdk.addMemoryTool(API_KEY, { namespace: "user_1" })
		await executeTool(tool, { memory: "Prefers tea" })

		expect(sdk.add).toHaveBeenCalledWith("user_1", {
			content: "Prefers tea",
			dreaming: "instant",
		})
	})

	it("documentAdd forwards title and description as metadata", async () => {
		const documentAdd = openAi.createDocumentAddFunction(API_KEY)
		await documentAdd({ content: "notes", title: "T", description: "D" })

		expect(sdk.add).toHaveBeenCalledWith(DEFAULT_NS, {
			content: "notes",
			metadata: { title: "T", description: "D" },
		})
	})
})

describe("getProfile", () => {
	it("returns the profile without searching when no query is given", async () => {
		const tool = aiSdk.getProfileTool(API_KEY)
		const result = (await executeTool(tool, {})) as Record<string, unknown>

		expect(result.success).toBe(true)
		expect(result.searchResults).toBeUndefined()
		expect(sdk.profile).toHaveBeenCalledWith(DEFAULT_NS)
		expect(sdk.search).not.toHaveBeenCalled()
	})

	it("runs a separate memories search for a query", async () => {
		const getProfile = openAi.createGetProfileFunction(API_KEY)
		const result = await getProfile({ query: "drinks" })

		expect(result.success).toBe(true)
		expect(result.searchResults).toEqual([])
		expect(sdk.search).toHaveBeenCalledWith(DEFAULT_NS, {
			query: "drinks",
			searchMode: "memories",
			threshold: 0.6,
		})
	})
})

describe("documentDelete", () => {
	it("checks the document in the namespace, then deletes it", async () => {
		const tool = aiSdk.documentDeleteTool(API_KEY)
		const result = (await executeTool(tool, { documentId: "doc_123" })) as {
			success: boolean
		}

		expect(result.success).toBe(true)
		expect(sdk.documentsGet).toHaveBeenCalledWith(DEFAULT_NS, "doc_123")
		expect(sdk.documentsDelete).toHaveBeenCalledWith(DEFAULT_NS, {
			ids: ["doc_123"],
		})
	})

	it("refuses to delete a document that is still processing", async () => {
		sdk.documentsGet.mockResolvedValue({
			id: "doc_123",
			metadata: {},
			system: { status: "embedding" },
		})
		const documentDelete = openAi.createDocumentDeleteFunction(API_KEY)
		const result = await documentDelete({ documentId: "doc_123" })

		expect(result.success).toBe(false)
		expect(result.error).toContain("embedding")
		expect(sdk.documentsDelete).not.toHaveBeenCalled()
	})

	it("reports not-found documents", async () => {
		sdk.documentsGet.mockRejectedValue(new sdk.NotFoundError("missing"))
		const documentDelete = openAi.createDocumentDeleteFunction(API_KEY)
		const result = await documentDelete({ documentId: "nope" })

		expect(result.success).toBe(false)
		expect(result.error).toContain("not found")
	})

	it("surfaces per-document delete errors", async () => {
		sdk.documentsDelete.mockResolvedValue({
			count: 0,
			errors: [{ id: "doc_123", error: "locked" }],
		})
		const documentDelete = openAi.createDocumentDeleteFunction(API_KEY)
		const result = await documentDelete({ documentId: "doc_123" })

		expect(result.success).toBe(false)
		expect(result.error).toContain("locked")
	})
})

describe("documentList", () => {
	it("ai-sdk variant returns the v5 documents array", async () => {
		const tool = aiSdk.documentListTool(API_KEY)
		const result = (await executeTool(tool, {})) as {
			success: boolean
			documents?: Array<{ id: string }>
		}

		expect(result.success).toBe(true)
		expect(result.documents).toEqual([{ id: "doc_1", title: "Doc one" }])
	})

	it("openai variant forwards page-based pagination to the SDK", async () => {
		const documentList = openAi.createDocumentListFunction(API_KEY)
		const result = await documentList({ limit: 5, page: 3 })

		expect(result.success).toBe(true)
		expect(sdk.list).toHaveBeenCalledWith(DEFAULT_NS, "documents", {
			limit: 5,
			page: 3,
		})
	})
})

describe("memoryForget", () => {
	it("forgets an exact memory ID", async () => {
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY, {
			namespace: "user_1",
		})
		const result = await memoryForget({ memoryId: "mem_1" })

		expect(result.success).toBe(true)
		expect(sdk.forget).toHaveBeenCalledWith("user_1", { ids: ["mem_1"] })
		expect(sdk.forgetMatching).not.toHaveBeenCalled()
	})

	it("forgets by content via a dry-run preview, keeping only exact matches", async () => {
		sdk.forgetMatching.mockResolvedValue({
			count: 2,
			matches: [
				{ id: "mem_exact", memory: "Stale  fact" },
				{ id: "mem_close", memory: "Stale fact about tea" },
			],
			errors: [],
		})
		const tool = aiSdk.memoryForgetTool(API_KEY, { namespace: "user_2" })
		const result = (await executeTool(tool, {
			memoryContent: "stale fact",
		})) as { success: boolean }

		expect(result.success).toBe(true)
		expect(sdk.forgetMatching).toHaveBeenCalledWith("user_2", {
			query: "stale fact",
			dryRun: true,
		})
		expect(sdk.forget).toHaveBeenCalledWith("user_2", { ids: ["mem_exact"] })
	})

	it("does not forget anything when no preview match is exact", async () => {
		sdk.forgetMatching.mockResolvedValue({
			count: 1,
			matches: [{ id: "mem_close", memory: "Something else" }],
			errors: [],
		})
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY)
		const result = await memoryForget({ memoryContent: "stale fact" })

		expect(result.success).toBe(false)
		expect(sdk.forget).not.toHaveBeenCalled()
	})

	it("surfaces forget errors as tool errors", async () => {
		sdk.forget.mockResolvedValue({
			count: 0,
			matches: [],
			errors: [{ id: "mem_9", error: "Memory not found" }],
		})
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY)
		const result = await memoryForget({ memoryId: "mem_9" })

		expect(result.success).toBe(false)
		expect(result.error).toContain("Memory not found")
	})

	it("still requires an id or content", async () => {
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY)
		const result = await memoryForget({})

		expect(result.success).toBe(false)
		expect(sdk.forget).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool", () => {
	const FILE_PATH = "/memories/prefs.txt"
	const FILE_ID = "memories_prefs_txt"

	function mockFileDocument(content: string) {
		sdk.documentsGet.mockResolvedValue({
			id: "doc_file_1",
			content,
			metadata: {
				source: "claude-memory",
				claude_memory_type: "file",
				file_path: FILE_PATH,
			},
			system: { status: "done" },
		})
	}

	it("create writes a new file tagged with source claude-memory", async () => {
		sdk.documentsUpdate.mockRejectedValue(new sdk.NotFoundError("missing"))
		const tool = new ClaudeMemoryTool(API_KEY, { namespace: "user_1" })

		const result = await tool.handleCommand({
			command: "create",
			path: FILE_PATH,
			file_text: "hello",
		})

		expect(result.success).toBe(true)
		expect(sdk.add).toHaveBeenCalledWith(
			"user_1",
			expect.objectContaining({
				id: FILE_ID,
				content: "hello",
				metadata: expect.objectContaining({
					source: "claude-memory",
					file_path: FILE_PATH,
				}),
			}),
		)
	})

	it("create overwrites an existing file via update, not append", async () => {
		const tool = new ClaudeMemoryTool(API_KEY)

		await tool.handleCommand({
			command: "create",
			path: FILE_PATH,
			file_text: "replaced",
		})

		expect(sdk.documentsUpdate).toHaveBeenCalledWith(
			DEFAULT_NS,
			FILE_ID,
			expect.objectContaining({ content: "replaced" }),
		)
		expect(sdk.add).not.toHaveBeenCalled()
	})

	it("str_replace accepts an empty new_str to delete text", async () => {
		mockFileDocument("keep this\nremove this\n")
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "str_replace",
			path: FILE_PATH,
			old_str: "remove this\n",
			new_str: "",
		})

		expect(result.success).toBe(true)
		expect(sdk.documentsUpdate).toHaveBeenCalledWith(
			DEFAULT_NS,
			FILE_ID,
			expect.objectContaining({ content: "keep this\n" }),
		)
	})

	it("str_replace still rejects a missing new_str", async () => {
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "str_replace",
			path: FILE_PATH,
			old_str: "something",
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("new_str")
	})

	it("insert accepts an empty insert_text for blank lines", async () => {
		mockFileDocument("line1\nline2")
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "insert",
			path: FILE_PATH,
			insert_line: 1,
			insert_text: "",
		})

		expect(result.success).toBe(true)
		expect(sdk.documentsUpdate).toHaveBeenCalledWith(
			DEFAULT_NS,
			FILE_ID,
			expect.objectContaining({ content: "line1\n\nline2" }),
		)
	})

	it("ignores documents not written by claude-memory", async () => {
		sdk.documentsGet.mockResolvedValue({
			id: "doc_other",
			content: "secret",
			metadata: { file_path: FILE_PATH },
			system: { status: "done" },
		})
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "view",
			path: FILE_PATH,
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("File not found")
	})

	it("delete actually deletes the backing document", async () => {
		mockFileDocument("contents")
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "delete",
			path: FILE_PATH,
		})

		expect(result.success).toBe(true)
		expect(sdk.documentsDelete).toHaveBeenCalledWith(DEFAULT_NS, {
			ids: [FILE_ID],
		})
	})

	it("rename removes the old document after creating the new one", async () => {
		mockFileDocument("contents")
		sdk.documentsUpdate.mockRejectedValue(new sdk.NotFoundError("missing"))
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "rename",
			path: FILE_PATH,
			new_path: "/memories/renamed.txt",
		})

		expect(result.success).toBe(true)
		expect(sdk.add).toHaveBeenCalledWith(
			DEFAULT_NS,
			expect.objectContaining({ id: "memories_renamed_txt" }),
		)
		expect(sdk.documentsDelete).toHaveBeenCalledWith(DEFAULT_NS, {
			ids: [FILE_ID],
		})
	})

	it("lists a directory with a typed v5 filter", async () => {
		sdk.list.mockResolvedValue({
			documents: [
				{ id: "a", metadata: { file_path: "/memories/a.txt" } },
				{ id: "b", metadata: { file_path: "/memories/sub/b.txt" } },
			],
			chunks: [],
			memories: [],
			pagination: { currentPage: 1, totalItems: 2, totalPages: 1 },
		})
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "view",
			path: "/memories",
		})

		expect(result.content).toBe("Directory: /memories/\n- sub/\n- a.txt")
		expect(sdk.list).toHaveBeenCalledWith(
			DEFAULT_NS,
			"documents",
			expect.objectContaining({
				filter: expect.objectContaining({ operator: "and" }),
			}),
		)
	})
})
