import type OpenAI from "openai"
import { APIPromise } from "openai/core"
import Supermemory from "supermemory"
import {
	addConversation,
	type ContentPart as ConversationContentPart,
	type ConversationMessage,
	toConversationImageUrl,
} from "../conversations-client"
import {
	replaceMemoryContext,
	stripMemoryContext,
	wrapMemoryContext,
} from "../shared"
import { deduplicateMemoriesForMode } from "../tools-shared"
import { createLogger, type Logger } from "../vercel/logger"
import { convertProfileToMarkdown } from "../vercel/util"

const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	return url?.trim().replace(/\/+$/, "") || defaultUrl
}

const PROFILE_REQUEST_TIMEOUT_MS = 30_000

const deferAPIPromise = <T>(
	start: () => Promise<{ request: APIPromise<T> }>,
): APIPromise<T> => {
	const ready = start()

	const responsePromise = ready.then(async ({ request }) => ({
		response: await request.asResponse(),
		options: {} as never,
		controller: new AbortController(),
	}))

	return new APIPromise<T>(responsePromise, async () => {
		const { request } = await ready
		return await request
	})
}

export interface OpenAIMiddlewareOptions {
	/** Container tag/identifier for memory search (e.g., user ID, project ID). Required. */
	containerTag: string
	/** Custom ID to group messages into a single document. Required. */
	customId: string
	verbose?: boolean
	mode?: "profile" | "query" | "full"
	addMemory?: "always" | "never"
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY). */
	apiKey?: string
	baseUrl?: string
}

interface SupermemoryProfileSearchResult {
	id: string
	memory?: string
	chunk?: string
	metadata: Record<string, unknown> | null
	updatedAt: string
	similarity: number
}

interface SupermemoryProfileSearch {
	profile: {
		static?: string[]
		dynamic?: string[]
		buckets?: Record<string, string[]>
	}
	searchResults?: {
		results: SupermemoryProfileSearchResult[]
		total: number
		timing: number
	}
}

const extractTextContent = (content: unknown): string => {
	if (typeof content === "string") return content.trim()
	if (!Array.isArray(content)) return ""

	return content
		.flatMap((part) => {
			if (!part || typeof part !== "object") return []
			const { type, text } = part as { type?: unknown; text?: unknown }
			if (
				(type === "text" || type === "input_text") &&
				typeof text === "string" &&
				text.trim()
			) {
				return [text.trim()]
			}
			return []
		})
		.join("\n")
}

const convertConversationContent = (
	content: unknown,
): string | ConversationContentPart[] => {
	if (typeof content === "string") return content
	if (!Array.isArray(content)) return ""

	const converted: ConversationContentPart[] = []
	for (const value of content) {
		if (!value || typeof value !== "object") continue
		const part = value as {
			type?: unknown
			text?: unknown
			image_url?: { url?: unknown }
		}
		if (part.type === "text" && typeof part.text === "string") {
			converted.push({ type: "text", text: part.text })
		} else if (
			part.type === "image_url" &&
			typeof part.image_url?.url === "string"
		) {
			converted.push({
				type: "image_url",
				imageUrl: { url: part.image_url.url },
			})
		}
	}

	return converted
}

const convertChatConversationMessages = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): ConversationMessage[] => {
	return messages.map((message) => ({
		role:
			message.role === "developer"
				? "system"
				: message.role === "function"
					? "tool"
					: message.role,
		content: convertConversationContent(message.content),
		...("name" in message && message.name && { name: message.name }),
		...("tool_calls" in message &&
			message.tool_calls && { tool_calls: message.tool_calls }),
		...("tool_call_id" in message &&
			message.tool_call_id && { tool_call_id: message.tool_call_id }),
	}))
}

const convertResponsesConversationMessages = (
	input: unknown,
): ConversationMessage[] => {
	if (typeof input === "string") {
		return input.trim() ? [{ role: "user", content: input }] : []
	}
	if (!Array.isArray(input)) return []

	const messages: ConversationMessage[] = []
	for (const item of input) {
		if (!item || typeof item !== "object") continue
		const structuredItem = item as {
			type?: unknown
			call_id?: unknown
			name?: unknown
			arguments?: unknown
			output?: unknown
		}
		if (
			structuredItem.type === "function_call" &&
			typeof structuredItem.call_id === "string" &&
			typeof structuredItem.name === "string" &&
			typeof structuredItem.arguments === "string"
		) {
			messages.push({
				role: "assistant",
				content: "",
				tool_calls: [
					{
						id: structuredItem.call_id,
						type: "function",
						function: {
							name: structuredItem.name,
							arguments: structuredItem.arguments,
						},
					},
				],
			})
			continue
		}
		if (
			structuredItem.type === "function_call_output" &&
			typeof structuredItem.call_id === "string" &&
			typeof structuredItem.output === "string"
		) {
			messages.push({
				role: "tool",
				content: structuredItem.output,
				tool_call_id: structuredItem.call_id,
			})
			continue
		}

		const message = item as { role?: unknown; content?: unknown }
		if (
			message.role !== "user" &&
			message.role !== "assistant" &&
			message.role !== "system" &&
			message.role !== "developer"
		) {
			continue
		}

		const role = message.role === "developer" ? "system" : message.role
		if (typeof message.content === "string") {
			if (message.content.trim())
				messages.push({ role, content: message.content })
			continue
		}
		if (!Array.isArray(message.content)) continue

		const content: ConversationContentPart[] = []
		for (const part of message.content) {
			if (!part || typeof part !== "object") continue
			const value = part as {
				type?: unknown
				text?: unknown
				image_url?: unknown
			}
			if (
				(value.type === "text" ||
					value.type === "input_text" ||
					value.type === "output_text") &&
				typeof value.text === "string" &&
				value.text
			) {
				content.push({ type: "text", text: value.text })
			} else if (value.type === "input_image") {
				const url = toConversationImageUrl(value.image_url)
				if (url) content.push({ type: "image_url", imageUrl: { url } })
			}
		}

		if (content.length > 0) messages.push({ role, content })
	}

	return messages
}

const hasPersistableUserConversationMessage = (
	messages: ConversationMessage[],
): boolean => {
	return messages.some(
		(message) =>
			message.role === "user" &&
			(typeof message.content === "string"
				? Boolean(message.content.trim())
				: message.content.length > 0),
	)
}

const getLastResponsesUserInput = (input: unknown): string => {
	if (typeof input === "string") return input.trim()
	if (!Array.isArray(input)) return ""

	for (let index = input.length - 1; index >= 0; index -= 1) {
		const item = input[index]
		if (!item || typeof item !== "object") continue
		const message = item as { role?: unknown; content?: unknown }
		if (message.role === "user") {
			return extractTextContent(message.content)
		}
	}

	return ""
}

const stripResponsesInputMemoryContexts = <T>(input: T): T => {
	if (!Array.isArray(input)) return input

	let inputChanged = false
	const cleanedInput = input.map((item) => {
		if (!item || typeof item !== "object") return item
		const message = item as { role?: unknown; content?: unknown }
		if (message.role !== "system" && message.role !== "developer") return item

		if (typeof message.content === "string") {
			const content = stripMemoryContext(message.content)
			if (content === message.content) return item
			inputChanged = true
			return { ...item, content }
		}

		if (!Array.isArray(message.content)) return item
		let contentChanged = false
		const content = message.content.map((part) => {
			if (!part || typeof part !== "object") return part
			const textPart = part as { type?: unknown; text?: unknown }
			if (
				(textPart.type !== "text" && textPart.type !== "input_text") ||
				typeof textPart.text !== "string"
			) {
				return part
			}
			const text = stripMemoryContext(textPart.text)
			if (text === textPart.text) return part
			contentChanged = true
			return { ...part, text }
		})

		if (!contentChanged) return item
		inputChanged = true
		return { ...item, content }
	})

	return (inputChanged ? cleanedInput : input) as T
}

const getSearchResultMemories = (
	results: SupermemoryProfileSearchResult[] | undefined,
): string[] => {
	return (results ?? []).flatMap((result) => {
		for (const value of [result.memory, result.chunk]) {
			if (typeof value === "string" && value.trim()) return [value.trim()]
		}
		return []
	})
}

type ChatInstructionMessage =
	| OpenAI.Chat.Completions.ChatCompletionDeveloperMessageParam
	| OpenAI.Chat.Completions.ChatCompletionSystemMessageParam

const isChatInstructionMessage = (
	message: OpenAI.Chat.Completions.ChatCompletionMessageParam,
): message is ChatInstructionMessage =>
	message.role === "developer" || message.role === "system"

const updateInstructionMessageMemoryContext = (
	message: ChatInstructionMessage,
	memories?: string,
): ChatInstructionMessage => {
	if (typeof message.content === "string") {
		return {
			...message,
			content:
				memories === undefined
					? stripMemoryContext(message.content)
					: replaceMemoryContext(message.content, memories),
		}
	}

	let injected = false
	const content = message.content.map((part) => {
		if (memories !== undefined && !injected) {
			injected = true
			return { ...part, text: replaceMemoryContext(part.text, memories) }
		}
		return { ...part, text: stripMemoryContext(part.text) }
	})

	if (memories !== undefined && !injected) {
		const memoryContext = wrapMemoryContext(memories)
		if (memoryContext) content.push({ type: "text", text: memoryContext })
	}

	return { ...message, content }
}

const updateChatMemoryContexts = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	memories?: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
	const developerIndex = messages.findIndex(
		(message) => message.role === "developer",
	)
	const injectionIndex =
		developerIndex >= 0
			? developerIndex
			: messages.findIndex((message) => message.role === "system")

	return messages.map((message, index) => {
		if (!isChatInstructionMessage(message)) return message
		return updateInstructionMessageMemoryContext(
			message,
			memories !== undefined && index === injectionIndex ? memories : undefined,
		)
	})
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

	return extractTextContent(lastUserMessage?.content)
}

/**
 * Searches for memories using the SuperMemory profile API.
 *
 * Makes a POST request to the SuperMemory API to retrieve user profile memories
 * and search results based on the provided container tag and optional query text.
 *
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param queryText - Optional query text to search for specific memories. If empty, returns all profile memories
 * @param apiKey - The Supermemory API key used to authenticate the request
 * @param baseUrl - The Supermemory API base URL
 * @returns Promise that resolves to the SuperMemory profile search response
 * @throws {Error} When the API request fails or returns an error status
 *
 * @example
 * ```typescript
 * // Search with query
 * const results = await supermemoryProfileSearch("user-123", "favorite programming language", apiKey, baseUrl)
 *
 * // Get all profile memories
 * const profile = await supermemoryProfileSearch("user-123", "", apiKey, baseUrl)
 * ```
 */
const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
	apiKey: string,
	baseUrl: string,
): Promise<SupermemoryProfileSearch> => {
	const payload = queryText
		? JSON.stringify({
				q: queryText,
				containerTag: containerTag,
				include: ["static", "dynamic"],
			})
		: JSON.stringify({
				containerTag: containerTag,
				include: ["static", "dynamic"],
			})

	try {
		const response = await fetch(`${baseUrl}/v4/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: payload,
			redirect: "error",
			signal: AbortSignal.timeout(PROFILE_REQUEST_TIMEOUT_MS),
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
 * @param apiKey - The Supermemory API key used to authenticate the request
 * @param baseUrl - The Supermemory API base URL
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
 *   apiKey,
 *   baseUrl
 * )
 * // Returns messages with system prompt containing relevant memories
 * ```
 */
const addSystemPrompt = async (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
	apiKey: string,
	baseUrl: string,
) => {
	const instructionPromptExists = messages.some(isChatInstructionMessage)

	const queryText = mode !== "profile" ? getLastUserMessage(messages) : ""

	const memoriesResponse = await supermemoryProfileSearch(
		containerTag,
		queryText,
		apiKey,
		baseUrl,
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

	const deduplicated = deduplicateMemoriesForMode(mode, {
		static: memoriesResponse.profile.static,
		dynamic: memoriesResponse.profile.dynamic,
		searchResults: getSearchResultMemories(
			memoriesResponse.searchResults?.results,
		),
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
		mode !== "profile" && deduplicated.searchResults.length > 0
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

	if (instructionPromptExists) {
		logger.debug("Replaced Supermemory context in existing instruction prompt")
		return updateChatMemoryContexts(messages, memories)
	}

	logger.debug(
		"System prompt does not exist, created system prompt with memories",
	)
	const memoryContext = wrapMemoryContext(memories)
	return memoryContext
		? [{ role: "system" as const, content: memoryContext }, ...messages]
		: messages
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
			const content = extractTextContent(msg.content)
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
 * @param conversationMessages - Optional normalized messages (for conversation endpoint)
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
	conversationMessages?: ConversationMessage[],
	apiKey?: string,
	baseUrl?: string,
): Promise<void> => {
	try {
		if (customId && conversationMessages && apiKey) {
			const conversationId = customId.replace("conversation:", "")

			const response = await addConversation({
				conversationId,
				messages: conversationMessages,
				containerTags: [containerTag],
				apiKey,
				baseUrl,
			})

			logger.info("Conversation saved successfully via /v4/conversations", {
				containerTag,
				customId,
				messageCount: conversationMessages.length,
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
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 * @param options.customId - Optional conversation ID to group messages for contextual memory generation
 * @param options.verbose - Enable detailed logging of memory operations (default: false)
 * @param options.mode - Memory search mode: "profile" (all memories), "query" (search-based), or "full" (both) (default: "profile")
 * @param options.addMemory - Automatic memory storage mode: "always" or "never" (default: "always")
 * @param options.apiKey - Supermemory API key (falls back to SUPERMEMORY_API_KEY)
 * @returns Object with `wrapClient` and `createClient` methods
 * @throws {Error} When neither options.apiKey nor SUPERMEMORY_API_KEY is set
 *
 * @example
 * ```typescript
 * const openaiWithSupermemory = createOpenAIMiddleware(openai, "user-123", {
 *   customId: "conversation-456",
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
	const apiKey =
		options?.apiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim() || ""
	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via options.apiKey or set the environment variable",
		)
	}
	const baseUrl = normalizeBaseUrl(options?.baseUrl)
	const client = new Supermemory({
		apiKey,
		...(baseUrl !== "https://api.supermemory.ai" ? { baseURL: baseUrl } : {}),
	})

	const customId = options?.customId
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "always"

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
			apiKey,
			baseUrl,
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

		const deduplicated = deduplicateMemoriesForMode(mode, {
			static: memoriesResponse.profile.static,
			dynamic: memoriesResponse.profile.dynamic,
			searchResults: getSearchResultMemories(
				memoriesResponse.searchResults?.results,
			),
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
			mode !== "profile" && deduplicated.searchResults.length > 0
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

	const prepareResponsesWithMemory = async (
		params: Parameters<typeof originalResponsesCreate>[0],
		requestOptions?: OpenAI.RequestOptions,
	) => {
		if (!originalResponsesCreate) {
			throw new Error(
				"Responses API is not available in this OpenAI client version",
			)
		}

		const input = getLastResponsesUserInput(params.input)
		const cleanedInput = stripResponsesInputMemoryContexts(params.input)
		const conversationMessages =
			convertResponsesConversationMessages(cleanedInput)
		const shouldPersist =
			addMemory === "always" &&
			(customId
				? hasPersistableUserConversationMessage(conversationMessages)
				: Boolean(input.trim()))
		const memoryCustomId = customId ? `conversation:${customId}` : undefined

		const persistResponsesInput = () =>
			addMemoryTool(
				client,
				containerTag,
				input,
				memoryCustomId,
				logger,
				conversationMessages,
				apiKey,
				baseUrl,
			)

		if (mode !== "profile" && !input) {
			if (shouldPersist) await persistResponsesInput()
			logger.debug(
				"No textual user input found for Responses API, skipping memory search",
			)
			const cleanedParams = {
				...params,
				input: cleanedInput,
				...(typeof params.instructions === "string"
					? { instructions: stripMemoryContext(params.instructions) }
					: {}),
			}
			return {
				request: originalResponsesCreate.call(
					openaiClient.responses,
					cleanedParams,
					requestOptions,
				),
			}
		}

		logger.info("Starting memory search for Responses API", {
			containerTag,
			customId,
			mode,
		})

		const operations: Promise<unknown>[] = []

		if (shouldPersist) operations.push(persistResponsesInput())

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

		let enhancedInstructions: string
		try {
			const results = await Promise.all(operations)
			const memories = results[results.length - 1] // Memory search result is always last

			enhancedInstructions = replaceMemoryContext(
				params.instructions || "",
				typeof memories === "string" ? memories : "",
			)
		} catch (error) {
			logger.warn(
				"Memory search failed for Responses API; continuing without stale Supermemory context",
				{
					error: error instanceof Error ? error.message : "Unknown error",
				},
			)
			enhancedInstructions =
				typeof params.instructions === "string"
					? stripMemoryContext(params.instructions)
					: ""
		}

		return {
			request: originalResponsesCreate.call(
				openaiClient.responses,
				{
					...params,
					input: cleanedInput,
					instructions: enhancedInstructions,
				},
				requestOptions,
			),
		}
	}

	const createResponsesWithMemory = (
		params: Parameters<typeof originalResponsesCreate>[0],
		requestOptions?: OpenAI.RequestOptions,
	) => deferAPIPromise(() => prepareResponsesWithMemory(params, requestOptions))

	const prepareCreateWithMemory = async (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
		requestOptions?: OpenAI.RequestOptions,
	) => {
		const messages = Array.isArray(params.messages) ? params.messages : []
		const userMessage = getLastUserMessage(messages)
		const conversationMessages = convertChatConversationMessages(
			updateChatMemoryContexts(messages),
		)
		const shouldPersist =
			addMemory === "always" &&
			(customId
				? hasPersistableUserConversationMessage(conversationMessages)
				: Boolean(userMessage.trim()))
		const memoryContent = customId
			? getConversationContent(messages)
			: userMessage
		const memoryCustomId = customId ? `conversation:${customId}` : undefined

		if (mode !== "profile" && !userMessage) {
			if (shouldPersist) {
				await addMemoryTool(
					client,
					containerTag,
					memoryContent,
					memoryCustomId,
					logger,
					conversationMessages,
					apiKey,
					baseUrl,
				)
			}
			logger.debug("No textual user message found, skipping memory search")
			return {
				request: originalCreate.call(
					openaiClient.chat.completions,
					{
						...params,
						messages: updateChatMemoryContexts(messages),
					},
					requestOptions,
				),
			}
		}

		logger.info("Starting memory search", {
			containerTag,
			customId,
			mode,
		})

		const operations: Promise<unknown>[] = []

		if (shouldPersist) {
			operations.push(
				addMemoryTool(
					client,
					containerTag,
					memoryContent,
					memoryCustomId,
					logger,
					conversationMessages,
					apiKey,
					baseUrl,
				),
			)
		}

		operations.push(
			addSystemPrompt(messages, containerTag, logger, mode, apiKey, baseUrl),
		)

		let enhancedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
		try {
			const results = await Promise.all(operations)
			enhancedMessages = results[
				results.length - 1
			] as OpenAI.Chat.Completions.ChatCompletionMessageParam[] // Enhanced messages result is always last
		} catch (error) {
			logger.warn(
				"Memory search failed for Chat Completions API; continuing without stale Supermemory context",
				{
					error: error instanceof Error ? error.message : "Unknown error",
				},
			)
			enhancedMessages = updateChatMemoryContexts(messages)
		}

		return {
			request: originalCreate.call(
				openaiClient.chat.completions,
				{
					...params,
					messages: enhancedMessages,
				},
				requestOptions,
			),
		}
	}

	const createWithMemory = (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
		requestOptions?: OpenAI.RequestOptions,
	) => deferAPIPromise(() => prepareCreateWithMemory(params, requestOptions))

	openaiClient.chat.completions.create =
		createWithMemory as typeof originalCreate

	// Wrap Responses API if available
	if (originalResponsesCreate) {
		openaiClient.responses.create =
			createResponsesWithMemory as typeof originalResponsesCreate
	}

	return openaiClient
}
