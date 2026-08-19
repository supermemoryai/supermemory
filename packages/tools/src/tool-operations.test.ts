import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

// Mock the Supermemory SDK (same pattern as claude-memory.test.ts) so tool
// executions can be verified deterministically without network access.
const documentsDelete = vi.fn()
const documentsList = vi.fn()
const searchExecute = vi.fn()
const clientAdd = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
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

type ToolWithExecute = { execute: (args: Record<string, unknown>) => unknown }

function executeTool(tool: unknown, args: Record<string, unknown>) {
	return (tool as ToolWithExecute).execute(args)
}

beforeEach(() => {
	documentsDelete.mockReset().mockResolvedValue(undefined)
	documentsList.mockReset().mockResolvedValue({
		memories: [{ id: "doc_1", title: "Doc one" }],
		pagination: { currentPage: 1, totalItems: 1, totalPages: 1 },
	})
	searchExecute.mockReset()
	clientAdd.mockReset().mockResolvedValue({ id: "doc_new" })
	vi.unstubAllGlobals()
})

describe("documentDelete", () => {
	it("ai-sdk variant passes the document id string to the SDK", async () => {
		const tool = aiSdk.documentDeleteTool(API_KEY)
		const result = (await executeTool(tool, { documentId: "doc_123" })) as {
			success: boolean
		}

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

	function forget(options?: { signal?: AbortSignal }) {
		return forgetMemoryRequest(
			API_KEY,
			{ containerTag: "user_1", id: "mem_1" },
			undefined,
			options,
		)
	}

	function signalOf(fetchMock: ReturnType<typeof stubFetch>) {
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		return init.signal as AbortSignal
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

	it("composes a caller-provided signal with the timeout", async () => {
		const fetchMock = stubFetch()
		const controller = new AbortController()

		await forget({ signal: controller.signal })

		const signal = signalOf(fetchMock)
		expect(signal).not.toBe(controller.signal)
		expect(signal.aborted).toBe(false)

		const reason = new Error("caller cancelled")
		controller.abort(reason)
		expect(signal.aborted).toBe(true)
		expect(signal.reason).toBe(reason)
	})

	it("still times out while a caller-provided signal stays open", async () => {
		const realTimeout = AbortSignal.timeout.bind(AbortSignal)
		const timeout = vi
			.spyOn(AbortSignal, "timeout")
			.mockImplementation(() => realTimeout(5))
		onTestFinished(() => timeout.mockRestore())
		const fetchMock = stubFetch()
		const controller = new AbortController()

		await forget({ signal: controller.signal })

		expect(timeout).toHaveBeenCalledWith(30_000)
		const signal = signalOf(fetchMock)
		await vi.waitFor(() => expect(signal.aborted).toBe(true))
		expect((signal.reason as Error).name).toBe("TimeoutError")
		expect(controller.signal.aborted).toBe(false)
	})

	it("forwards an already-aborted caller signal", async () => {
		const fetchMock = stubFetch()
		const reason = new Error("cancelled before dispatch")

		await forget({ signal: AbortSignal.abort(reason) })

		expect(signalOf(fetchMock).aborted).toBe(true)
		expect(signalOf(fetchMock).reason).toBe(reason)
	})

	it("uses the bare timeout when options carry no signal", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout")
		onTestFinished(() => timeout.mockRestore())
		const fetchMock = stubFetch()

		await forget({})

		expect(timeout).toHaveBeenCalledWith(30_000)
		expect(signalOf(fetchMock)).toBe(timeout.mock.results[0]?.value)
	})

	it("surfaces an aborted request to the caller", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockRejectedValue(
					new DOMException("The operation timed out", "TimeoutError"),
				),
		)

		await expect(forget()).rejects.toThrow("The operation timed out")
	})

	it("throws a descriptive error on non-2xx responses", async () => {
		stubFetch(new Response("nope", { status: 401, statusText: "Unauthorized" }))

		await expect(forget()).rejects.toThrow(/401/)
	})

	it("ai-sdk tool forgets by content through the endpoint", async () => {
		const fetchMock = stubFetch()
		const tool = aiSdk.memoryForgetTool(API_KEY, {
			containerTags: ["user_2"],
		})

		const result = (await executeTool(tool, {
			memoryContent: "stale fact",
		})) as { success: boolean }

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
