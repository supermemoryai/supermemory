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
	type Logger,
	type PromptTemplate,
	type MemoryMode,
} from "../shared"
import { type LanguageModelCallOptions, getLastUserMessage } from "./util"
import { extractQueryText, injectMemoriesIntoParams } from "./memory-prompt"

const convertToConversationMessages = (
	params: LanguageModelCallOptions,
	assistantResponseText: string,
): ConversationMessage[] => {
	const messages: ConversationMessage[] = []

	for (const msg of params.prompt) {
		if (msg.role === "system") {
			continue
		}

		if (typeof msg.content === "string") {
			if (msg.content) {
				messages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: msg.content,
				})
			}
		} else {
			const contentParts = msg.content
				.map((c) => {
					if (c.type === "text" && c.text) {
						return {
							type: "text" as const,
							text: c.text,
						}
					}
					if (
						c.type === "file" &&
						typeof c.data === "string" &&
						c.mediaType.startsWith("image/")
					) {
						return {
							type: "image_url" as const,
							image_url: { url: c.data },
						}
					}
					return null
				})
				.filter((part) => part !== null)

			if (contentParts.length > 0) {
				messages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: contentParts,
				})
			}
		}
	}

	if (assistantResponseText) {
		messages.push({
			role: "assistant",
			content: assistantResponseText,
		})
	}

	return messages
}

export const saveMemoryAfterResponse = async (
	_client: Supermemory,
	containerTag: string,
	customId: string,
	assistantResponseText: string,
	params: LanguageModelCallOptions,
	logger: Logger,
	apiKey: string,
	baseUrl: string,
): Promise<void> => {
	try {
		const conversationMessages = convertToConversationMessages(
			params,
			assistantResponseText,
		)

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
			messageCount: conversationMessages.length,
			responseId: response.id,
		})
	} catch (error) {
		logger.error("Error saving memory", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}

/**
 * Configuration options for the Supermemory middleware.
 */
interface SupermemoryMiddlewareOptions {
	/** Container tag/identifier for memory search (e.g., user ID, project ID) */
	containerTag: string
	/** Supermemory API key */
	apiKey: string
	/** Custom ID to group messages into a single document. Required. */
	customId: string
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
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/** Custom function to format memory data into the system prompt */
	promptTemplate?: PromptTemplate
	/** Max wait (ms) for the pre-LLM `/v4/profile` retrieval. Omit for no limit (e.g. tests). `withSupermemory` sets this internally. */
	memoryRetrievalTimeoutMs?: number
}

interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	containerTag: string
	customId: string
	mode: MemoryMode
	addMemory: "always" | "never"
	normalizedBaseUrl: string
	apiKey: string
	promptTemplate?: PromptTemplate
	memoryRetrievalTimeoutMs?: number
	/**
	 * Per-turn memory cache. Stores the injected memories string for each
	 * user turn (keyed by turnKey) to avoid redundant API calls during tool-call
	 */
	memoryCache: MemoryCache<string>
}

export const createSupermemoryContext = (
	options: SupermemoryMiddlewareOptions,
): SupermemoryMiddlewareContext => {
	const {
		containerTag,
		apiKey,
		customId,
		verbose = false,
		mode = "profile",
		addMemory = "always",
		baseUrl,
		promptTemplate,
		memoryRetrievalTimeoutMs,
	} = options

	const logger = createLogger(verbose)
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
		...(memoryRetrievalTimeoutMs !== undefined
			? { memoryRetrievalTimeoutMs }
			: {}),
		memoryCache: new MemoryCache<string>(),
	}
}

/**
 * Generates a cache key for the current turn based on context and user message.
 * Uses the shared MemoryCache.makeTurnKey implementation.
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
 * Checks if this is a new user turn (last message is from user)
 */
const isNewUserTurn = (params: LanguageModelCallOptions): boolean => {
	const lastMessage = params.prompt.at(-1)
	return lastMessage?.role === "user"
}

export const transformParamsWithMemory = async (
	params: LanguageModelCallOptions,
	ctx: SupermemoryMiddlewareContext,
): Promise<LanguageModelCallOptions> => {
	const userMessage = getLastUserMessage(params)

	if (ctx.mode !== "profile") {
		if (!userMessage) {
			ctx.logger.debug("No user message found, skipping memory search")
			return params
		}
	}

	const turnKey = makeTurnKey(ctx, userMessage || "")
	const isNewTurn = isNewUserTurn(params)

	// Check if we can use cached memories
	const cachedMemories = ctx.memoryCache.get(turnKey)
	if (!isNewTurn && cachedMemories) {
		ctx.logger.debug("Using cached memories: ", {
			turnKey,
		})
		return injectMemoriesIntoParams(params, cachedMemories, ctx.logger)
	}

	ctx.logger.info("Starting memory search", {
		containerTag: ctx.containerTag,
		customId: ctx.customId,
		mode: ctx.mode,
		isNewTurn,
		cacheHit: false,
	})

	const queryText = extractQueryText(params, ctx.mode)

	let fetchSignal: AbortSignal | undefined
	let timeoutId: ReturnType<typeof setTimeout> | undefined
	const timeoutMs = ctx.memoryRetrievalTimeoutMs
	if (timeoutMs !== undefined && timeoutMs > 0) {
		const controller = new AbortController()
		fetchSignal = controller.signal
		timeoutId = setTimeout(() => controller.abort(), timeoutMs)
	}

	let memories: string
	try {
		memories = await buildMemoriesText({
			containerTag: ctx.containerTag,
			queryText,
			mode: ctx.mode,
			baseUrl: ctx.normalizedBaseUrl,
			apiKey: ctx.apiKey,
			logger: ctx.logger,
			promptTemplate: ctx.promptTemplate,
			...(fetchSignal ? { signal: fetchSignal } : {}),
		})
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId)
		}
	}

	ctx.memoryCache.set(turnKey, memories)
	ctx.logger.debug("Cached memories for turn", { turnKey })

	return injectMemoriesIntoParams(params, memories, ctx.logger)
}

export const extractAssistantResponseText = (content: unknown[]): string => {
	return (content as Array<{ type: string; text?: string }>)
		.map((item) => (item.type === "text" ? item.text || "" : ""))
		.join("")
}
