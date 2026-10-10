import { z } from "zod"
import { uploadViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveNamespaceAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { withLegacyView } from "./compat"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"upload-file",
		{
			title: "Upload File",
			description:
				"Open Supermemory's interactive file picker whenever the user wants to upload, import, or add any local file to Supermemory. Call this tool immediately even when the user only says they want to upload a file. Do not ask for a file path, folder, filename, or filesystem access; the picker handles file selection. It supports documents, text, spreadsheets, images, audio, and video.",
			inputSchema: z.object({}),
			outputSchema: uploadViewSchema,
			_meta: appToolMeta(),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
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

				const sc: ViewMessage = withLegacyView({
					view: "upload",
					viewId,
					activeNamespace,
					writableNamespaces,
				})

				return {
					content: [textContent("Opening file upload form...")],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
