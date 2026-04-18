import type OpenAI from "openai"
import Supermemory from "supermemory"
import { addConversation } from "../conversations-client"
import {
	createLogger,
	normalizeBaseUrl,
	buildMemoriesText,
	type Logger,
	type MemoryMode,
	type SearchMode,
	type AddMemoryMode,
	type PromptTemplate,
} from "../shared"

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
	mode?: MemoryMode
	/**
	 * Search mode for memory retrieval:
	 * - "memories": Search only memory entries (default)
	 * - "hybrid": Search both memories AND document chunks (recommended for RAG)
	 * - "documents": Search only document chunks
	 */
	searchMode?: SearchMode
	/** Maximum number of search results to return when using hybrid/documents mode (default: 10) */
	searchLimit?: number
	/**
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories (default)
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: AddMemoryMode
	/**
	 * Custom function to format memory data into the system prompt.
	 * If not provided, uses the default "User Supermemories:" format.
	 */
	promptTemplate?: PromptTemplate
}

/**
 * Extracts the last user message from an array of chat completion messages.
 */
const getLastUserMessage = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): string => {
	const lastUserMessage = messages
		.slice()
		.reverse()
		.find((msg) => msg.role === "user")

	return typeof lastUserMessage?.content === "string"
		? lastUserMessage.content
		: ""
}

/**
 * Converts an array of chat completion messages into a formatted conversation string.
 */
const getConversationContent = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): string => {
	return messages
		.map((msg) => {
			const role = msg.role === "user" ? "User" : "Assistant"
			const content = typeof msg.content === "string" ? msg.content : ""
			return `${role}: ${content}`
		})
		.join("\n\n")
}

/**
 * Injects memories into messages by appending to existing system prompt
 * or creating a new one.
 */
const injectMemoriesIntoMessages = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	memories: string,
	logger: Logger,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
	const systemPromptExists = messages.some((msg) => msg.role === "system")

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
 * Saves a conversation to Supermemory.
 */
const saveConversation = async (
	client: Supermemory,
	containerTag: string,
	customId: string,
	content: string,
	logger: Logger,
	messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	apiKey?: string,
	baseUrl?: string,
): Promise<void> => {
	try {
		if (messages && apiKey) {
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
				// biome-ignore lint/suspicious/noExplicitAny: OpenAI message types
				...((msg as any).name && { name: (msg as any).name }),
				// biome-ignore lint/suspicious/noExplicitAny: OpenAI message types
				...((msg as any).tool_calls && { tool_calls: (msg as any).tool_calls }),
				// biome-ignore lint/suspicious/noExplicitAny: OpenAI message types
				...((msg as any).tool_call_id && {
					// biome-ignore lint/suspicious/noExplicitAny: OpenAI message types
					tool_call_id: (msg as any).tool_call_id,
				}),
			}))

			const response = await addConversation({
				conversationId: customId,
				messages: conversationMessages,
				containerTags: [containerTag],
				apiKey,
				baseUrl,
			})

			logger.info("Conversation saved successfully via /v4/conversations", {
				containerTag,
				customId,
				messageCount: messages.length,
				responseId: response.id,
			})
			return
		}

		// Fallback to old behavior
		const response = await client.add({
			content,
			containerTags: [containerTag],
			customId: `conversation:${customId}`,
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
		searchMode = "memories",
		searchLimit = 10,
		addMemory = "always",
		promptTemplate,
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
	 * Wraps chat.completions.create with memory injection
	 */
	const createWithMemory = async (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
	) => {
		const messages = Array.isArray(params.messages) ? params.messages : []

		const userMessage = getLastUserMessage(messages)
		if (mode !== "profile" && !userMessage) {
			logger.debug("No user message found, skipping memory search")
			return originalCreate.call(openaiClient.chat.completions, params)
		}

		logger.info("Starting memory search", {
			containerTag,
			customId,
			mode,
			searchMode,
		})

		const operations: Promise<unknown>[] = []

		// Save conversation if enabled
		if (addMemory === "always" && userMessage?.trim()) {
			const content = getConversationContent(messages)
			operations.push(
				saveConversation(
					client,
					containerTag,
					customId,
					content,
					logger,
					messages,
					apiKey,
					normalizedBaseUrl,
				),
			)
		}

		// Fetch and inject memories
		const queryText = mode !== "profile" ? userMessage : ""
		operations.push(
			buildMemoriesText({
				containerTag,
				queryText,
				mode,
				baseUrl: normalizedBaseUrl,
				apiKey,
				logger,
				promptTemplate,
				searchMode,
				searchLimit,
			}),
		)

		const results = await Promise.all(operations)
		const memories = results[results.length - 1] as string

		// Only inject memories if we actually have some
		const enhancedMessages = memories
			? injectMemoriesIntoMessages(messages, memories, logger)
			: messages

		return originalCreate.call(openaiClient.chat.completions, {
			...params,
			messages: enhancedMessages,
		})
	}

	/**
	 * Wraps responses.create with memory injection
	 */
	const createResponsesWithMemory = async (
		params: Parameters<NonNullable<typeof originalResponsesCreate>>[0],
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
			searchMode,
		})

		const operations: Promise<unknown>[] = []

		// Save input if enabled (Responses API doesn't have messages array)
		if (addMemory === "always" && input?.trim()) {
			const content = `Input: ${input}`
			operations.push(
				saveConversation(
					client,
					containerTag,
					customId,
					content,
					logger,
					undefined,
					apiKey,
					normalizedBaseUrl,
				),
			)
		}

		// Fetch memories
		const queryText = mode !== "profile" ? input : ""
		operations.push(
			buildMemoriesText({
				containerTag,
				queryText,
				mode,
				baseUrl: normalizedBaseUrl,
				apiKey,
				logger,
				promptTemplate,
				searchMode,
				searchLimit,
			}),
		)

		const results = await Promise.all(operations)
		const memories = results[results.length - 1] as string

		const enhancedInstructions = memories
			? `${params.instructions || ""}\n\n${memories}`.trim()
			: params.instructions

		return originalResponsesCreate.call(openaiClient.responses, {
			...params,
			instructions: enhancedInstructions,
		})
	}

	// Replace original methods with memory-enhanced versions
	openaiClient.chat.completions.create =
		createWithMemory as typeof originalCreate

	if (originalResponsesCreate) {
		openaiClient.responses.create =
			createResponsesWithMemory as typeof originalResponsesCreate
	}

	return openaiClient
}
