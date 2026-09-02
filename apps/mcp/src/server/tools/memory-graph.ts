import { z } from "zod"
import { graphViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { optionalContainerTagSchema } from "../container-tag"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"memory-graph",
		{
			title: "Memory Graph",
			description:
				"Render a space's memory graph directly as an interactive MCP App. This tool is the final visualization; do not create another graph, file, or artifact unless the user explicitly asks for one. If the user names a space, call listSpaces to resolve its key and pass it as containerTag. If the user does not name a space, call this tool directly and omit containerTag; the server uses the active space or account default. Do not open the space picker unless the user asks to change their active space.",
			inputSchema,
			outputSchema: graphViewSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(),
		},
		async (args) => {
			try {
				const viewId = crypto.randomUUID()
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const result = await client.getDocuments([effectiveTag], 1, 200)
				const memoryCount = result.documents.reduce(
					(sum, document) => sum + document.memoryEntries.length,
					0,
				)
				const sc: ViewMessage = {
					view: "graph",
					viewId,
					containerTag: effectiveTag,
					documents: result.documents,
					totalCount: result.pagination.totalItems,
					documentCount: result.documents.length,
					memoryCount,
					totalDocumentCount: result.pagination.totalItems,
					truncated: result.documents.length < result.pagination.totalItems,
					rendered: true,
				}
				return {
					content: [
						textContent(
							`Rendered the interactive Memory Graph MCP App: ${result.documents.length} documents, ${memoryCount} memories. Space: ${effectiveTag}. Do not create a duplicate graph or artifact unless the user explicitly requests one.`,
						),
					],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
