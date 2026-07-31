import { z } from "zod"
import type { ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"select-space",
		{
			title: "Select Space",
			description:
				"Choose the active Supermemory space. Shows available spaces as interactive cards.",
			inputSchema: z.object({}),
			_meta: appToolMeta(),
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
						{
							type: "text" as const,
							text: `${tags.length} spaces available. Select one to set your active context.`,
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
