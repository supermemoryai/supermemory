import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"upload-file",
		{
			title: "Upload File",
			description: "Upload a file (PDF, text, image, video) to memory.",
			inputSchema: {},
			_meta: { ui: { resourceUri: SUPERMEMORY_RESOURCE_URI } },
		},
		async () => {
			const activeTag = await deps.storage.get<string>("activeContainerTag")

			let writableTags: string[]
			if (deps.rbac.isRestricted) {
				writableTags = deps.rbac.writeTags.map((t) => t.containerTag)
			} else {
				const tags = await deps.getClient().listContainerTags()
				writableTags = tags.map((t) => t.containerTag)
			}

			const sc: ViewMessage = {
				view: "upload",
				activeTag,
				writableTags,
			}

			return {
				content: [
					{ type: "text" as const, text: "Opening file upload form..." },
				],
				structuredContent: sc,
			}
		},
	)
}
