/**
 * Middleware utilities for VoltAgent integration with Supermemory.
 *
 * Provides memory retrieval, injection, and storage functionality.
 */

import Supermemory from "supermemory"
import {
	addConversation,
	type ContentPart as ConversationContentPart,
	type ConversationMessage,
	toConversationImageUrl,
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
import type {
	SearchFilters,
	SupermemoryVoltAgent,
	VoltAgentMessage,
} from "./types"

/**
 * Context for Supermemory middleware operations.
 */
export interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	containerTag: string
	customId: string
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
	filters?: SearchFilters
	include?: {
		chunks?: boolean
		documents?: boolean
		forgottenMemories?: boolean
		relatedMemories?: boolean
		summaries?: boolean
	}
	// Storage parameters
	metadata?: Record<string, string | number | boolean>
	searchMode?: "memories" | "documents" | "hybrid"
}

/**
 * Creates a Supermemory middleware context.
 */
export const createSupermemoryContext = (
	containerTag: string,
	options: SupermemoryVoltAgent,
): SupermemoryMiddlewareContext => {
	const apiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY
	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	const {
		customId,
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
		metadata,
		searchMode,
		verbose = false,
	} = options

	// Runtime validation: customId is required
	if (!customId || typeof customId !== "string" || customId.trim() === "") {
		throw new Error(
			"customId is required and must be a non-empty string — provide it via `options.customId`",
		)
	}
	if (
		threshold !== undefined &&
		(!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
	) {
		throw new Error("threshold must be between 0 and 1")
	}
	if (
		limit !== undefined &&
		(!Number.isInteger(limit) || limit < 1 || limit > 100)
	) {
		throw new Error("limit must be an integer between 1 and 100")
	}

	const logger = createLogger(verbose)
	if (options.entityContext !== undefined) {
		logger.warn(
			"entityContext is not supported by /v4/conversations and will be ignored; configure it on the container tag instead.",
		)
	}
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
		customId,
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
		metadata,
		searchMode,
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
		ctx.customId,
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

type VoltAgentContentPart = {
	type: string
	text?: string
	[key: string]: unknown
}

const getMessageContent = (
	message: VoltAgentMessage,
): string | VoltAgentContentPart[] => {
	if (typeof message.content === "string" || Array.isArray(message.content)) {
		return message.content
	}
	return Array.isArray(message.parts) ? message.parts : ""
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

	const content = getMessageContent(lastUserMessage)

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
		customId: ctx.customId,
		mode: ctx.mode,
		isNewTurn,
	})

	const genericMessages = messages.map((msg) => ({
		role: msg.role,
		content: getMessageContent(msg),
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

	// Warn if advanced search params are set but mode is "profile"
	// Profile mode only fetches static/dynamic user data, not query-based search
	if (useAdvancedSearch && ctx.mode === "profile") {
		ctx.logger.warn(
			"Advanced search parameters (threshold, limit, rerank, rewriteQuery, filters, include, searchMode) " +
				'are ignored when mode is "profile". Use mode "query" or "full" to enable advanced search.',
		)
	}

	let memories: string

	if (useAdvancedSearch && ctx.mode !== "profile") {
		ctx.logger.info("Using advanced search with custom parameters")

		const searchParams: Supermemory.SearchParams = {
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

		const response = await ctx.client.search(searchParams)

		// Hybrid search returns both memory entries (`memory` field) and
		// document chunks (`chunk` field). Normalize both for prompt templates.
		const searchResults = response.results.flatMap((result) => {
			const memory = result.memory ?? result.chunk
			if (!memory) {
				return []
			}

			return [
				{
					memory,
					...(result.metadata ? { metadata: result.metadata } : {}),
				},
			]
		})
		const formattedMemories = searchResults
			.map((result) => `- ${result.memory}`)
			.join("\n")

		memories = ctx.promptTemplate
			? ctx.promptTemplate({
					userMemories: "",
					generalSearchMemories: formattedMemories,
					searchResults,
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
	const convertPart = (
		part: VoltAgentContentPart,
	): ConversationContentPart | null => {
		if (part.type === "text" && typeof part.text === "string" && part.text) {
			return { type: "text", text: part.text }
		}

		if (part.type === "file") {
			const mediaType = part.mediaType
			const url =
				typeof mediaType === "string" && mediaType.startsWith("image/")
					? toConversationImageUrl(part.url ?? part.data, mediaType)
					: null
			if (url) return { type: "image_url", imageUrl: { url } }
		}

		if (part.type === "image") {
			const mediaType =
				typeof part.mediaType === "string" ? part.mediaType : "image/jpeg"
			const url = toConversationImageUrl(part.image, mediaType)
			if (url) return { type: "image_url", imageUrl: { url } }
		}

		if (part.type === "image_url") {
			const imageUrl =
				typeof part.imageUrl === "object" && part.imageUrl
					? (part.imageUrl as { url?: unknown })
					: typeof part.image_url === "object" && part.image_url
						? (part.image_url as { url?: unknown })
						: undefined
			if (typeof imageUrl?.url === "string") {
				return { type: "image_url", imageUrl: { url: imageUrl.url } }
			}
		}

		return null
	}

	for (const msg of messages) {
		if (msg.role === "system") {
			continue
		}

		const structuredParts = Array.isArray(msg.parts)
			? msg.parts
			: Array.isArray(msg.content)
				? msg.content
				: undefined

		if (structuredParts) {
			const contentParts = structuredParts
				.map(convertPart)
				.filter((part) => part !== null)

			if (contentParts.length > 0) {
				conversationMessages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: contentParts,
				})
			}
		} else if (typeof msg.content === "string") {
			if (msg.content) {
				conversationMessages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: msg.content,
				})
			}
		}
	}

	return conversationMessages
}

/**
 * Saves conversation to Supermemory.
 */
export const saveConversation = async (
	messages: VoltAgentMessage[],
	ctx: SupermemoryMiddlewareContext,
): Promise<void> => {
	if (ctx.addMemory !== "always") {
		return
	}

	try {
		const conversationMessages = convertToConversationMessages(messages)

		if (conversationMessages.length === 0) {
			ctx.logger.debug("No messages to save")
			return
		}

		const response = await addConversation({
			conversationId: ctx.customId,
			messages: conversationMessages,
			containerTags: [ctx.containerTag],
			metadata: ctx.metadata,
			apiKey: ctx.apiKey,
			baseUrl: ctx.normalizedBaseUrl,
		})

		ctx.logger.info("Conversation saved successfully via /v4/conversations", {
			containerTag: ctx.containerTag,
			customId: ctx.customId,
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
