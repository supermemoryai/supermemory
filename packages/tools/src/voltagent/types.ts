/**
 * Type definitions for VoltAgent integration.
 *
 * VoltAgent uses hooks to intercept and modify agent behavior. We integrate
 * Supermemory by providing hooks that inject memories before LLM calls.
 */

import type {
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
	SupermemoryBaseOptions,
} from "../shared"

/**
 * Configuration options for the Supermemory VoltAgent integration.
 * Extends base options with VoltAgent-specific settings.
 */
export interface SupermemoryVoltAgentOptions extends Omit<SupermemoryBaseOptions, 'verbose'> {
	/**
	 * When using memory storage, set this to enable automatic conversation saving.
	 * The threadId is used to group messages into a single conversation.
	 */
	threadId?: string

	/**
	 * Threshold / sensitivity for memory selection. 0 is least sensitive (returns
	 * most memories, more results), 1 is most sensitive (returns fewer memories,
	 * more accurate results). Default: 0.1
	 */
	threshold?: number

	/**
	 * Maximum number of memory results to return. Default: 10
	 */
	limit?: number

	/**
	 * If true, rerank the results based on the query. This helps ensure the most
	 * relevant results are returned. Default: false
	 */
	rerank?: boolean

	/**
	 * If true, rewrites the query to make it easier to find memories. This increases
	 * latency by about 400ms. Default: false
	 */
	rewriteQuery?: boolean

	/**
	 * Advanced filters to apply to the search using AND/OR logic.
	 * Example: { OR: [{ metadata: { type: "note" } }, { metadata: { type: "conversation" } }] }
	 */
	filters?: SearchFilters

	/**
	 * Control what additional data to include in search results
	 */
	include?: IncludeOptions

	/**
	 * Optional custom ID for document creation (alternative to threadId).
	 * Max 100 characters, alphanumeric with hyphens and underscores only.
	 */
	customId?: string

	/**
	 * Optional metadata to attach to saved documents/conversations.
	 * Can include strings, numbers, or booleans.
	 */
	metadata?: Record<string, string | number | boolean>

	/**
	 * Search mode controlling what type of results to search.
	 * - "memories": Search only memory entries (atomic facts)
	 * - "documents": Search only document chunks
	 * - "hybrid": Search both memories AND document chunks (recommended)
	 */
	searchMode?: "memories" | "documents" | "hybrid"

	/**
	 * Context for memory extraction when saving conversations.
	 * Helps guide how memories are extracted and understood from content.
	 * Max 1500 characters.
	 * Example: "This is John, saving items in a personal knowledge management system"
	 */
	entityContext?: string
}

/**
 * Advanced search filters using AND/OR logic
 */
export type SearchFilters =
	| { OR: Array<unknown> }
	| { AND: Array<unknown> }

/**
 * Options for including additional data in search results
 */
export interface IncludeOptions {
	/**
	 * If true, fetch and return chunks from documents associated with found memories.
	 * Performs vector search on chunks within those documents.
	 */
	chunks?: boolean

	/**
	 * If true, include full document information in results
	 */
	documents?: boolean

	/**
	 * If true, include forgotten memories in search results. Forgotten memories are
	 * memories that have been explicitly forgotten or have passed their expiration date.
	 */
	forgottenMemories?: boolean

	/**
	 * If true, include related memories (parents/children in the memory graph)
	 */
	relatedMemories?: boolean

	/**
	 * If true, include document summaries in results
	 */
	summaries?: boolean
}

/**
 * VoltAgent message format (simplified to avoid direct dependency).
 * Compatible with VoltAgent's Message type.
 */
export interface VoltAgentMessage {
	role: "system" | "user" | "assistant" | "tool"
	content: string | Array<{ type: string; text?: string; [key: string]: unknown }>
	[key: string]: unknown
}

/**
 * Minimal VoltAgent AgentConfig interface representing properties we enhance.
 * This avoids a direct dependency on @voltagent/core while staying type-safe.
 */
export interface VoltAgentConfig {
	name: string
	instructions?: string
	model?: unknown
	llm?: unknown
	hooks?: VoltAgentHooks
	[key: string]: unknown
}

/**
 * VoltAgent hooks interface (simplified).
 * Hooks allow intercepting agent lifecycle events.
 */
export interface VoltAgentHooks {
	onStart?: (args: HookStartArgs) => void | Promise<void>
	onPrepareMessages?: (
		args: HookPrepareMessagesArgs,
	) => { messages?: VoltAgentMessage[] } | Promise<{ messages?: VoltAgentMessage[] }>
	onEnd?: (args: HookEndArgs) => void | Promise<void>
	[key: string]: unknown
}

/**
 * Arguments passed to onStart hook.
 */
export interface HookStartArgs {
	agent: {
		name: string
		[key: string]: unknown
	}
	context?: {
		messages?: VoltAgentMessage[]
		[key: string]: unknown
	}
	[key: string]: unknown
}

/**
 * Arguments passed to onPrepareMessages hook.
 */
export interface HookPrepareMessagesArgs {
	messages: VoltAgentMessage[]
	agent: {
		name: string
		[key: string]: unknown
	}
	context?: {
		[key: string]: unknown
	}
	[key: string]: unknown
}

/**
 * Arguments passed to onEnd hook.
 */
export interface HookEndArgs {
	agent: {
		name: string
		[key: string]: unknown
	}
	context?: {
		input?: unknown
		[key: string]: unknown
	}
	output?: unknown
	[key: string]: unknown
}

// Re-export shared types for convenience
export type {
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
}
