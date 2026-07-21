import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import { effectiveContainerTagAccess } from "../auth/rbac"
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
			try {
				const [activeTag, tags, session] = await Promise.all([
					deps.storage.get<string>("activeContainerTag"),
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
					activeTag,
					writableTags,
				}

				return {
					content: [
						{ type: "text" as const, text: "Opening file upload form..." },
					],
					structuredContent: sc,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
