import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema: Record<string, z.ZodTypeAny> = deps.props?.containerTag
		? {}
		: {
				containerTag: z
					.string()
					.max(128, "Container tag exceeds maximum length")
					.optional(),
			}

	registerAppTool(
		deps.server,
		"memory-graph",
		{
			title: "Memory Graph",
			description:
				"Visualize the user's memory graph as an interactive force-directed graph.",
			inputSchema,
			_meta: { ui: { resourceUri: SUPERMEMORY_RESOURCE_URI } },
		},
		async (rawArgs) => {
			try {
				const explicit = (rawArgs as { containerTag?: string }).containerTag
				const effectiveTag = await deps.resolveContainerTag(explicit)
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
