import { describe, expect, it, vi } from "vitest"
import { register } from "./delete-document"
import { errorResult, type ToolDeps } from "./types"

function setupHarness() {
	let handler: ((args: { documentId: string }) => Promise<unknown>) | undefined
	let toolConfig: Record<string, unknown> | undefined

	const registerTool = vi.fn(
		(_name: string, config: Record<string, unknown>, fn: typeof handler) => {
			toolConfig = config
			handler = fn
			return {}
		},
	)

	const deleteDocument = vi.fn()
	const mockClient = {
		deleteDocument,
	}

	const deps: Partial<ToolDeps> = {
		server: { registerTool } as unknown as ToolDeps["server"],
		getClient: vi.fn().mockReturnValue(mockClient),
		errorResult,
	}

	register(deps as ToolDeps)

	if (!handler || !toolConfig) {
		throw new Error("delete_document tool failed to register")
	}

	return {
		handler,
		toolConfig,
		deleteDocument,
	}
}

describe("delete_document tool", () => {
	it("registers with destructive memory annotations", () => {
		const harness = setupHarness()
		expect(harness.toolConfig.annotations).toEqual({
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		})
	})

	it("calls client.deleteDocument and returns structured result", async () => {
		const harness = setupHarness()
		harness.deleteDocument.mockResolvedValueOnce({
			success: true,
			message: "Document doc-123 deleted successfully.",
			documentId: "doc-123",
		})

		const result = (await harness.handler({ documentId: "doc-123" })) as {
			content: Array<{ type: string; text: string }>
			structuredContent: {
				success: boolean
				documentId: string
				message: string
			}
		}

		expect(harness.deleteDocument).toHaveBeenCalledWith("doc-123")
		expect(result.structuredContent).toEqual({
			success: true,
			documentId: "doc-123",
			message: "Document doc-123 deleted successfully.",
		})
		expect(result.content[0]?.text).toContain(
			"Document doc-123 deleted successfully.",
		)
	})

	it("handles client errors gracefully", async () => {
		const harness = setupHarness()
		harness.deleteDocument.mockRejectedValueOnce(
			new Error("Document not found"),
		)

		const result = (await harness.handler({
			documentId: "doc-missing",
		})) as {
			content: Array<{ type: string; text: string }>
			isError: boolean
		}

		expect(result.isError).toBe(true)
		expect(result.content[0]?.text).toContain("Document not found")
	})
})
