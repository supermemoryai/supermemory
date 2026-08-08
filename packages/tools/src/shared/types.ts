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
	 * Raw search results from the API for the current query.
	 * Use this to traverse, filter, or selectively include results based on metadata.
	 * Empty array if mode is "profile" or when no search was performed.
	 */
	searchResults: Array<{ memory: string; metadata?: Record<string, unknown> }>
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

/**
 * Response structure from the Supermemory profile API.
 */
export interface ProfileStructure {
	profile: {
		/**
		 * Core, stable facts about the user that rarely change.
		 * Examples: name, profession, long-term preferences, goals.
		 */
		static?: Array<{ memory: string; metadata?: Record<string, unknown> }>
		/**
		 * Recently learned or frequently updated information about the user.
		 * Examples: current projects, recent interests, ongoing topics.
		 */
		dynamic?: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}
	searchResults: {
		/**
		 * Memories retrieved based on semantic similarity to the current query.
		 * Most relevant to the immediate conversation context. `chunk`, when
		 * present, marks the entry as a document chunk (e.g. from a connector
		 * sync) rather than an atomic user-authored memory — governance hooks
		 * that need to treat connector-sourced content differently (e.g. for
		 * injection scanning) rely on this distinction being preserved.
		 */
		results: Array<{
			memory: string
			chunk?: string
			metadata?: Record<string, unknown>
		}>
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
	searchResults: {
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
	/** Governance hook invoked on raw retrieval results before formatting/injection */
	governanceHook?: MemoryGovernanceHook
}

/**
 * Context passed to a governance hook alongside the retrieved memories.
 */
export interface MemoryGovernanceContext {
	/** Container tag/user ID the retrieval was scoped to */
	containerTag: string
	/** Query text used for the retrieval (empty string in "profile" mode) */
	queryText: string
	/** Memory retrieval mode active for this call */
	mode: MemoryMode
}

/**
 * A hook invoked with the raw retrieval results before they are deduplicated,
 * formatted, and injected into the LLM context. Lets a governance provider
 * (PII redaction, prompt-injection detection, audit logging, etc.) inspect
 * and/or rewrite `memory` strings, drop entries, or throw to abort retrieval.
 *
 * Runs at the retrieval boundary only — it does not scan content at ingestion
 * time, and it is not implemented by Supermemory itself; providers plug in here.
 */
export type MemoryGovernanceHook = (
	profile: ProfileStructure,
	context: MemoryGovernanceContext,
) => ProfileStructure | Promise<ProfileStructure>
