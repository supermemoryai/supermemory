import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
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
				const tags = await client.listContainerTags()

				const activeTag = await deps.storage.get<string>("activeContainerTag")

				const sc: ViewMessage = {
					view: "picker",
					containerTags: tags,
					activeTag,
					assignedTags: deps.rbac.isRestricted ? deps.rbac.assignedTags : null,
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
