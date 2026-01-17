import Supermemory from "supermemory"
import {
	addConversation,
	type ConversationMessage,
} from "../conversations-client"
import { createLogger, type Logger } from "./logger"
import {
	type LanguageModelCallOptions,
	type LanguageModelStreamPart,
	type OutputContentItem,
	getLastUserMessage,
	filterOutSupermemories,
} from "./util"
import {
	addSystemPrompt,
	normalizeBaseUrl,
	type PromptTemplate,
} from "./memory-prompt"

export const getConversationContent = (params: LanguageModelCallOptions) => {
	return params.prompt
		.filter((msg) => msg.role !== "system" && msg.role !== "tool")
		.map((msg) => {
			const role = msg.role === "user" ? "User" : "Assistant"

			if (typeof msg.content === "string") {
				return `${role}: ${filterOutSupermemories(msg.content)}`
			}

			const content = msg.content
				.filter((c) => c.type === "text")
				.map((c) => (c.type === "text" ? filterOutSupermemories(c.text) : ""))
				.join(" ")
			return `${role}: ${content}`
		})
		.join("\n\n")
}

export const convertToConversationMessages = (
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
	client: Supermemory,
	containerTag: string,
	conversationId: string | undefined,
	assistantResponseText: string,
	params: LanguageModelCallOptions,
	logger: Logger,
	apiKey: string,
	baseUrl: string,
): Promise<void> => {
	const customId = conversationId ? `conversation:${conversationId}` : undefined

	try {
		if (customId && conversationId) {
			const conversationMessages = convertToConversationMessages(
				params,
				assistantResponseText,
			)

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
				messageCount: conversationMessages.length,
				responseId: response.id,
			})
			return
		}

		const userMessage = getLastUserMessage(params)
		const content = conversationId
			? `${getConversationContent(params)} \n\n Assistant: ${assistantResponseText}`
			: `User: ${userMessage} \n\n Assistant: ${assistantResponseText}`

		const response = await client.add({
			content,
			containerTags: [containerTag],
			customId,
		})

		logger.info("Memory saved successfully via /v3/documents", {
			containerTag,
			customId,
			content,
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
 * Configuration options for the Supermemory middleware.
 */
export interface SupermemoryMiddlewareOptions {
	/** Container tag/identifier for memory search (e.g., user ID, project ID) */
	containerTag: string
	/** Supermemory API key */
	apiKey: string
	/** Optional conversation ID to group messages for contextual memory generation */
	conversationId?: string
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
	 * - "always": Automatically save conversations as memories
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/** Custom function to format memory data into the system prompt */
	promptTemplate?: PromptTemplate
}

export interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	containerTag: string
	conversationId?: string
	mode: "profile" | "query" | "full"
	addMemory: "always" | "never"
	normalizedBaseUrl: string
	apiKey: string
	promptTemplate?: PromptTemplate
}

export const createSupermemoryContext = (
	options: SupermemoryMiddlewareOptions,
): SupermemoryMiddlewareContext => {
	const {
		containerTag,
		apiKey,
		conversationId,
		verbose = false,
		mode = "profile",
		addMemory = "never",
		baseUrl,
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

	return {
		client,
		logger,
		containerTag,
		conversationId,
		mode,
		addMemory,
		normalizedBaseUrl,
		apiKey,
		promptTemplate,
	}
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

	ctx.logger.info("Starting memory search", {
		containerTag: ctx.containerTag,
		conversationId: ctx.conversationId,
		mode: ctx.mode,
	})

	const transformedParams = await addSystemPrompt(
		params,
		ctx.containerTag,
		ctx.logger,
		ctx.mode,
		ctx.normalizedBaseUrl,
		ctx.apiKey,
		ctx.promptTemplate,
	)
	return transformedParams
}

export const extractAssistantResponseText = (content: unknown[]): string => {
	return (content as Array<{ type: string; text?: string }>)
		.map((item) => (item.type === "text" ? item.text || "" : ""))
		.join("")
}

export const createStreamTransform = (
	ctx: SupermemoryMiddlewareContext,
	params: LanguageModelCallOptions,
): {
	transform: TransformStream<LanguageModelStreamPart, LanguageModelStreamPart>
	getGeneratedText: () => string
} => {
	let generatedText = ""

	const transform = new TransformStream<
		LanguageModelStreamPart,
		LanguageModelStreamPart
	>({
		transform(chunk, controller) {
			if (chunk.type === "text-delta") {
				generatedText += chunk.delta
			}
			controller.enqueue(chunk)
		},
		flush: async () => {
			const userMessage = getLastUserMessage(params)
			if (ctx.addMemory === "always" && userMessage && userMessage.trim()) {
				saveMemoryAfterResponse(
					ctx.client,
					ctx.containerTag,
					ctx.conversationId,
					generatedText,
					params,
					ctx.logger,
					ctx.apiKey,
					ctx.normalizedBaseUrl,
				)
			}
		},
	})

	return {
		transform,
		getGeneratedText: () => generatedText,
	}
}

export { createLogger, type Logger, type OutputContentItem }
