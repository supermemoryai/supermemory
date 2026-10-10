import { z } from "zod"
import { saveSuccessViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { namespaceSchema } from "../namespace"
import { legacyNamespaceInput, namespaceArg, withLegacyView } from "./compat"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"save-memory",
		{
			description: "Save content to memory",
			inputSchema: z.object({
				content: z.string().min(1),
				namespace: namespaceSchema.optional(),
				...legacyNamespaceInput,
				viewId: z.string().uuid().optional(),
			}),
			outputSchema: saveSuccessViewSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const namespace = namespaceArg(args)
				if (!namespace)
					return deps.errorResult(new Error("namespace is required"))
				const viewId = args.viewId ?? crypto.randomUUID()
				const client = deps.getClient(namespace)
				const result = await client.createMemory(args.content)
				const sc: ViewMessage = withLegacyView({
					view: "save-success",
					viewId,
					id: result.id,
					namespace,
				})
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
