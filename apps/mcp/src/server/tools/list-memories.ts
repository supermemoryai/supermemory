import { z } from "zod"
import { optionalContainerTagSchema } from "../container-tag"
import { formatMemoryEntriesList } from "../format"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	listMemoriesOutputSchema,
	type ListMemoriesOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

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
			.describe("Memory entries per page (default 10, max 50)"),
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"listMemories",
		{
			title: "List Memories",
			description:
				"List the latest extracted memory entries in one space, including stable memory IDs, version information, and source document IDs. This lists memories directly, not documents. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use the active space. Use search_memory instead for semantic recall.",
			inputSchema,
			outputSchema: listMemoriesOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const data = await client.listMemoryEntries(
					args.page ?? 1,
					args.limit ?? 10,
				)
				const structuredContent: ListMemoriesOutput = {
					memoryEntries: data.memoryEntries.filter(
						(entry) => entry.isForgotten !== true && entry.isLatest !== false,
					),
					pagination: data.pagination,
				}

				return {
					content: [textContent(formatMemoryEntriesList(data))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
