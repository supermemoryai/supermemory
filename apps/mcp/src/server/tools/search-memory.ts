import { z } from "zod"
import { getMemoryText } from "../client"
import { optionalContainerTagSchema } from "../container-tag"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import {
	searchMemoryOutputSchema,
	type SearchMemoryOutput,
} from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		query: z
			.string()
			.max(1000, "Query exceeds maximum length")
			.describe("The search query to find relevant memories"),
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"search_memory",
		{
			description:
				"Search memories in one space with a natural-language query. Returns matching memories only — not the space profile. If you need who-the-user-is, preferences, or recent context after searching, call get_profile. When the user names a space, resolve it with list_spaces and pass containerTag; otherwise use the active space.",
			inputSchema,
			outputSchema: searchMemoryOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)

				const searchResult = await client.search(args.query)
				const results = searchResult.results.map((result) => ({
					id: result.id,
					text: getMemoryText(result),
					similarity: result.similarity,
					...(result.title ? { title: result.title } : {}),
				}))

				const parts: string[] = []
				if (searchResult.results.length > 0) {
					parts.push("## Matching memories")
					for (const result of searchResult.results) {
						const text = getMemoryText(result)
						const similarity = (result.similarity * 100).toFixed(0)
						parts.push(`- [${similarity}%] ${text}`)
					}
				} else {
					parts.push("No matching memories found.")
				}

				const structuredContent: SearchMemoryOutput = {
					query: args.query,
					containerTag: effectiveTag,
					results,
					total: searchResult.total,
					timing: searchResult.timing,
				}

				return {
					content: [textContent(parts.join("\n"))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
