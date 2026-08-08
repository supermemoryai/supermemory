import { z } from "zod"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import {
	deleteDocumentOutputSchema,
	type DeleteDocumentOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		documentId: z
			.string()
			.min(1, "Document ID is required")
			.max(255, "Document ID exceeds maximum length")
			.describe("Document ID returned by listDocuments or a memory result"),
	})

	deps.server.registerTool(
		"deleteDocument",
		{
			title: "Delete Document",
			description:
				"Permanently delete one stored document by ID, along with the memories extracted from it. This cannot be undone. Use listDocuments or getDocument first to confirm the target; prefer this over add_memory's forget action when the exact document is known.",
			inputSchema,
			outputSchema: deleteDocumentOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const client = deps.getClient()
				await client.deleteDocument(args.documentId)
				const structuredContent: DeleteDocumentOutput = {
					success: true,
					id: args.documentId,
				}
				return {
					content: [
						textContent(`Deleted document ${args.documentId} permanently.`),
					],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
