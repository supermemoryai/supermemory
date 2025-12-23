import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Middleware,
	LanguageModelV2StreamPart,
} from "@ai-sdk/provider"
import Supermemory from "supermemory"
import {
	addConversation,
	type ConversationMessage,
} from "../conversations-client"
import { createLogger, type Logger } from "./logger"
import {
	type OutputContentItem,
	getLastUserMessage,
	filterOutSupermemories,
} from "./util"
import { addSystemPrompt, normalizeBaseUrl } from "./memory-prompt"

const getConversationContent = (params: LanguageModelV2CallOptions) => {
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

const convertToConversationMessages = (
	params: LanguageModelV2CallOptions,
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

const addMemoryTool = async (
	client: Supermemory,
	containerTag: string,
	conversationId: string | undefined,
	assistantResponseText: string,
	params: LanguageModelV2CallOptions,
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

export const createSupermemoryMiddleware = (
	containerTag: string,
	apiKey: string,
	conversationId?: string,
	verbose = false,
	mode: "profile" | "query" | "full" = "profile",
	addMemory: "always" | "never" = "never",
	baseUrl?: string,
): LanguageModelV2Middleware => {
	const logger = createLogger(verbose)
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

	const client = new Supermemory({
		apiKey,
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseURL: normalizedBaseUrl }
			: {}),
	})

	return {
		transformParams: async ({ params }) => {
			const userMessage = getLastUserMessage(params)

			if (mode !== "profile") {
				if (!userMessage) {
					logger.debug("No user message found, skipping memory search")
					return params
				}
			}

			logger.info("Starting memory search", {
				containerTag,
				conversationId,
				mode,
			})

			const transformedParams = await addSystemPrompt(
				params,
				containerTag,
				logger,
				mode,
				normalizedBaseUrl,
			)
			return transformedParams
		},
		wrapGenerate: async ({ doGenerate, params }) => {
			const userMessage = getLastUserMessage(params)

			try {
				const result = await doGenerate()
				const assistantResponse = result.content
				const assistantResponseText = assistantResponse
					.map((content) => (content.type === "text" ? content.text : ""))
					.join("")

				if (addMemory === "always" && userMessage && userMessage.trim()) {
					addMemoryTool(
						client,
						containerTag,
						conversationId,
						assistantResponseText,
						params,
						logger,
						apiKey,
						normalizedBaseUrl,
					)
				}

				return result
			} catch (error) {
				logger.error("Error generating response", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				throw error
			}
		},
		wrapStream: async ({ doStream, params }) => {
			const userMessage = getLastUserMessage(params)
			let generatedText = ""

			try {
				const { stream, ...rest } = await doStream()
				const transformStream = new TransformStream<
					LanguageModelV2StreamPart,
					LanguageModelV2StreamPart
				>({
					transform(chunk, controller) {
						if (chunk.type === "text-delta") {
							generatedText += chunk.delta
						}

						controller.enqueue(chunk)
					},
					flush: async () => {
						const content: OutputContentItem[] = []
						if (generatedText) {
							content.push({
								type: "text",
								text: generatedText,
							})
						}

						if (addMemory === "always" && userMessage && userMessage.trim()) {
							addMemoryTool(
								client,
								containerTag,
								conversationId,
								generatedText,
								params,
								logger,
								apiKey,
								normalizedBaseUrl,
							)
						}
					},
				})

				return {
					stream: stream.pipeThrough(transformStream),
					...rest,
				}
			} catch (error) {
				logger.error("Error streaming response", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				throw error
			}
		},
	}
}
