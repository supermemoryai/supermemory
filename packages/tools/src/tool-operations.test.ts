import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK (same pattern as claude-memory.test.ts) so tool
// executions can be verified deterministically without network access.
const documentsDelete = vi.fn()
const documentsList = vi.fn()
const profileRequest = vi.fn()
const searchExecute = vi.fn()
const clientAdd = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			profile = profileRequest
			search = { execute: searchExecute }
			add = clientAdd
			documents = {
				delete: documentsDelete,
				list: documentsList,
				add: vi.fn(),
			}
		},
	}
})

import * as aiSdk from "./ai-sdk"
import { ClaudeMemoryTool } from "./claude-memory"
import { forgetMemoryRequest } from "./shared/forget-memory"
import * as openAi from "./openai/tools"

const API_KEY = "sm_test_key"

type ToolExecutionResult = { success: boolean; error?: string }
type ToolWithExecute = {
	execute: (args: Record<string, unknown>) => Promise<ToolExecutionResult>
}

function executeTool(
	tool: unknown,
	args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
	return (tool as ToolWithExecute).execute(args)
}

beforeEach(() => {
	documentsDelete.mockReset().mockResolvedValue(undefined)
	documentsList.mockReset().mockResolvedValue({
		memories: [{ id: "doc_1", title: "Doc one" }],
		pagination: { currentPage: 1, totalItems: 1, totalPages: 1 },
	})
	profileRequest.mockReset().mockResolvedValue({
		profile: { static: [], dynamic: [] },
		searchResults: { results: [] },
	})
	searchExecute.mockReset()
	clientAdd.mockReset().mockResolvedValue({ id: "doc_new" })
	vi.unstubAllGlobals()
})

describe("configured container scope", () => {
	it("rejects out-of-scope tags across both tool surfaces before I/O", async () => {
		const config = { containerTags: ["tenant-a"] }
		const fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)

		const results: ToolExecutionResult[] = await Promise.all([
			executeTool(aiSdk.getProfileTool(API_KEY, config), {
				containerTag: "tenant-b",
			}),
			openAi.createGetProfileFunction(
				API_KEY,
				config,
			)({
				containerTag: "tenant-b",
			}),
			executeTool(aiSdk.documentListTool(API_KEY, config), {
				containerTag: "tenant-b",
			}),
			openAi.createDocumentListFunction(
				API_KEY,
				config,
			)({
				containerTag: "tenant-b",
			}),
			executeTool(aiSdk.memoryForgetTool(API_KEY, config), {
				containerTag: "tenant-b",
				memoryId: "mem_1",
			}),
			openAi.createMemoryForgetFunction(
				API_KEY,
				config,
			)({
				containerTag: "tenant-b",
				memoryId: "mem_1",
			}),
		])

		expect(results).toHaveLength(6)
		for (const result of results) {
			expect(result.success).toBe(false)
			expect(result.error).toContain("outside the configured scope")
		}
		expect(profileRequest).not.toHaveBeenCalled()
		expect(documentsList).not.toHaveBeenCalled()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("allows selecting another explicitly configured tag", async () => {
		const getProfile = openAi.createGetProfileFunction(API_KEY, {
			containerTags: ["tenant-a", "tenant-b"],
		})

		const result = await getProfile({ containerTag: "tenant-b" })

		expect(result.success).toBe(true)
		expect(profileRequest).toHaveBeenCalledWith({
			containerTag: "tenant-b",
		})
	})

	it("does not let model input override implicit or project scopes", async () => {
		const implicitResult = await openAi.createDocumentListFunction(API_KEY)({
			containerTag: "tenant-b",
		})
		const projectResult = await executeTool(
			aiSdk.getProfileTool(API_KEY, { projectId: "alpha" }),
			{ containerTag: "tenant-b" },
		)

		expect(implicitResult.success).toBe(false)
		expect(implicitResult.error).toContain("outside the configured scope")
		expect(projectResult.success).toBe(false)
		expect(projectResult.error).toContain("outside the configured scope")
		expect(documentsList).not.toHaveBeenCalled()
		expect(profileRequest).not.toHaveBeenCalled()
	})

	it("fails closed when the configured scope is empty", async () => {
		const result = await openAi.createGetProfileFunction(API_KEY, {
			containerTags: [],
		})({})

		expect(result.success).toBe(false)
		expect(result.error).toContain(
			"require at least one configured container tag",
		)
		expect(profileRequest).not.toHaveBeenCalled()
	})
})

describe("documentDelete", () => {
	it("ai-sdk variant passes the document id string to the SDK", async () => {
		const tool = aiSdk.documentDeleteTool(API_KEY)
		const result = await executeTool(tool, { documentId: "doc_123" })

		expect(result.success).toBe(true)
		expect(documentsDelete).toHaveBeenCalledWith("doc_123")
	})
})

describe("documentList", () => {
	it("ai-sdk variant returns the SDK's memories array as documents", async () => {
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
		expect(result.documents).toEqual([{ id: "doc_1", title: "Doc one" }])
		expect(documentsList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 5, page: 3 }),
		)
	})
})

describe("memoryForget", () => {
	function stubFetch(response = new Response(null, { status: 200 })) {
		const fetchMock = vi.fn().mockResolvedValue(response)
		vi.stubGlobal("fetch", fetchMock)
		return fetchMock
	}

	it("issues DELETE /v4/memories with the forget payload", async () => {
		const fetchMock = stubFetch()

		await forgetMemoryRequest(API_KEY, {
			containerTag: "user_1",
			id: "mem_1",
			reason: "outdated",
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe("https://api.supermemory.ai/v4/memories")
		expect(init.method).toBe("DELETE")
		expect(init.headers).toMatchObject({
			Authorization: `Bearer ${API_KEY}`,
		})
		expect(JSON.parse(init.body as string)).toEqual({
			containerTag: "user_1",
			id: "mem_1",
			reason: "outdated",
		})
		expect(init.signal).toBeInstanceOf(AbortSignal)
	})

	it("uses a caller-provided signal instead of creating a timeout", async () => {
		const fetchMock = stubFetch()
		const controller = new AbortController()

		await forgetMemoryRequest(
			API_KEY,
			{ containerTag: "user_1", id: "mem_1" },
			undefined,
			{ signal: controller.signal },
		)

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(init.signal).toBe(controller.signal)
	})

	it("throws a descriptive error on non-2xx responses", async () => {
		stubFetch(new Response("nope", { status: 401, statusText: "Unauthorized" }))

		await expect(
			forgetMemoryRequest(API_KEY, { containerTag: "user_1", id: "mem_1" }),
		).rejects.toThrow(/401/)
	})

	it("ai-sdk tool forgets by content through the endpoint", async () => {
		const fetchMock = stubFetch()
		const tool = aiSdk.memoryForgetTool(API_KEY, {
			containerTags: ["user_2"],
		})

		const result = await executeTool(tool, {
			memoryContent: "stale fact",
		})

		expect(result.success).toBe(true)
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(JSON.parse(init.body as string)).toEqual({
			containerTag: "user_2",
			content: "stale fact",
		})
	})

	it("openai tool surfaces endpoint failures as tool errors", async () => {
		stubFetch(new Response("boom", { status: 500, statusText: "Server Error" }))
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY)

		const result = await memoryForget({ memoryId: "mem_9" })

		expect(result.success).toBe(false)
		expect(result.error).toMatch(/500/)
	})

	it("still requires an id or content", async () => {
		const fetchMock = stubFetch()
		const memoryForget = openAi.createMemoryForgetFunction(API_KEY)

		const result = await memoryForget({})

		expect(result.success).toBe(false)
		expect(fetchMock).not.toHaveBeenCalled()
	})
})

describe("ClaudeMemoryTool", () => {
	const FILE_PATH = "/memories/prefs.txt"
	const CUSTOM_ID = "memories_prefs_txt"

	function mockFileDocument(content: string) {
		searchExecute.mockResolvedValue({
			results: [
				{
					documentId: CUSTOM_ID,
					content,
					metadata: { file_path: FILE_PATH },
				},
			],
		})
	}

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
		expect(clientAdd).toHaveBeenCalledWith(
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
			insert_line: 2,
			insert_text: "",
		})

		expect(result.success).toBe(true)
		expect(clientAdd).toHaveBeenCalledWith(
			expect.objectContaining({ content: "line1\n\nline2" }),
		)
	})

	it("delete actually deletes the backing document", async () => {
		mockFileDocument("contents")
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "delete",
			path: FILE_PATH,
		})

		expect(result.success).toBe(true)
		expect(documentsDelete).toHaveBeenCalledWith(CUSTOM_ID)
	})

	it("rename removes the old document after creating the new one", async () => {
		mockFileDocument("contents")
		const tool = new ClaudeMemoryTool(API_KEY)

		const result = await tool.handleCommand({
			command: "rename",
			path: FILE_PATH,
			new_path: "/memories/renamed.txt",
		})

		expect(result.success).toBe(true)
		expect(clientAdd).toHaveBeenCalledWith(
			expect.objectContaining({ customId: "memories_renamed_txt" }),
		)
		expect(documentsDelete).toHaveBeenCalledWith(CUSTOM_ID)
	})
})
