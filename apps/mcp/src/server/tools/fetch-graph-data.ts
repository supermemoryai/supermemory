import { z } from "zod"
import { documentsApiResponseSchema } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { optionalNamespaceSchema } from "../namespace"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"fetch-graph-data",
		{
			description: "Fetch documents with memories for graph display",
			inputSchema: z.object({
				namespace: optionalNamespaceSchema,
				page: z.number().int().min(1).max(10_000).optional().default(1),
				limit: z.number().int().min(1).max(1_000).optional().default(200),
			}),
			outputSchema: documentsApiResponseSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(args.namespace)
				const client = deps.getClient(namespace)
				const data = await client.getGraphDocuments(args.page, args.limit)

				return {
					content: [
						textContent(
							`Loaded ${data.documents.length} documents for the memory graph.`,
						),
					],
					structuredContent: data,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
