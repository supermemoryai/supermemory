import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"listSpaces",
		{
			description:
				"List the spaces available to you. Spaces are the workspaces you organize memories into — returns each space's name, identifier, emoji, document/memory counts, and last activity. The list is auto-filtered to spaces you have access to.",
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
