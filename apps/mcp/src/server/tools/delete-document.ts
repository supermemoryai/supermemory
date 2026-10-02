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
			.describe(
				"Document ID to delete, as returned by list_documents or a memory result",
			),
	})

	deps.server.registerTool(
		"delete_document",
		{
			title: "Delete Document",
			description:
				"Permanently delete a stored document and its associated memories by document ID. Use list_documents to find the document ID.",
			inputSchema,
			outputSchema: deleteDocumentOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const client = deps.getClient()
				const result = await client.deleteDocument(args.documentId)
				const structuredContent: DeleteDocumentOutput = {
					success: true,
					documentId: args.documentId,
					message: result.message,
				}

				return {
					content: [textContent(result.message)],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
