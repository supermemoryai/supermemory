import { z } from "zod"
import type { ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"upload-file",
		{
			title: "Upload File",
			description: "Upload a file (PDF, text, image, video) to memory.",
			inputSchema: z.object({}),
			_meta: appToolMeta(),
		},
		async () => {
			try {
				const viewId = crypto.randomUUID()
				const [activeTag, tags, session] = await Promise.all([
					deps.getActiveContainerTag(),
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
					viewId,
					activeTag,
					writableTags,
				}

				return {
					content: [
						{ type: "text" as const, text: "Opening file upload form..." },
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
