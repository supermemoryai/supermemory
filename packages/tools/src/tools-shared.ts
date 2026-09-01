/**
 * Shared constants and descriptions for Supermemory tools
 */

import type Supermemory from "supermemory"
import type { MemoryMode } from "./shared/types"

// Tool descriptions
export const TOOL_DESCRIPTIONS = {
	searchMemories:
		"Search the primary configured container tag for relevant facts, preferences, history, and source context. Use when explicitly asked to search or recall, or when past context could materially improve the response; do not invoke reflexively on every turn. Hybrid results mix learned memories (memory field) and source chunks (chunk field). Only an ID on a result containing a memory field is a profile-memory ID that can be passed to memoryForget; chunk-result IDs cannot be forgotten.",
	addMemory:
		"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
	getProfile:
		"Get the user profile for the primary configured container tag, unless containerTag explicitly overrides it. The profile contains static memories (permanent facts) and dynamic memories (recent context). Profile entries are text without IDs. Provide a query to include searchResults, whose memory entries may include IDs usable with memoryForget.",
	documentList:
		"List stored source documents (conversations, URLs, files, pasted text) with pagination. Configured container tags are treated as the default union; an optional containerTag replaces that union with one tag for this operation. Returns document metadata and IDs for documentDelete, not raw document content or memory IDs for memoryForget.",
	documentDelete:
		"Permanently delete a stored source document. Memories extracted from that source are soft-forgotten so they no longer appear in profile or search; they are not hard-deleted. Use a document ID or customId when removing an entire conversation, file, URL, or other source. The effective scope is the configured container-tag union, or the explicit one-tag override; if documentList used an override, pass the same value here. For safety, deletion is refused while the document is processing or nonterminal, or when its authoritative tag set is empty, unavailable, or contains any tag outside the effective scope. To forget one learned fact, use memoryForget instead.",
	documentAdd:
		"Store a source document for asynchronous processing and automatic memory extraction. Use when the user gives you raw content to ingest — a pasted text blob, conversation transcript, chat history, notes, URL, article link, or other substantial text — rather than a single atomic fact (use addMemory for one short generalizable sentence). The document is queued immediately; Supermemory post-processes it in the background (chunking, embedding, indexing) and extracts profile memories automatically — you do not need to call addMemory for facts buried inside the document. Good for saving full conversations, long-form notes, knowledge-base articles, meeting transcripts, or any large body of text the user wants remembered beyond this chat turn. Processing may take a moment; extracted memories appear in profile/search after indexing completes.",
	memoryForget:
		"Soft-forget a single extracted profile memory (a learned fact) in the primary configured container tag, unless containerTag explicitly overrides it, so the fact no longer appears in profile or search. Does NOT delete source documents. Provide memoryId from query-backed getProfile searchResults or from a searchMemories result containing a memory field, or provide memoryContent for an exact text match. Chunk-result IDs from searchMemories are not valid. Use when the user retracts or corrects a specific fact. To remove an entire source, use documentDelete instead.",
} as const

// Parameter descriptions
export const PARAMETER_DESCRIPTIONS = {
	informationToGet:
		"What to look up in stored context — keywords from the user's message, topic, entity names, or question phrasing.",
	includeFullDocs:
		"Deprecated compatibility input. It is ignored because v4 hybrid search returns learned memories and matching chunks, not full source documents.",
	limit: "Maximum number of results to return",
	searchLimit: "Maximum number of results to return (1-50)",
	memory:
		"The text content of the memory to add. This should be a single sentence or a short paragraph.",
	containerTag: "Tag to filter/scope the operation (e.g., user ID, project ID)",
	documentContainerTag:
		"Optional one-tag scope override. When deleting a document returned by documentList with a containerTag override, pass the same value here. In strict mode, pass null to use the configured union. Deletion is refused if the document has any tag outside the resulting effective scope.",
	query: "Optional search query to include relevant search results",
	page: "Page number to fetch, 1-based (default: 1)",
	documentId:
		"Document ID from documentList, or the document customId. Permanently deletes the source document and soft-forgets its extracted memories only after processing reaches a terminal done or failed state. If documentList used a containerTag override, pass it again. Deletion is refused if the document has any tag outside the effective scope. Not a profile-memory ID.",
	content:
		"Document body to store — plain text, a conversation transcript, a long pasted blob, or a URL to a webpage/PDF/image/video. Content is queued and memories are extracted automatically after background processing; do not split into addMemory calls.",
	title: "Optional title for the document",
	description: "Optional description for the document",
	memoryId:
		"Profile-memory ID from query-backed getProfile searchResults or a searchMemories result containing a memory field. Soft-forgets one learned fact; chunk-result and document IDs are not valid.",
	memoryContent:
		"Exact text of the profile memory to forget (alternative to memoryId). Must match precisely; if unsure, query getProfile and use a search-result memory ID.",
	reason:
		"Optional reason recorded when forgetting (e.g. outdated, user correction)",
} as const

// Default values
export const DEFAULT_VALUES = {
	includeFullDocs: true,
	limit: 10,
	searchThreshold: 0.6,
} as const

// Bounds for the searchMemories `limit` input.
export const SEARCH_LIMIT_BOUNDS = { min: 1, max: 50 } as const

/**
 * Clamp a searchMemories `limit` into SEARCH_LIMIT_BOUNDS.
 * The schema constrains well-behaved models; a prompt-injected one can still
 * send anything, so tool execution clamps as well. Non-numeric input falls
 * back to DEFAULT_VALUES.limit.
 */
export function clampSearchLimit(value: unknown): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return DEFAULT_VALUES.limit
	return Math.min(
		SEARCH_LIMIT_BOUNDS.max,
		Math.max(SEARCH_LIMIT_BOUNDS.min, Math.floor(parsed)),
	)
}

// Supermemory client options shared by the tool surfaces: bound each request
// and limit retries so a slow API cannot stall an agent turn indefinitely.
export const CLIENT_OPTIONS = {
	timeout: 30_000,
	maxRetries: 2,
} as const

// Container tag constants
export const CONTAINER_TAG_CONSTANTS = {
	projectPrefix: "sm_project_",
	defaultTags: ["sm_project_default"] as const,
} as const

/**
 * Helper function to generate container tags based on config
 */
export function getContainerTags(config?: {
	projectId?: string
	containerTags?: string[]
}): [string, ...string[]] {
	if (config?.projectId !== undefined && config.containerTags !== undefined) {
		throw new Error(
			"Supermemory tools config accepts either projectId or containerTags, not both.",
		)
	}
	if (config?.projectId !== undefined) {
		if (config.projectId.trim() === "") {
			throw new Error(
				"Supermemory tools config requires a non-empty projectId.",
			)
		}
		return [`${CONTAINER_TAG_CONSTANTS.projectPrefix}${config.projectId}`]
	}
	if (config?.containerTags !== undefined) {
		const [firstTag, ...remainingTags] = config.containerTags
		if (
			firstTag === undefined ||
			config.containerTags.some((tag) => tag.trim() === "")
		) {
			throw new Error(
				"Supermemory tools config requires at least one non-empty containerTag.",
			)
		}
		return [firstTag, ...remainingTags]
	}
	return [...CONTAINER_TAG_CONSTANTS.defaultTags]
}

/** Delete exactly one document by its internal ID. */
export async function deleteDocumentById(
	client: Supermemory,
	documentId: string,
): Promise<void> {
	const response = await client.documents.deleteBulk({ ids: [documentId] })
	if (response.success && response.deletedCount === 1) return

	const detail = response.errors?.find(
		(error) => error.id === documentId,
	)?.error
	throw new Error(
		detail
			? `Failed to delete document ${documentId}: ${detail}`
			: `Failed to delete document ${documentId}: expected one deletion, received ${response.deletedCount}`,
	)
}

/**
 * Resolve an internal ID or customId inside the effective container-tag union,
 * then delete the exact internal document ID. Internal IDs take precedence over
 * customId matches.
 */
export async function deleteDocumentByIdentifier(
	client: Supermemory,
	documentIdentifier: string,
	containerTags: readonly [string, ...string[]],
): Promise<void> {
	const directMatch = await getDocumentIfFound(client, documentIdentifier)
	if (directMatch?.id === documentIdentifier) {
		assertDocumentCanBeDeleted(directMatch, containerTags)
		await deleteDocumentById(client, directMatch.id)
		return
	}

	const candidateIds = new Set<string>()
	let hasInternalIdCandidate = false
	let page = 1
	while (true) {
		const response = await client.documents.list({
			containerTags: [...containerTags],
			includeContent: false,
			limit: 100,
			page,
		})
		for (const document of response.memories) {
			if (document.id === documentIdentifier) {
				hasInternalIdCandidate = true
			}
			if (
				document.id === documentIdentifier ||
				document.customId === documentIdentifier
			) {
				candidateIds.add(document.id)
			}
		}
		if (page >= response.pagination.totalPages) break
		page += 1
	}

	let exactIdMatch: string | undefined
	let hasUnverifiedCandidate = false
	const customIdMatches: string[] = []
	for (const candidateId of candidateIds) {
		const document = await getDocumentIfFound(client, candidateId)
		if (document?.id !== candidateId) {
			hasUnverifiedCandidate = true
			continue
		}
		assertDocumentCanBeDeleted(document, containerTags)
		if (document.id === documentIdentifier) {
			exactIdMatch = document.id
			break
		}
		if (document.customId === documentIdentifier) {
			customIdMatches.push(document.id)
		} else {
			hasUnverifiedCandidate = true
		}
	}

	if (exactIdMatch) {
		await deleteDocumentById(client, exactIdMatch)
		return
	}
	if (hasInternalIdCandidate) {
		throw new Error(
			`Document ID ${documentIdentifier} could not be verified safely in the configured container scope.`,
		)
	}
	if (hasUnverifiedCandidate) {
		throw new Error(
			`Document identifier ${documentIdentifier} could not be resolved unambiguously in the configured container scope.`,
		)
	}
	if (customIdMatches.length === 1) {
		await deleteDocumentById(client, customIdMatches[0] as string)
		return
	}
	if (customIdMatches.length > 1) {
		throw new Error(
			`Document customId ${documentIdentifier} is ambiguous in the configured container scope.`,
		)
	}
	throw new Error(
		`Document ${documentIdentifier} was not found in the configured container scope.`,
	)
}

async function getDocumentIfFound(client: Supermemory, documentId: string) {
	try {
		return await client.documents.get(documentId)
	} catch (error) {
		if (isNotFoundError(error)) return undefined
		throw error
	}
}

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		error.status === 404
	)
}

const TERMINAL_DOCUMENT_STATUSES = new Set(["done", "failed"])

function assertDocumentCanBeDeleted(
	document: Awaited<ReturnType<Supermemory["documents"]["get"]>>,
	expectedContainerTags: readonly string[],
): void {
	if (
		!hasCompleteContainerTagScope(document.containerTags, expectedContainerTags)
	) {
		throw new Error(
			`Document ${document.id} could not be verified safely: its complete non-empty container-tag set must be contained in the configured scope.`,
		)
	}

	// The current SDK always supplies status. Keeping undefined permissive lets
	// older SDKs and lightweight client doubles continue to work.
	const status = (document as { status?: string }).status
	if (status !== undefined && !TERMINAL_DOCUMENT_STATUSES.has(status)) {
		throw new Error(
			`Document ${document.id} cannot be deleted while it is processing or otherwise nonterminal (status: ${status}).`,
		)
	}
}

function hasCompleteContainerTagScope(
	actual: string[] | undefined,
	expected: readonly string[],
): boolean {
	return (
		actual !== undefined &&
		actual.length > 0 &&
		actual.every((tag) => tag.trim() !== "" && expected.includes(tag))
	)
}

/**
 * Memory item interface representing a single memory with optional metadata
 */
export interface MemoryItem {
	memory?: string
	chunk?: string
	metadata?: Record<string, unknown> | null
}

/**
 * Profile data from `/v4/profile`.
 *
 * Current profile arrays contain plain strings and search results contain
 * MemoryItem objects. Object profile entries and string search entries remain
 * accepted for compatibility with older API responses and SDK fixtures.
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
		.trim()
		.replace(/^\[recent\]\s*/i, "")
		.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase()
}

/** Extract the first non-empty fact from current memory or chunk result shapes. */
export function getMemoryText(item: MemoryItem | string): string | null {
	if (typeof item === "string") {
		const trimmed = item.trim()
		return trimmed.length > 0 ? trimmed : null
	}

	for (const value of [item.memory, item.chunk]) {
		if (typeof value !== "string") continue
		const trimmed = value.trim()
		if (trimmed) return trimmed
	}
	return null
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
 *   static: ["User likes TypeScript"],
 *   dynamic: ["User likes TypeScript", "User works remotely"],
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

	const staticMemories: string[] = []
	const seenMemories = new Set<string>()

	for (const item of staticItems as Array<MemoryItem | string>) {
		const memory = getMemoryText(item)
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key && !seenMemories.has(key)) {
			staticMemories.push(memory)
			seenMemories.add(key)
		}
	}

	const dynamicMemories: string[] = []

	for (const item of dynamicItems as Array<MemoryItem | string>) {
		const memory = getMemoryText(item)
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key && !seenMemories.has(key)) {
			dynamicMemories.push(memory)
			seenMemories.add(key)
		}
	}

	const searchMemories: string[] = []

	for (const item of searchItems as Array<MemoryItem | string>) {
		const memory = getMemoryText(item)
		const key = memory === null ? null : normalizeMemoryFact(memory)
		if (memory !== null && key && !seenMemories.has(key)) {
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
