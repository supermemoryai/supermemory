import { z } from "zod"
import { confirmationViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { containerTagSchema } from "../container-tag"
import { SETTINGS_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"set-active-tag",
		{
			description: "Set the active Supermemory space for this account",
			inputSchema: z.object({
				containerTag: containerTagSchema,
				viewId: z.string().uuid().optional(),
			}),
			outputSchema: confirmationViewSchema,
			_meta: appToolMeta(["app"]),
			annotations: SETTINGS_TOOL_ANNOTATIONS,
		},
		async (args) => {
			const { containerTag } = args
			try {
				const viewId = args.viewId ?? crypto.randomUUID()
				const tags = await deps.getClient().listContainerTags()
				if (!tags.some((tag) => tag.containerTag === containerTag)) {
					return deps.errorResult(
						new Error(`No access to container tag '${containerTag}'.`),
					)
				}
				await deps.setActiveContainerTag(containerTag)
				const sc: ViewMessage = {
					view: "confirmation",
					viewId,
					containerTag,
				}
				return {
					content: [textContent(`Active space set to ${containerTag}`)],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
