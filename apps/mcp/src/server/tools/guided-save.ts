import { z } from "zod"
import { saveViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveNamespaceAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"guided-save",
		{
			title: "Add Memory",
			description:
				"Open an interactive form when the user wants to draft, review, edit, or choose the target space before saving information to Supermemory. Use this when the user wants to add a memory but has not supplied final content, or explicitly wants to review supplied content before saving. If the user provides the exact content and asks to save it immediately, use add_memory instead.",
			inputSchema: z.object({
				prefill: z
					.string()
					.max(200000, "Prefill exceeds maximum length")
					.optional()
					.describe("Optional content to prefill"),
			}),
			outputSchema: saveViewSchema,
			_meta: appToolMeta(),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const { prefill } = args
				const viewId = crypto.randomUUID()
				const [activeNamespace, namespaces, session] = await Promise.all([
					deps.getActiveNamespace(),
					deps.getClient().listNamespaces(),
					deps.getSession(),
				])
				const writableNamespaces = effectiveNamespaceAccess(
					namespaces.map((entry) => entry.namespace),
					session,
				)
					.filter((access) => access.permission === "write")
					.map((access) => access.namespace)

				const sc: ViewMessage = {
					view: "save",
					viewId,
					activeNamespace,
					writableNamespaces,
					prefill,
				}

				return {
					content: [textContent("Opening memory save form...")],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
