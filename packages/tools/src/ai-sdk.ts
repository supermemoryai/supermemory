import { tool } from "ai"
import { z } from "zod"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	SEARCH_LIMIT_BOUNDS,
	TOOL_DESCRIPTIONS,
	clampSearchLimit,
	createToolsClient,
	deleteDocument,
	forgetMemory,
	getNamespace,
	getProfileWithSearch,
} from "./tools-shared"
import type { SupermemoryToolsConfig } from "./types"

function toolError(error: unknown) {
	return {
		success: false as const,
		error: error instanceof Error ? error.message : "Unknown error",
	}
}

export const searchMemoriesTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)
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
						.int()
						.min(SEARCH_LIMIT_BOUNDS.min)
						.max(SEARCH_LIMIT_BOUNDS.max)
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.searchLimit)
				: z.coerce
						.number()
						.int()
						.min(SEARCH_LIMIT_BOUNDS.min)
						.max(SEARCH_LIMIT_BOUNDS.max)
						.optional()
						.default(DEFAULT_VALUES.limit)
						.describe(PARAMETER_DESCRIPTIONS.searchLimit),
		}),
		execute: async ({ informationToGet, limit = DEFAULT_VALUES.limit }) => {
			try {
				const response = await client.search(namespace, {
					query: informationToGet,
					limit: clampSearchLimit(limit),
					threshold: DEFAULT_VALUES.searchThreshold,
					searchMode: "hybrid",
				})

				return {
					success: true,
					results: response.results,
					count: response.results?.length || 0,
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const addMemoryTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)

	return tool({
		description: TOOL_DESCRIPTIONS.addMemory,
		inputSchema: z.object({
			memory: z.string().describe(PARAMETER_DESCRIPTIONS.memory),
		}),
		execute: async ({ memory }) => {
			try {
				const response = await client.add(namespace, {
					content: memory,
					dreaming: "instant",
				})

				return {
					success: true,
					memory: response,
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const getProfileTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)

	return tool({
		description: TOOL_DESCRIPTIONS.getProfile,
		inputSchema: z.object({
			query: z.string().optional().describe(PARAMETER_DESCRIPTIONS.query),
		}),
		execute: async ({ query }) => {
			try {
				return {
					success: true,
					...(await getProfileWithSearch(client, namespace, query)),
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const documentListTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)
	const strict = config?.strict ?? false

	return tool({
		description: TOOL_DESCRIPTIONS.documentList,
		inputSchema: z.object({
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
		execute: async ({ limit, page }) => {
			try {
				const response = await client.list(namespace, "documents", {
					limit: limit || DEFAULT_VALUES.limit,
					...(page !== undefined && { page }),
				})

				return {
					success: true,
					documents: response.documents,
					pagination: response.pagination,
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const documentDeleteTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)

	return tool({
		description: TOOL_DESCRIPTIONS.documentDelete,
		inputSchema: z.object({
			documentId: z.string().describe(PARAMETER_DESCRIPTIONS.documentId),
		}),
		execute: async ({ documentId }) => {
			try {
				await deleteDocument(client, namespace, documentId)

				return {
					success: true,
					message: `Document ${documentId} deleted successfully`,
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const documentAddTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)

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

				const response = await client.add(namespace, {
					content,
					...(Object.keys(metadata).length > 0 && { metadata }),
				})

				return {
					success: true,
					document: response,
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

export const memoryForgetTool = (
	apiKey: string,
	config?: SupermemoryToolsConfig,
) => {
	const client = createToolsClient(apiKey, config)
	const namespace = getNamespace(config)

	return tool({
		description: TOOL_DESCRIPTIONS.memoryForget,
		inputSchema: z.object({
			memoryId: z.string().optional().describe(PARAMETER_DESCRIPTIONS.memoryId),
			memoryContent: z
				.string()
				.optional()
				.describe(PARAMETER_DESCRIPTIONS.memoryContent),
		}),
		execute: async ({ memoryId, memoryContent }) => {
			try {
				if (!memoryId && !memoryContent) {
					return {
						success: false,
						error: "Either memoryId or memoryContent must be provided",
					}
				}

				await forgetMemory(client, namespace, {
					...(memoryId && { id: memoryId }),
					...(memoryContent && { content: memoryContent }),
				})

				return {
					success: true,
					message: "Memory forgotten successfully",
				}
			} catch (error) {
				return toolError(error)
			}
		},
	})
}

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

// `./vercel` is not a published subpath, so this is the only way consumers reach the middleware types.
export {
	withSupermemory,
	type WithSupermemoryOptions,
	type PromptTemplate,
	type MemoryPromptData,
} from "./vercel"
export { getNamespace } from "./tools-shared"
