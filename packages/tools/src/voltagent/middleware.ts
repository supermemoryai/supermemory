/**
 * Middleware utilities for VoltAgent integration with Supermemory.
 *
 * Provides memory retrieval, injection, and storage functionality.
 */

import type { SearchRequest, Supermemory } from "supermemory"
import {
	addConversation,
	type ContentPart as ConversationContentPart,
	type ConversationMessage,
	toConversationImageUrl,
} from "../conversations-client"
import {
	convertProfileToMarkdown,
	createLogger,
	createMemoryBlocks,
	createSupermemoryClient,
	normalizeBaseUrl,
	defaultPromptTemplate,
	placeMemoryBlocks,
	stripMemoryContext,
	PROFILE_SEARCH_THRESHOLD,
	type Logger,
	type MemoryBlocks,
	type MemoryMessages,
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
	blocks: MemoryBlocks
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

	const client = createSupermemoryClient({
		apiKey,
		baseUrl: normalizedBaseUrl,
		source: "tools-voltagent",
	})

	const ctx: SupermemoryMiddlewareContext = {
		client,
		logger,
		namespace,
		id,
		mode,
		addMemory,
		normalizedBaseUrl,
		apiKey,
		promptTemplate,
		blocks: createMemoryBlocks({
			namespace,
			apiKey,
			baseUrl: normalizedBaseUrl,
			source: "tools-voltagent",
			mode,
			logger,
			...(promptTemplate && { promptTemplate }),
		}),
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
	if (usesAdvancedSearch(ctx)) {
		if (mode === "profile") {
			logger.warn(
				"Advanced search parameters (threshold, limit, rerank, rewriteQuery, filter, include, searchMode) " +
					'are ignored when mode is "profile". Use mode "query" or "full" to enable advanced search.',
			)
		} else {
			ctx.blocks = createMemoryBlocks({
				namespace,
				apiKey,
				baseUrl: normalizedBaseUrl,
				source: "tools-voltagent",
				mode,
				logger,
				recallText: (query, signal) =>
					searchWithAdvancedOptions(ctx, query, signal),
			})
		}
	}
	return ctx
}

const usesAdvancedSearch = (ctx: SupermemoryMiddlewareContext): boolean =>
	ctx.threshold !== undefined ||
	ctx.limit !== undefined ||
	ctx.rerank !== undefined ||
	ctx.rewriteQuery !== undefined ||
	ctx.filter !== undefined ||
	ctx.include !== undefined ||
	ctx.searchMode !== undefined

type VoltAgentContentPart = {
	type: string
	text?: string
	[key: string]: unknown
}

const getMessageContent = (
	message: VoltAgentMessage,
): string | VoltAgentContentPart[] => {
	if (Array.isArray(message.parts)) return message.parts
	if (typeof message.content === "string" || Array.isArray(message.content)) {
		return message.content
	}
	return ""
}

const getMessageText = (message: VoltAgentMessage): string => {
	const content = getMessageContent(message)
	if (typeof content === "string") return content
	return content
		.filter((part) => part.type === "text")
		.map((part) => part.text || "")
		.join(" ")
}

const searchWithAdvancedOptions = async (
	ctx: SupermemoryMiddlewareContext,
	queryText: string,
	signal: AbortSignal,
): Promise<string> => {
	ctx.logger.info("Using advanced search with custom parameters")

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

	const requestOptions = { maxRetries: 0, abortSignal: signal }
	const [response, profileResponse] = await Promise.all([
		ctx.client.search(ctx.namespace, searchParams, requestOptions),
		ctx.mode === "full"
			? ctx.client.profile(ctx.namespace, undefined, requestOptions)
			: undefined,
	])
	const profileData = profileResponse?.profile

	const searchResults = response.results.flatMap((result) => {
		const memory = getMemoryText(result)
		if (!memory) {
			return []
		}

		return [{ ...result, memory }]
	})
	const deduplicated = deduplicateMemoriesForMode(ctx.mode, {
		static: profileData?.static,
		dynamic: profileData?.dynamic,
		searchResults,
	})
	const searchResultByKey = new Map<string, (typeof searchResults)[number]>()
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
		userMemories:
			ctx.mode === "full"
				? convertProfileToMarkdown({
						profile: {
							static: deduplicated.static,
							dynamic: deduplicated.dynamic,
						},
						searchResults: { results: [] },
					})
				: "",
		generalSearchMemories,
		searchResults: deduplicatedSearchResults,
	})
}

const voltAgentMessages: MemoryMessages<VoltAgentMessage> = {
	tagOf: () => undefined,
	isUser: (message) => message.role === "user",
	textOf: getMessageText,
	blockMessage: (block) => ({
		id: `supermemory-${crypto.randomUUID()}`,
		role: "user",
		content: block,
		parts: [{ type: "text", text: block }],
	}),
}

/**
 * Appends one recall for the latest user message as a separate user message at the end, leaving
 * every given message unchanged. Returns new messages; the input is not mutated.
 *
 * @param messages - VoltAgent messages to enhance
 * @param ctx - Supermemory middleware context
 * @returns The messages, plus the memory message when the recall found anything
 */
export const enhanceMessagesWithMemories = async (
	messages: VoltAgentMessage[],
	ctx: SupermemoryMiddlewareContext,
): Promise<VoltAgentMessage[]> => {
	const placed = await placeMemoryBlocks(
		ctx.blocks,
		messages,
		voltAgentMessages,
	)
	if (placed.error !== undefined) {
		ctx.logger.warn("Memory recall failed; continuing without it", {
			error:
				placed.error instanceof Error
					? placed.error.message
					: String(placed.error),
		})
	}
	return placed.messages
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
		if (part.type === "text" && typeof part.text === "string") {
			const text = stripMemoryContext(part.text)
			return text ? { type: "text", text } : null
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
			const content = stripMemoryContext(msg.content)
			if (content) {
				conversationMessages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content,
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
			source: "tools-voltagent",
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
