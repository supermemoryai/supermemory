import { z } from "zod"
import { optionalContainerTagSchema } from "../container-tag"
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
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"listDocuments",
		{
			title: "List Documents",
			description:
				"List documents in one space with their IDs, titles, types, processing status, dates, and summaries. This does not return full document content; use getDocument with an ID from this result to read one document. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use the active space.",
			inputSchema,
			outputSchema: listDocumentsOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
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
