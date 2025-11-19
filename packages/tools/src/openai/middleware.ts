import type OpenAI from "openai"
import Supermemory from "supermemory"
import { createLogger, type Logger } from "../vercel/logger"
import { convertProfileToMarkdown } from "../vercel/util"

export interface OpenAIMiddlewareOptions {
	conversationId?: string
	verbose?: boolean
	mode?: "profile" | "query" | "full"
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
 * @returns Promise that resolves to the SuperMemory profile search response
 * @throws {Error} When the API request fails or returns an error status
 *
 * @example
 * ```typescript
 * // Search with query
 * const results = await supermemoryProfileSearch("user-123", "favorite programming language")
 *
 * // Get all profile memories
 * const profile = await supermemoryProfileSearch("user-123", "")
 * ```
 */
const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
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
		const response = await fetch("https://api.supermemory.ai/v4/profile", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
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
 *   "full"
 * )
 * // Returns messages with system prompt containing relevant memories
 * ```
 */
const addSystemPrompt = async (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
) => {
	const systemPromptExists = messages.some((msg) => msg.role === "system")

	const queryText = mode !== "profile" ? getLastUserMessage(messages) : ""

	const memories = await searchAndFormatMemories(
		queryText,
		containerTag,
		logger,
		mode,
		"chat",
	)

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
 * @param client - SuperMemory client instance
 * @param containerTag - The container tag/identifier for the memory
 * @param content - The content to save as a memory
 * @param customId - Optional custom ID for the memory (e.g., conversation ID)
 * @param logger - Logger instance for debugging and info output
 * @returns Promise that resolves when memory is saved (or fails silently)
 *
 * @example
 * ```typescript
 * await addMemoryTool(
 *   supermemoryClient,
 *   "user-123",
 *   "User prefers React with TypeScript",
 *   "conversation-456",
 *   logger
 * )
 * ```
 */
const addMemoryTool = async (
	client: Supermemory,
	containerTag: string,
	content: string,
	customId: string | undefined,
	logger: Logger,
): Promise<void> => {
	try {
		const response = await client.memories.add({
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
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 * @param options.conversationId - Optional conversation ID to group messages for contextual memory generation
 * @param options.verbose - Enable detailed logging of memory operations (default: false)
 * @param options.mode - Memory search mode: "profile" (all memories), "query" (search-based), or "full" (both) (default: "profile")
 * @param options.addMemory - Automatic memory storage mode: "always" or "never" (default: "never")
 * @returns Object with `wrapClient` and `createClient` methods
 * @throws {Error} When SUPERMEMORY_API_KEY environment variable is not set
 *
 * @example
 * ```typescript
 * const openaiWithSupermemory = createOpenAIMiddleware(openai, "user-123", {
 *   conversationId: "conversation-456",
 *   mode: "full",
 *   addMemory: "always",
 *   verbose: true
 * })
 *
 * ```
 */
export function createOpenAIMiddleware(
	openaiClient: OpenAI,
	containerTag: string,
	options?: OpenAIMiddlewareOptions,
) {
	const logger = createLogger(options?.verbose ?? false)
	const client = new Supermemory({
		apiKey: process.env.SUPERMEMORY_API_KEY,
	})

	const conversationId = options?.conversationId
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "never"

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

		const profileData =
			mode !== "query"
				? convertProfileToMarkdown({
						profile: {
							static: memoriesResponse.profile.static?.map((item) => item.memory),
							dynamic: memoriesResponse.profile.dynamic?.map(
								(item) => item.memory,
							),
						},
						searchResults: {
							results: memoriesResponse.searchResults.results.map((item) => ({
								memory: item.memory,
							})) as [{ memory: string }],
						},
					})
				: ""
		const searchResultsMemories =
			mode !== "profile"
				? `Search results for user's ${context === "chat" ? "recent message" : "input"}: \n${memoriesResponse.searchResults.results
						.map((result) => `- ${result.memory}`)
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
			throw new Error("Responses API is not available in this OpenAI client version")
		}

		const input = typeof params.input === "string" ? params.input : ""

		if (mode !== "profile" && !input) {
			logger.debug("No input found for Responses API, skipping memory search")
			return originalResponsesCreate.call(openaiClient.responses, params)
		}

		logger.info("Starting memory search for Responses API", {
			containerTag,
			conversationId,
			mode,
		})

		const operations: Promise<any>[] = []

		if (addMemory === "always" && input?.trim()) {
			const content = conversationId
				? `Input: ${input}`
				: input
			const customId = conversationId
				? `conversation:${conversationId}`
				: undefined

			operations.push(addMemoryTool(client, containerTag, content, customId, logger))
		}

		const queryText = mode !== "profile" ? input : ""
		operations.push(searchAndFormatMemories(
			queryText,
			containerTag,
			logger,
			mode,
			"responses",
		))

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
			conversationId,
			mode,
		})

		const operations: Promise<any>[] = []

		if (addMemory === "always") {
			const userMessage = getLastUserMessage(messages)
			if (userMessage?.trim()) {
				const content = conversationId
					? getConversationContent(messages)
					: userMessage
				const customId = conversationId
					? `conversation:${conversationId}`
					: undefined

				operations.push(addMemoryTool(client, containerTag, content, customId, logger))
			}
		}

		operations.push(addSystemPrompt(
			messages,
			containerTag,
			logger,
			mode,
		))

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
