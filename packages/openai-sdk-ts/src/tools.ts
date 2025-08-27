import type OpenAI from "openai"
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

export interface MemoryFetchResult {
	success: boolean
	memory?: Awaited<ReturnType<Supermemory["memories"]["get"]>>
	error?: string
}

/**
 * Function schemas for OpenAI function calling
 */
export const memoryToolSchemas = {
	searchMemories: {
		name: "searchMemories",
		description:
			"Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful.",
		parameters: {
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
					type: "number",
					description: "Maximum number of results to return",
					default: 10,
				},
			},
			required: ["informationToGet"],
		},
	} satisfies OpenAI.FunctionDefinition,

	addMemory: {
		name: "addMemory",
		description:
			"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
		parameters: {
			type: "object",
			properties: {
				memory: {
					type: "string",
					description:
						"The text content of the memory to add. This should be a single sentence or a short paragraph.",
				},
			},
			required: ["memory"],
		},
	} satisfies OpenAI.FunctionDefinition,
} as const

/**
 * Create memory tool handlers for OpenAI function calling
 */
export class SupermemoryTools {
	private client: Supermemory
	private containerTags: string[]

	constructor(apiKey: string, config?: SupermemoryToolsConfig) {
		this.client = new Supermemory({
			apiKey,
			...(config?.baseUrl && { baseURL: config.baseUrl }),
		})

		this.containerTags = config?.projectId
			? [`sm_project_${config.projectId}`]
			: (config?.containerTags ?? ["sm_project_default"])
	}

	/**
	 * Get OpenAI function definitions for all memory tools
	 */
	getToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
		return [
			{ type: "function", function: memoryToolSchemas.searchMemories },
			{ type: "function", function: memoryToolSchemas.addMemory },
		]
	}

	/**
	 * Execute a tool call based on the function name and arguments
	 */
	async executeToolCall(
		toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
	): Promise<string> {
		const functionName = toolCall.function.name
		const args = JSON.parse(toolCall.function.arguments)

		switch (functionName) {
			case "searchMemories":
				return JSON.stringify(await this.searchMemories(args))
			case "addMemory":
				return JSON.stringify(await this.addMemory(args))
			default:
				return JSON.stringify({
					success: false,
					error: `Unknown function: ${functionName}`,
				})
		}
	}

	/**
	 * Search memories
	 */
	async searchMemories({
		informationToGet,
		includeFullDocs = true,
		limit = 10,
	}: {
		informationToGet: string
		includeFullDocs?: boolean
		limit?: number
	}): Promise<MemorySearchResult> {
		try {
			const response = await this.client.search.execute({
				q: informationToGet,
				containerTags: this.containerTags,
				limit,
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
	}

	/**
	 * Add a memory
	 */
	async addMemory({ memory }: { memory: string }): Promise<MemoryAddResult> {
		try {
			const metadata: Record<string, string | number | boolean> = {}

			const response = await this.client.memories.add({
				content: memory,
				containerTags: this.containerTags,
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

	/**
	 * Fetch a specific memory by ID
	 */
	async fetchMemory({
		memoryId,
	}: {
		memoryId: string
	}): Promise<MemoryFetchResult> {
		try {
			const response = await this.client.memories.get(memoryId)

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
 * Helper function to create SupermemoryTools instance
 */
export function createSupermemoryTools(
	apiKey: string,
	config?: SupermemoryToolsConfig,
): SupermemoryTools {
	return new SupermemoryTools(apiKey, config)
}

/**
 * Get OpenAI function definitions for memory tools
 */
export function getMemoryToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
	return [
		{ type: "function", function: memoryToolSchemas.searchMemories },
		{ type: "function", function: memoryToolSchemas.addMemory },
	]
}

/**
 * Execute tool calls from OpenAI function calling
 */
export async function executeMemoryToolCalls(
	apiKey: string,
	toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
	config?: SupermemoryToolsConfig,
): Promise<OpenAI.Chat.Completions.ChatCompletionToolMessageParam[]> {
	const tools = new SupermemoryTools(apiKey, config)

	const results = await Promise.all(
		toolCalls.map(async (toolCall) => {
			const result = await tools.executeToolCall(toolCall)
			return {
				tool_call_id: toolCall.id,
				role: "tool" as const,
				content: result,
			}
		}),
	)

	return results
}

/**
 * Individual tool creators for more granular control
 */
export function createSearchMemoriesTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.searchMemories,
		},
		execute: (args: {
			informationToGet: string
			includeFullDocs?: boolean
			limit?: number
		}) => {
			const tools = new SupermemoryTools(apiKey, config)
			return tools.searchMemories(args)
		},
	}
}

export function createAddMemoryTool(
	apiKey: string,
	config?: SupermemoryToolsConfig,
) {
	return {
		definition: {
			type: "function" as const,
			function: memoryToolSchemas.addMemory,
		},
		execute: (args: { memory: string }) => {
			const tools = new SupermemoryTools(apiKey, config)
			return tools.addMemory(args)
		},
	}
}
