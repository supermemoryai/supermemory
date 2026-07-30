import { z } from "zod"
import type { ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"guided-save",
		{
			title: "Add Memory",
			description: "Save information to memory with an interactive form.",
			inputSchema: z.object({
				prefill: z.string().optional().describe("Optional content to prefill"),
			}),
			_meta: appToolMeta(),
		},
		async (args) => {
			try {
				const { prefill } = args
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
					view: "save",
					viewId,
					activeTag,
					writableTags,
					prefill,
				}

				return {
					content: [
						{ type: "text" as const, text: "Opening memory save form..." },
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
