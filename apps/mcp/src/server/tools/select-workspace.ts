import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import { effectiveContainerTagAccess } from "../auth/rbac"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"select-workspace",
		{
			title: "Select Workspace",
			description:
				"Choose which container tag to work in. Shows available container tags as interactive cards.",
			inputSchema: {},
			_meta: { ui: { resourceUri: SUPERMEMORY_RESOURCE_URI } },
		},
		async () => {
			try {
				const client = deps.getClient()
				const [tags, session, activeTag] = await Promise.all([
					client.listContainerTags(),
					deps.getSession(),
					deps.storage.get<string>("activeContainerTag"),
				])
				const assignedTags = effectiveContainerTagAccess(
					tags.map((tag) => tag.containerTag),
					session,
				)

				const sc: ViewMessage = {
					view: "picker",
					containerTags: tags,
					activeTag,
					assignedTags,
				}

				return {
					content: [
						{
							type: "text" as const,
							text: `${tags.length} container tags available. Select one to set your active context.`,
						},
					],
					structuredContent: sc,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
