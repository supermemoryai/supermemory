import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"guided-save",
		{
			title: "Add Memory",
			description: "Save information to memory with an interactive form.",
			inputSchema: {
				prefill: z.string().optional().describe("Optional content to prefill"),
			},
			_meta: { ui: { resourceUri: SUPERMEMORY_RESOURCE_URI } },
		},
		async (args) => {
			const prefill = (args as { prefill?: string }).prefill
			const activeTag = await deps.storage.get<string>("activeContainerTag")

			let writableTags: string[]
			if (deps.rbac.isRestricted) {
				writableTags = deps.rbac.writeTags.map((t) => t.containerTag)
			} else {
				const tags = await deps.getClient().listContainerTags()
				writableTags = tags.map((t) => t.containerTag)
			}

			const sc: ViewMessage = {
				view: "save",
				activeTag,
				writableTags,
				prefill,
			}

			return {
				content: [
					{ type: "text" as const, text: "Opening memory save form..." },
				],
				structuredContent: sc,
			}
		},
	)
}
