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

/**
 * Configuration options for Supermemory integration
 */
interface WithSupermemoryConfig {
	/** The container tag/identifier for memory search (e.g., user ID, project ID) */
	containerTag: string
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
	mode?: "profile" | "query" | "full"
	/**
	 * Search mode for memory retrieval:
	 * - "memories": Search only memory entries (default)
	 * - "hybrid": Search both memories AND document chunks (recommended for RAG)
	 * - "documents": Search only document chunks
	 */
	searchMode?: "memories" | "hybrid" | "documents"
	/** Maximum number of search results to return when using hybrid/documents mode (default: 10) */
	searchLimit?: number
	/**
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories (default)
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
 * @param config - Configuration object for Supermemory integration
 * @param config.containerTag - Required. The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param config.customId - Required. Custom ID to group messages into a single document
 * @param config.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param config.mode - Optional mode for memory search: "profile", "query", or "full" (default: "profile")
 * @param config.searchMode - Optional search mode: "memories" (default), "hybrid" (memories + chunks), or "documents" (chunks only)
 * @param config.searchLimit - Optional maximum number of search results when using hybrid/documents mode (default: 10)
 * @param config.addMemory - Optional mode for memory persistence: "always" (default - saves conversations), "never" (read-only mode)
 * @param config.apiKey - Optional Supermemory API key to use instead of the environment variable
 * @param config.baseUrl - Optional base URL for the Supermemory API (default: "https://api.supermemory.ai")
 *
 * @returns A wrapped language model that automatically includes relevant memories in prompts
 *
 * @example
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/vercel"
 * import { openai } from "@ai-sdk/openai"
 * import { generateText } from "ai"
 *
 * // Basic usage with profile memories
 * const modelWithMemory = withSupermemory(
 *   openai("gpt-4"),
 *   {
 *     containerTag: "user-123",
 *     customId: "conv-456",
 *     mode: "full",
 *     addMemory: "always"
 *   }
 * )
 *
 * // RAG usage with hybrid search (memories + document chunks)
 * const ragModel = withSupermemory(
 *   openai("gpt-4"),
 *   {
 *     containerTag: "user-123",
 *     customId: "conv-789",
 *     mode: "full",
 *     searchMode: "hybrid",  // Search both memories and document chunks
 *     searchLimit: 15,
 *   }
 * )
 *
 * const result = await generateText({
 *   model: ragModel,
 *   messages: [{ role: "user", content: "What's in my documents about quarterly goals?" }]
 * })
 * ```
 *
 * @throws {Error} When neither `config.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 * @throws {Error} When supermemory API request fails
 */
const wrapVercelLanguageModel = <T extends LanguageModel>(
	model: T,
	config: WithSupermemoryConfig,
): T => {
	const { containerTag, customId, ...restOptions } = config
	const providedApiKey = restOptions.apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!providedApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	const ctx = createSupermemoryContext({
		containerTag,
		apiKey: providedApiKey,
		customId,
		verbose: restOptions.verbose ?? false,
		mode: restOptions.mode ?? "profile",
		searchMode: restOptions.searchMode ?? "memories",
		searchLimit: restOptions.searchLimit ?? 10,
		addMemory: restOptions.addMemory ?? "always",
		baseUrl: restOptions.baseUrl,
		promptTemplate: restOptions.promptTemplate,
	})

	// Use Object.create to preserve prototype chain, then copy own properties
	const wrappedModel = Object.create(
		Object.getPrototypeOf(model),
		Object.getOwnPropertyDescriptors(model),
	) as T

	// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
	wrappedModel.doGenerate = async (params: LanguageModelCallOptions): Promise<any> => {
		try {
			const transformedParams = await transformParamsWithMemory(params, ctx)

			// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
			const result = await model.doGenerate(transformedParams as any)

			const userMessage = getLastUserMessage(params)
			if (
				ctx.addMemory === "always" &&
				ctx.customId &&
				userMessage &&
				userMessage.trim()
			) {
				const assistantResponseText = extractAssistantResponseText(
					result.content as unknown[],
				)
				saveMemoryAfterResponse(
					ctx.client,
					ctx.containerTag,
					ctx.customId,
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
	}

	// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
	wrappedModel.doStream = async (params: LanguageModelCallOptions): Promise<any> => {
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
						ctx.customId &&
						userMessage &&
						userMessage.trim()
					) {
						saveMemoryAfterResponse(
							ctx.client,
							ctx.containerTag,
							ctx.customId,
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
	}

	return wrappedModel
}

export {
	wrapVercelLanguageModel as withSupermemory,
	type WithSupermemoryConfig,
	type PromptTemplate,
	type MemoryPromptData,
}
