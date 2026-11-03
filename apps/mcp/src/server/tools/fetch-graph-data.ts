import { z } from "zod"
import { graphDocumentsPageSchema } from "../../shared/types"
import { GRAPH_PAGE_LIMIT } from "../client"
import { appToolMeta } from "../app-metadata"
import { optionalNamespaceSchema } from "../namespace"
import { legacyNamespaceInput, namespaceArg } from "./compat"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"fetch-graph-data",
		{
			description: "Fetch documents with memories for graph display",
			inputSchema: z.object({
				namespace: optionalNamespaceSchema,
				...legacyNamespaceInput,
				cursor: z.string().min(1).max(2048).optional(),
				limit: z
					.number()
					.int()
					.min(1)
					.max(GRAPH_PAGE_LIMIT)
					.optional()
					.default(GRAPH_PAGE_LIMIT),
			}),
			outputSchema: graphDocumentsPageSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)
				const data = await client.getGraphDocuments(args.cursor, args.limit)

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
