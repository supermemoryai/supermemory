import type OpenAI from "openai"
import {
	createOpenAIMiddleware,
	type SupermemoryOpenAIOptions,
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
 * @param options.containerTag - The container tag/identifier for memory search (e.g., user ID)
 * @param options.customId - Custom ID to group messages into a single document (e.g., conversation ID)
 * @param options.mode - Memory search mode: "profile" (default), "query", or "full"
 * @param options.addMemory - Memory persistence mode: "always" (default) or "never"
 * @param options.verbose - Enable detailed logging (default: false)
 * @param options.apiKey - Supermemory API key (falls back to SUPERMEMORY_API_KEY env var)
 * @param options.baseUrl - Custom Supermemory API base URL
 *
 * @returns An OpenAI client with SuperMemory middleware injected for both Chat Completions and Responses APIs
 *
 * @example
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/openai"
 * import OpenAI from "openai"
 *
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
 *
 * const openaiWithSupermemory = withSupermemory(openai, {
 *   containerTag: "user-123",
 *   customId: "conv-456",
 *   mode: "full",
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
 * @throws {Error} When neither apiKey option nor SUPERMEMORY_API_KEY environment variable is set
 * @throws {Error} When containerTag is not provided or is empty
 * @throws {Error} When customId is not provided or is empty
 * @throws {Error} When supermemory API request fails
 */
export function withSupermemory(
	openaiClient: OpenAI,
	options: SupermemoryOpenAIOptions,
) {
	const apiKey = options.apiKey ?? process.env.SUPERMEMORY_API_KEY
	if (!apiKey) {
		throw new Error(
			"[supermemory] API key is required. Provide it via options.apiKey or set SUPERMEMORY_API_KEY environment variable.",
		)
	}

	if (
		!options.containerTag ||
		typeof options.containerTag !== "string" ||
		!options.containerTag.trim()
	) {
		throw new Error(
			"[supermemory] containerTag is required and must be a non-empty string. " +
				"This identifies the user or container for memory scoping. " +
				"Example: { containerTag: 'user-123', ... }",
		)
	}

	if (
		!options.customId ||
		typeof options.customId !== "string" ||
		!options.customId.trim()
	) {
		throw new Error(
			"[supermemory] customId is required and must be a non-empty string. " +
				"This ensures messages are grouped into the same document for a conversation. " +
				"Example: { containerTag: 'user-123', customId: 'conv-456', ... }",
		)
	}

	return createOpenAIMiddleware(openaiClient, { ...options, apiKey })
}

export type { SupermemoryOpenAIOptions }
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
