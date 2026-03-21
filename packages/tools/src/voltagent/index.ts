/**
 * VoltAgent integration for Supermemory.
 *
 * Provides a wrapper function that enhances VoltAgent agent configurations
 * with Supermemory hooks for automatic memory injection and storage.
 *
 * @module
 */

import { validateApiKey } from "../shared"
import { createSupermemoryHooks, mergeHooks } from "./hooks"
import type {
	VoltAgentConfig,
	SupermemoryVoltAgentOptions,
} from "./types"

/**
 * Enhances a VoltAgent agent configuration with Supermemory memory capabilities.
 *
 * Pattern: First create your agent config, then wrap it with Supermemory.
 * This matches the Pipecat-style two-step setup.
 *
 * The function injects hooks that automatically:
 * - Retrieve relevant memories before LLM calls (via onPrepareMessages)
 * - Inject memories into the system prompt
 * - Optionally save conversations after completion (via onEnd)
 *
 * @param agentConfig - The VoltAgent agent configuration to enhance
 * @param options - Configuration options including containerTag and memory behavior
 * @param options.containerTag - Required. The container tag/user ID for scoping memories (e.g., "user-123")
 * @param options.mode - Memory retrieval mode: "profile" (default), "query", or "full"
 * @param options.addMemory - Memory persistence: "always" (default for VoltAgent) or "never"
 * @param options.threadId - Optional conversation/thread ID to group messages
 * @param options.apiKey - Supermemory API key (falls back to SUPERMEMORY_API_KEY env var)
 * @param options.baseUrl - Custom Supermemory API base URL
 * @param options.promptTemplate - Custom function to format memory data into prompt
 * @param options.threshold - Search sensitivity: 0 (more results) to 1 (more accurate). Default: 0.1
 * @param options.limit - Maximum number of memory results to return. Default: 10
 * @param options.rerank - If true, rerank results for relevance. Default: false
 * @param options.rewriteQuery - If true, AI-rewrite query for better results (+400ms latency). Default: false
 * @param options.filters - Advanced AND/OR filters for search
 * @param options.include - Control what additional data to include (chunks, documents, etc.)
 * @param options.customId - Optional custom ID for document creation (alternative to threadId)
 * @param options.metadata - Optional metadata to attach to saved conversations
 * @param options.searchMode - Search mode: "memories" (atomic facts), "documents" (chunks), or "hybrid" (both)
 * @param options.entityContext - Context for memory extraction (max 1500 chars), guides how memories are understood
 * @returns Enhanced agent config with Supermemory hooks injected
 *
 * @example
 * Basic usage with profile memories (Pipecat-style two-step):
 * ```typescript
 * import { withSupermemory } from "@supermemory/tools/voltagent"
 * import { Agent } from "@voltagent/core"
 * import { VercelAIProvider } from "@voltagent/vercel-ai"
 * import { openai } from "@ai-sdk/openai"
 *
 * // Step 1: Define your agent configuration
 * const agentConfig = {
 *   name: "my-agent",
 *   instructions: "You are a helpful assistant",
 *   llm: new VercelAIProvider(),
 *   model: openai("gpt-4o"),
 * }
 *
 * // Step 2: Wrap it with Supermemory
 * const configWithMemory = withSupermemory(agentConfig, {
 *   containerTag: "user-123"
 * })
 *
 * // Step 3: Create the agent
 * const agent = new Agent(configWithMemory)
 * ```
 *
 * @example
 * Advanced usage with full memory mode and conversation saving:
 * ```typescript
 * // Step 1: Create base agent config
 * const agentConfig = {
 *   name: "my-agent",
 *   instructions: "You are a helpful assistant",
 *   llm: new VercelAIProvider(),
 *   model: openai("gpt-4o"),
 * }
 *
 * // Step 2: Wrap with Supermemory (Pipecat-style params)
 * const configWithMemory = withSupermemory(agentConfig, {
 *   containerTag: "user-123",  // Required: user/project ID
 *   mode: "full",              // "profile" | "query" | "full"
 *   addMemory: "always",       // "always" | "never"
 *   threadId: "conv-456",      // Group messages by conversation
 *   threshold: 0.7,            // 0.0-1.0 (higher = more accurate)
 *   limit: 15,                 // Max results to return
 *   rerank: true,              // Rerank for best relevance
 *   searchMode: "hybrid",      // "memories" | "documents" | "hybrid"
 *   entityContext: "This is John, a software engineer saving technical discussions",
 *   metadata: {                // Custom metadata
 *     source: "voltagent",
 *     version: "1.0"
 *   }
 * })
 *
 * // Step 3: Create agent
 * const agent = new Agent(configWithMemory)
 *
 * // Use the agent - memories are automatically injected
 * const result = await agent.generateText({
 *   messages: [{ role: "user", content: "What's my favorite programming language?" }]
 * })
 * ```
 *
 * @example
 * Custom prompt template (inline style):
 * ```typescript
 * // You can also do it in one step for simpler cases
 * const agent = new Agent(
 *   withSupermemory(
 *     {
 *       name: "my-agent",
 *       instructions: "...",
 *       llm: new VercelAIProvider(),
 *       model: openai("gpt-4o"),
 *     },
 *     {
 *       containerTag: "user-123",
 *       mode: "full",
 *       promptTemplate: (data) => `
 *         <user_context>
 *         ${data.userMemories}
 *         ${data.generalSearchMemories}
 *         </user_context>
 *       `.trim()
 *     }
 *   )
 * )
 * ```
 *
 * @throws {Error} When neither `options.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 * @throws {Error} When Supermemory API request fails
 */
export function withSupermemory<T extends VoltAgentConfig>(
	config: T,
	options: SupermemoryVoltAgentOptions & { containerTag: string },
): T {
	const { containerTag, ...supermemoryOptions } = options

	// Validate API key
	validateApiKey(supermemoryOptions.apiKey)

	// Create Supermemory hooks (internally creates its own context)
	const supermemoryHooks = createSupermemoryHooks(
		containerTag,
		supermemoryOptions,
	)

	// Merge with existing hooks if present
	const mergedHooks = mergeHooks(config.hooks, supermemoryHooks)

	// Return enhanced config with merged hooks
	return {
		...config,
		hooks: mergedHooks,
	}
}

// Export types for consumers
export type {
	SupermemoryVoltAgentOptions,
	VoltAgentConfig,
	VoltAgentMessage,
	VoltAgentHooks,
	SearchFilters,
	IncludeOptions,
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
} from "./types"

// Export hook creation utilities for advanced use cases
export { createSupermemoryHooks } from "./hooks"
