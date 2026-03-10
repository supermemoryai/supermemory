import type OpenAI from "openai"
import Supermemory from "supermemory"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
	getContainerTags,
} from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"

/**
 * Result types for memory operations
 */
export interface MemorySearchResult {
	success: boolean
	results?: Awaited<ReturnType<Supermemory["search"]["execute"]>>["results"]
	count?: number
	error?: string
}

export interface MemoryAddResult {
	success: boolean
	memory?: Awaited<ReturnType<Supermemory["memories"]["add"]>>
	error?: string
}

export interface ProfileResult {
	success: boolean
	profile?: {
		static: string[]
		dynamic: string[]
	}
	searchResults?: Awaited<ReturnType<Supermemory["search"]["execute"]>>
	error?: string
}

export interface DocumentListResult {
	success: boolean
	documents?: Awaited<ReturnType<Supermemory["documents"]["list"]>>["documents"]
	pagination?: Awaited<
		ReturnType<Supermemory["documents"]["list"]>
	>["pagination"]
	error?: string
}

export interface DocumentDeleteResult {
	success: boolean
	message?: string
	error?: string
}

export interface DocumentAddResult {
	success: boolean
	document?: Awaited<ReturnType<Supermemory["documents"]["add"]>>
	error?: string
}

export interface MemoryForgetResult {
	success: boolean
	message?: string
	error?: string
}

/**
 * Function schemas for OpenAI function calling
 */
export const memoryToolSchemas = {
	searchMemories: {
		name: "searchMemories",
		description: TOOL_DESCRIPTIONS.searchMemories,
		parameters: {
			type: "object",
			properties: {
				informationToGet: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.informationToGet,
				},
				includeFullDocs: {
					type: "boolean",
					description: PARAMETER_DESCRIPTIONS.includeFullDocs,
					default: DEFAULT_VALUES.includeFullDocs,
				},
				limit: {
					type: "number",
					description: PARAMETER_DESCRIPTIONS.limit,
					default: DEFAULT_VALUES.limit,
				},
			},
			required: ["informationToGet"],
		},
	} satisfies OpenAI.FunctionDefinition,

	addMemory: {
		name: "addMemory",
		description: TOOL_DESCRIPTIONS.addMemory,
		parameters: {
			type: "object",
			properties: {
				memory: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.memory,
				},
			},
			required: ["memory"],
		},
	} satisfies OpenAI.FunctionDefinition,

	getProfile: {
		name: "getProfile",
		description: TOOL_DESCRIPTIONS.getProfile,
		parameters: {
			type: "object",
			properties: {
				containerTag: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.containerTag,
				},
				query: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.query,
				},
			},
			required: [],
		},
	} satisfies OpenAI.FunctionDefinition,

	documentList: {
		name: "documentList",
		description: TOOL_DESCRIPTIONS.documentList,
		parameters: {
			type: "object",
			properties: {
				containerTag: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.containerTag,
				},
				limit: {
					type: "number",
					description: PARAMETER_DESCRIPTIONS.limit,
					default: DEFAULT_VALUES.limit,
				},
				offset: {
					type: "number",
					description: PARAMETER_DESCRIPTIONS.offset,
				},
				status: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.status,
				},
			},
			required: [],
		},
	} satisfies OpenAI.FunctionDefinition,

	documentDelete: {
		name: "documentDelete",
		description: TOOL_DESCRIPTIONS.documentDelete,
		parameters: {
			type: "object",
			properties: {
				documentId: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.documentId,
				},
			},
			required: ["documentId"],
		},
	} satisfies OpenAI.FunctionDefinition,

	documentAdd: {
		name: "documentAdd",
		description: TOOL_DESCRIPTIONS.documentAdd,
		parameters: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.content,
				},
				title: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.title,
				},
				description: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.description,
				},
			},
			required: ["content"],
		},
	} satisfies OpenAI.FunctionDefinition,

	memoryForget: {
		name: "memoryForget",
		description: TOOL_DESCRIPTIONS.memoryForget,
		parameters: {
			type: "object",
			properties: {
				containerTag: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.containerTag,
				},
				memoryId: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.memoryId,
				},
				memoryContent: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.memoryContent,
				},
				reason: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.reason,
				},
			},
			required: [],
		},
	} satisfies OpenAI.FunctionDefinition,
} as const

/**
 * Create a Supermemory client with configuration
 */
function createClient(apiKey: string, config?: SupermemoryToolsConfig) {
	const client = new Supermemory({
		apiKey,
		...(config?.baseUrl && { baseURL: config.baseUrl }),
	})

	const containerTags = getContainerTags(config)

	return { client, containerTags }
}

/**
 * Search memories function
 */
export function createSearchMemoriesFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function searchMemories({
		informationToGet,
		includeFullDocs = DEFAULT_VALUES.includeFullDocs,
		limit = DEFAULT_VALUES.limit,
	}: {
		informationToGet: string
		includeFullDocs?: boolean
		limit?: number
	}): Promise<MemorySearchResult> {
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
	}
}

/**
 * Add memory function
 */
export function createAddMemoryFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function addMemory({
		memory,
	}: {
		memory: string
	}): Promise<MemoryAddResult> {
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
	}
}

/**
 * Get profile function
 */
export function createGetProfileFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function getProfile({
		containerTag,
		query,
	}: {
		containerTag?: string
		query?: string
	}): Promise<ProfileResult> {
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
	}
}

/**
 * List documents function
 */
export function createDocumentListFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function documentList({
		containerTag,
		limit,
		offset,
		status,
	}: {
		containerTag?: string
		limit?: number
		offset?: number
		status?: string
	}): Promise<DocumentListResult> {
		try {
			const tag = containerTag || containerTags[0]

			const response = await client.documents.list({
				containerTags: [tag],
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
	}
}

/**
 * Delete document function
 */
export function createDocumentDeleteFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client } = createClient(apiKey, config)

	return async function documentDelete({
		documentId,
	}: {
		documentId: string
	}): Promise<DocumentDeleteResult> {
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
	}
}

/**
 * Add document function
 */
export function createDocumentAddFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function documentAdd({
		content,
		title,
		description,
	}: {
		content: string
		title?: string
		description?: string
	}): Promise<DocumentAddResult> {
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
	}
}

/**
 * Forget memory function
 */
export function createMemoryForgetFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, containerTags } = createClient(apiKey, config)

	return async function memoryForget({
		containerTag,
		memoryId,
		memoryContent,
		reason,
	}: {
		containerTag?: string
		memoryId?: string
		memoryContent?: string
		reason?: string
	}): Promise<MemoryForgetResult> {
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
	}
}

/**
 * Create all memory tools functions
 */
export function supermemoryTools(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const searchMemories = createSearchMemoriesFunction(apiKey, config)
	const addMemory = createAddMemoryFunction(apiKey, config)
	const getProfile = createGetProfileFunction(apiKey, config)
	const documentList = createDocumentListFunction(apiKey, config)
	const documentDelete = createDocumentDeleteFunction(apiKey, config)
	const documentAdd = createDocumentAddFunction(apiKey, config)
	const memoryForget = createMemoryForgetFunction(apiKey, config)

	return {
		searchMemories,
		addMemory,
		getProfile,
		documentList,
		documentDelete,
		documentAdd,
		memoryForget,
	}
}

/**
 * Get OpenAI function definitions for all memory tools
 */
export function getToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
	return [
		{ type: "function", function: memoryToolSchemas.searchMemories },
		{ type: "function", function: memoryToolSchemas.addMemory },
		{ type: "function", function: memoryToolSchemas.getProfile },
		{ type: "function", function: memoryToolSchemas.documentList },
		{ type: "function", function: memoryToolSchemas.documentDelete },
		{ type: "function", function: memoryToolSchemas.documentAdd },
		{ type: "function", function: memoryToolSchemas.memoryForget },
	]
}

/**
 * Execute a tool call based on the function name and arguments
 */
export function createToolCallExecutor(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const tools = supermemoryTools(apiKey, config)

	return async function executeToolCall(
		toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
	): Promise<string> {
		const functionName = toolCall.function.name
		const args = JSON.parse(toolCall.function.arguments)

		switch (functionName) {
			case "searchMemories":
				return JSON.stringify(await tools.searchMemories(args))
			case "addMemory":
				return JSON.stringify(await tools.addMemory(args))
			case "getProfile":
				return JSON.stringify(await tools.getProfile(args))
			case "documentList":
				return JSON.stringify(await tools.documentList(args))
			case "documentDelete":
				return JSON.stringify(await tools.documentDelete(args))
			case "documentAdd":
				return JSON.stringify(await tools.documentAdd(args))
			case "memoryForget":
				return JSON.stringify(await tools.memoryForget(args))
			default:
				return JSON.stringify({
					success: false,
					error: `Unknown function: ${functionName}`,
				})
		}
	}
}

/**
 * Execute tool calls from OpenAI function calling
 */
export function createToolCallsExecutor(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const executeToolCall = createToolCallExecutor(apiKey, config)

	return async function executeToolCalls(
		toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
	): Promise<OpenAI.Chat.Completions.ChatCompletionToolMessageParam[]> {
		const results = await Promise.all(
			toolCalls.map(async (toolCall) => {
				const result = await executeToolCall(toolCall)
				return {
					tool_call_id: toolCall.id,
					role: "tool" as const,
					content: result,
				}
			}),
		)

		return results
	}
}

/**
 * Individual tool creators for more granular control
 */
export function createSearchMemoriesTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const searchMemories = createSearchMemoriesFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.searchMemories,
		},
		execute: searchMemories,
	}
}

export function createAddMemoryTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const addMemory = createAddMemoryFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.addMemory,
		},
		execute: addMemory,
	}
}

export function createGetProfileTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const getProfile = createGetProfileFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.getProfile,
		},
		execute: getProfile,
	}
}

export function createDocumentListTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const documentList = createDocumentListFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.documentList,
		},
		execute: documentList,
	}
}

export function createDocumentDeleteTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const documentDelete = createDocumentDeleteFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.documentDelete,
		},
		execute: documentDelete,
	}
}

export function createDocumentAddTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const documentAdd = createDocumentAddFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.documentAdd,
		},
		execute: documentAdd,
	}
}

export function createMemoryForgetTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const memoryForget = createMemoryForgetFunction(apiKey, config)

	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.memoryForget,
		},
		execute: memoryForget,
	}
}
