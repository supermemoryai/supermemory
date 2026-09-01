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
			.describe("Document ID to permanently delete, as returned by listDocuments or getDocument"),
	})

	deps.server.registerTool(
		"deleteDocument",
		{
			title: "Delete Document",
			description:
				"Permanently delete a document by its exact ID. Use listDocuments to discover document IDs before calling this tool.",
			inputSchema,
			outputSchema: deleteDocumentOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag()
				const client = deps.getClient()
				const document = await client.getDocument(args.documentId)
				const docTags = document.containerTags
				if (
					Array.isArray(docTags) &&
					docTags.length > 0 &&
					!docTags.includes(effectiveTag)
				) {
					throw new Error("Document not found")
				}

				await client.deleteDocument(args.documentId)

				const message = `Document ${args.documentId} permanently deleted.`
				const structuredContent: DeleteDocumentOutput = {
					documentId: args.documentId,
					success: true,
					message,
				}

				return {
					content: [textContent(message)],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
