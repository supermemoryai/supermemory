/**
 * VoltAgent integration for Supermemory.
 *
 * Provides a wrapper function that enhances VoltAgent agent configurations
 * with Supermemory hooks for automatic memory injection and storage.
 *
 * @module
 */

import { createSupermemoryHooks, mergeHooks } from "./hooks"
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
 * The function injects hooks that automatically:
 * - Retrieve relevant memories before LLM calls (via onPrepareMessages)
 * - Inject memories into the system prompt
 * - Optionally save conversations after completion (via onEnd)
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

	// Create Supermemory hooks (internally creates its own context, validates API key)
	const supermemoryHooks = createSupermemoryHooks(namespace, supermemoryOptions)

	// Merge with existing hooks if present
	const mergedHooks = mergeHooks(agentConfig.hooks, supermemoryHooks)

	// Return enhanced config with merged hooks
	return {
		...agentConfig,
		hooks: mergedHooks,
	}
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
