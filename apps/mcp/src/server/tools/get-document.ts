import { z } from "zod"
import { formatDocument } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

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
				"Read one stored document by ID, including its summary and available content. Use listDocuments in the intended workspace to discover document IDs.",
			inputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const client = deps.getClient()
				const document = await client.getDocument(args.documentId)

				return {
					content: [{ type: "text" as const, text: formatDocument(document) }],
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
