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
		includeProfile: z.boolean().optional().default(true),
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"search_memory",
		{
			description:
				"Search memories in one space with a natural-language query. Returns relevant memories plus that space's profile summary. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use the active space.",
			inputSchema,
			outputSchema: searchMemoryOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)

				const parts: string[] = []
				let profile: SearchMemoryOutput["profile"]

				if (args.includeProfile !== false) {
					const profileResult = await client.getProfile(args.query)
					profile = profileResult.profile

					if (profileResult.profile.static.length > 0) {
						parts.push("## Profile")
						for (const fact of profileResult.profile.static) {
							parts.push(`- ${fact}`)
						}
					}

					if (profileResult.profile.dynamic.length > 0) {
						parts.push("\n## Recent context")
						for (const fact of profileResult.profile.dynamic) {
							parts.push(`- ${fact}`)
						}
					}
				}

				const searchResult = await client.search(args.query)
				const results = searchResult.results.map((result) => ({
					id: result.id,
					text: getMemoryText(result),
					similarity: result.similarity,
					...(result.title ? { title: result.title } : {}),
				}))

				if (searchResult.results.length > 0) {
					parts.push("\n## Matching memories")
					for (const result of searchResult.results) {
						const text = getMemoryText(result)
						const similarity = (result.similarity * 100).toFixed(0)
						parts.push(`- [${similarity}%] ${text}`)
					}
				} else {
					parts.push("\nNo matching memories found.")
				}

				const structuredContent: SearchMemoryOutput = {
					query: args.query,
					containerTag: effectiveTag,
					...(profile ? { profile } : {}),
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
