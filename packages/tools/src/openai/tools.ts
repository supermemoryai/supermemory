import type OpenAI from "openai"
import Supermemory from "supermemory"
import {
	DEFAULT_VALUES,
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
	getContainerTags,
} from "../shared"
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

	return {
		searchMemories,
		addMemory,
	}
}

/**
 * Get OpenAI function definitions for all memory tools
 */
export function getToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
	return [
		{ type: "function", function: memoryToolSchemas.searchMemories },
		{ type: "function", function: memoryToolSchemas.addMemory },
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
