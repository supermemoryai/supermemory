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
import { addSystemPrompt, normalizeBaseUrl } from "./memory-prompt"

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
		if (typeof msg.content === "string") {
			const filteredContent = filterOutSupermemories(msg.content)
			if (filteredContent) {
				messages.push({
					role: msg.role as "user" | "assistant" | "system" | "tool",
					content: filteredContent,
				})
			}
		} else {
			const contentParts = msg.content
				.map((c) => {
					if (c.type === "text") {
						const filteredText = filterOutSupermemories(c.text)
						if (filteredText) {
							return {
								type: "text" as const,
								text: filteredText,
							}
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
					role: msg.role as "user" | "assistant" | "system" | "tool",
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

		const response = await client.memories.add({
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

export interface SupermemoryMiddlewareOptions {
	containerTag: string
	apiKey: string
	conversationId?: string
	verbose?: boolean
	mode?: "profile" | "query" | "full"
	addMemory?: "always" | "never"
	baseUrl?: string
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
