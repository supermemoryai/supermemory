/**
 * Middleware utilities for VoltAgent integration with Supermemory.
 *
 * Provides memory retrieval, injection, and storage functionality.
 */

import Supermemory from "supermemory"
import {
	addConversation,
	type ConversationMessage,
} from "../conversations-client"
import {
	createLogger,
	normalizeBaseUrl,
	MemoryCache,
	buildMemoriesText,
	extractQueryText,
	type Logger,
	type MemoryMode,
} from "../shared"
import type { SupermemoryVoltAgent, VoltAgentMessage } from "./types"

/**
 * Context for Supermemory middleware operations.
 */
export interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	containerTag: string
	threadId?: string
	mode: MemoryMode
	addMemory: "always" | "never"
	normalizedBaseUrl: string
	apiKey: string
	promptTemplate?: (data: {
		userMemories: string
		generalSearchMemories: string
		searchResults: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}) => string
	/**
	 * Per-turn memory cache. Stores the injected memories string for each
	 * user turn (keyed by turnKey) to avoid redundant API calls.
	 */
	memoryCache: MemoryCache<string>
	// New search parameters
	threshold?: number
	limit?: number
	rerank?: boolean
	rewriteQuery?: boolean
	filters?: { OR: Array<unknown> } | { AND: Array<unknown> }
	include?: {
		chunks?: boolean
		documents?: boolean
		forgottenMemories?: boolean
		relatedMemories?: boolean
		summaries?: boolean
	}
	// Storage parameters
	customId?: string
	metadata?: Record<string, string | number | boolean>
	searchMode?: "memories" | "documents" | "hybrid"
	entityContext?: string
}

/**
 * Creates a Supermemory middleware context.
 */
export const createSupermemoryContext = (
	containerTag: string,
	options: SupermemoryVoltAgent = {},
): SupermemoryMiddlewareContext => {
	const apiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY
	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	const {
		threadId,
		mode = "profile",
		addMemory = "always", // VoltAgent default: save conversations by default for chat apps
		baseUrl,
		promptTemplate,
		threshold,
		limit,
		rerank,
		rewriteQuery,
		filters,
		include,
		customId,
		metadata,
		searchMode,
		entityContext,
	} = options

	const logger = createLogger(false) // VoltAgent SDK doesn't use verbose
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

	const client = new Supermemory({
		apiKey,
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseURL: normalizedBaseUrl }
			: {}),
	})

	return {
		client,
		logger,
		containerTag,
		threadId,
		mode,
		addMemory,
		normalizedBaseUrl,
		apiKey,
		promptTemplate,
		memoryCache: new MemoryCache<string>(),
		threshold,
		limit,
		rerank,
		rewriteQuery,
		filters,
		include,
		customId,
		metadata,
		searchMode,
		entityContext,
	}
}

/**
 * Generates a cache key for the current turn based on context and user message.
 */
const makeTurnKey = (
	ctx: SupermemoryMiddlewareContext,
	userMessage: string,
): string => {
	return MemoryCache.makeTurnKey(
		ctx.containerTag,
		ctx.threadId,
		ctx.mode,
		userMessage,
	)
}

/**
 * Checks if this is a new user turn (last message is from user).
 */
const isNewUserTurn = (messages: VoltAgentMessage[]): boolean => {
	const lastMessage = messages.at(-1)
	return lastMessage?.role === "user"
}

/**
 * Extracts the last user message text from messages array.
 */
const getLastUserMessage = (messages: VoltAgentMessage[]): string => {
	const lastUserMessage = messages
		.slice()
		.reverse()
		.find((msg) => msg.role === "user")

	if (!lastUserMessage) {
		return ""
	}

	const content = lastUserMessage.content

	if (typeof content === "string") {
		return content
	}

	if (Array.isArray(content)) {
		return content
			.filter((part) => part.type === "text")
			.map((part) => part.text || "")
			.join(" ")
	}

	return ""
}

/**
 * Retrieves and injects memories into messages.
 * Returns enhanced messages with memories injected into system prompt.
 *
 * @param searchMessages - Messages to search for user input (VoltAgent's input messages)
 * @param ctx - Supermemory middleware context
 * @param systemMessages - System messages to inject memories into (VoltAgent's prepared messages)
 */
export const enhanceMessagesWithMemories = async (
	searchMessages: VoltAgentMessage[],
	ctx: SupermemoryMiddlewareContext,
	systemMessages?: VoltAgentMessage[],
): Promise<VoltAgentMessage[]> => {
	const messagesToEnhance = systemMessages || searchMessages
	const messages = searchMessages

	const userMessage = getLastUserMessage(messages)

	if (ctx.mode !== "profile" && !userMessage) {
		ctx.logger.debug("No user message found, skipping memory search")
		return messagesToEnhance
	}

	const turnKey = makeTurnKey(ctx, userMessage || "")
	const isNewTurn = isNewUserTurn(messages)

	const cachedMemories = ctx.memoryCache.get(turnKey)
	if (!isNewTurn && cachedMemories) {
		ctx.logger.debug("Using cached memories", { turnKey })
		return injectMemoriesIntoMessages(
			messagesToEnhance,
			cachedMemories,
			ctx.logger,
		)
	}

	ctx.logger.info("Starting memory search", {
		containerTag: ctx.containerTag,
		threadId: ctx.threadId,
		mode: ctx.mode,
		isNewTurn,
	})

	const genericMessages = messages.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}))

	const queryText = extractQueryText(genericMessages, ctx.mode)

	const useAdvancedSearch =
		ctx.threshold !== undefined ||
		ctx.limit !== undefined ||
		ctx.rerank !== undefined ||
		ctx.rewriteQuery !== undefined ||
		ctx.filters !== undefined ||
		ctx.include !== undefined ||
		ctx.searchMode !== undefined

	let memories: string

	if (useAdvancedSearch && ctx.mode !== "profile") {
		ctx.logger.info("Using advanced search with custom parameters")

		const searchParams: {
			q: string
			containerTag: string
			threshold?: number
			limit?: number
			rerank?: boolean
			rewriteQuery?: boolean
			filters?: { OR: Array<unknown> } | { AND: Array<unknown> }
			include?: {
				chunks?: boolean
				documents?: boolean
				forgottenMemories?: boolean
				relatedMemories?: boolean
				summaries?: boolean
			}
			searchMode?: "memories" | "documents" | "hybrid"
		} = {
			q: queryText,
			containerTag: ctx.containerTag,
		}

		if (ctx.threshold !== undefined) searchParams.threshold = ctx.threshold
		if (ctx.limit !== undefined) searchParams.limit = ctx.limit
		if (ctx.rerank !== undefined) searchParams.rerank = ctx.rerank
		if (ctx.rewriteQuery !== undefined)
			searchParams.rewriteQuery = ctx.rewriteQuery
		if (ctx.filters !== undefined) searchParams.filters = ctx.filters
		if (ctx.include !== undefined) searchParams.include = ctx.include
		if (ctx.searchMode !== undefined) searchParams.searchMode = ctx.searchMode

		const response = await ctx.client.search.memories(searchParams)

		// Hybrid search returns both memory entries (`memory` field) and
		// document chunks (`chunk` field). Handle both.
		type SearchResult = {
			memory?: string
			chunk?: string
			metadata?: Record<string, unknown>
		}
		const formattedMemories = response.results
			.map((result: SearchResult) => {
				const text = result.memory || result.chunk
				return text ? `- ${text}` : null
			})
			.filter(Boolean)
			.join("\n")

		memories = ctx.promptTemplate
			? ctx.promptTemplate({
					userMemories: "",
					generalSearchMemories: formattedMemories,
					searchResults: response.results as Array<{
						memory: string
						metadata?: Record<string, unknown>
					}>,
				})
			: `The following are relevant memories and context about this user retrieved from previous interactions. Use these to personalize your response:\n\n${formattedMemories}`
	} else {
		memories = await buildMemoriesText({
			containerTag: ctx.containerTag,
			queryText,
			mode: ctx.mode,
			baseUrl: ctx.normalizedBaseUrl,
			apiKey: ctx.apiKey,
			logger: ctx.logger,
			promptTemplate: ctx.promptTemplate,
		})
	}

	ctx.memoryCache.set(turnKey, memories)
	ctx.logger.debug("Cached memories for turn", { turnKey })

	return injectMemoriesIntoMessages(messagesToEnhance, memories, ctx.logger)
}

/**
 * Injects memories into messages by appending to existing system prompt
 * or creating a new one. Pure function - does not mutate the original messages.
 *
 * VoltAgent uses AI SDK v5's UIMessage format which requires `id` and `parts`
 * (not just `content`). We must conform to this format for messages to
 * actually reach the LLM.
 */
const injectMemoriesIntoMessages = (
	messages: VoltAgentMessage[],
	memories: string,
	logger: Logger,
): VoltAgentMessage[] => {
	const systemMessageIndex = messages.findIndex((msg) => msg.role === "system")

	if (systemMessageIndex !== -1) {
		logger.debug("Added memories to existing system message")
		const newMessages = [...messages]
		const systemMessage = newMessages[systemMessageIndex]
		if (!systemMessage) {
			return messages
		}

		// Extract existing text from parts (UIMessage format) or content fallback
		const parts = (
			systemMessage as { parts?: Array<{ type: string; text?: string }> }
		).parts
		const existingContent = parts
			? parts
					.filter((p) => p.type === "text")
					.map((p) => p.text || "")
					.join("\n")
			: typeof systemMessage.content === "string"
				? systemMessage.content
				: ""

		const newContent = `${existingContent}\n\n${memories}`

		newMessages[systemMessageIndex] = {
			...systemMessage,
			content: newContent,
			// Update parts array to match - this is what the LLM actually reads
			parts: [{ type: "text", text: newContent }],
		} as VoltAgentMessage
		return newMessages
	}

	logger.debug("Created system message with memories")
	return [
		{
			id: crypto.randomUUID(),
			role: "system" as const,
			content: memories,
			parts: [{ type: "text", text: memories }],
		} as VoltAgentMessage,
		...messages,
	]
}

/**
 * Converts VoltAgent messages to conversation format for storage.
 */
const convertToConversationMessages = (
	messages: VoltAgentMessage[],
): ConversationMessage[] => {
	const conversationMessages: ConversationMessage[] = []

	for (const msg of messages) {
		if (msg.role === "system") {
			continue
		}

		if (typeof msg.content === "string") {
			if (msg.content) {
				conversationMessages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: msg.content,
				})
			}
		} else if (Array.isArray(msg.content)) {
			const contentParts = msg.content
				.map((c) => {
					if (c.type === "text" && c.text) {
						return {
							type: "text" as const,
							text: c.text,
						}
					}
					// Handle image URLs if present
					if (c.type === "image_url" && typeof c.image_url === "object") {
						const imageUrl = c.image_url as { url?: string }
						if (imageUrl.url) {
							return {
								type: "image_url" as const,
								image_url: { url: imageUrl.url },
							}
						}
					}
					return null
				})
				.filter((part) => part !== null)

			if (contentParts.length > 0) {
				conversationMessages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: contentParts,
				})
			}
		}
	}

	return conversationMessages
}

/**
 * Saves conversation to Supermemory (fire-and-forget).
 */
export const saveConversation = async (
	messages: VoltAgentMessage[],
	ctx: SupermemoryMiddlewareContext,
): Promise<void> => {
	if (ctx.addMemory !== "always") {
		return
	}

	const conversationId = ctx.threadId || ctx.customId
	if (!conversationId) {
		ctx.logger.debug(
			"No threadId or customId provided, skipping conversation save",
		)
		return
	}

	try {
		const conversationMessages = convertToConversationMessages(messages)

		if (conversationMessages.length === 0) {
			ctx.logger.debug("No messages to save")
			return
		}

		const response = await addConversation({
			conversationId,
			messages: conversationMessages,
			containerTags: [ctx.containerTag],
			metadata: ctx.metadata,
			entityContext: ctx.entityContext,
			apiKey: ctx.apiKey,
			baseUrl: ctx.normalizedBaseUrl,
		})

		ctx.logger.info("Conversation saved successfully via /v4/conversations", {
			containerTag: ctx.containerTag,
			conversationId,
			messageCount: conversationMessages.length,
			responseId: response.id,
			metadata: ctx.metadata,
		})
	} catch (error) {
		ctx.logger.error("Error saving conversation", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}
