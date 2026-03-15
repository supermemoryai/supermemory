/**
 * Shared constants and descriptions for Supermemory tools
 */

// Tool descriptions
export const TOOL_DESCRIPTIONS = {
	searchMemories:
		"Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful.",
	addMemory:
		"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
	getProfile:
		"Get user profile containing static memories (permanent facts) and dynamic memories (recent context). Optionally include search results by providing a query.",
	documentList:
		"List stored documents with optional filtering by container tag, status, and pagination. Useful for browsing or managing saved content.",
	documentDelete:
		"Delete a document and its associated memories by document ID or customId. Deletes are permanent. Use when user wants to remove saved content.",
	documentAdd:
		"Add a new document (URL, text, or content) to memory. The content is queued for processing, and memories will be extracted automatically.",
	memoryForget:
		"Forget (soft delete) a specific memory by ID or content match. The memory is marked as forgotten but not permanently deleted. Use when user wants to remove specific information from their profile.",
} as const

// Parameter descriptions
export const PARAMETER_DESCRIPTIONS = {
	informationToGet: "Terms to search for in the user's memories",
	includeFullDocs:
		"Whether to include the full document content in the response. Defaults to true for better AI context.",
	limit: "Maximum number of results to return",
	memory:
		"The text content of the memory to add. This should be a single sentence or a short paragraph.",
	containerTag: "Tag to filter/scope the operation (e.g., user ID, project ID)",
	query: "Optional search query to include relevant search results",
	offset: "Number of items to skip for pagination (default: 0)",
	status:
		"Filter documents by processing status (e.g., 'completed', 'processing', 'failed')",
	documentId: "The unique identifier of the document to operate on",
	content: "The content to add - can be text, URL, or other supported formats",
	title: "Optional title for the document",
	description: "Optional description for the document",
	memoryId: "The unique identifier of the memory entry",
	memoryContent:
		"Exact content match of the memory entry to operate on (alternative to ID)",
	reason: "Optional reason for forgetting this memory",
} as const

// Default values
export const DEFAULT_VALUES = {
	includeFullDocs: true,
	limit: 10,
	chunkThreshold: 0.6,
} as const

// Container tag constants
export const CONTAINER_TAG_CONSTANTS = {
	projectPrefix: "sm_project_",
	defaultTags: ["sm_project_default"] as string[],
} as const

/**
 * Helper function to generate container tags based on config
 */
export function getContainerTags(config?: {
	projectId?: string
	containerTags?: string[]
}): string[] {
	if (config?.projectId) {
		return [`${CONTAINER_TAG_CONSTANTS.projectPrefix}${config.projectId}`]
	}
	return config?.containerTags ?? CONTAINER_TAG_CONSTANTS.defaultTags
}

/**
 * Memory item interface representing a single memory with optional metadata
 */
export interface MemoryItem {
	memory: string
	metadata?: Record<string, unknown>
}

/**
 * Profile data structure containing memory items from different sources.
 * API may return either MemoryItem objects or plain strings.
 */
export interface ProfileWithMemories {
	static?: Array<MemoryItem | string>
	dynamic?: Array<MemoryItem | string>
	searchResults?: Array<MemoryItem | string>
}

/**
 * Deduplicated memory strings organized by source
 */
export interface DeduplicatedMemories {
	static: string[]
	dynamic: string[]
	searchResults: string[]
}

/**
 * Deduplicates memory items across static, dynamic, and search result sources.
 * Priority: Static > Dynamic > Search Results
 *
 * @param data - Profile data with memory items from different sources
 * @returns Deduplicated memory strings for each source
 *
 * @example
 * ```typescript
 * const deduplicated = deduplicateMemories({
 *   static: [{ memory: "User likes TypeScript" }],
 *   dynamic: [{ memory: "User likes TypeScript" }, { memory: "User works remotely" }],
 *   searchResults: [{ memory: "User prefers async/await" }]
 * });
 * // Returns:
 * // {
 * //   static: ["User likes TypeScript"],
 * //   dynamic: ["User works remotely"],
 * //   searchResults: ["User prefers async/await"]
 * // }
 * ```
 */
export function deduplicateMemories(
	data: ProfileWithMemories,
): DeduplicatedMemories {
	const staticItems = data.static ?? []
	const dynamicItems = data.dynamic ?? []
	const searchItems = data.searchResults ?? []

	const getMemoryString = (item: MemoryItem | string): string | null => {
		if (!item) return null
		// Handle both string format (from API) and object format
		if (typeof item === "string") {
			const trimmed = item.trim()
			return trimmed.length > 0 ? trimmed : null
		}
		if (typeof item.memory !== "string") return null
		const trimmed = item.memory.trim()
		return trimmed.length > 0 ? trimmed : null
	}

	const staticMemories: string[] = []
	const seenMemories = new Set<string>()

	for (const item of staticItems as Array<MemoryItem | string>) {
		const memory = getMemoryString(item)
		if (memory !== null) {
			staticMemories.push(memory)
			seenMemories.add(memory)
		}
	}

	const dynamicMemories: string[] = []

	for (const item of dynamicItems as Array<MemoryItem | string>) {
		const memory = getMemoryString(item)
		if (memory !== null && !seenMemories.has(memory)) {
			dynamicMemories.push(memory)
			seenMemories.add(memory)
		}
	}

	const searchMemories: string[] = []

	for (const item of searchItems as Array<MemoryItem | string>) {
		const memory = getMemoryString(item)
		if (memory !== null && !seenMemories.has(memory)) {
			searchMemories.push(memory)
			seenMemories.add(memory)
		}
	}

	return {
		static: staticMemories,
		dynamic: dynamicMemories,
		searchResults: searchMemories,
	}
}
