import type OpenAI from "openai"
import Supermemory from "supermemory"
import { addConversation } from "../conversations-client"
import { deduplicateMemories } from "../tools-shared"
import { createLogger, type Logger } from "../vercel/logger"
import { convertProfileToMarkdown } from "../vercel/util"

const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	if (!url) return defaultUrl
	return url.endsWith("/") ? url.slice(0, -1) : url
}

/**
 * Configuration options for the Supermemory OpenAI middleware.
 */
export interface SupermemoryOpenAIOptions {
	/** Container tag/identifier for memory search (e.g., user ID) */
	containerTag: string
	/** Custom ID to group messages into a single document (e.g., conversation ID) */
	customId: string
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY env var) */
	apiKey?: string
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/** Enable detailed logging of memory search and injection */
	verbose?: boolean
	/**
	 * Memory retrieval mode:
	 * - "profile": Retrieves user profile memories (static + dynamic) without query filtering
	 * - "query": Searches memories based on semantic similarity to the user's message
	 * - "full": Combines both profile and query-based results
	 */
	mode?: "profile" | "query" | "full"
	/**
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories (default)
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
}

interface SupermemoryProfileSearch {
	profile: {
		static?: Array<{ memory: string; metadata?: Record<string, unknown> }>
		dynamic?: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}
	searchResults: {
		results: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}
}

/**
 * Extracts the last user message from an array of chat completion messages.
 *
 * Searches through the messages array in reverse order to find the most recent
 * message with role "user" and returns its content as a string.
 *
 * @param messages - Array of chat completion message parameters
 * @returns The content of the last user message, or empty string if none found
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "Hello there!" },
 *   { role: "assistant", content: "Hi! How can I help you?" },
 *   { role: "user", content: "What's the weather like?" }
 * ]
 *
 * const lastMessage = getLastUserMessage(messages)
 * // Returns: "What's the weather like?"
 * ```
 */
const getLastUserMessage = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) => {
	const lastUserMessage = messages
		.slice()
		.reverse()
		.find((msg) => msg.role === "user")

	return typeof lastUserMessage?.content === "string"
		? lastUserMessage.content
		: ""
}

/**
 * Searches for memories using the SuperMemory profile API.
 *
 * Makes a POST request to the SuperMemory API to retrieve user profile memories
 * and search results based on the provided container tag and optional query text.
 *
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param queryText - Optional query text to search for specific memories. If empty, returns all profile memories
 * @param baseUrl - Base URL for the Supermemory API
 * @param apiKey - Supermemory API key
 * @returns Promise that resolves to the SuperMemory profile search response
 * @throws {Error} When the API request fails or returns an error status
 *
 * @example
 * ```typescript
 * // Search with query
 * const results = await supermemoryProfileSearch("user-123", "favorite programming language", baseUrl, apiKey)
 *
 * // Get all profile memories
 * const profile = await supermemoryProfileSearch("user-123", "", baseUrl, apiKey)
 * ```
 */
const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
	baseUrl: string,
	apiKey: string,
): Promise<SupermemoryProfileSearch> => {
	const payload = queryText
		? JSON.stringify({
				q: queryText,
				containerTag: containerTag,
			})
		: JSON.stringify({
				containerTag: containerTag,
			})

	try {
		const response = await fetch(`${baseUrl}/v4/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: payload,
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error")
			throw new Error(
				`Supermemory profile search failed: ${response.status} ${response.statusText}. ${errorText}`,
			)
		}

		return await response.json()
	} catch (error) {
		if (error instanceof Error) {
			throw error
		}
		throw new Error(`Supermemory API request failed: ${error}`)
	}
}

/**
 * Adds memory-enhanced system prompts to chat completion messages.
 *
 * Searches for relevant memories based on the specified mode and injects them
 * into the conversation. If a system prompt already exists, memories are appended
 * to it. Otherwise, a new system prompt is created with the memories.
 *
 * @param messages - Array of chat completion message parameters
 * @param containerTag - The container tag/identifier for memory search
 * @param logger - Logger instance for debugging and info output
 * @param mode - Memory search mode: "profile" (all memories), "query" (search-based), or "full" (both)
 * @param baseUrl - Base URL for the Supermemory API
 * @param apiKey - Supermemory API key
 * @returns Promise that resolves to enhanced messages with memory-injected system prompt
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: "user", content: "What's my favorite programming language?" }
 * ]
 *
 * const enhancedMessages = await addSystemPrompt(
 *   messages,
 *   "user-123",
 *   logger,
 *   "full",
 *   baseUrl,
 *   apiKey
 * )
 * // Returns messages with system prompt containing relevant memories
 * ```
 */
const addSystemPrompt = async (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
	baseUrl: string,
	apiKey: string,
) => {
	const systemPromptExists = messages.some((msg) => msg.role === "system")

	const queryText = mode !== "profile" ? getLastUserMessage(messages) : ""

	const memoriesResponse = await supermemoryProfileSearch(
		containerTag,
		queryText,
		baseUrl,
		apiKey,
	)

	const memoryCountStatic = memoriesResponse.profile.static?.length || 0
	const memoryCountDynamic = memoriesResponse.profile.dynamic?.length || 0

	logger.info("Memory search completed for chat API", {
		containerTag,
		memoryCountStatic,
		memoryCountDynamic,
		queryText:
			queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
		mode,
	})

	const deduplicated = deduplicateMemories({
		static: memoriesResponse.profile.static,
		dynamic: memoriesResponse.profile.dynamic,
		searchResults: memoriesResponse.searchResults?.results,
	})

	logger.debug("Memory deduplication completed for chat API", {
		static: {
			original: memoryCountStatic,
			deduplicated: deduplicated.static.length,
		},
		dynamic: {
			original: memoryCountDynamic,
			deduplicated: deduplicated.dynamic.length,
		},
		searchResults: {
			original: memoriesResponse.searchResults?.results?.length,
			deduplicated: deduplicated.searchResults.length,
		},
	})

	const profileData =
		mode !== "query"
			? convertProfileToMarkdown({
					profile: {
						static: deduplicated.static,
						dynamic: deduplicated.dynamic,
					},
					searchResults: { results: [] },
				})
			: ""
	const searchResultsMemories =
		mode !== "profile"
			? `Search results for user's recent message: \n${deduplicated.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""

	const memories = `${profileData}\n${searchResultsMemories}`.trim()

	if (memories) {
		logger.debug("Memory content preview for chat API", {
			content: memories,
			fullLength: memories.length,
		})
	}

	if (systemPromptExists) {
		logger.debug("Added memories to existing system prompt")
		return messages.map((msg) =>
			msg.role === "system"
				? { ...msg, content: `${msg.content} \n ${memories}` }
				: msg,
		)
	}

	logger.debug(
		"System prompt does not exist, created system prompt with memories",
	)
	return [{ role: "system" as const, content: memories }, ...messages]
}

/**
 * Converts an array of chat completion messages into a formatted conversation string.
 *
 * Transforms the messages array into a readable conversation format where each
 * message is prefixed with its role (User/Assistant) and messages are separated
 * by double newlines.
 *
 * @param messages - Array of chat completion message parameters
 * @returns Formatted conversation string with role prefixes
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: "user", content: "Hello!" },
 *   { role: "assistant", content: "Hi there!" },
 *   { role: "user", content: "How are you?" }
 * ]
 *
 * const conversation = getConversationContent(messages)
 * // Returns: "User: Hello!\n\nAssistant: Hi there!\n\nUser: How are you?"
 * ```
 */
const getConversationContent = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) => {
	return messages
		.map((msg) => {
			const role = msg.role === "user" ? "User" : "Assistant"
			const content = typeof msg.content === "string" ? msg.content : ""
			return `${role}: ${content}`
		})
		.join("\n\n")
}

/**
 * Adds a new memory to the SuperMemory system.
 *
 * Saves the provided content as a memory with the specified container tag and
 * optional custom ID. Logs success or failure information for debugging.
 *
 * If customId starts with "conversation:" and messages are provided, uses the
 * /v4/conversations endpoint with structured messages instead of the memories endpoint.
 *
 * @param client - SuperMemory client instance
 * @param containerTag - The container tag/identifier for the memory
 * @param content - The content to save as a memory (used for fallback)
 * @param customId - Optional custom ID for the memory (e.g., conversation:456)
 * @param logger - Logger instance for debugging and info output
 * @param messages - Optional OpenAI messages array (for conversation endpoint)
 * @param apiKey - API key for direct conversation endpoint calls
 * @param baseUrl - Base URL for API calls
 * @returns Promise that resolves when memory is saved (or fails silently)
 *
 * @example
 * ```typescript
 * await addMemoryTool(
 *   supermemoryClient,
 *   "user-123",
 *   "User: Hello\n\nAssistant: Hi!",
 *   "conversation:456",
 *   logger,
 *   messages, // OpenAI messages array
 *   apiKey,
 *   baseUrl
 * )
 * ```
 */
const addMemoryTool = async (
	client: Supermemory,
	containerTag: string,
	content: string,
	customId: string | undefined,
	logger: Logger,
	messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	apiKey?: string,
	baseUrl?: string,
): Promise<void> => {
	try {
		if (customId && messages && apiKey) {
			const conversationId = customId.replace("conversation:", "")

			// Convert OpenAI messages to conversation format
			const conversationMessages = messages.map((msg) => ({
				role: msg.role as "user" | "assistant" | "system" | "tool",
				content:
					typeof msg.content === "string"
						? msg.content
						: Array.isArray(msg.content)
							? msg.content
									.filter((c) => c.type === "text")
									.map((c) => ({
										type: "text" as const,
										text: (c as { type: "text"; text: string }).text,
									}))
							: "",
				...((msg as any).name && { name: (msg as any).name }),
				...((msg as any).tool_calls && { tool_calls: (msg as any).tool_calls }),
				...((msg as any).tool_call_id && {
					tool_call_id: (msg as any).tool_call_id,
				}),
			}))

			const response = await addConversation({
				conversationId,
				messages: conversationMessages,
				containerTags: [containerTag],
				apiKey,
				baseUrl,
			})

			logger.info("Conversation saved successfully via /v4/conversations", {
				containerTag,
				conversationId,
				messageCount: messages.length,
				responseId: response.id,
			})
			return
		}

		// Fallback to old behavior for non-conversation memories
		const response = await client.add({
			content,
			containerTags: [containerTag],
			customId,
		})

		logger.info("Memory saved successfully", {
			containerTag,
			customId,
			contentLength: content.length,
			memoryId: response.id,
		})
	} catch (error) {
		logger.error("Error saving memory", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}

/**
 * Creates SuperMemory middleware for OpenAI clients.
 *
 * This function creates middleware that automatically injects relevant memories
 * into OpenAI chat completions and optionally saves new memories. The middleware
 * can wrap existing OpenAI clients or create new ones with SuperMemory capabilities.
 *
 * @param openaiClient - The OpenAI client to wrap
 * @param options - Configuration options for the middleware
 * @returns OpenAI client with SuperMemory middleware injected
 *
 * @example
 * ```typescript
 * const openaiWithSupermemory = createOpenAIMiddleware(openai, {
 *   containerTag: "user-123",
 *   customId: "conv-456",
 *   mode: "full",
 *   addMemory: "always",
 *   verbose: true,
 * })
 * ```
 */
export function createOpenAIMiddleware(
	openaiClient: OpenAI,
	options: SupermemoryOpenAIOptions & { apiKey: string },
) {
	const {
		containerTag,
		customId,
		apiKey,
		baseUrl,
		verbose = false,
		mode = "profile",
		addMemory = "always",
	} = options

	const logger = createLogger(verbose)
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
	const client = new Supermemory({
		apiKey,
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseURL: normalizedBaseUrl }
			: {}),
	})

	const originalCreate = openaiClient.chat.completions.create
	const originalResponsesCreate = openaiClient.responses?.create

	/**
	 * Searches for memories and formats them for injection into API calls.
	 *
	 * This shared function handles memory search and formatting for both Chat Completions
	 * and Responses APIs, reducing code duplication.
	 *
	 * @param queryText - The text to search for (empty string for profile-only mode)
	 * @param containerTag - The container tag for memory search
	 * @param logger - Logger instance
	 * @param mode - Memory search mode
	 * @param context - API context for logging differentiation
	 * @returns Formatted memories string
	 */
	const searchAndFormatMemories = async (
		queryText: string,
		containerTag: string,
		logger: Logger,
		mode: "profile" | "query" | "full",
		context: "chat" | "responses",
	) => {
		const memoriesResponse = await supermemoryProfileSearch(
			containerTag,
			queryText,
			normalizedBaseUrl,
			apiKey,
		)

		const memoryCountStatic = memoriesResponse.profile.static?.length || 0
		const memoryCountDynamic = memoriesResponse.profile.dynamic?.length || 0

		logger.info(`Memory search completed for ${context} API`, {
			containerTag,
			memoryCountStatic,
			memoryCountDynamic,
			queryText:
				queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
			mode,
		})

		const deduplicated = deduplicateMemories({
			static: memoriesResponse.profile.static,
			dynamic: memoriesResponse.profile.dynamic,
			searchResults: memoriesResponse.searchResults?.results,
		})

		logger.debug(`Memory deduplication completed for ${context} API`, {
			static: {
				original: memoryCountStatic,
				deduplicated: deduplicated.static.length,
			},
			dynamic: {
				original: memoryCountDynamic,
				deduplicated: deduplicated.dynamic.length,
			},
			searchResults: {
				original: memoriesResponse.searchResults?.results?.length,
				deduplicated: deduplicated.searchResults.length,
			},
		})

		const profileData =
			mode !== "query"
				? convertProfileToMarkdown({
						profile: {
							static: deduplicated.static,
							dynamic: deduplicated.dynamic,
						},
						searchResults: { results: [] },
					})
				: ""
		const searchResultsMemories =
			mode !== "profile"
				? `Search results for user's ${context === "chat" ? "recent message" : "input"}: \n${deduplicated.searchResults
						.map((memory) => `- ${memory}`)
						.join("\n")}`
				: ""

		const memories = `${profileData}\n${searchResultsMemories}`.trim()

		if (memories) {
			logger.debug(`Memory content preview for ${context} API`, {
				content: memories,
				fullLength: memories.length,
			})
		}

		return memories
	}

	const createResponsesWithMemory = async (
		params: Parameters<typeof originalResponsesCreate>[0],
	) => {
		if (!originalResponsesCreate) {
			throw new Error(
				"Responses API is not available in this OpenAI client version",
			)
		}

		const input = typeof params.input === "string" ? params.input : ""

		if (mode !== "profile" && !input) {
			logger.debug("No input found for Responses API, skipping memory search")
			return originalResponsesCreate.call(openaiClient.responses, params)
		}

		logger.info("Starting memory search for Responses API", {
			containerTag,
			customId,
			mode,
		})

		const operations: Promise<any>[] = []

		if (addMemory === "always" && input?.trim()) {
			const content = customId ? `Input: ${input}` : input
			const memoryCustomId = customId ? `conversation:${customId}` : undefined

			// Note: Responses API doesn't have a messages array, so we pass undefined
			// This means it will use the regular memory storage instead of conversation endpoint
			operations.push(
				addMemoryTool(
					client,
					containerTag,
					content,
					memoryCustomId,
					logger,
					undefined, // No messages for Responses API
					apiKey,
					normalizedBaseUrl,
				),
			)
		}

		const queryText = mode !== "profile" ? input : ""
		operations.push(
			searchAndFormatMemories(
				queryText,
				containerTag,
				logger,
				mode,
				"responses",
			),
		)

		const results = await Promise.all(operations)
		const memories = results[results.length - 1] // Memory search result is always last

		const enhancedInstructions = memories
			? `${params.instructions || ""}\n\n${memories}`.trim()
			: params.instructions

		return originalResponsesCreate.call(openaiClient.responses, {
			...params,
			instructions: enhancedInstructions,
		})
	}

	const createWithMemory = async (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
	) => {
		const messages = Array.isArray(params.messages) ? params.messages : []

		if (mode !== "profile") {
			const userMessage = getLastUserMessage(messages)
			if (!userMessage) {
				logger.debug("No user message found, skipping memory search")
				return originalCreate.call(openaiClient.chat.completions, params)
			}
		}

		logger.info("Starting memory search", {
			containerTag,
			customId,
			mode,
		})

		const operations: Promise<any>[] = []

		if (addMemory === "always") {
			const userMessage = getLastUserMessage(messages)
			if (userMessage?.trim()) {
				const content = customId
					? getConversationContent(messages)
					: userMessage
				const memoryCustomId = customId ? `conversation:${customId}` : undefined

				operations.push(
					addMemoryTool(
						client,
						containerTag,
						content,
						memoryCustomId,
						logger,
						messages,
						apiKey,
						normalizedBaseUrl,
					),
				)
			}
		}

		operations.push(
			addSystemPrompt(
				messages,
				containerTag,
				logger,
				mode,
				normalizedBaseUrl,
				apiKey,
			),
		)

		const results = await Promise.all(operations)
		const enhancedMessages = results[results.length - 1] // Enhanced messages result is always last

		return originalCreate.call(openaiClient.chat.completions, {
			...params,
			messages: enhancedMessages,
		})
	}

	openaiClient.chat.completions.create =
		createWithMemory as typeof originalCreate

	// Wrap Responses API if available
	if (originalResponsesCreate) {
		openaiClient.responses.create =
			createResponsesWithMemory as typeof originalResponsesCreate
	}

	return openaiClient
}
