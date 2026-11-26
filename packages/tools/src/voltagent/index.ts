/**
 * VoltAgent integration for Supermemory.
 *
 * Provides a wrapper function that enhances VoltAgent agent configurations
 * with Supermemory hooks for automatic memory injection and storage.
 *
 * @module
 */

import { withMemoryBlocks } from "../vercel/middleware"
import type { LanguageModel } from "../vercel/util"
import { createHooks, mergeHooks } from "./hooks"
import {
	createSupermemoryContext,
	type SupermemoryMiddlewareContext,
} from "./middleware"
import type { VoltAgentConfig, SupermemoryVoltAgent } from "./types"

/**
 * Configuration options for withSupermemory.
 */
interface WithSupermemoryOptions<T extends VoltAgentConfig>
	extends SupermemoryVoltAgent {
	/**
	 * The VoltAgent agent configuration to enhance
	 */
	agentConfig: T

	/**
	 * Required. The namespace (e.g. user ID) for scoping memories (e.g., "user-123")
	 */
	namespace: string
}

/**
 * Enhances a VoltAgent agent configuration with Supermemory memory capabilities.
 *
 * When `agentConfig.model` is a model object or a function returning one, the model is wrapped:
 * - When the latest user message has no memories yet, one recall (profile and search, per
 *   `mode`) is sent as a separate user message after it. Instructions and stored messages are
 *   never changed.
 * - The reply carries that block, signed, in its provider metadata, which VoltAgent memory
 *   stores with the message. On later calls the block is put back in front of that reply, so
 *   history is resent byte for byte and stays prompt-cacheable. Tool-call steps reuse it.
 * - A block with a missing or bad signature is ignored and the call gets a fresh recall.
 * - Nothing is held in memory between calls, so a new agent per request is fine.
 *
 * With a `provider/model` string or a fallback list, the recall is appended by an
 * `onPrepareMessages` hook instead (see {@link createSupermemoryHooks}). Either way an `onEnd`
 * hook saves the conversation when `addMemory` is `"always"`.
 *
 * @param options - Configuration object containing agent config and Supermemory options
 * @param options.agentConfig - The VoltAgent agent configuration to enhance
 * @param options.namespace - Required. The namespace (e.g. user ID) for scoping memories (e.g., "user-123")
 * @param options.mode - Memory retrieval mode: "profile" (default), "query", or "full"
 * @param options.addMemory - Memory persistence: "always" (default for VoltAgent) or "never"
 * @param options.id - Required. ID that groups messages into a single document
 * @param options.apiKey - Supermemory API key (falls back to SUPERMEMORY_API_KEY env var)
 * @param options.baseUrl - Custom Supermemory API base URL
 * @param options.promptTemplate - Custom function to format memory data into prompt
 * @param options.threshold - Search sensitivity: 0 (more results) to 1 (more accurate)
 * @param options.limit - Maximum number of memory results to return (integer from 1 to 100)
 * @param options.rerank - "none" (default), "order", or "aggregate"
 * @param options.rewriteQuery - If true, AI-rewrite query for better results (+400ms latency). Default: false
 * @param options.filter - Typed metadata filter for search
 * @param options.include - Extra context per result: documents, related, forgotten
 * @param options.metadata - Optional metadata to attach to saved conversations
 * @param options.searchMode - Search mode: "memories" (atomic facts), "chunks", or "hybrid" (both)
 * @param options.supportingContext - Context that guides memory extraction for saved conversations
 * @returns Enhanced agent config with Supermemory hooks injected
 *
 * @example
 * Basic usage with profile memories:
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/voltagent"
 * import { Agent } from "@voltagent/core"
 * import { openai } from "@ai-sdk/openai"
 *
 * const configWithMemory = withSupermemory({
 *   agentConfig: {
 *     name: "my-agent",
 *     instructions: "You are a helpful assistant",
 *     model: openai("gpt-4o"),
 *   },
 *   namespace: "user-123",
 *   id: "conversation-123"
 * })
 *
 * const agent = new Agent(configWithMemory)
 * ```
 *
 * @example
 * Advanced usage with full memory mode and conversation saving:
 * ```typescript
 * const configWithMemory = withSupermemory({
 *   agentConfig: {
 *     name: "my-agent",
 *     instructions: "You are a helpful assistant",
 *     model: openai("gpt-4o"),
 *   },
 *   namespace: "user-123",      // Required: user/project ID
 *   mode: "full",                   // "profile" | "query" | "full"
 *   addMemory: "always",            // "always" | "never"
 *   id: "conv-456",           // Group messages by conversation
 *   threshold: 0.7,                 // 0.0-1.0 (higher = more accurate)
 *   limit: 15,                      // Max results to return
 *   rerank: "order",                // Rerank for best relevance
 *   searchMode: "hybrid",           // "memories" | "chunks" | "hybrid"
 *   metadata: {                     // Custom metadata
 *     source: "voltagent",
 *     version: "1.0"
 *   }
 * })
 *
 * const agent = new Agent(configWithMemory)
 *
 * // Use the agent - memories are automatically injected
 * const result = await agent.generateText(
 *   "What's my favorite programming language?",
 * )
 * ```
 *
 * @example
 * Custom prompt template:
 * ```typescript
 * const configWithMemory = withSupermemory({
 *   agentConfig: {
 *     name: "my-agent",
 *     instructions: "...",
 *     model: openai("gpt-4o"),
 *   },
 *   namespace: "user-123",
 *   id: "conversation-123",
 *   mode: "full",
 *   promptTemplate: (data) => `
 *     <user_context>
 *     ${data.userMemories}
 *     ${data.generalSearchMemories}
 *     </user_context>
 *   `.trim()
 * })
 *
 * const agent = new Agent(configWithMemory)
 * ```
 *
 * @throws {Error} When neither `options.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 * @throws {Error} When Supermemory API request fails
 */
export function withSupermemory<T extends VoltAgentConfig>(
	options: WithSupermemoryOptions<T>,
): T & { hooks: NonNullable<VoltAgentConfig["hooks"]> } {
	const { agentConfig, namespace, ...supermemoryOptions } = options

	const ctx = createSupermemoryContext(namespace, supermemoryOptions)
	const model = wrapModel(agentConfig.model, ctx)
	const hooks = mergeHooks(agentConfig.hooks, createHooks(ctx, !model))

	return { ...agentConfig, model: model ?? agentConfig.model, hooks } as T & {
		hooks: NonNullable<VoltAgentConfig["hooks"]>
	}
}

const isModel = (value: unknown): value is LanguageModel =>
	!!value &&
	typeof value === "object" &&
	typeof (value as { doStream?: unknown }).doStream === "function"

// Returns undefined when the model cannot be wrapped, so the hooks append the recall instead.
const wrapModel = (
	model: VoltAgentConfig["model"],
	ctx: SupermemoryMiddlewareContext,
): VoltAgentConfig["model"] | undefined => {
	const wrap = (value: unknown) => {
		if (isModel(value)) {
			return withMemoryBlocks(value, {
				blocks: ctx.blocks,
				logger: ctx.logger,
				onRecallError: (error) =>
					ctx.logger.warn("Memory recall failed; continuing without it", {
						error: error instanceof Error ? error.message : String(error),
					}),
			})
		}
		ctx.logger.warn(
			"Supermemory can only wrap a model object; this call runs without memories",
		)
		return value
	}
	if (isModel(model)) return wrap(model) as VoltAgentConfig["model"]
	if (typeof model === "function") {
		return (async (...args: Parameters<typeof model>) =>
			wrap(await model(...args))) as VoltAgentConfig["model"]
	}
	return undefined
}

// Export types for consumers
export type {
	SupermemoryVoltAgent,
	VoltAgentConfig,
	VoltAgentMessage,
	VoltAgentHooks,
	SearchFilter,
	IncludeOptions,
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
} from "./types"

export type { WithSupermemoryOptions }

// Note: WithSupermemoryOptions is exported above separately because it's generic

// Export hook creation utilities for advanced use cases
export { createSupermemoryHooks } from "./hooks"
