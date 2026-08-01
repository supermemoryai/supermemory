import { z } from "zod"
import { uploadViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
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
				const [activeTag, tags, session] = await Promise.all([
					deps.getActiveContainerTag(),
					deps.getClient().listContainerTags(),
					deps.getSession(),
				])
				const writableTags = effectiveContainerTagAccess(
					tags.map((tag) => tag.containerTag),
					session,
				)
					.filter((access) => access.permission === "write")
					.map((access) => access.containerTag)

				const sc: ViewMessage = {
					view: "upload",
					viewId,
					activeTag,
					writableTags,
				}

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
