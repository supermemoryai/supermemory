import { type LanguageModel, hasPersistableUserContent } from "./util"
import {
	createSupermemoryContext,
	saveMemoryAfterResponse,
	withMemoryBlocks,
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
	 * - "profile": Recalls the user profile (static + dynamic)
	 * - "query": Searches memories for the latest user message
	 * - "full": Both, in one block
	 *
	 * The block is sent as a separate user message after the latest user message, so the
	 * system prompt and every message you send stay byte-identical and prompt-cacheable.
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
	 * It is called once per recall, with the profile in `data.userMemories` and the
	 * search results in `data.generalSearchMemories`.
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
	 * - `true` (default): log and call the base model without this call's memories.
	 * - `false`: propagate the error (fail closed on memory).
	 *
	 * Either way, the next call recalls again.
	 */
	skipMemoryOnError?: boolean
}

/**
 * Wraps a language model with Supermemory middleware to automatically inject relevant memories
 * into the prompt and save the conversation.
 *
 * Memory placement is designed to keep provider prompt caching working across turns,
 * with nothing held in memory between calls:
 * - When the latest user message has no memories yet, one recall (profile and search,
 *   per `mode`) is sent as a separate user message after it. Your messages, the system
 *   prompt and your cache breakpoints are never changed.
 * - The reply's first text or tool-call part carries that block, signed, in
 *   `providerMetadata.supermemory`. When you send the reply back (for example
 *   `convertToModelMessages` on stored UI messages), the block is put back in front of it,
 *   so earlier turns are resent byte for byte. Tool-call steps reuse it without a new recall.
 * - A block with a missing or bad signature is ignored. Without one (for example when only
 *   message text is stored), each call just gets a fresh recall after the latest user message.
 *
 * Creating a new wrapped model per request is fine. Pre-LLM retrieval uses a fixed internal
 * time budget and cannot be configured via options.
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

	return withMemoryBlocks(model, {
		blocks: ctx.blocks,
		logger: ctx.logger,
		onRecallError: (error) => {
			if (!skipMemoryOnError) {
				ctx.logger.error("Error during memory retrieval", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				throw error
			}
			ctx.logger.warn(
				"Supermemory retrieval failed; continuing without this turn's memories",
				{ error: error instanceof Error ? error.message : "Unknown error" },
			)
		},
		onFinish: (params, text) => {
			if (ctx.addMemory !== "always" || !hasPersistableUserContent(params)) {
				return
			}
			void saveMemoryAfterResponse(
				ctx.client,
				ctx.namespace,
				ctx.id,
				text,
				params,
				ctx.logger,
				ctx.apiKey,
				ctx.normalizedBaseUrl,
				ctx.includeToolCalls,
			)
		},
	})
}

export {
	wrapVercelLanguageModel as withSupermemory,
	type WrapVercelLanguageModelOptions as WithSupermemoryOptions,
	type PromptTemplate,
	type MemoryPromptData,
}
