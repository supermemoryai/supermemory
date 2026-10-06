import type { SearchResponseResultsItem } from "supermemory"

/**
 * Data provided to the prompt template function for customizing memory injection.
 */
export interface MemoryPromptData {
	/**
	 * Pre-formatted markdown combining static and dynamic profile memories.
	 * Contains core user facts (name, preferences, goals) and recent context (projects, interests).
	 */
	userMemories: string
	/**
	 * Pre-formatted search results text for the current query.
	 * Contains memories retrieved based on semantic similarity to the conversation.
	 * Empty string if mode is "profile" only.
	 */
	generalSearchMemories: string
	/**
	 * Metadata-preserving search results that remain after cross-source deduplication.
	 * Use this to traverse, filter, or selectively include visible results.
	 * The runtime always supplies an array (empty in profile mode or when no search
	 * was performed).
	 */
	searchResults: MemorySearchResult[]
}

/** A raw v5 search result, as returned by `search(namespace)`. */
export type ProfileSearchResult = SearchResponseResultsItem

/** One profile memory, as returned by `profile(namespace)`. */
export interface ProfileEntry {
	id: string
	memory: string
}

/** A visible, deduplicated query result provided to prompt templates. */
export interface MemorySearchResult
	extends Omit<ProfileSearchResult, "memory"> {
	memory: string
}

/**
 * Function type for customizing the memory prompt injection.
 * Return the full string to be injected into the system prompt.
 *
 * @example
 * ```typescript
 * const promptTemplate: PromptTemplate = (data) => `
 * <user_memories>
 * Here is some information about your past conversations:
 * ${data.userMemories}
 * ${data.generalSearchMemories}
 * </user_memories>
 * `.trim()
 * // data.searchResults provides raw results for custom filtering/formatting
 * ```
 */
export type PromptTemplate = (data: MemoryPromptData) => string

/**
 * Memory retrieval mode:
 * - "profile": Retrieves user profile memories (static + dynamic) without query filtering
 * - "query": Searches memories based on semantic similarity to the user's message
 * - "full": Combines both profile and query-based results
 */
export type MemoryMode = "profile" | "query" | "full"

/**
 * Memory persistence mode:
 * - "always": Automatically save conversations as memories
 * - "never": Only retrieve memories, don't store new ones
 */
export type AddMemoryMode = "always" | "never"

/**
 * Logger interface for consistent logging across integrations.
 */
export interface Logger {
	debug: (message: string, data?: unknown) => void
	info: (message: string, data?: unknown) => void
	warn: (message: string, data?: unknown) => void
	error: (message: string, data?: unknown) => void
}

/** v5 profile plus an optional memories search for the current query. */
export interface ProfileStructure {
	profile: {
		/** Core, stable facts (name, profession, long-term preferences). */
		static?: ProfileEntry[]
		/** Recently learned or frequently updated context. */
		dynamic?: ProfileEntry[]
		/** Memories grouped by custom profile bucket. */
		buckets?: Record<string, ProfileEntry[]>
	}
	searchResults?: {
		results: ProfileSearchResult[]
		/** Server-side search duration in milliseconds. */
		timing: number
	}
}

/**
 * Simplified profile data for markdown conversion.
 */
export interface ProfileMarkdownData {
	profile: {
		/** Core, stable user facts (name, preferences, goals) */
		static?: string[]
		/** Recently learned or updated information (current projects, interests) */
		dynamic?: string[]
	}
	searchResults?: {
		/** Query-relevant memories based on semantic similarity */
		results: Array<{ memory: string }>
	}
}

/**
 * Base options shared across all integrations for Supermemory configuration.
 */
export interface SupermemoryBaseOptions {
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY env var) */
	apiKey?: string
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/** Optional conversation/thread ID to group messages for contextual memory generation */
	threadId?: string
	/** Memory retrieval mode */
	mode?: MemoryMode
	/** Memory persistence mode */
	addMemory?: AddMemoryMode
	/** Enable detailed logging of memory search and injection */
	verbose?: boolean
	/** Custom function to format memory data into the system prompt */
	promptTemplate?: PromptTemplate
}
