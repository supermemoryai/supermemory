import { z } from "zod"
import { listSpacesOutputSchema } from "../../shared/types"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"listSpaces",
		{
			description:
				"List the spaces available to the user. Returns each space's name, key, emoji, document/memory counts, and last activity. Use this first to resolve a named space before calling a space-aware tool, or when the user asks which space may contain something. The list is auto-filtered to spaces the user can access.",
			inputSchema: z.object({}),
			outputSchema: listSpacesOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
				const tags = await deps.getClient().listContainerTags()
				const spaces = tags.map((tag) => ({
					name: tag.name,
					containerTag: tag.containerTag,
					description: tag.description,
					visibility: tag.visibility,
					emoji: tag.emoji,
					documentCount: tag.documentCount,
					memoryCount: tag.memoryCount,
					lastActivityAt: tag.lastActivityAt,
				}))

				if (tags.length === 0) {
					return {
						content: [textContent("No spaces found.")],
						structuredContent: { spaces, count: 0 },
					}
				}

				const lines = tags.map((t) => {
					const display = t.emoji ? `${t.emoji} ${t.name}` : t.name
					const counts = `(${t.documentCount} docs, ${t.memoryCount} memories)`
					return `- ${display} [${t.containerTag}] ${counts}`
				})

				return {
					content: [textContent(`Available spaces:\n${lines.join("\n")}`)],
					structuredContent: { spaces, count: spaces.length },
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
