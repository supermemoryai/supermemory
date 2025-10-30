import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Middleware,
	LanguageModelV2StreamPart,
} from "@ai-sdk/provider"
import Supermemory from "supermemory"
import { createLogger, type Logger } from "./logger"
import {
	type OutputContentItem,
	getLastUserMessage,
	filterOutSupermemories,
} from "./util"
import { addSystemPrompt } from "./memory-prompt"

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

const addMemoryTool = async (
	client: Supermemory,
	containerTag: string,
	conversationId: string | undefined,
	assistantResponseText: string,
	params: LanguageModelV2CallOptions,
	logger: Logger,
): Promise<void> => {
	const userMessage = getLastUserMessage(params)
	const content = conversationId
		? `${getConversationContent(params)} \n\n Assistant: ${assistantResponseText}`
		: `User: ${userMessage} \n\n Assistant: ${assistantResponseText}`
	const customId = conversationId ? `conversation:${conversationId}` : undefined

	try {
		const response = await client.memories.add({
			content,
			containerTags: [containerTag],
			customId,
		})

		logger.info("Memory saved successfully", {
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
	conversationId?: string,
	verbose = false,
	mode: "profile" | "query" | "full" = "profile",
	addMemory: "always" | "never" = "never",
): LanguageModelV2Middleware => {
	const logger = createLogger(verbose)

	const client = new Supermemory({
		apiKey: process.env.SUPERMEMORY_API_KEY,
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
