import type OpenAI from "openai"
import {
	createOpenAIMiddleware,
	type OpenAIMiddlewareOptions,
} from "./middleware"

/**
 * Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
 * into both Chat Completions and Responses APIs based on the user's input content.
 *
 * For Chat Completions API: Searches for memories using the user message content and injects
 * them into the system prompt (appends to existing or creates new system prompt).
 *
 * For Responses API: Searches for memories using the input parameter and injects them into
 * the instructions parameter (appends to existing or creates new instructions).
 *
 * @param openaiClient - The OpenAI client to wrap with SuperMemory middleware
 * @param options - Configuration options for the middleware
 * @param options.containerTag - Required. The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options.customId - Required. Custom ID to group messages into a single document for contextual memory generation
 * @param options.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param options.mode - Optional mode for memory search: "profile" (default), "query", or "full"
 * @param options.addMemory - Optional mode for memory addition: "always", "never" (default)
 * @param options.apiKey - Optional Supermemory API key to use instead of the environment variable
 * @param options.baseUrl - Optional base URL for the Supermemory API (default: "https://api.supermemory.ai")
 *
 * @returns An OpenAI client with SuperMemory middleware injected for both Chat Completions and Responses APIs
 *
 * @example
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/openai"
 * import OpenAI from "openai"
 *
 * // Create OpenAI client with supermemory middleware
 * const openai = new OpenAI({
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 * const openaiWithSupermemory = withSupermemory(openai, {
 *   containerTag: "user-123",
 *   customId: "conversation-456",
 *   mode: "full",
 *   addMemory: "always"
 * })
 *
 * // Use with Chat Completions API - memories injected into system prompt
 * const chatResponse = await openaiWithSupermemory.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [
 *     { role: "user", content: "What's my favorite programming language?" }
 *   ]
 * })
 *
 * // Use with Responses API - memories injected into instructions
 * const response = await openaiWithSupermemory.responses.create({
 *   model: "gpt-4o",
 *   instructions: "You are a helpful coding assistant",
 *   input: "What's my favorite programming language?"
 * })
 * ```
 *
 * @throws {Error} When neither `options.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 */
export function withSupermemory(
	openaiClient: OpenAI,
	options: OpenAIMiddlewareOptions,
) {
	const apiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	if (!options.containerTag) {
		throw new Error(
			"containerTag is required — provide a non-empty string to identify the user/container",
		)
	}

	if (!options.customId) {
		throw new Error(
			"customId is required — provide a non-empty string to group messages into a single document",
		)
	}

	const { containerTag } = options
	const verbose = options.verbose ?? false
	const mode = options.mode ?? "profile"
	const addMemory = options.addMemory ?? "never"

	const openaiWithSupermemory = createOpenAIMiddleware(
		openaiClient,
		containerTag,
		{
			...options,
			apiKey,
			verbose,
			mode,
			addMemory,
		},
	)

	return openaiWithSupermemory
}

export type { OpenAIMiddlewareOptions }
export type {
	MemorySearchResult,
	MemoryAddResult,
	ProfileResult,
	DocumentListResult,
	DocumentDeleteResult,
	DocumentAddResult,
	MemoryForgetResult,
} from "./tools"
export {
	createSearchMemoriesFunction,
	createAddMemoryFunction,
	createGetProfileFunction,
	createDocumentListFunction,
	createDocumentDeleteFunction,
	createDocumentAddFunction,
	createMemoryForgetFunction,
	supermemoryTools,
	getToolDefinitions,
	createToolCallExecutor,
	createToolCallsExecutor,
	createSearchMemoriesTool,
	createAddMemoryTool,
	createGetProfileTool,
	createDocumentListTool,
	createDocumentDeleteTool,
	createDocumentAddTool,
	createMemoryForgetTool,
	memoryToolSchemas,
} from "./tools"
