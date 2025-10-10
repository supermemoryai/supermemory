import Supermemory from "supermemory"
import { tool } from "ai"
import { z } from "zod"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
	getContainerTags,
} from "./shared"
import type { SupermemoryToolsConfig } from "./types"

// Export individual tool creators
export const searchMemoriesTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.searchMemories,
		inputSchema: z.object({
			informationToGet: z
				.string()
				.describe(PARAMETER_DESCRIPTIONS.informationToGet),
			includeFullDocs: z
				.boolean()
				.optional()
				.default(DEFAULT_VALUES.includeFullDocs)
				.describe(PARAMETER_DESCRIPTIONS.includeFullDocs),
			limit: z
				.number()
				.optional()
				.default(DEFAULT_VALUES.limit)
				.describe(PARAMETER_DESCRIPTIONS.limit),
		}),
		execute: async ({
			informationToGet,
			includeFullDocs = DEFAULT_VALUES.includeFullDocs,
			limit = DEFAULT_VALUES.limit,
		}) => {
			try {
				const response = await client.search.execute({
					q: informationToGet,
					containerTags,
					limit,
					chunkThreshold: DEFAULT_VALUES.chunkThreshold,
					includeFullDocs,
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
}

export const addMemoryTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.addMemory,
		inputSchema: z.object({
			memory: z.string().describe(PARAMETER_DESCRIPTIONS.memory),
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
}

/**
 * Create Supermemory tools for AI SDK
 */
export function supermemoryTools(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	return {
		searchMemories: searchMemoriesTool(apiKey, config),
		addMemory: addMemoryTool(apiKey, config),
	}
}

export { withSupermemory } from "./vercel"
