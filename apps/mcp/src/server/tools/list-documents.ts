import { z } from "zod"
import { optionalNamespaceSchema } from "../namespace"
import { legacyNamespaceInput, namespaceArg } from "./compat"
import { formatDocumentsList } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	listDocumentsOutputSchema,
	type ListDocumentsOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		page: z
			.number()
			.int()
			.min(1)
			.optional()
			.default(1)
			.describe("Page number (1-based)"),
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.optional()
			.default(10)
			.describe("Documents per page (default 10, max 50)"),
		namespace: optionalNamespaceSchema,
		...legacyNamespaceInput,
	})

	deps.server.registerTool(
		"list_documents",
		{
			title: "List Documents",
			description:
				"List documents in one space with their IDs, titles, types, processing status, dreamingStatus when available, dates, and summaries. status=done means content processing completed, not memory readiness. dreamingStatus=dreaming means memory generation is pending, running, or awaiting recovery after failure; done means generation settled or none was needed, not guaranteed search readiness or nonzero memories. This does not return full document content; use get_document with an ID from this result to read one document. When the user names a space, resolve it with list_spaces and pass namespace; otherwise use the active space.",
			inputSchema,
			outputSchema: listDocumentsOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)
				const data = await client.listDocuments(
					args.page ?? 1,
					args.limit ?? 10,
				)
				const structuredContent: ListDocumentsOutput = {
					documents: data.documents.map((document) => ({
						id: document.id,
						title: document.title,
						type: document.type,
						status: document.status,
						dreamingStatus: document.dreamingStatus,
						createdAt: document.createdAt,
						updatedAt: document.updatedAt,
						summary: document.summary,
					})),
					pagination: {
						currentPage: data.pagination.currentPage,
						limit: data.pagination.limit ?? args.limit ?? 10,
						totalItems: data.pagination.totalItems,
						totalPages: data.pagination.totalPages,
					},
				}

				return {
					content: [textContent(formatDocumentsList(data))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
