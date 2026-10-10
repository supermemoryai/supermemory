import { z } from "zod"
import { pickerViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveNamespaceAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { withLegacyView } from "./compat"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"select-space",
		{
			title: "Select Space",
			description:
				"Open an interactive picker to choose or change the active Supermemory space used for future actions. Use this only when the user asks to switch, select, or change their active or default space. Do not use it merely because the user names a space for a search, list, graph, save, or upload; resolve that space with list_spaces and pass namespace to the relevant tool instead.",
			inputSchema: z.object({}),
			outputSchema: pickerViewSchema,
			_meta: appToolMeta(),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
				const viewId = crypto.randomUUID()
				const client = deps.getClient()
				const [namespaces, session, activeNamespace] = await Promise.all([
					client.listNamespaces(),
					deps.getSession(),
					deps.getActiveNamespace(),
				])
				const assignedNamespaces = effectiveNamespaceAccess(
					namespaces.map((entry) => entry.namespace),
					session,
				)

				const sc: ViewMessage = withLegacyView({
					view: "picker",
					viewId,
					namespaces,
					activeNamespace,
					assignedNamespaces,
				})

				return {
					content: [
						textContent(
							`${namespaces.length} spaces available. Select one to set your active context.`,
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
