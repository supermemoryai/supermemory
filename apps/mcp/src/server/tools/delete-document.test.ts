import { describe, expect, it, vi } from "vitest"
import type { SupermemoryClient } from "../client"
import * as deleteDocument from "./delete-document"
import { errorResult, type ToolDeps } from "./types"

type ToolHandler = (args: { documentId: string }) => Promise<{
	content: Array<{ type: string; text: string }>
	structuredContent?: { success: boolean; id: string }
	isError?: boolean
}>

function registerWithClient(client: Partial<SupermemoryClient>) {
	let handler: ToolHandler | undefined
	let config: Record<string, unknown> | undefined
	const registerTool = vi.fn(
		(_name: string, toolConfig: Record<string, unknown>, cb: ToolHandler) => {
			config = toolConfig
			handler = cb
			return {}
		},
	)

	const deps = {
		server: { registerTool },
		getClient: () => client as SupermemoryClient,
		errorResult,
	} as unknown as ToolDeps

	deleteDocument.register(deps)
	if (!handler || !config) throw new Error("Tool was not registered")
	return { handler, config, registerTool }
}

describe("deleteDocument tool", () => {
	it("deletes the document by id and reports success", async () => {
		const deleteDocumentMock = vi.fn().mockResolvedValue({ id: "doc_123" })
		const { handler } = registerWithClient({
			deleteDocument: deleteDocumentMock,
		})

		const result = await handler({ documentId: "doc_123" })

		expect(deleteDocumentMock).toHaveBeenCalledWith("doc_123")
		expect(result.structuredContent).toEqual({ success: true, id: "doc_123" })
		expect(result.isError).toBeUndefined()
		expect(result.content[0]?.text).toContain("doc_123")
	})

	it("returns an error result when deletion fails", async () => {
		const { handler } = registerWithClient({
			deleteDocument: vi
				.fn()
				.mockRejectedValue(new Error("Document not found")),
		})

		const result = await handler({ documentId: "doc_missing" })

		expect(result.isError).toBe(true)
		expect(result.content[0]?.text).toContain("Document not found")
	})

	it("registers as a destructive, non-read-only tool", () => {
		const { config, registerTool } = registerWithClient({
			deleteDocument: vi.fn(),
		})

		expect(registerTool).toHaveBeenCalledWith(
			"deleteDocument",
			expect.anything(),
			expect.any(Function),
		)
		expect(config?.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: true,
		})
	})
})
