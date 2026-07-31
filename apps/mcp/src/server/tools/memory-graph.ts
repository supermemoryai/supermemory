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
				"Render the space's memory graph directly as an interactive MCP App. This tool is the final visualization; do not create another graph, file, or artifact unless the user explicitly asks for one. When the user names a space, resolve it with listSpaces and pass containerTag.",
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
							text: `Rendered the interactive Memory Graph MCP App: ${result.documents.length} documents, ${memoryCount} memories${effectiveTag ? `. Space: ${effectiveTag}` : ""}. Do not create a duplicate graph or artifact unless the user explicitly requests one.`,
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
