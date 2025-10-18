import { tool } from "ai"
import Supermemory from "supermemory"
import { z } from "zod"

/**
 * Supermemory configuration
 * Only one of `projectId` or `containerTags` can be provided.
 */
export interface SupermemoryToolsConfig {
	baseUrl?: string
	containerTags?: string[]
	projectId?: string
	enableTemporalQueries?: boolean
}

/**
 * Create Supermemory tools for AI SDK
 */
export function supermemoryTools(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = config?.projectId
		? [`sm_project_${config?.projectId}`]
		: config?.containerTags

	const searchMemories = tool({
		description:
			"Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful.",
		inputSchema: z.object({
			informationToGet: z
				.string()
				.describe("Terms to search for in the user's memories"),
			includeFullDocs: z
				.boolean()
				.optional()
				.default(true)
				.describe(
					"Whether to include the full document content in the response. Defaults to true for better AI context.",
				),
			limit: z
				.number()
				.optional()
				.default(10)
				.describe("Maximum number of results to return"),
			asOf: z
				.string()
				.datetime()
				.optional()
				.describe(
					"[Beta] Point-in-time filter (ISO 8601). Only applied when temporal queries are enabled.",
				),
			timeWindow: z
				.object({
					from: z
						.string()
						.datetime()
						.optional()
						.describe("[Beta] Lower bound of validity window (ISO 8601)."),
					to: z
						.string()
						.datetime()
						.optional()
						.describe("[Beta] Upper bound of validity window (ISO 8601)."),
				})
				.optional()
				.describe(
					"[Beta] Validity window filter. Only applied when temporal queries are enabled.",
				),
		}),
		execute: async ({
			informationToGet,
			includeFullDocs = true,
			limit = 10,
			asOf,
			timeWindow,
		}) => {
			try {
				const temporalFilters =
					config?.enableTemporalQueries === true
						? {
								...(asOf ? { asOf } : {}),
								...(timeWindow?.from ? { validFromGte: timeWindow.from } : {}),
								...(timeWindow?.to ? { validUntilLte: timeWindow.to } : {}),
							}
						: undefined

				const response = await client.search.execute({
					q: informationToGet,
					containerTags,
					limit,
					chunkThreshold: 0.6,
					includeFullDocs,
					...(temporalFilters ?? {}),
				})

				return {
					success: true,
					results: response.results,
					count: response.results?.length || 0,
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				}
			}
		},
	})

	const addMemory = tool({
		description:
			"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
		inputSchema: z.object({
			memory: z
				.string()
				.describe(
					"The text content of the memory to add. This should be a single sentence or a short paragraph.",
				),
		}),
		execute: async ({ memory }) => {
			try {
				const metadata: Record<string, string | number | boolean> = {}

				const response = await client.memories.add({
					content: memory,
					containerTags,
					...(Object.keys(metadata).length > 0 && { metadata }),
				})

				return {
					success: true,
					memory: response,
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				}
			}
		},
	})

	return {
		searchMemories,
		addMemory,
	}
}

// Export individual tool creators for more flexibility
export const searchMemoriesTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const { searchMemories } = supermemoryTools(apiKey, config)
	return searchMemories
}

export const addMemoryTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const { addMemory } = supermemoryTools(apiKey, config)
	return addMemory
}
