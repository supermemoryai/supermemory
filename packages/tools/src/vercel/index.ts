import type { LanguageModelV2 } from "@ai-sdk/provider"
import { wrapLanguageModel } from "ai"
import { createSupermemoryMiddleware } from "./middleware"

interface WrapVercelLanguageModelOptions {
	conversationId?: string;
	verbose?: boolean;
	mode?: "profile" | "query" | "full";
	addMemory?: "always" | "never";
	apiKey?: string;
	baseUrl?: string;
}

/**
 * Wraps a language model with supermemory middleware to automatically inject relevant memories
 * into the system prompt based on the user's message content.
 *
 * This middleware searches the supermemory API for relevant memories using the container tag
 * and user message, then either appends memories to an existing system prompt or creates
 * a new system prompt with the memories.
 *
 * @param model - The language model to wrap with supermemory capabilities
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
const wrapVercelLanguageModel = (
	model: LanguageModelV2,
	containerTag: string,
	options?: WrapVercelLanguageModelOptions,
): LanguageModelV2 => {
	const providedApiKey = options?.apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!providedApiKey) {
		throw new Error("SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`")
	}

	const conversationId = options?.conversationId
	const verbose = options?.verbose ?? false
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "never"
	const baseUrl = options?.baseUrl

	const wrappedModel = wrapLanguageModel({
		model,
		middleware: createSupermemoryMiddleware(containerTag, providedApiKey, conversationId, verbose, mode, addMemory, baseUrl),
	})

	return wrappedModel
}

export { wrapVercelLanguageModel as withSupermemory, type WrapVercelLanguageModelOptions as WithSupermemoryOptions }
