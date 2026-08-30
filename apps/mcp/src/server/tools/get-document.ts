import { z } from "zod"
import { formatDocument, getDocumentContent } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	getDocumentOutputSchema,
	type GetDocumentOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

// An out-of-space document reports "not found" on purpose, so the id is not an existence oracle.
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
				"Read one stored document by ID, including its summary and available content. Use listDocuments in the intended space to discover document IDs.",
			inputSchema,
			outputSchema: getDocumentOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag()
				const client = deps.getClient(effectiveTag)
				// The SDK documents.get(id) returns an optional, deprecated
				// containerTags field the API may omit, so it can't gate scope.
				// Verify the document belongs to the effective space via a scoped
				// list before returning its content. An out-of-space document
				// reports "not found" so the id is not an existence oracle.
				const inSpace = await client.documentExistsInSpace(args.documentId)
				if (!inSpace) {
					throw new Error("Document not found")
				}
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
