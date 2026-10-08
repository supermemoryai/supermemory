import { z } from "zod"
import { confirmationViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { namespaceSchema } from "../namespace"
import { legacyNamespaceInput, namespaceArg, withLegacyView } from "./compat"
import { SETTINGS_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"set-active-tag",
		{
			description: "Set the active Supermemory space for this account",
			inputSchema: z.object({
				namespace: namespaceSchema.optional(),
				...legacyNamespaceInput,
				viewId: z.string().uuid().optional(),
			}),
			outputSchema: confirmationViewSchema,
			_meta: appToolMeta(["app"]),
			annotations: SETTINGS_TOOL_ANNOTATIONS,
		},
		async (args) => {
			const namespace = namespaceArg(args)
			if (!namespace)
				return deps.errorResult(new Error("namespace is required"))
			try {
				const viewId = args.viewId ?? crypto.randomUUID()
				const namespaces = await deps.getClient().listNamespaces()
				if (!namespaces.some((entry) => entry.namespace === namespace)) {
					return deps.errorResult(
						new Error(`No access to namespace '${namespace}'.`),
					)
				}
				await deps.setActiveNamespace(namespace)
				const sc: ViewMessage = withLegacyView({
					view: "confirmation",
					viewId,
					namespace,
				})
				return {
					content: [textContent(`Active space set to ${namespace}`)],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
