/**
 * Shared constants and descriptions for Supermemory tools
 */

import type { MemoryMode } from "./shared/types"

// Tool descriptions
export const TOOL_DESCRIPTIONS = {
	searchMemories:
		"Search (recall) stored memories for facts, preferences, history, and context about the user or any topic. Use proactively before answering whenever memory could help — do not wait for the user to explicitly ask you to search or recall. Search when the question touches personal context, past conversations, preferences, projects, people, plans, or anything you may have learned before. Results include memory/chunk IDs — use those IDs with memoryForget to remove a specific learned fact.",
	addMemory:
		"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
	getProfile:
		"Get user profile containing static memories (permanent facts) and dynamic memories (recent context). Optionally include search results by providing a query. Profile and search result entries may include memory IDs useful for memoryForget.",
	documentList:
		"List stored source documents (conversations, URLs, files, pasted text) with pagination. Returns document IDs for documentDelete — not memory IDs for memoryForget. Use to browse raw stored content before permanently removing a source.",
	documentDelete:
		"Permanently delete a stored document and ALL memories extracted from it (hard delete). Use document IDs from documentList. Use when the user wants to remove an entire conversation, file, URL, or other source — not when correcting a single learned fact (use memoryForget for that).",
	documentAdd:
		"Store a source document for asynchronous processing and automatic memory extraction. Use when the user gives you raw content to ingest — a pasted text blob, conversation transcript, chat history, notes, URL, article link, or other substantial text — rather than a single atomic fact (use addMemory for one short generalizable sentence). The document is queued immediately; Supermemory post-processes it in the background (chunking, embedding, indexing) and extracts profile memories automatically — you do not need to call addMemory for facts buried inside the document. Good for saving full conversations, long-form notes, knowledge-base articles, meeting transcripts, or any large body of text the user wants remembered beyond this chat turn. Processing may take a moment; extracted memories appear in profile/search after indexing completes.",
	memoryForget:
		"Soft-delete a single extracted profile memory (a learned fact) so it no longer appears in profile or search. Does NOT delete source documents. Provide memoryId (preferred — from searchMemories or getProfile) OR memoryContent for an exact text match. Use when the user retracts or corrects a specific fact (e.g. 'forget I like tea', 'that's wrong'). To remove an entire conversation or file, use documentDelete instead.",
} as const

// Parameter descriptions
export const PARAMETER_DESCRIPTIONS = {
	informationToGet:
		"What to look up in memory — keywords from the user's message, topic, entity names, or question phrasing. Search even when the user did not explicitly ask you to recall.",
	includeFullDocs:
		"Whether to include the full document content in the response. Defaults to true for better AI context.",
	limit: "Maximum number of results to return",
	memory:
		"The text content of the memory to add. This should be a single sentence or a short paragraph.",
	containerTag: "Tag to filter/scope the operation (e.g., user ID, project ID)",
	query: "Optional search query to include relevant search results",
	page: "Page number to fetch, 1-based (default: 1)",
	documentId:
		"Document ID from documentList — permanently deletes the source document and all extracted memories. Not a profile memory ID.",
	content:
		"Document body to store — plain text, a conversation transcript, a long pasted blob, or a URL to a webpage/PDF/image/video. Content is queued and memories are extracted automatically after background processing; do not split into addMemory calls.",
	title: "Optional title for the document",
	description: "Optional description for the document",
	memoryId:
		"Profile memory ID from searchMemories or getProfile — soft-deletes one learned fact via memoryForget. Not a document ID.",
	memoryContent:
		"Exact text of the profile memory to forget (alternative to memoryId). Must match precisely; if unsure, search first and use memoryId.",
	reason:
		"Optional reason recorded when forgetting (e.g. outdated, user correction)",
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
	if (config?.projectId !== undefined && config.containerTags !== undefined) {
		throw new Error(
			"Supermemory tools config accepts either projectId or containerTags, not both.",
		)
	}
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

/** Normalize exact fact variants without attempting semantic/fuzzy matching. */
export function normalizeMemoryFact(memory: string): string {
	return memory
		.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase()
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
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key !== null && !seenMemories.has(key)) {
			staticMemories.push(memory)
			seenMemories.add(key)
		}
	}

	const dynamicMemories: string[] = []

	for (const item of dynamicItems as Array<MemoryItem | string>) {
		const memory = getMemoryString(item)
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key !== null && !seenMemories.has(key)) {
			dynamicMemories.push(memory)
			seenMemories.add(key)
		}
	}

	const searchMemories: string[] = []

	for (const item of searchItems as Array<MemoryItem | string>) {
		const memory = getMemoryString(item)
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key !== null && !seenMemories.has(key)) {
			searchMemories.push(memory)
			seenMemories.add(key)
		}
	}

	return {
		static: staticMemories,
		dynamic: dynamicMemories,
		searchResults: searchMemories,
	}
}

/**
 * Deduplicates memory items against only the sources the given mode actually
 * injects into the prompt.
 *
 * `"query"` mode injects the search results but not the profile, so search
 * results must not be deduplicated against the profile: a memory present in
 * both would be dropped as a duplicate of something the model never sees, and
 * would disappear from the prompt entirely.
 *
 * @param mode - The memory retrieval mode
 * @param data - Profile data with memory items from different sources
 * @returns Deduplicated memory strings for each source
 */
export function deduplicateMemoriesForMode(
	mode: MemoryMode,
	data: ProfileWithMemories,
): DeduplicatedMemories {
	const injectsProfile = mode !== "query"

	return deduplicateMemories({
		static: injectsProfile ? data.static : [],
		dynamic: injectsProfile ? data.dynamic : [],
		searchResults: data.searchResults,
	})
}
