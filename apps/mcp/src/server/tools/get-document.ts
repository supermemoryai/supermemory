import { z } from "zod"
import { formatDocument, getDocumentContent } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	getDocumentOutputSchema,
	type GetDocumentOutput,
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
		"getDocument",
		{
			title: "Get Document",
			description:
				"Read one stored document by ID from any space you can access, including its summary and available content. Use listDocuments to discover document IDs.",
			inputSchema,
			outputSchema: getDocumentOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const client = deps.getClient()
				const document = await client.getDocument(args.documentId)
				const { content, truncated } = getDocumentContent(document)
				const structuredContent: GetDocumentOutput = {
					document: {
						id: document.id,
						title: document.title,
						type: document.type,
						status: document.status,
						createdAt: document.createdAt,
						updatedAt: document.updatedAt,
						url: document.url ?? null,
						summary: document.summary,
						content,
						contentTruncated: truncated,
					},
				}

				return {
					content: [textContent(formatDocument(document))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
