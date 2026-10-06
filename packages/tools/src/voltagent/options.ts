/**
 * Peer-free configuration types for the VoltAgent integration.
 *
 * This module intentionally avoids importing @voltagent/core so the root
 * @supermemory/tools declarations remain usable when the optional peer is absent.
 */

import type {
	FilterExpression,
	SearchRequestInclude,
	SearchRequestRerank,
	SearchRequestSearchMode,
} from "supermemory"
import type { SupermemoryBaseOptions } from "../shared"

/**
 * Configuration options for the Supermemory VoltAgent integration.
 * Extends base options with VoltAgent-specific settings.
 */
export interface SupermemoryVoltAgent extends SupermemoryBaseOptions {
	/**
	 * ID that groups messages into a single document.
	 * Ensures related messages are added to the same document for that conversation.
	 */
	id: string

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
	 * Post-retrieval ranking: "none", "order", or "aggregate". Default: "none"
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	rerank?: SearchRequestRerank

	/**
	 * If true, rewrites the query to make it easier to find memories. This increases
	 * latency by about 400ms. Default: false
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	rewriteQuery?: boolean

	/**
	 * Typed metadata filter applied before ranking.
	 * Example: { operator: "or", operands: [{ field: "type", operator: "eq", value: "note" }, { field: "type", operator: "eq", value: "conversation" }] }
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	filter?: SearchFilter

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
	 * - "chunks": Search only document chunks
	 * - "hybrid": Search both memories AND document chunks (recommended)
	 *
	 * Note: Only effective when mode is "query" or "full". Ignored in "profile" mode.
	 */
	searchMode?: SearchRequestSearchMode

	/** Context that guides memory extraction for saved conversations. Max 1500 characters. */
	supportingContext?: string
}

/** Typed v5 metadata filter expression. */
export type SearchFilter = FilterExpression

/** Options for including additional data in search results. */
export type IncludeOptions = SearchRequestInclude
