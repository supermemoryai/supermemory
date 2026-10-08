import { z } from "zod"
import { listSpacesOutputSchema } from "../../shared/types"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"list_spaces",
		{
			description:
				"List the spaces available to the user. Returns each space's key, description, document/memory counts, and last update. Use this first to resolve a named space before calling a space-aware tool, or when the user asks which space may contain something. The list is auto-filtered to spaces the user can access.",
			inputSchema: z.object({}),
			outputSchema: listSpacesOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async () => {
			try {
				const namespaces = await deps.getClient().listNamespaces()
				const spaces = namespaces.map((entry) => ({
					namespace: entry.namespace,
					description: entry.description,
					documentCount: entry.documentCount,
					memoryCount: entry.memoryCount,
					updatedAt: entry.updatedAt,
				}))

				if (spaces.length === 0) {
					return {
						content: [textContent("No spaces found.")],
						structuredContent: { spaces, count: 0 },
					}
				}

				const lines = spaces.map(
					(space) =>
						`- ${space.namespace} (${space.documentCount} docs, ${space.memoryCount} memories)`,
				)

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
