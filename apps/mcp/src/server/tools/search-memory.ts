import { z } from "zod"
import { getMemoryText } from "../client"
import type { ToolDeps } from "./types"
import {
	containerTagValidationUnavailableError,
	unknownContainerTagError,
	validateContainerTag,
} from "./validate-container-tag"

export function register(deps: ToolDeps) {
	const containerTagField: Record<string, z.ZodTypeAny> = deps.rbac
		.hasRootContainerTag
		? {}
		: {
				containerTag: z
					.string()
					.max(128, "Container tag exceeds maximum length")
					.optional(),
			}

	const inputSchema = {
		query: z
			.string()
			.max(1000, "Query exceeds maximum length")
			.describe("The search query to find relevant memories"),
		includeProfile: z.boolean().optional().default(true),
		...containerTagField,
	}

	deps.server.registerTool(
		"search_memory",
		{
			description:
				"Search the user's memories with a natural-language query. Returns relevant memories plus their profile summary.",
			inputSchema,
		},
		async (rawArgs) => {
			const args = rawArgs as {
				query: string
				includeProfile?: boolean
				containerTag?: string
			}
			try {
				if (args.containerTag && !deps.rbac.canRead(args.containerTag)) {
					return deps.errorResult(
						new Error(
							`No read access to container tag '${args.containerTag}'.`,
						),
					)
				}
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				if (effectiveTag && !deps.rbac.canRead(effectiveTag)) {
					return deps.errorResult(
						new Error(`No read access to container tag '${effectiveTag}'.`),
					)
				}
				if (effectiveTag) {
					const validation = await validateContainerTag(deps, effectiveTag)
					if (validation === "missing") {
						return deps.errorResult(unknownContainerTagError(effectiveTag))
					}
					if (validation === "unavailable") {
						return deps.errorResult(containerTagValidationUnavailableError())
					}
				}
				const client = deps.getClient(effectiveTag)

				const parts: string[] = []

				if (args.includeProfile !== false) {
					const profileResult = await client.getProfile(args.query)

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

				return {
					content: [{ type: "text" as const, text: parts.join("\n") }],
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
