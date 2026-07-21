import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import { effectiveContainerTagAccess } from "../auth/rbac"
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
			try {
				const prefill = (args as { prefill?: string }).prefill
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
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
