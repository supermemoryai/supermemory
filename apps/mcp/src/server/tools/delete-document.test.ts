import { describe, expect, it, vi } from "vitest"
import type { SupermemoryClient } from "../client"
import { register } from "./delete-document"
import { errorResult, type ToolDeps } from "./types"

function createMockDeps(overrides: Partial<ToolDeps> = {}): {
	deps: ToolDeps
	registeredTool: {
		name: string
		config: any
		handler: (args: any) => Promise<any>
	}
	mockClient: {
		getDocument: ReturnType<typeof vi.fn>
		deleteDocument: ReturnType<typeof vi.fn>
	}
} {
	let registeredTool: any = null
	const registerTool = vi.fn((name, config, handler) => {
		registeredTool = { name, config, handler }
	})

	const mockClient = {
		getDocument: vi.fn(),
		deleteDocument: vi.fn(),
	}

	const deps: ToolDeps = {
		server: { registerTool } as any,
		actor: {
			userId: "user_123",
			organizationId: "org_123",
			bearerToken: "token_123",
			scopes: [],
		},
		getClient: vi.fn(() => mockClient as unknown as SupermemoryClient),
		getSession: vi.fn(),
		resolveContainerTag: vi.fn().mockResolvedValue("space_default"),
		getActiveContainerTag: vi.fn().mockResolvedValue("space_default"),
		setActiveContainerTag: vi.fn(),
		createUploadSession: vi.fn(),
		getClientInfo: vi.fn(),
		errorResult,
		...overrides,
	}

	register(deps)

	return { deps, registeredTool, mockClient }
}

describe("deleteDocument tool", () => {
	it("registers with destructiveHint: true and correct schema", () => {
		const { registeredTool } = createMockDeps()

		expect(registeredTool.name).toBe("deleteDocument")
		expect(registeredTool.config.annotations.destructiveHint).toBe(true)
		expect(registeredTool.config.annotations.readOnlyHint).toBe(false)
		expect(registeredTool.config.inputSchema).toBeDefined()
	})

	it("successfully deletes a document belonging to the active space", async () => {
		const { registeredTool, mockClient } = createMockDeps()

		mockClient.getDocument.mockResolvedValue({
			id: "doc_123",
			containerTags: ["space_default"],
			title: "My Document",
		})
		mockClient.deleteDocument.mockResolvedValue(undefined)

		const result = await registeredTool.handler({ documentId: "doc_123" })

		expect(mockClient.getDocument).toHaveBeenCalledWith("doc_123")
		expect(mockClient.deleteDocument).toHaveBeenCalledWith("doc_123")
		expect(result.structuredContent).toEqual({
			documentId: "doc_123",
			success: true,
			message: "Document doc_123 permanently deleted.",
		})
		expect(result.content[0].text).toContain("permanently deleted")
	})

	it("rejects deletion of a document from a different space with 'Document not found'", async () => {
		const { registeredTool, mockClient } = createMockDeps()

		mockClient.getDocument.mockResolvedValue({
			id: "doc_other",
			containerTags: ["other_space"],
			title: "Private Document",
		})

		const result = await registeredTool.handler({ documentId: "doc_other" })

		expect(mockClient.getDocument).toHaveBeenCalledWith("doc_other")
		expect(mockClient.deleteDocument).not.toHaveBeenCalled()
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain("Document not found")
	})

	it("propagates client errors via errorResult", async () => {
		const { registeredTool, mockClient } = createMockDeps()

		mockClient.getDocument.mockRejectedValue(new Error("Network timeout"))

		const result = await registeredTool.handler({ documentId: "doc_123" })

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain("Error: Network timeout")
	})
})
