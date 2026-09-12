import { z } from "zod"
import { saveViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { effectiveContainerTagAccess } from "../auth/rbac"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"guided-save",
		{
			title: "Add Memory",
			description:
				"Open an interactive form when the user wants to draft, review, edit, or choose the target space before saving information to Supermemory. Use this when the user wants to add a memory but has not supplied final content, or explicitly wants to review supplied content before saving. If the user provides the exact content and asks to save it immediately, use add_memory instead.",
			inputSchema: z.object({
				prefill: z
					.string()
					.max(200000, "Prefill exceeds maximum length")
					.optional()
					.describe("Optional content to prefill"),
			}),
			outputSchema: saveViewSchema,
			_meta: appToolMeta(),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
					content: [textContent("Opening memory save form...")],
					structuredContent: sc,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
