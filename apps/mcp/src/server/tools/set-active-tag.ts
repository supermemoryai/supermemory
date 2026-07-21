import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"set-active-tag",
		{
			description: "Set the active container tag for this session",
			inputSchema: {
				containerTag: z.string().min(1),
			},
			_meta: {
				ui: {
					resourceUri: SUPERMEMORY_RESOURCE_URI,
					visibility: ["app"],
				},
			},
		},
		async (args) => {
			const containerTag = (args as { containerTag: string }).containerTag
			try {
				const tags = await deps.getClient().listContainerTags()
				if (!tags.some((tag) => tag.containerTag === containerTag)) {
					return deps.errorResult(
						new Error(`No access to container tag '${containerTag}'.`),
					)
				}
				await deps.storage.put("activeContainerTag", containerTag)
				const sc: ViewMessage = {
					view: "confirmation",
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
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
