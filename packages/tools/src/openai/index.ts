import type OpenAI from "openai"
import {
	createOpenAIMiddleware,
	type OpenAIMiddlewareOptions,
} from "./middleware"

/**
 * Wraps an OpenAI client with SuperMemory middleware to automatically inject relevant memories
 * into the system prompt based on the user's message content.
 *
 * This middleware searches the supermemory API for relevant memories using the container tag
 * and user message, then either appends memories to an existing system prompt or creates
 * a new system prompt with the memories.
 *
 * @param openaiClient - The OpenAI client to wrap with SuperMemory middleware
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 * @param options.conversationId - Optional conversation ID to group messages into a single document for contextual memory generation
 * @param options.verbose - Optional flag to enable detailed logging of memory search and injection process (default: false)
 * @param options.mode - Optional mode for memory search: "profile" (default), "query", or "full"
 * @param options.addMemory - Optional mode for memory addition: "always" (default), "never"
 *
 * @returns An OpenAI client with SuperMemory middleware injected
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
 * const openaiWithSupermemory = withSupermemory(openai, "user-123", {
 *   conversationId: "conversation-456",
 *   mode: "full",
 *   addMemory: "always"
 * })
 *
 * // Use normally - memories will be automatically injected
 * const response = await openaiWithSupermemory.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [
 *     { role: "user", content: "What's my favorite programming language?" }
 *   ]
 * })
 * ```
 *
 * @throws {Error} When SUPERMEMORY_API_KEY environment variable is not set
 * @throws {Error} When supermemory API request fails
 */
export function withSupermemory(
	openaiClient: OpenAI,
	containerTag: string,
	options?: OpenAIMiddlewareOptions,
) {
	if (!process.env.SUPERMEMORY_API_KEY) {
		throw new Error("SUPERMEMORY_API_KEY is not set")
	}

	const conversationId = options?.conversationId
	const verbose = options?.verbose ?? false
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "never"

	const openaiWithSupermemory = createOpenAIMiddleware(
		openaiClient,
		containerTag,
		{
			conversationId,
			verbose,
			mode,
			addMemory,
		},
	)

	return openaiWithSupermemory
}

export type { OpenAIMiddlewareOptions }
export type { MemorySearchResult, MemoryAddResult } from "./tools"
export {
	createSearchMemoriesFunction,
	createAddMemoryFunction,
	supermemoryTools,
	getToolDefinitions,
	createToolCallExecutor,
	createToolCallsExecutor,
	createSearchMemoriesTool,
	createAddMemoryTool,
	memoryToolSchemas,
} from "./tools"
