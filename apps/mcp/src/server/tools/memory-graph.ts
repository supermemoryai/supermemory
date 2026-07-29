import { z } from "zod"
import type { ViewMessage } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { optionalContainerTagSchema } from "../container-tag"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"memory-graph",
		{
			title: "Memory Graph",
			description:
				"Visualize the user's memory graph as an interactive force-directed graph.",
			inputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(),
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const containerTags = effectiveTag ? [effectiveTag] : undefined

				const result = await client.getDocuments(containerTags, 1, 200)

				const memoryCount = result.documents.reduce(
					(sum, d) => sum + d.memoryEntries.length,
					0,
				)

				const sc: ViewMessage = {
					view: "graph",
					containerTag: effectiveTag,
					documents: result.documents,
					totalCount: result.pagination.totalItems,
				}

				return {
					content: [
						{
							type: "text" as const,
							text: `Memory Graph: ${result.documents.length} documents, ${memoryCount} memories${effectiveTag ? `. Workspace: ${effectiveTag}` : ""}`,
						},
					],
					structuredContent: sc,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
