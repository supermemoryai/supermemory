import { jsonSchema, tool } from "ai"
import Supermemory from "supermemory"

/**
 * Supermemory configuration
 * Only one of `projectId` or `containerTags` can be provided.
 */
export interface SupermemoryToolsConfig {
	baseUrl?: string
	containerTags?: string[]
	projectId?: string
}

type SearchMemoriesInput = {
	informationToGet: string
	includeFullDocs: boolean
	limit: number
}

type AddMemoryInput = {
	memory: string
}

// The schema constrains well-behaved models; a prompt-injected one can still send anything.
function clampSearchLimit(value: unknown): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return 10
	return Math.min(50, Math.max(1, Math.floor(parsed)))
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
		timeout: 30_000,
		maxRetries: 2,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = config?.projectId
		? [`sm_project_${config?.projectId}`]
		: config?.containerTags

	const searchMemories = tool({
		description:
			"Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful.",
		inputSchema: jsonSchema<SearchMemoriesInput>({
			type: "object",
			properties: {
				informationToGet: {
					type: "string",
					description: "Terms to search for in the user's memories",
				},
				includeFullDocs: {
					type: "boolean",
					description:
						"Whether to include the full document content in the response. Defaults to true for better AI context.",
					default: true,
				},
				limit: {
					type: "integer",
					minimum: 1,
					maximum: 50,
					description: "Maximum number of results to return (1-50)",
					default: 10,
				},
			},
			required: ["informationToGet"],
		}),
		execute: async ({
			informationToGet,
			includeFullDocs = true,
			limit = 10,
		}) => {
			try {
				const safeLimit = clampSearchLimit(limit)
				const response = await client.search.execute({
					q: informationToGet,
					containerTags,
					limit: safeLimit,
					chunkThreshold: 0.6,
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

	const addMemory = tool({
		description:
			"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
		inputSchema: jsonSchema<AddMemoryInput>({
			type: "object",
			properties: {
				memory: {
					type: "string",
					description:
						"The text content of the memory to add. This should be a single sentence or a short paragraph.",
				},
			},
			required: ["memory"],
		}),
		execute: async ({ memory }) => {
			try {
				const metadata: Record<string, string | number | boolean> = {}

				const response = await client.add({
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
