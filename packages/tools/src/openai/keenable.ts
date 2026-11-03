import type OpenAI from "openai"
import { createKeenableClient } from "../keenable/client"
import type { KeenableToolsConfig } from "../keenable/types"
import {
	PARAMETER_DESCRIPTIONS,
	SEARCH_LIMIT_BOUNDS,
	TOOL_DESCRIPTIONS,
} from "../tools-shared"

export interface WebSearchResult {
	success: boolean
	query?: string
	mode?: string
	results?: Awaited<
		ReturnType<ReturnType<typeof createKeenableClient>["search"]>
	>["results"]
	count?: number
	error?: string
}

export interface FetchPageResult {
	success: boolean
	url?: string
	title?: string
	description?: string
	author?: string
	content?: string
	publishedAt?: number
	error?: string
}

export const keenableToolSchemas = {
	webSearch: {
		name: "webSearch",
		description: TOOL_DESCRIPTIONS.webSearch,
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.webSearchQuery,
				},
				site: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.webSearchSite,
				},
				publishedAfter: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.webSearchPublishedAfter,
				},
				publishedBefore: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.webSearchPublishedBefore,
				},
				maxResults: {
					type: "integer",
					minimum: SEARCH_LIMIT_BOUNDS.min,
					maximum: SEARCH_LIMIT_BOUNDS.max,
					description: PARAMETER_DESCRIPTIONS.webSearchMaxResults,
				},
				mode: {
					type: "string",
					enum: ["pro", "realtime"],
					description: PARAMETER_DESCRIPTIONS.webSearchMode,
				},
			},
			required: ["query"],
		},
	} satisfies OpenAI.FunctionDefinition,

	fetchPage: {
		name: "fetchPage",
		description: TOOL_DESCRIPTIONS.fetchPage,
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.fetchPageUrl,
				},
				maxChars: {
					type: "integer",
					minimum: 1,
					description: PARAMETER_DESCRIPTIONS.fetchPageMaxChars,
				},
				live: {
					type: "boolean",
					description: PARAMETER_DESCRIPTIONS.fetchPageLive,
				},
				prompt: {
					type: "string",
					description: PARAMETER_DESCRIPTIONS.fetchPagePrompt,
				},
			},
			required: ["url"],
		},
	} satisfies OpenAI.FunctionDefinition,
} as const

function toolError(error: unknown) {
	return {
		success: false,
		error: error instanceof Error ? error.message : "Unknown error",
	}
}

export function createWebSearchFunction(config?: KeenableToolsConfig) {
	const client = createKeenableClient(config)

	return async function webSearch({
		query,
		site,
		publishedAfter,
		publishedBefore,
		maxResults,
		mode,
	}: {
		query: string
		site?: string
		publishedAfter?: string
		publishedBefore?: string
		maxResults?: number
		mode?: "pro" | "realtime"
	}): Promise<WebSearchResult> {
		try {
			const response = await client.search({
				query,
				site,
				publishedAfter,
				publishedBefore,
				maxResults,
				mode,
			})
			return {
				success: true,
				query: response.query,
				mode: response.mode,
				results: response.results,
				count: response.results?.length || 0,
			}
		} catch (error) {
			return toolError(error)
		}
	}
}

export function createFetchPageFunction(config?: KeenableToolsConfig) {
	const client = createKeenableClient(config)

	return async function fetchPage({
		url,
		maxChars,
		live,
		prompt,
	}: {
		url: string
		maxChars?: number
		live?: boolean
		prompt?: string
	}): Promise<FetchPageResult> {
		try {
			const page = await client.fetchPage({ url, maxChars, live, prompt })
			return {
				success: true,
				url: page.url,
				title: page.title,
				description: page.description,
				author: page.author,
				content: page.content,
				publishedAt: page.published_at,
			}
		} catch (error) {
			return toolError(error)
		}
	}
}

export function keenableTools(config?: KeenableToolsConfig) {
	return {
		webSearch: createWebSearchFunction(config),
		fetchPage: createFetchPageFunction(config),
	}
}

export function getKeenableToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
	return [
		{ type: "function", function: keenableToolSchemas.webSearch },
		{ type: "function", function: keenableToolSchemas.fetchPage },
	]
}

function parseToolArguments(argumentsJson: string) {
	const source = argumentsJson?.trim() || "{}"

	try {
		const value = JSON.parse(source)
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return { success: false as const }
		}
		return { success: true as const, value }
	} catch {
		return { success: false as const }
	}
}

export function createKeenableToolCallExecutor(config?: KeenableToolsConfig) {
	const tools = keenableTools(config)

	return async function executeToolCall(
		toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
	): Promise<string> {
		if (toolCall.type !== "function") {
			return JSON.stringify({
				success: false,
				error: `Unsupported tool call type: ${toolCall.type}`,
			})
		}

		const functionName = toolCall.function.name
		const parsed = parseToolArguments(toolCall.function.arguments)
		if (!parsed.success) {
			return JSON.stringify({
				success: false,
				error: "Invalid JSON arguments",
			})
		}
		const args = parsed.value

		switch (functionName) {
			case "webSearch":
				return JSON.stringify(await tools.webSearch(args))
			case "fetchPage":
				return JSON.stringify(await tools.fetchPage(args))
			default:
				return JSON.stringify({
					success: false,
					error: `Unknown function: ${functionName}`,
				})
		}
	}
}

export function createWebSearchTool(config?: KeenableToolsConfig) {
	return {
		definition: {
			type: "function" as const,
			function: keenableToolSchemas.webSearch,
		},
		execute: createWebSearchFunction(config),
	}
}

export function createFetchPageTool(config?: KeenableToolsConfig) {
	return {
		definition: {
			type: "function" as const,
			function: keenableToolSchemas.fetchPage,
		},
		execute: createFetchPageFunction(config),
	}
}
