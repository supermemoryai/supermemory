import { z } from "zod"
import type { ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { containerTagSchema } from "../container-tag"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"set-active-tag",
		{
			description: "Set the active container tag for this account",
			inputSchema: z.object({
				containerTag: containerTagSchema,
				viewId: z.string().uuid().optional(),
			}),
			_meta: appToolMeta(["app"]),
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
					content: [
						{
							type: "text" as const,
							text: `Active workspace set to ${containerTag}`,
						},
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
