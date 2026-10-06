/**
 * Middleware utilities for VoltAgent integration with Supermemory.
 *
 * Provides memory retrieval, injection, and storage functionality.
 */

import { type SearchRequest, Supermemory } from "supermemory"
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
	convertProfileToMarkdown,
	defaultPromptTemplate,
	extractQueryText,
	replaceMemoryContext,
	stripMemoryContext,
	PROFILE_SEARCH_THRESHOLD,
	supermemoryProfileSearch,
	wrapMemoryContext,
	type Logger,
	type MemoryMode,
	type PromptTemplate,
} from "../shared"
import {
	deduplicateMemoriesForMode,
	getMemoryText,
	normalizeMemoryFact,
} from "../tools-shared"
import type {
	SearchFilter,
	SupermemoryVoltAgent,
	VoltAgentMessage,
} from "./types"

/**
 * Context for Supermemory middleware operations.
 */
export interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	namespace: string
	id: string
	mode: MemoryMode
	addMemory: "always" | "never"
	normalizedBaseUrl: string
	apiKey: string
	promptTemplate?: PromptTemplate
	/**
	 * Per-turn memory cache. Stores the injected memories string for each
	 * user turn (keyed by turnKey) to avoid redundant API calls.
	 */
	memoryCache: MemoryCache<string>
	threshold?: number
	limit?: number
	rerank?: SupermemoryVoltAgent["rerank"]
	rewriteQuery?: boolean
	filter?: SearchFilter
	include?: SupermemoryVoltAgent["include"]
	metadata?: Record<string, string | number | boolean>
	supportingContext?: string
	searchMode?: SupermemoryVoltAgent["searchMode"]
}

/**
 * Creates a Supermemory middleware context.
 */
export const createSupermemoryContext = (
	namespace: string,
	options: SupermemoryVoltAgent,
): SupermemoryMiddlewareContext => {
	const apiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY
	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	const {
		id,
		mode = "profile",
		addMemory = "always", // VoltAgent default: save conversations by default for chat apps
		baseUrl,
		promptTemplate,
		threshold,
		limit,
		rerank,
		rewriteQuery,
		filter,
		include,
		metadata,
		supportingContext,
		searchMode,
		verbose = false,
	} = options

	// Runtime validation: id is required
	if (!id || typeof id !== "string" || id.trim() === "") {
		throw new Error(
			"id is required and must be a non-empty string — provide it via `options.id`",
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
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

	const client = new Supermemory({
		apiKey,
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseUrl: normalizedBaseUrl }
			: {}),
	})

	return {
		client,
		logger,
		namespace,
		id,
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
		filter,
		include,
		metadata,
		supportingContext,
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
	return MemoryCache.makeTurnKey(ctx.namespace, ctx.id, ctx.mode, userMessage)
}

/**
 * Checks if this is a new user turn (last message is from user).
 */
const isNewUserTurn = (messages: VoltAgentMessage[]): boolean => {
	const lastMessage = messages.at(-1)
	return lastMessage?.role === "user"
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
		return injectMemoriesIntoMessages(messagesToEnhance, "", ctx.logger)
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
		namespace: ctx.namespace,
		id: ctx.id,
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
		ctx.filter !== undefined ||
		ctx.include !== undefined ||
		ctx.searchMode !== undefined

	// Warn if advanced search params are set but mode is "profile"
	// Profile mode only fetches static/dynamic user data, not query-based search
	if (useAdvancedSearch && ctx.mode === "profile") {
		ctx.logger.warn(
			"Advanced search parameters (threshold, limit, rerank, rewriteQuery, filter, include, searchMode) " +
				'are ignored when mode is "profile". Use mode "query" or "full" to enable advanced search.',
		)
	}

	const memories = await (async (): Promise<string> => {
		if (useAdvancedSearch && ctx.mode !== "profile") {
			ctx.logger.info("Using advanced search with custom parameters")

			// v5 defaults are hybrid/0.3; keep the v4 defaults unless the caller overrides them.
			const searchParams: SearchRequest = {
				query: queryText,
				searchMode: ctx.searchMode ?? "memories",
				threshold: ctx.threshold ?? PROFILE_SEARCH_THRESHOLD,
			}

			if (ctx.limit !== undefined) searchParams.limit = ctx.limit
			if (ctx.rerank !== undefined) searchParams.rerank = ctx.rerank
			if (ctx.rewriteQuery !== undefined)
				searchParams.rewriteQuery = ctx.rewriteQuery
			if (ctx.filter !== undefined) searchParams.filter = ctx.filter
			if (ctx.include !== undefined) searchParams.include = ctx.include

			const [response, profileResponse] = await Promise.all([
				ctx.client.search(ctx.namespace, searchParams),
				ctx.mode === "full"
					? supermemoryProfileSearch(
							ctx.namespace,
							"",
							ctx.normalizedBaseUrl,
							ctx.apiKey,
						)
					: Promise.resolve(undefined),
			])

			// Hybrid search returns both memory entries (`memory` field) and
			// document chunks (`chunk` field). Normalize both for prompt templates.
			const searchResults = response.results.flatMap((result) => {
				const memory = getMemoryText(result)
				if (!memory) {
					return []
				}

				return [{ ...result, memory }]
			})
			const deduplicated = deduplicateMemoriesForMode(ctx.mode, {
				static: profileResponse?.profile.static,
				dynamic: profileResponse?.profile.dynamic,
				searchResults,
			})
			const searchResultByKey = new Map<
				string,
				(typeof searchResults)[number]
			>()
			for (const result of searchResults) {
				const key = normalizeMemoryFact(result.memory)
				if (!searchResultByKey.has(key)) {
					searchResultByKey.set(key, result)
				}
			}
			const deduplicatedSearchResults = deduplicated.searchResults
				.map((memory) => {
					const original = searchResultByKey.get(normalizeMemoryFact(memory))
					return original ? { ...original, memory } : undefined
				})
				.filter((result) => result !== undefined)
			const userMemories = convertProfileToMarkdown({
				profile: {
					static: deduplicated.static,
					dynamic: deduplicated.dynamic,
				},
				searchResults: { results: [] },
			})
			const generalSearchMemories =
				deduplicated.searchResults.length > 0
					? `Search results for user's recent message: \n${deduplicated.searchResults
							.map((memory) => `- ${memory}`)
							.join("\n")}`
					: ""

			ctx.logger.debug("Advanced memory deduplication completed", {
				profileStatic: deduplicated.static.length,
				profileDynamic: deduplicated.dynamic.length,
				searchResults: deduplicated.searchResults.length,
			})

			return (ctx.promptTemplate ?? defaultPromptTemplate)({
				userMemories,
				generalSearchMemories,
				searchResults: deduplicatedSearchResults,
			})
		}

		return await buildMemoriesText({
			namespace: ctx.namespace,
			queryText,
			mode: ctx.mode,
			baseUrl: ctx.normalizedBaseUrl,
			apiKey: ctx.apiKey,
			logger: ctx.logger,
			promptTemplate: ctx.promptTemplate,
		})
	})().catch((error) => {
		ctx.logger.error("Error fetching memories", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
		return ""
	})

	ctx.memoryCache.set(turnKey, memories)
	ctx.logger.debug("Cached memories for turn", { turnKey })

	return injectMemoriesIntoMessages(messagesToEnhance, memories, ctx.logger)
}

/**
 * Injects memories into messages by appending to existing system prompt
 * or creating a new one. Pure function - does not mutate the original messages.
 *
 * VoltAgent uses AI SDK v6's UIMessage format which requires `id` and `parts`
 * (not just `content`). We must conform to this format for messages to
 * actually reach the LLM.
 */
type VoltAgentContentPart = {
	type: string
	text?: string
	[key: string]: unknown
}

const replaceMemoryContextInParts = (
	parts: VoltAgentContentPart[],
	memories: string,
	shouldInject: boolean,
	fallbackText = "",
): VoltAgentContentPart[] => {
	let injected = false
	const updatedParts = parts.map((part) => {
		if (part.type !== "text" || typeof part.text !== "string") {
			return part
		}

		const text =
			shouldInject && !injected
				? replaceMemoryContext(part.text, memories)
				: stripMemoryContext(part.text)
		injected = injected || shouldInject
		return { ...part, text }
	})

	if (shouldInject && !injected) {
		const text = fallbackText
			? replaceMemoryContext(fallbackText, memories)
			: wrapMemoryContext(memories)
		if (text) {
			return [{ type: "text", text }, ...updatedParts]
		}
	}

	return updatedParts
}

const updateSystemMessage = (
	message: VoltAgentMessage,
	memories: string,
	shouldInject: boolean,
): VoltAgentMessage => {
	const content = message.content
	const nextContent =
		typeof content === "string"
			? shouldInject
				? replaceMemoryContext(content, memories)
				: stripMemoryContext(content)
			: Array.isArray(content)
				? replaceMemoryContextInParts(content, memories, shouldInject)
				: undefined
	const contentText =
		typeof nextContent === "string"
			? nextContent
			: (nextContent ?? [])
					.filter(
						(part) => part.type === "text" && typeof part.text === "string",
					)
					.map((part) => part.text || "")
					.join("\n")
	const parts = message.parts
	const nextParts = Array.isArray(parts)
		? replaceMemoryContextInParts(parts, memories, shouldInject, contentText)
		: shouldInject
			? contentText || wrapMemoryContext(memories)
				? [
						{
							type: "text",
							text: contentText || wrapMemoryContext(memories),
						},
					]
				: []
			: undefined

	return {
		...message,
		...(Object.hasOwn(message, "content") ? { content: nextContent } : {}),
		...(Array.isArray(parts) || nextParts ? { parts: nextParts ?? [] } : {}),
	}
}

const injectMemoriesIntoMessages = (
	messages: VoltAgentMessage[],
	memories: string,
	logger: Logger,
): VoltAgentMessage[] => {
	if (messages.some((msg) => msg.role === "system")) {
		logger.debug("Replaced Supermemory context in existing system message")
		let injected = false
		return messages.map((message) => {
			if (message.role !== "system") return message
			const updated = updateSystemMessage(message, memories, !injected)
			injected = true
			return updated
		})
	}

	logger.debug("Created system message with memories")
	const memoryContext = wrapMemoryContext(memories)
	if (!memoryContext) return messages
	return [
		{
			id: crypto.randomUUID(),
			role: "system" as const,
			content: memoryContext,
			parts: [{ type: "text", text: memoryContext }],
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
			if (url) {
				return { type: "image_url", imageUrl: { url } }
			}
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
			id: ctx.id,
			messages: conversationMessages,
			namespace: ctx.namespace,
			metadata: ctx.metadata,
			supportingContext: ctx.supportingContext,
			apiKey: ctx.apiKey,
			baseUrl: ctx.normalizedBaseUrl,
		})

		ctx.logger.info("Conversation saved successfully", {
			namespace: ctx.namespace,
			id: ctx.id,
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
