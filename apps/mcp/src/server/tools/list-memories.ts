import { z } from "zod"
import { optionalContainerTagSchema } from "../container-tag"
import { formatMemoriesList } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		page: z
			.number()
			.int()
			.min(1)
			.optional()
			.default(1)
			.describe("Page number (1-based)"),
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.optional()
			.default(10)
			.describe(
				"Documents per page; each document groups its extracted memories (default 10, max 50)",
			),
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"listMemories",
		{
			description:
				"Enumerate stored memories grouped by their source document, newest first. Returns only the extracted memory facts (no document content), so use it to audit what is on file. For finding memories relevant to a topic, use search_memory instead.",
			inputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const containerTags = effectiveTag ? [effectiveTag] : undefined
				const data = await client.getDocuments(
					containerTags,
					args.page ?? 1,
					args.limit ?? 10,
				)

				return {
					content: [{ type: "text" as const, text: formatMemoriesList(data) }],
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
