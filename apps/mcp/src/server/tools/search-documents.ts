import { DocumentTypeEnum } from "@repo/validation/schemas"
import { z } from "zod"
import { getMemoryText } from "../client"
import { optionalContainerTagSchema } from "../container-tag"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	searchDocumentsOutputSchema,
	type SearchDocumentsOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

// Keep the tool's type filter aligned with the backend document-type enum so
// users can only request types the API knows how to return.
const documentTypes = DocumentTypeEnum.options

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		query: z
			.string()
			.max(1000, "Query exceeds maximum length")
			.describe("The search query to find relevant documents"),
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.optional()
			.default(10)
			.describe("Maximum number of results (default 10, max 50)"),
		types: z
			.array(z.enum(documentTypes))
			.optional()
			.describe("Filter results to these document types"),
		source: z
			.string()
			.max(255)
			.optional()
			.describe(
				"Filter by the document's metadata.source value (e.g. 'web', 'notion')",
			),
		dateFrom: z
			.string()
			.datetime()
			.optional()
			.describe(
				"Only return documents created on or after this ISO 8601 timestamp",
			),
		dateTo: z
			.string()
			.datetime()
			.optional()
			.describe(
				"Only return documents created on or before this ISO 8601 timestamp",
			),
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"search_documents",
		{
			title: "Search Documents",
			description:
				"Search documents in one space with a natural-language query and structured filters (document type, source, date range). Returns matching document chunks with similarity scores. More capable than search_memory when you need to filter by type or date. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use the active space.",
			inputSchema,
			outputSchema: searchDocumentsOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)

				const searchResult = await client.searchDocuments(
					args.query,
					args.limit ?? 10,
					{
						types: args.types,
						source: args.source,
						dateFrom: args.dateFrom,
						dateTo: args.dateTo,
					},
				)

				const results = searchResult.results.map((result) => ({
					id: result.id,
					text: getMemoryText(result),
					similarity: result.similarity,
					...(result.title ? { title: result.title } : {}),
				}))

				const parts: string[] = []
				if (results.length > 0) {
					parts.push("## Matching documents")
					for (const result of searchResult.results) {
						const text = getMemoryText(result)
						const similarity = (result.similarity * 100).toFixed(0)
						parts.push(`- [${similarity}%] ${text}`)
					}
				} else {
					parts.push("No matching documents found.")
				}

				const structuredContent: SearchDocumentsOutput = {
					query: args.query,
					containerTag: effectiveTag,
					results,
					total: searchResult.total,
					timing: searchResult.timing,
				}

				return {
					content: [textContent(parts.join("\n"))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
