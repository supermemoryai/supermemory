import type OpenAI from "openai"
import {
	createOpenAIMiddleware,
	type OpenAIMiddlewareOptions,
} from "./middleware"

/**
 * Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
 * into both Chat Completions and Responses APIs based on the user's input content.
 *
 * The profile ("profile" and "full" modes) is fetched once per conversation and is not refreshed:
 * - Chat Completions API: appended as a separate block to the first system or developer message,
 *   keeping your text unchanged, or sent as a new system message when there is none.
 * - Responses API: appended to `instructions` the same way, or set as `instructions`. OpenAI does
 *   not carry `instructions` over with `previous_response_id`, so it is resent unchanged each call.
 *
 * Search results ("query" and "full" modes) are appended to the user message (or user `input` item)
 * they were retrieved for, and earlier messages keep the block they first received, so the prompt
 * prefix stays byte-identical and prompt-cacheable. A failed or timed-out fetch is retried on the
 * next user message. Use one wrapped client per conversation (`options.id`).
 *
 * @param openaiClient - The OpenAI client to wrap with SuperMemory middleware
 * @param options - Configuration options for the middleware
 * @param options.namespace - Required. The namespace for memory search (e.g., user ID, project ID)
 * @param options.id - Required. ID that groups messages into a single document for contextual memory generation
 * @param options.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param options.mode - Optional mode for memory search: "profile" (default), "query", or "full"
 * @param options.addMemory - Optional mode for memory addition: "always" (default), "never"
 * @param options.apiKey - Optional Supermemory API key; falls back to SUPERMEMORY_API_KEY
 * @param options.baseUrl - Optional base URL for the Supermemory API (default: "https://api.supermemory.ai")
 *
 * @returns A distinct OpenAI middleware facade for Chat Completions and Responses APIs. The supplied client is not mutated.
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
 *   namespace: "user-123",
 *   id: "conversation-456",
 *   mode: "full",
 *   addMemory: "always"
 * })
 *
 * // Use with Chat Completions API - profile in the system message, search on the user message
 * const chatResponse = await openaiWithSupermemory.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [
 *     { role: "user", content: "What's my favorite programming language?" }
 *   ]
 * })
 *
 * // Use with Responses API - profile in instructions, search on the user input
 * const response = await openaiWithSupermemory.responses.create({
 *   model: "gpt-4o",
 *   instructions: "You are a helpful coding assistant",
 *   input: "What's my favorite programming language?"
 * })
 * ```
 *
 * @throws {Error} When neither options.apiKey nor SUPERMEMORY_API_KEY is set
 * @throws {Error} When supermemory API request fails
 */
export function withSupermemory(
	openaiClient: OpenAI,
	options: OpenAIMiddlewareOptions,
) {
	if (!options.apiKey?.trim() && !process.env.SUPERMEMORY_API_KEY?.trim()) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via options.apiKey or set the environment variable",
		)
	}

	if (!options.namespace) {
		throw new Error(
			"namespace is required — provide a non-empty string to identify the user or project",
		)
	}

	if (!options.id) {
		throw new Error(
			"id is required — provide a non-empty string to group messages into a single document",
		)
	}

	const { namespace } = options
	const verbose = options.verbose ?? false
	const mode = options.mode ?? "profile"
	const addMemory = options.addMemory ?? "always"

	const openaiWithSupermemory = createOpenAIMiddleware(
		openaiClient,
		namespace,
		{
			...options,
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
