import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"listContainerTags",
		{
			description:
				"List available container tags for organizing memories. Returns name, identifier, emoji, document/memory counts, and last activity time per tag. The API auto-filters this list to tags the caller has access to.",
			inputSchema: {},
		},
		async () => {
			try {
				const tags = await deps.getClient().listContainerTags()

				if (tags.length === 0) {
					return {
						content: [
							{
								type: "text" as const,
								text: "No container tags found.",
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
							text: `Available container tags:\n${lines.join("\n")}`,
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
