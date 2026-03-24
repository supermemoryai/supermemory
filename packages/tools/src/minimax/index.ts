import type OpenAI from "openai"
import {
	createOpenAIMiddleware,
	type OpenAIMiddlewareOptions,
} from "../openai/middleware"

/**
 * MiniMax model definitions.
 *
 * MiniMax provides OpenAI-compatible chat models via `https://api.minimax.io/v1`.
 */
export const MINIMAX_MODELS = [
	{ id: "MiniMax-M2.7", name: "MiniMax M2.7" },
	{ id: "MiniMax-M2.7-highspeed", name: "MiniMax M2.7 Highspeed" },
] as const

export type MiniMaxModelId = (typeof MINIMAX_MODELS)[number]["id"]

/** Default MiniMax API base URL (international). */
export const MINIMAX_BASE_URL = "https://api.minimax.io/v1"

export interface MiniMaxSupermemoryOptions extends OpenAIMiddlewareOptions {
	/**
	 * MiniMax API key. Falls back to `process.env.MINIMAX_API_KEY`.
	 */
	minimaxApiKey?: string
	/**
	 * MiniMax API base URL. Defaults to `https://api.minimax.io/v1`.
	 */
	minimaxBaseUrl?: string
}

/**
 * Clamps temperature to MiniMax's accepted range (0, 1.0].
 * MiniMax does not accept temperature = 0; the minimum is a small positive value.
 */
export function clampTemperature(temperature?: number): number {
	if (temperature === undefined || temperature === null) return 1.0
	if (temperature <= 0) return 0.01
	if (temperature > 1) return 1.0
	return temperature
}

/**
 * Creates an OpenAI client pre-configured for MiniMax's API and wraps it with
 * SuperMemory middleware to automatically inject relevant memories.
 *
 * This is a convenience wrapper that combines MiniMax client creation with
 * SuperMemory's memory middleware, so you get persistent memory out of the box
 * when using MiniMax models.
 *
 * @param openaiClient - An OpenAI client instance configured with MiniMax's base URL and API key.
 *   You can create one like:
 *   ```typescript
 *   import OpenAI from "openai"
 *   const client = new OpenAI({
 *     apiKey: process.env.MINIMAX_API_KEY,
 *     baseURL: "https://api.minimax.io/v1",
 *   })
 *   ```
 * @param containerTag - The container tag/identifier for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 *
 * @returns An OpenAI client with SuperMemory middleware injected for both Chat Completions and Responses APIs
 *
 * @example
 * ```typescript
 * import OpenAI from "openai"
 * import { withSupermemory } from "@supermemory/tools/minimax"
 *
 * const minimax = new OpenAI({
 *   apiKey: process.env.MINIMAX_API_KEY,
 *   baseURL: "https://api.minimax.io/v1",
 * })
 *
 * const client = withSupermemory(minimax, "user-123", {
 *   mode: "full",
 *   addMemory: "always",
 * })
 *
 * const response = await client.chat.completions.create({
 *   model: "MiniMax-M2.7",
 *   messages: [{ role: "user", content: "What's my favorite color?" }],
 *   temperature: 0.7,
 * })
 * ```
 *
 * @throws {Error} When SUPERMEMORY_API_KEY environment variable is not set
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
	const baseUrl = options?.baseUrl

	const openaiWithSupermemory = createOpenAIMiddleware(
		openaiClient,
		containerTag,
		{
			conversationId,
			verbose,
			mode,
			addMemory,
			baseUrl,
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
} from "../openai/tools"
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
} from "../openai/tools"
