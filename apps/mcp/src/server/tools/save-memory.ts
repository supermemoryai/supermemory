import { z } from "zod"
import { saveSuccessViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { containerTagSchema } from "../container-tag"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"save-memory",
		{
			description: "Save content to memory",
			inputSchema: z.object({
				content: z.string().min(1),
				containerTag: containerTagSchema,
				viewId: z.string().uuid().optional(),
			}),
			outputSchema: saveSuccessViewSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const viewId = args.viewId ?? crypto.randomUUID()
				const client = deps.getClient(args.containerTag)
				const result = await client.createMemory(args.content)
				const sc: ViewMessage = {
					view: "save-success",
					viewId,
					id: result.id,
					containerTag: args.containerTag,
				}
				return {
					content: [textContent(`Memory saved: ${result.id}`)],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
