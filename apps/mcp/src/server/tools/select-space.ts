import { z } from "zod"
import { pickerViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"select-space",
		{
			title: "Select Space",
			description:
				"Open an interactive picker to choose or change the active Supermemory space used for future actions. Use this only when the user asks to switch, select, or change their active or default space. Do not use it merely because the user names a space for a search, list, graph, save, or upload; resolve that space with listSpaces and pass containerTag to the relevant tool instead.",
			inputSchema: z.object({}),
			outputSchema: pickerViewSchema,
			_meta: appToolMeta(),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
				const viewId = crypto.randomUUID()
				const client = deps.getClient()
				const [tags, session, activeTag] = await Promise.all([
					client.listContainerTags(),
					deps.getSession(),
					deps.getActiveContainerTag(),
				])
				const assignedTags = effectiveContainerTagAccess(
					tags.map((tag) => tag.containerTag),
					session,
				)

				const sc: ViewMessage = {
					view: "picker",
					viewId,
					containerTags: tags,
					activeTag,
					assignedTags,
				}

				return {
					content: [
						textContent(
							`${tags.length} spaces available. Select one to set your active context.`,
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
