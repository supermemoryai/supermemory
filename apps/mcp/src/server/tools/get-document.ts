import { z } from "zod"
import { formatDocument, getDocumentContent } from "../format"
import { optionalNamespaceSchema } from "../namespace"
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
			.describe("Document ID returned by list_documents or a memory result"),
		namespace: optionalNamespaceSchema,
	})

	deps.server.registerTool(
		"get_document",
		{
			title: "Get Document",
			description:
				"Read one stored document by ID from one space, including its summary and available content. Use list_documents to discover document IDs. When the document is in a named space, resolve it with list_spaces and pass namespace; otherwise use the active space.",
			inputSchema,
			outputSchema: getDocumentOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(args.namespace)
				const client = deps.getClient(namespace)
				const document = await client.getDocument(args.documentId)
				const { content, truncated } = getDocumentContent(document)
				const structuredContent: GetDocumentOutput = {
					namespace,
					document: {
						id: document.id,
						title: document.title,
						type: document.type,
						status: document.system.status,
						createdAt: document.system.createdAt,
						updatedAt: document.system.updatedAt,
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
