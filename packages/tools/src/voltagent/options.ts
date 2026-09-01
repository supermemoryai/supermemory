/**
 * Peer-free configuration types for the VoltAgent integration.
 *
 * This module intentionally avoids importing @voltagent/core so the root
 * @supermemory/tools declarations remain usable when the optional peer is absent.
 */

import type Supermemory from "supermemory"
import type { SupermemoryBaseOptions } from "../shared"

/**
 * Configuration options for the Supermemory VoltAgent integration.
 * Extends base options with VoltAgent-specific settings.
 */
export interface SupermemoryVoltAgent extends SupermemoryBaseOptions {
	/**
	 * Custom ID to group messages into a single document.
	 * Ensures related messages are added to the same document for that conversation.
	 */
	customId: string

	/**
	 * Threshold / sensitivity for memory selection. 0 is least sensitive (returns
	 * most memories, more results), 1 is most sensitive (returns fewer memories,
	 * more accurate results). When omitted, the selected backend route applies
	 * its own default.
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	threshold?: number

	/**
	 * Maximum number of memory results to return. Must be an integer between 1
	 * and 100. When omitted, the selected backend route applies its own default.
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	limit?: number

	/**
	 * If true, rerank the results based on the query. This helps ensure the most
	 * relevant results are returned. Default: false
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	rerank?: boolean

	/**
	 * If true, rewrites the query to make it easier to find memories. This increases
	 * latency by about 400ms. Default: false
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	rewriteQuery?: boolean

	/**
	 * Advanced filters to apply to the search using AND/OR logic.
	 * Example: { OR: [{ key: "type", value: "note" }, { key: "type", value: "conversation" }] }
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	filters?: SearchFilters

	/**
	 * Control what additional data to include in search results.
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	include?: IncludeOptions

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
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	searchMode?: "memories" | "documents" | "hybrid"

	/**
	 * @deprecated The conversations API does not accept per-request entity context.
	 * Configure entity context on the container tag instead.
	 */
	entityContext?: string
}

/** Advanced search filters using AND/OR logic. */
export type SearchFilters = NonNullable<Supermemory.SearchParams["filters"]>

/** Options for including additional data in search results. */
export interface IncludeOptions {
	/** Fetch chunks from documents associated with found memories. */
	chunks?: boolean
	/** Include full document information in results. */
	documents?: boolean
	/** Include explicitly forgotten or expired memories. */
	forgottenMemories?: boolean
	/** Include parent/child memories from the memory graph. */
	relatedMemories?: boolean
	/** Include document summaries in results. */
	summaries?: boolean
}
