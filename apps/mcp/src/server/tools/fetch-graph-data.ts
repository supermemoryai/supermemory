import { z } from "zod"
import { documentsApiResponseSchema } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { optionalContainerTagSchema } from "../container-tag"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"fetch-graph-data",
		{
			description: "Fetch documents with memories for graph display",
			inputSchema: z.object({
				containerTag: optionalContainerTagSchema,
				page: z.number().optional().default(1),
				limit: z.number().optional().default(200),
			}),
			outputSchema: documentsApiResponseSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const containerTags = effectiveTag ? [effectiveTag] : undefined
				const data = await client.getDocuments(
					containerTags,
					args.page,
					args.limit,
				)

				return {
					content: [
						{
							type: "text" as const,
							text: `Loaded ${data.documents.length} documents for the memory graph.`,
						},
					],
					structuredContent: data,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
