import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the Supermemory SDK (same pattern as tool-operations.test.ts) so tool
// executions can be verified deterministically without network access.
const documentsDeleteBulk = vi.fn()
const documentsGet = vi.fn()
const documentsList = vi.fn()

vi.mock("supermemory", () => {
	return {
		default: class MockSupermemory {
			documents = {
				deleteBulk: documentsDeleteBulk,
				get: documentsGet,
				list: documentsList,
			}
		},
	}
})

import * as aiSdk from "./ai-sdk"
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
	documentsDeleteBulk.mockReset().mockResolvedValue({
		success: true,
		deletedCount: 1,
		errors: [],
	})
	documentsGet.mockReset()
	documentsList.mockReset().mockResolvedValue({
		memories: [],
		pagination: { currentPage: 1, totalItems: 0, totalPages: 0 },
	})
})

describe("documentDelete configured container scope", () => {
	it("ai-sdk refuses a model-supplied tag outside the configured scope", async () => {
		documentsGet.mockResolvedValue({
			id: "doc_in_tenant_b",
			customId: "doc_in_tenant_b",
			containerTags: ["tenant-b"],
		})

		const result = await executeTool(
			aiSdk.documentDeleteTool(API_KEY, { containerTags: ["tenant-a"] }),
			{ documentId: "doc_in_tenant_b", containerTag: "tenant-b" },
		)

		expect(result.success).toBe(false)
		expect(result.error).toContain("outside the configured scope")
		expect(documentsGet).not.toHaveBeenCalled()
		expect(documentsList).not.toHaveBeenCalled()
		expect(documentsDeleteBulk).not.toHaveBeenCalled()
	})

	it("openai refuses a model-supplied tag outside the configured scope", async () => {
		documentsGet.mockResolvedValue({
			id: "doc_in_tenant_b",
			customId: "doc_in_tenant_b",
			containerTags: ["tenant-b"],
		})

		const documentDelete = openAi.createDocumentDeleteFunction(API_KEY, {
			containerTags: ["tenant-a"],
		})
		const result = await documentDelete({
			documentId: "doc_in_tenant_b",
			containerTag: "tenant-b",
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain("outside the configured scope")
		expect(documentsGet).not.toHaveBeenCalled()
		expect(documentsList).not.toHaveBeenCalled()
		expect(documentsDeleteBulk).not.toHaveBeenCalled()
	})

	it("rejects tags outside an implicit project scope", async () => {
		const result = await executeTool(
			aiSdk.documentDeleteTool(API_KEY, { projectId: "alpha" }),
			{ documentId: "doc_1", containerTag: "tenant-b" },
		)

		expect(result.success).toBe(false)
		expect(result.error).toContain("outside the configured scope")
		expect(documentsDeleteBulk).not.toHaveBeenCalled()
	})

	it("allows selecting another explicitly configured tag", async () => {
		documentsGet.mockResolvedValue({
			id: "doc_in_tenant_b",
			customId: "doc_in_tenant_b",
			containerTags: ["tenant-b"],
		})

		const result = await executeTool(
			aiSdk.documentDeleteTool(API_KEY, {
				containerTags: ["tenant-a", "tenant-b"],
			}),
			{ documentId: "doc_in_tenant_b", containerTag: "tenant-b" },
		)

		expect(result.success).toBe(true)
		expect(documentsDeleteBulk).toHaveBeenCalledWith({
			ids: ["doc_in_tenant_b"],
		})
	})

	it("keeps the configured union when no tag is supplied", async () => {
		documentsGet.mockResolvedValue({
			id: "doc_in_tenant_a",
			customId: "doc_in_tenant_a",
			containerTags: ["tenant-a"],
		})

		const result = await executeTool(
			aiSdk.documentDeleteTool(API_KEY, { containerTags: ["tenant-a"] }),
			{ documentId: "doc_in_tenant_a" },
		)

		expect(result.success).toBe(true)
		expect(documentsDeleteBulk).toHaveBeenCalledWith({
			ids: ["doc_in_tenant_a"],
		})
	})
})
