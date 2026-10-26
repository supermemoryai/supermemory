import { z } from "zod"
import { formatDocument, getDocumentContent } from "../format"
import { optionalNamespaceSchema } from "../namespace"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
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
			.describe(
				"Document ID from list_documents, or the document ID shown on a search_memory or list_memories result. Memory IDs are not document IDs.",
			),
		namespace: optionalNamespaceSchema,
		...legacyNamespaceInput,
	})

	deps.server.registerTool(
		"get_document",
		{
			title: "Get Document",
			description:
				"Read one stored document by ID from one space, including its summary, available content, and dreamingStatus when available. status=done means content processing completed, not memory readiness. dreamingStatus=dreaming means memory generation is pending, running, or awaiting recovery after failure; done means generation settled or none was needed, not guaranteed search readiness or nonzero memories. Get document IDs from list_documents or from the document shown on a search_memory result. When the document is in a named space, resolve it with list_spaces and pass namespace; otherwise use the active space.",
			inputSchema,
			outputSchema: getDocumentOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)
				const document = await client.getDocument(args.documentId)
				const { content, truncated } = getDocumentContent(document)
				const structuredContent: GetDocumentOutput = withLegacyNamespace({
					namespace,
					document: {
						id: document.id,
						title: document.title,
						type: document.type,
						status: document.system.status,
						dreamingStatus: document.system.dreamingStatus,
						createdAt: document.system.createdAt,
						updatedAt: document.system.updatedAt,
						summary: document.summary,
						content,
						contentTruncated: truncated,
					},
				})

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
