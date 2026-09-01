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
				const client = deps.getClient()
				const document = await client.getDocument(args.documentId)
				const docTags = Array.isArray(document.memoryEntries)
					? document.memoryEntries
							.map((entry: any) => entry.spaceContainerTag)
							.filter(Boolean)
					: []
				if (
					docTags.length > 0 &&
					!docTags.includes(effectiveTag)
				) {
					throw new Error("Document not found")
				}
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
