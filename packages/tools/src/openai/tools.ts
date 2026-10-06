import type OpenAI from "openai"
import type { Supermemory } from "supermemory"
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
} from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"

export interface MemorySearchResult {
	success: boolean
	results?: Awaited<ReturnType<Supermemory["search"]>>["results"]
	count?: number
	error?: string
}

export interface MemoryAddResult {
	success: boolean
	memory?: Awaited<ReturnType<Supermemory["add"]>>
	error?: string
}

export interface ProfileResult {
	success: boolean
	profile?: Awaited<ReturnType<Supermemory["profile"]>>["profile"]
	searchResults?: Awaited<ReturnType<Supermemory["search"]>>["results"]
	error?: string
}

export interface DocumentListResult {
	success: boolean
	documents?: Awaited<ReturnType<Supermemory["list"]>>["documents"]
	pagination?: Awaited<ReturnType<Supermemory["list"]>>["pagination"]
	error?: string
}

export interface DocumentDeleteResult {
	success: boolean
	message?: string
	error?: string
}

export interface DocumentAddResult {
	success: boolean
	document?: Awaited<ReturnType<Supermemory["add"]>>
	error?: string
}

export interface MemoryForgetResult {
	success: boolean
	message?: string
	error?: string
}

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
					type: "integer",
					minimum: SEARCH_LIMIT_BOUNDS.min,
					maximum: SEARCH_LIMIT_BOUNDS.max,
					description: PARAMETER_DESCRIPTIONS.searchLimit,
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
				limit: {
					type: "number",
					description: PARAMETER_DESCRIPTIONS.limit,
					default: DEFAULT_VALUES.limit,
				},
				page: {
					type: "number",
					description: PARAMETER_DESCRIPTIONS.page,
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
				memoryId: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.memoryId,
				},
				memoryContent: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.memoryContent,
				},
			},
			required: [],
		},
	} satisfies OpenAI.FunctionDefinition,
} as const

function createClient(apiKey: string, config?: SupermemoryToolsConfig) {
	return {
		client: createToolsClient(apiKey, config),
		namespace: getNamespace(config),
	}
}

function toolError(error: unknown) {
	return {
		success: false,
		error: error instanceof Error ? error.message : "Unknown error",
	}
}

export function createSearchMemoriesFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function searchMemories({
		informationToGet,
		limit = DEFAULT_VALUES.limit,
	}: {
		informationToGet: string
		includeFullDocs?: boolean
		limit?: number
	}): Promise<MemorySearchResult> {
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
	}
}

export function createAddMemoryFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function addMemory({
		memory,
	}: {
		memory: string
	}): Promise<MemoryAddResult> {
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
	}
}

export function createGetProfileFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function getProfile({
		query,
	}: {
		query?: string
	}): Promise<ProfileResult> {
		try {
			return {
				success: true,
				...(await getProfileWithSearch(client, namespace, query)),
			}
		} catch (error) {
			return toolError(error)
		}
	}
}

export function createDocumentListFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function documentList({
		limit,
		page,
	}: {
		limit?: number
		page?: number
	}): Promise<DocumentListResult> {
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
	}
}

export function createDocumentDeleteFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function documentDelete({
		documentId,
	}: {
		documentId: string
	}): Promise<DocumentDeleteResult> {
		try {
			await deleteDocument(client, namespace, documentId)

			return {
				success: true,
				message: `Document ${documentId} deleted successfully`,
			}
		} catch (error) {
			return toolError(error)
		}
	}
}

export function createDocumentAddFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

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
	}
}

export function createMemoryForgetFunction(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	const { client, namespace } = createClient(apiKey, config)

	return async function memoryForget({
		memoryId,
		memoryContent,
	}: {
		memoryId?: string
		memoryContent?: string
	}): Promise<MemoryForgetResult> {
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

function parseToolArguments(argumentsJson: string) {
	try {
		return { success: true as const, value: JSON.parse(argumentsJson) }
	} catch {
		return { success: false as const }
	}
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
		const parsed = parseToolArguments(toolCall.function.arguments)
		if (!parsed.success) {
			return JSON.stringify({
				success: false,
				error: `Invalid JSON arguments for ${functionName}`,
			})
		}
		const args = parsed.value

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
