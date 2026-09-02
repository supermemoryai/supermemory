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
	const searchContainerTagSchema = optionalContainerTagSchema.describe(
		"Space key to search. If the user names a space, call listSpaces to resolve its key and pass it here. If no space is named, omit this field so the server uses an active space readable by the current grant or lets authorization select the caller's readable scope.",
	)
	const inputSchema = z.object({
		query: z
			.string()
			.max(1000, "Query exceeds maximum length")
			.describe("The search query to find relevant memories"),
		includeProfile: z.boolean().optional().default(true),
		containerTag: searchContainerTagSchema,
	})

	deps.server.registerTool(
		"search_memory",
		{
			description:
				"Search memories with a natural-language query. Returns relevant memories plus a profile summary when a concrete space is selected. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use an active space readable by the current grant or the caller's authorized readable scope.",
			inputSchema,
			outputSchema: searchMemoryOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				let effectiveTag = await deps.resolveSelectedContainerTag(
					args.containerTag,
				)
				const unscopedClient =
					args.containerTag === undefined && effectiveTag
						? deps.getClient()
						: undefined
				if (unscopedClient) {
					// Active state is account-wide and can outlive an OAuth grant.
					// Revalidate inherited state before sending it as an explicit scope.
					const visibleTags = await unscopedClient.listContainerTags()
					if (!visibleTags.some((tag) => tag.containerTag === effectiveTag)) {
						effectiveTag = undefined
					}
				}
				const client =
					effectiveTag === undefined
						? (unscopedClient ?? deps.getClient())
						: deps.getClient(effectiveTag)

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
					containerTag: effectiveTag ?? null,
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
