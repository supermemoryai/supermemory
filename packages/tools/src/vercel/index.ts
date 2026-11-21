import {
	type LanguageModel,
	type LanguageModelCallOptions,
	type LanguageModelStreamPart,
	hasPersistableUserContent,
} from "./util"
import {
	createSupermemoryContext,
	injectCachedMemories,
	transformParamsWithMemory,
	extractAssistantResponseText,
	saveMemoryAfterResponse,
} from "./middleware"
import type { PromptTemplate, MemoryPromptData } from "./memory-prompt"

const DEFAULT_MEMORY_RETRIEVAL_TIMEOUT_MS = 5000

interface WrapVercelLanguageModelOptions {
	/** The namespace for memory search (e.g., user ID, project ID) */
	namespace: string
	/** ID that groups messages into a single document. Required. */
	id: string
	/** Enable detailed logging of memory search and injection */
	verbose?: boolean
	/**
	 * Memory retrieval mode (default: "profile"):
	 * - "profile": Fetches the user profile (static + dynamic) once and adds it to the system prompt
	 * - "query": Searches memories for each user message and appends the results to that message
	 * - "full": Both: the profile once in the system prompt, plus per-message search results
	 *
	 * The profile is fetched once per wrapped model and is not refreshed mid-conversation,
	 * so the system prompt and earlier turns stay byte-identical and prompt-cacheable.
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
	 * Persist assistant tool calls and tool results as part of the saved
	 * conversation. Off by default: tool payloads are often large and
	 * low-signal, and would pollute memory extraction.
	 */
	includeToolCalls?: boolean
	/**
	 * Custom function to format memory data into the injected memory block.
	 * If not provided, uses the default "User Supermemories:" format.
	 *
	 * It is called separately for the profile block (system prompt) and for each
	 * user message's search block; in the search block `data.userMemories` is empty.
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
	/**
	 * When Supermemory memory retrieval / injection fails or times out:
	 * - `true` (default): log and call the base model without the memories that failed.
	 * - `false`: propagate the error (fail closed on memory).
	 *
	 * Either way, a failed retrieval is retried on the next user message.
	 */
	skipMemoryOnError?: boolean
}

/**
 * Wraps a language model with Supermemory middleware to automatically inject relevant memories
 * into the prompt and save the conversation.
 *
 * Memory placement is designed to keep provider prompt caching working across turns:
 * - The user profile ("profile" and "full" modes) is fetched once, on the first user message,
 *   and added to the system prompt. It is not refreshed mid-conversation.
 * - Search results ("query" and "full" modes) are appended to the user message they were
 *   retrieved for, and earlier messages keep the exact block they first received.
 * - Tool-call steps within a turn reuse that turn's memories without new API calls.
 * - A failed or timed-out retrieval is retried on the next user message.
 *
 * Create one wrapped model per conversation (`options.id`): the profile and per-message
 * memories are cached on the wrapper. Pre-LLM retrieval uses a fixed internal time budget
 * and cannot be configured via options.
 *
 * Supports Vercel AI SDK 5 (LanguageModelV2), 6 (LanguageModelV3) and 7 (LanguageModelV4) via runtime
 * detection of `model.specificationVersion`.
 *
 * @param model - The language model to wrap with supermemory capabilities (V2, V3 or V4)
 * @param options - Configuration options for Supermemory integration
 * @param options.namespace - Required. The namespace for memory search (e.g., user ID, project ID)
 * @param options.id - Required. Conversation ID that groups messages into a single document for contextual memory generation
 * @param options.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param options.mode - Optional memory retrieval mode: "profile", "query", or "full" (default: "profile")
 * @param options.addMemory - Optional memory persistence mode: "always" or "never" (default: "always")
 * @param options.apiKey - Optional Supermemory API key to use instead of the environment variable
 * @param options.baseUrl - Optional base URL for the Supermemory API (default: "https://api.supermemory.ai")
 * @param options.includeToolCalls - Optional flag to save tool calls and results with the conversation (default: false)
 * @param options.promptTemplate - Optional function to format memory data into the injected memory block
 * @param options.skipMemoryOnError - When memory retrieval fails or times out: `true` (default) continues without injected memories; `false` throws
 *
 * @returns A wrapped language model that automatically includes relevant memories in prompts
 *
 * @example
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/ai-sdk"
 * import { openai } from "@ai-sdk/openai"
 *
 * const modelWithMemory = withSupermemory(openai("gpt-4"), {
 *   namespace: "user-123",
 *   id: "conversation-456",
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
 * @throws {Error} When `options.id` is empty
 * @throws {Error} When supermemory memory retrieval fails and `skipMemoryOnError` is `false`
 */
const wrapVercelLanguageModel = <T extends LanguageModel>(
	model: T,
	options: WrapVercelLanguageModelOptions,
): T => {
	const providedApiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!providedApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	if (!options.id) {
		throw new Error(
			"id is required — provide a non-empty string to group messages into a single document",
		)
	}

	const ctx = createSupermemoryContext({
		namespace: options.namespace,
		apiKey: providedApiKey,
		id: options.id,
		verbose: options.verbose ?? false,
		mode: options.mode ?? "profile",
		addMemory: options.addMemory ?? "always",
		baseUrl: options.baseUrl,
		includeToolCalls: options.includeToolCalls ?? false,
		promptTemplate: options.promptTemplate,
		memoryRetrievalTimeoutMs: DEFAULT_MEMORY_RETRIEVAL_TIMEOUT_MS,
	})

	const skipMemoryOnError = options.skipMemoryOnError ?? true

	// Proxy keeps prototype/getter fields (e.g. provider, modelId) that `{ ...model }` drops.
	return new Proxy(model, {
		get(target, prop, receiver) {
			if (prop === "doGenerate") {
				return async (params: LanguageModelCallOptions) => {
					let modelParams: LanguageModelCallOptions = params
					try {
						modelParams = await transformParamsWithMemory(params, ctx)
					} catch (memoryError) {
						if (skipMemoryOnError) {
							ctx.logger.warn(
								"Supermemory retrieval failed; continuing without injected memories",
								{
									error:
										memoryError instanceof Error
											? memoryError.message
											: "Unknown error",
								},
							)
							modelParams = injectCachedMemories(params, ctx)
						} else {
							ctx.logger.error("Error during memory retrieval for generation", {
								error:
									memoryError instanceof Error
										? memoryError.message
										: "Unknown error",
							})
							throw memoryError
						}
					}

					try {
						// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4
						const result = await target.doGenerate(modelParams as any)

						if (
							ctx.addMemory === "always" &&
							hasPersistableUserContent(params)
						) {
							const assistantResponseText = extractAssistantResponseText(
								result.content as unknown[],
							)
							saveMemoryAfterResponse(
								ctx.client,
								ctx.namespace,
								ctx.id,
								assistantResponseText,
								params,
								ctx.logger,
								ctx.apiKey,
								ctx.normalizedBaseUrl,
								ctx.includeToolCalls,
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
			}

			if (prop === "doStream") {
				return async (params: LanguageModelCallOptions) => {
					let generatedText = ""

					let modelParams: LanguageModelCallOptions = params
					try {
						modelParams = await transformParamsWithMemory(params, ctx)
					} catch (memoryError) {
						if (skipMemoryOnError) {
							ctx.logger.warn(
								"Supermemory retrieval failed; continuing without injected memories",
								{
									error:
										memoryError instanceof Error
											? memoryError.message
											: "Unknown error",
								},
							)
							modelParams = injectCachedMemories(params, ctx)
						} else {
							ctx.logger.error("Error during memory retrieval for stream", {
								error:
									memoryError instanceof Error
										? memoryError.message
										: "Unknown error",
							})
							throw memoryError
						}
					}

					try {
						const { stream, ...rest } = await target.doStream(
							// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4
							modelParams as any,
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
								if (
									ctx.addMemory === "always" &&
									hasPersistableUserContent(params)
								) {
									saveMemoryAfterResponse(
										ctx.client,
										ctx.namespace,
										ctx.id,
										generatedText,
										params,
										ctx.logger,
										ctx.apiKey,
										ctx.normalizedBaseUrl,
										ctx.includeToolCalls,
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
			}

			return Reflect.get(target, prop, receiver)
		},
	}) as T
}

export {
	wrapVercelLanguageModel as withSupermemory,
	type WrapVercelLanguageModelOptions as WithSupermemoryOptions,
	type PromptTemplate,
	type MemoryPromptData,
}
