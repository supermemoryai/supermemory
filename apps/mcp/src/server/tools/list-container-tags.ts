import { z } from "zod"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"listSpaces",
		{
			description:
				"List the workspaces available to the user. Returns each workspace's name, key, emoji, document/memory counts, and last activity. Use this first to resolve a named workspace before calling a workspace-aware tool, or when the user asks which workspace may contain something. The list is auto-filtered to workspaces the user can access.",
			inputSchema: z.object({}),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
				const tags = await deps.getClient().listContainerTags()

				if (tags.length === 0) {
					return {
						content: [
							{
								type: "text" as const,
								text: "No spaces found.",
							},
						],
					}
				}

				const lines = tags.map((t) => {
					const display = t.emoji ? `${t.emoji} ${t.name}` : t.name
					const counts = `(${t.documentCount} docs, ${t.memoryCount} memories)`
					return `- ${display} [${t.containerTag}] ${counts}`
				})

				return {
					content: [
						{
							type: "text" as const,
							text: `Available spaces:\n${lines.join("\n")}`,
						},
					],
					structuredContent: { containerTags: tags },
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
