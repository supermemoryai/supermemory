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
	createLogger,
	createSupermemoryClient,
	normalizeBaseUrl,
	defaultPromptTemplate,
	stripMemoryContext,
	PROFILE_SEARCH_THRESHOLD,
	buildTurnRecall,
	turnKey,
	turnKeys,
	withTurnMemory,
	wrapMemoryContext,
	TurnMemoryByConversation,
	type Logger,
	type MemoryMode,
	type ProfileStructure,
	type PromptTemplate,
	type TurnRecallFetcher,
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
	turns: TurnMemoryByConversation
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
		turns: new TurnMemoryByConversation(),
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

const withMessageMemory = (
	message: VoltAgentMessage,
	memories: string,
): VoltAgentMessage => {
	if (Array.isArray(message.parts)) {
		return { ...message, parts: withTurnMemory(message.parts, memories) }
	}
	if (typeof message.content === "string" || Array.isArray(message.content)) {
		return { ...message, content: withTurnMemory(message.content, memories) }
	}
	return message
}

const searchWithAdvancedOptions = async (
	ctx: SupermemoryMiddlewareContext,
	queryText: string,
	mode: MemoryMode,
	profile: Promise<ProfileStructure["profile"]> | undefined,
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

	const [response, profileData] = await Promise.all([
		ctx.client.search(ctx.namespace, searchParams, {
			maxRetries: 0,
			abortSignal: signal,
		}),
		mode === "full" ? profile : undefined,
	])

	const searchResults = response.results.flatMap((result) => {
		const memory = getMemoryText(result)
		if (!memory) {
			return []
		}

		return [{ ...result, memory }]
	})
	const deduplicated = deduplicateMemoriesForMode(mode, {
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
		userMemories: "",
		generalSearchMemories,
		searchResults: deduplicatedSearchResults,
	})
}

const recallTurn = (
	ctx: SupermemoryMiddlewareContext,
	queryText: string,
): TurnRecallFetcher => {
	const useAdvancedSearch =
		ctx.threshold !== undefined ||
		ctx.limit !== undefined ||
		ctx.rerank !== undefined ||
		ctx.rewriteQuery !== undefined ||
		ctx.filter !== undefined ||
		ctx.include !== undefined ||
		ctx.searchMode !== undefined
	return buildTurnRecall({
		namespace: ctx.namespace,
		query: queryText,
		mode: ctx.mode,
		baseUrl: ctx.normalizedBaseUrl,
		apiKey: ctx.apiKey,
		source: "tools-voltagent",
		logger: ctx.logger,
		promptTemplate: ctx.promptTemplate,
		...(useAdvancedSearch && {
			search: (profile, signal) =>
				searchWithAdvancedOptions(ctx, queryText, ctx.mode, profile, signal),
		}),
	})
}

/**
 * Retrieves memories for the latest user message: search results are appended to that
 * message and the conversation's frozen profile to the system message. Earlier user messages
 * get back the exact block they first received, so the prompt prefix stays cacheable.
 * Returns new messages; the input is not mutated.
 *
 * @param messages - VoltAgent messages to enhance
 * @param ctx - Supermemory middleware context
 * @param conversationId - Conversation whose memories to reuse (default: ctx.id)
 */
export const enhanceMessagesWithMemories = async (
	messages: VoltAgentMessage[],
	ctx: SupermemoryMiddlewareContext,
	conversationId: string = ctx.id,
): Promise<VoltAgentMessage[]> => {
	const latest = messages.filter((message) => message.role === "user").at(-1)
	if (!latest) return messages

	if (
		ctx.mode === "profile" &&
		(ctx.threshold !== undefined ||
			ctx.limit !== undefined ||
			ctx.rerank !== undefined ||
			ctx.rewriteQuery !== undefined ||
			ctx.filter !== undefined ||
			ctx.include !== undefined ||
			ctx.searchMode !== undefined)
	) {
		ctx.logger.warn(
			"Advanced search parameters (threshold, limit, rerank, rewriteQuery, filter, include, searchMode) " +
				'are ignored when mode is "profile". Use mode "query" or "full" to enable advanced search.',
		)
	}

	const keys = turnKeys(messages, (message) => ({
		role: message.role,
		text: getMessageText(message),
	}))
	const memory = ctx.turns.for(conversationId)
	const query = turnKey(getMessageText(latest))
	await memory.recall(keys.get(latest) as string, recallTurn(ctx, query))

	const blocks = await Promise.all(
		messages.map((message) => {
			const key = keys.get(message)
			return key === undefined ? undefined : memory.get(key)
		}),
	)
	const withBlocks = messages.map((message, index) => {
		const block = blocks[index]
		return block === undefined ? message : withMessageMemory(message, block)
	})
	const system = withBlocks.findIndex((message) => message.role === "system")
	if (system !== -1) {
		return withBlocks.map((message, index) =>
			index === system ? withMessageMemory(message, memory.profile) : message,
		)
	}
	const profile = wrapMemoryContext(memory.profile)
	if (!profile) return withBlocks
	return [
		{
			id: `supermemory-profile-${conversationId}`,
			role: "system",
			content: profile,
			parts: [{ type: "text", text: profile }],
		},
		...withBlocks,
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
