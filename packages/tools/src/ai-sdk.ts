import Supermemory from "supermemory"
import { tool } from "ai"
import { z } from "zod"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
	getContainerTags,
} from "./tools-shared"
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
	const strict = config?.strict ?? false

	return tool({
		description: TOOL_DESCRIPTIONS.searchMemories,
		inputSchema: z.object({
			informationToGet: z
				.string()
				.describe(PARAMETER_DESCRIPTIONS.informationToGet),
			includeFullDocs: strict
				? z
						.boolean()
						.default(DEFAULT_VALUES.includeFullDocs)
						.describe(PARAMETER_DESCRIPTIONS.includeFullDocs)
				: z
						.boolean()
						.optional()
						.default(DEFAULT_VALUES.includeFullDocs)
						.describe(PARAMETER_DESCRIPTIONS.includeFullDocs),
			limit: strict
				? z
						.number()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit)
				: z
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
}

export const getProfileTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)
	const strict = config?.strict ?? false

	return tool({
		description: TOOL_DESCRIPTIONS.getProfile,
		inputSchema: z.object({
			containerTag: strict
				? z.string().describe(PARAMETER_DESCRIPTIONS.containerTag)
				: z
						.string()
						.optional()
						.describe(PARAMETER_DESCRIPTIONS.containerTag),
			query: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.query),
		}),
		execute: async ({ containerTag, query }) => {
			try {
				const tag = containerTag || containerTags[0]

				const response = await client.profile({
					containerTag: tag,
					...(query && { q: query }),
				})

				return {
					success: true,
					profile: response.profile,
					searchResults: response.searchResults,
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

export const documentListTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)
	const strict = config?.strict ?? false

	return tool({
		description: TOOL_DESCRIPTIONS.documentList,
		inputSchema: z.object({
			containerTag: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.containerTag),
			limit: strict
				? z
						.number()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit)
				: z
						.number()
						.optional()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit),
			offset: z
				.number()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.offset),
			status: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.status),
		}),
		execute: async ({ containerTag, limit, offset, status }) => {
			try {
				const tag = containerTag || containerTags[0]

				const response = await client.documents.list({
					containerTag: tag,
					limit: limit || DEFAULT_VALUES.limit,
					...(offset !== undefined && { offset }),
					...(status && { status }),
				})

				return {
					success: true,
					documents: response.documents,
					pagination: response.pagination,
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

export const documentDeleteTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	return tool({
		description: TOOL_DESCRIPTIONS.documentDelete,
		inputSchema: z.object({
			documentId: z.string().describe(PARAMETER_DESCRIPTIONS.documentId),
		}),
		execute: async ({ documentId }) => {
			try {
				await client.documents.delete({ docId: documentId })

				return {
					success: true,
					message: `Document ${documentId} deleted successfully`,
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

export const documentAddTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.documentAdd,
		inputSchema: z.object({
			content: z.string().describe(PARAMETER_DESCRIPTIONS.content),
			title: z.string().optional().describe(PARAMETER_DESCRIPTIONS.title),
			description: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.description),
		}),
		execute: async ({ content, title, description }) => {
			try {
				const metadata: Record<string, string> = {}
				if (title) metadata.title = title
				if (description) metadata.description = description

				const response = await client.documents.add({
					content,
					containerTags,
					...(Object.keys(metadata).length > 0 && { metadata }),
				})

				return {
					success: true,
					document: response,
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

export const memoryForgetTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
	})

	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.memoryForget,
		inputSchema: z.object({
			containerTag: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.containerTag),
			memoryId: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.memoryId),
			memoryContent: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.memoryContent),
			reason: z.string().optional().describe(PARAMETER_DESCRIPTIONS.reason),
		}),
		execute: async ({ containerTag, memoryId, memoryContent, reason }) => {
			try {
				if (!memoryId && !memoryContent) {
					return {
						success: false,
						error: "Either memoryId or memoryContent must be provided",
					}
				}

				const tag = containerTag || containerTags[0]

				await client.memories.forget({
					containerTag: tag,
					...(memoryId && { id: memoryId }),
					...(memoryContent && { content: memoryContent }),
					...(reason && { reason }),
				})

				return {
					success: true,
					message: "Memory forgotten successfully",
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
		getProfile: getProfileTool(apiKey, config),
		documentList: documentListTool(apiKey, config),
		documentDelete: documentDeleteTool(apiKey, config),
		documentAdd: documentAddTool(apiKey, config),
		memoryForget: memoryForgetTool(apiKey, config),
	}
}

export { withSupermemory } from "./vercel"
