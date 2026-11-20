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
	 * Persist assistant tool calls and tool results as part of the saved
	 * conversation. Off by default: tool payloads are often large and
	 * low-signal, and would pollute memory extraction.
	 */
	includeToolCalls?: boolean
	promptTemplate?: PromptTemplate
	/**
	 * When Supermemory memory retrieval / injection fails or times out:
	 * - `true` (default): log and call the base model with the original prompt (no memories).
	 * - `false`: propagate the error (fail closed on memory).
	 */
	skipMemoryOnError?: boolean
}

// Keep one wrapped model per conversation so its profile and historical recall stay stable.
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
