import Supermemory from "supermemory"
import { tool } from "ai"
import { z } from "zod"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
	getContainerTags,
} from "./tools-shared"
import {
	forgetMatchingRequest,
	forgetMemoryRequest,
} from "./shared/forget-memory"
import { profileBucketsRequest } from "./shared/profile-buckets"
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
				? z.coerce
						.number()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit)
				: z.coerce
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
				: z.string().optional().describe(PARAMETER_DESCRIPTIONS.containerTag),
			query: z.string().optional().describe(PARAMETER_DESCRIPTIONS.query),
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
				? z.coerce
						.number()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit)
				: z.coerce
						.number()
						.optional()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.limit),
			page: z.coerce.number().optional().describe(PARAMETER_DESCRIPTIONS.page),
		}),
		execute: async ({ containerTag, limit, page }) => {
			try {
				const tag = containerTag || containerTags[0]

				const response = await client.documents.list({
					containerTags: [tag],
					limit: limit || DEFAULT_VALUES.limit,
					...(page !== undefined && { page }),
				})

				return {
					success: true,
					documents: response.memories,
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
				await client.documents.delete(documentId)

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
	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.memoryForget,
		inputSchema: z.object({
			containerTag: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.containerTag),
			memoryId: z.string().optional().describe(PARAMETER_DESCRIPTIONS.memoryId),
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

				await forgetMemoryRequest(
					apiKey,
					{
						containerTag: tag as string,
						...(memoryId && { id: memoryId }),
						...(memoryContent && { content: memoryContent }),
						...(reason && { reason }),
					},
					config?.baseUrl,
				)

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

export const memoryForgetMatchingTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.memoryForgetMatching,
		inputSchema: z.object({
			containerTag: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.containerTag),
			query: z.string().optional().describe(PARAMETER_DESCRIPTIONS.forgetQuery),
			memoryIds: z
				.array(z.string())
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.forgetMemoryIds),
			dryRun: z
				.boolean()
				.optional()
				.default(DEFAULT_VALUES.forgetDryRun)
				.describe(PARAMETER_DESCRIPTIONS.forgetDryRun),
			maxForget: z.coerce
				.number()
				.optional()
				.default(DEFAULT_VALUES.forgetMaxForget)
				.describe(PARAMETER_DESCRIPTIONS.forgetMaxForget),
			reason: z.string().optional().describe(PARAMETER_DESCRIPTIONS.reason),
		}),
		execute: async ({
			containerTag,
			query,
			memoryIds,
			dryRun = DEFAULT_VALUES.forgetDryRun,
			maxForget = DEFAULT_VALUES.forgetMaxForget,
			reason,
		}) => {
			try {
				if (!query && !memoryIds?.length) {
					return {
						success: false,
						error: "Either query or memoryIds must be provided",
					}
				}

				const tag = containerTag || containerTags[0]

				const result = await forgetMatchingRequest(
					apiKey,
					{
						containerTag: tag as string,
						dryRun,
						maxForget,
						...(query && { query }),
						...(memoryIds?.length && { ids: memoryIds }),
						...(reason && { reason }),
					},
					config?.baseUrl,
				)

				return {
					success: true,
					dryRun: result.dryRun,
					count: result.count,
					summary: result.summary,
					memories: result.candidates ?? result.forgotten ?? [],
					forgetBatchId: result.forgetBatchId,
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

export const getProfileBucketsTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const containerTags = getContainerTags(config)

	return tool({
		description: TOOL_DESCRIPTIONS.getProfileBuckets,
		inputSchema: z.object({
			containerTag: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.containerTag),
			buckets: z
				.array(z.string())
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.bucketKeys),
		}),
		execute: async ({ containerTag, buckets }) => {
			try {
				const tag = containerTag || containerTags[0]

				const result = await profileBucketsRequest(
					apiKey,
					{
						containerTag: tag as string,
						...(buckets?.length && { buckets }),
					},
					config?.baseUrl,
				)

				return {
					success: true,
					buckets: result.buckets,
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
		getProfileBuckets: getProfileBucketsTool(apiKey, config),
		documentList: documentListTool(apiKey, config),
		documentDelete: documentDeleteTool(apiKey, config),
		documentAdd: documentAddTool(apiKey, config),
		memoryForget: memoryForgetTool(apiKey, config),
		memoryForgetMatching: memoryForgetMatchingTool(apiKey, config),
	}
}

export { withSupermemory } from "./vercel"
