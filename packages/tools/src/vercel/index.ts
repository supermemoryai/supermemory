import {
	type LanguageModel,
	type LanguageModelCallOptions,
	type LanguageModelStreamPart,
	getLastUserMessage,
} from "./util"
import {
	createSupermemoryContext,
	transformParamsWithMemory,
	extractAssistantResponseText,
	saveMemoryAfterResponse,
} from "./middleware"
import type { PromptTemplate, MemoryPromptData } from "./memory-prompt"

interface WrapVercelLanguageModelOptions {
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
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY env var) */
	apiKey?: string
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/**
	 * Custom function to format memory data into the system prompt.
	 * If not provided, uses the default "User Supermemories:" format.
	 *
	 * @example
	 * ```typescript
	 * promptTemplate: (data) => `
	 * <user_memories>
	 * Here is some information about your past conversations:
	 * ${data.userMemories}
	 * ${data.generalSearchMemories}
	 * </user_memories>
	 * `.trim()
	 * ```
	 */
	promptTemplate?: PromptTemplate
}

/**
 * Wraps a language model with supermemory middleware to automatically inject relevant memories
 * into the system prompt based on the user's message content.
 *
 * This wrapper searches the supermemory API for relevant memories using the container tag
 * and user message, then either appends memories to an existing system prompt or creates
 * a new system prompt with the memories.
 *
 * Supports both Vercel AI SDK 5 (LanguageModelV2) and SDK 6 (LanguageModelV3) via runtime
 * detection of `model.specificationVersion`.
 *
 * @param model - The language model to wrap with supermemory capabilities (V2 or V3)
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 * @param options.conversationId - Optional conversation ID to group messages into a single document for contextual memory generation
 * @param options.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param options.mode - Optional mode for memory search: "profile", "query", or "full" (default: "profile")
 * @param options.addMemory - Optional mode for memory search: "always", "never" (default: "never")
 * @param options.apiKey - Optional Supermemory API key to use instead of the environment variable
 * @param options.baseUrl - Optional base URL for the Supermemory API (default: "https://api.supermemory.ai")
 *
 * @returns A wrapped language model that automatically includes relevant memories in prompts
 *
 * @example
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/ai-sdk"
 * import { openai } from "@ai-sdk/openai"
 *
 * const modelWithMemory = withSupermemory(openai("gpt-4"), "user-123", {
 *   conversationId: "conversation-456",
 *   mode: "full",
 *   addMemory: "always"
 * })
 *
 * const result = await generateText({
 *   model: modelWithMemory,
 *   messages: [{ role: "user", content: "What's my favorite programming language?" }]
 * })
 * ```
 *
 * @throws {Error} When neither `options.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 * @throws {Error} When supermemory API request fails
 */
const wrapVercelLanguageModel = <T extends LanguageModel>(
	model: T,
	containerTag: string,
	options?: WrapVercelLanguageModelOptions,
): T => {
	const providedApiKey = options?.apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!providedApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	const ctx = createSupermemoryContext({
		containerTag,
		apiKey: providedApiKey,
		conversationId: options?.conversationId,
		verbose: options?.verbose ?? false,
		mode: options?.mode ?? "profile",
		addMemory: options?.addMemory ?? "never",
		baseUrl: options?.baseUrl,
		promptTemplate: options?.promptTemplate,
	})

	const wrappedModel = {
		...model,

		doGenerate: async (params: LanguageModelCallOptions) => {
			try {
				const transformedParams = await transformParamsWithMemory(params, ctx)

				// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
				const result = await model.doGenerate(transformedParams as any)

				const userMessage = getLastUserMessage(params)
				if (ctx.addMemory === "always" && userMessage && userMessage.trim()) {
					const assistantResponseText = extractAssistantResponseText(
						result.content as unknown[],
					)
					saveMemoryAfterResponse(
						ctx.client,
						ctx.containerTag,
						ctx.conversationId,
						assistantResponseText,
						params,
						ctx.logger,
						ctx.apiKey,
						ctx.normalizedBaseUrl,
					)
				}

				return result
			} catch (error) {
				ctx.logger.error("Error generating response", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				throw error
			}
		},

		doStream: async (params: LanguageModelCallOptions) => {
			let generatedText = ""

			try {
				const transformedParams = await transformParamsWithMemory(params, ctx)

				const { stream, ...rest } = await model.doStream(
					// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
					transformedParams as any,
				)

				const transformStream = new TransformStream<
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
						if (
							ctx.addMemory === "always" &&
							userMessage &&
							userMessage.trim()
						) {
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
					stream: stream.pipeThrough(transformStream),
					...rest,
				}
			} catch (error) {
				ctx.logger.error("Error streaming response", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				throw error
			}
		},
	} as T

	return wrappedModel
}

export {
	wrapVercelLanguageModel as withSupermemory,
	type WrapVercelLanguageModelOptions as WithSupermemoryOptions,
	type PromptTemplate,
	type MemoryPromptData,
}
