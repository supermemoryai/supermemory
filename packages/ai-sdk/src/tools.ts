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
}

/**
 * Create Supermemory tools for AI SDK
 */
export function supermemoryTools(
	apiKey: string,
	config: SupermemoryToolsConfig,
) {
	const client = new Supermemory({
		apiKey,
		...(config.baseUrl && { baseURL: config.baseUrl }),
	})

	const containerTags = config.projectId
		? [`sm_project_${config.projectId}`]
		: (config.containerTags ?? ["sm_project_default"])

	const searchMemories = tool({
		description:
			"Search user memories and patterns. Run when explicitly asked or when context about user's past choices would be helpful. Uses semantic matching to find relevant details across related experiences.",
		inputSchema: z.object({
			informationToGet: z
				.string()
				.describe("Terms to search for in the user's memories"),
		}),
		execute: async ({ informationToGet }) => {
			try {
				const response = await client.search.execute({
					q: informationToGet,
					containerTags,
					limit: 10,
					chunkThreshold: 0.6,
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
			"Add a new memory to the user's memories. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
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

	const fetchMemory = tool({
		description: "Fetch a specific memory by ID to get its full details",
		inputSchema: z.object({
			memoryId: z.string().describe("The ID of the memory to fetch"),
		}),
		execute: async ({ memoryId }) => {
			try {
				const response = await client.memories.get(memoryId)

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
		fetchMemory,
	}
}

// Export individual tool creators for more flexibility
export const searchMemoriesTool = (
	apiKey: string,
	config: SupermemoryToolsConfig,
) => {
	const { searchMemories } = supermemoryTools(apiKey, config)
	return searchMemories
}

export const addMemoryTool = (
	apiKey: string,
	config: SupermemoryToolsConfig,
) => {
	const { addMemory } = supermemoryTools(apiKey, config)
	return addMemory
}

export const fetchMemoryTool = (
	apiKey: string,
	config: SupermemoryToolsConfig,
) => {
	const { fetchMemory } = supermemoryTools(apiKey, config)
	return fetchMemory
}
