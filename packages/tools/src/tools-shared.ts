import { NotFoundError, Supermemory } from "supermemory"
import type { MemoryMode } from "./shared/types"
import type { SupermemoryToolsConfig } from "./types"

export { TOOL_DESCRIPTIONS, PARAMETER_DESCRIPTIONS } from "./tools-descriptions"

export const DEFAULT_VALUES = {
	includeFullDocs: true,
	limit: 10,
	searchThreshold: 0.6,
} as const

export const SEARCH_LIMIT_BOUNDS = { min: 1, max: 50 } as const

// The schema constrains well-behaved models; a prompt-injected one can still send anything.
export function clampSearchLimit(value: unknown): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return DEFAULT_VALUES.limit
	return Math.min(
		SEARCH_LIMIT_BOUNDS.max,
		Math.max(SEARCH_LIMIT_BOUNDS.min, Math.floor(parsed)),
	)
}

// Bound each request so a slow API cannot stall an agent turn indefinitely.
export const CLIENT_OPTIONS = {
	timeoutInSeconds: 30,
	maxRetries: 2,
} as const

export const DEFAULT_NAMESPACE = "sm_project_default"

export function getNamespace(config?: { namespace?: string }): string {
	if (config?.namespace === undefined) return DEFAULT_NAMESPACE
	if (config.namespace.trim() === "") {
		throw new Error("Supermemory tools config requires a non-empty namespace.")
	}
	return config.namespace
}

export function createToolsClient(
	apiKey: string,
	config?: SupermemoryToolsConfig,
): Supermemory {
	return new Supermemory({
		apiKey,
		...CLIENT_OPTIONS,
		...(config?.baseUrl ? { baseUrl: config.baseUrl } : {}),
	})
}

export function isNotFoundError(error: unknown): boolean {
	if (error instanceof NotFoundError) return true
	if (typeof error !== "object" || error === null) return false
	const status =
		"statusCode" in error
			? error.statusCode
			: "status" in error
				? error.status
				: undefined
	return status === 404
}

const TERMINAL_DOCUMENT_STATUSES = new Set(["done", "failed"])

// Accepts a Supermemory ID or caller-defined ID; v5 resolves both inside the namespace.
export async function deleteDocument(
	client: Supermemory,
	namespace: string,
	documentId: string,
): Promise<void> {
	let document: Awaited<ReturnType<Supermemory["documents"]["get"]>>
	try {
		document = await client.documents.get(namespace, documentId)
	} catch (error) {
		if (isNotFoundError(error)) {
			throw new Error(
				`Document ${documentId} was not found in namespace ${namespace}.`,
			)
		}
		throw error
	}

	const status = document.system?.status
	if (status !== undefined && !TERMINAL_DOCUMENT_STATUSES.has(status)) {
		throw new Error(
			`Document ${documentId} cannot be deleted while it is processing or otherwise nonterminal (status: ${status}).`,
		)
	}

	const response = await client.documents.delete(namespace, {
		ids: [document.id],
	})
	if (response.count === 1) return

	const detail = response.errors?.find(
		(error) => error.id === document.id,
	)?.error
	throw new Error(
		detail
			? `Failed to delete document ${documentId}: ${detail}`
			: `Failed to delete document ${documentId}: expected one deletion, received ${response.count}`,
	)
}

// v5 profile takes no query; query-ranked results come from a separate memories search.
export async function getProfileWithSearch(
	client: Supermemory,
	namespace: string,
	query?: string,
) {
	const [profileResponse, searchResponse] = await Promise.all([
		client.profile(namespace),
		query
			? client.search(namespace, {
					query,
					searchMode: "memories",
					threshold: DEFAULT_VALUES.searchThreshold,
				})
			: undefined,
	])
	return {
		profile: profileResponse.profile,
		...(searchResponse && { searchResults: searchResponse.results }),
	}
}

export interface ForgetMemoryParams {
	id?: string
	content?: string
}

// Exact-text forget previews semantic matches, then forgets only the exact-text ones by ID.
export async function forgetMemory(
	client: Supermemory,
	namespace: string,
	params: ForgetMemoryParams,
): Promise<number> {
	let ids: string[]
	if (params.id) {
		ids = [params.id]
	} else if (params.content) {
		const target = normalizeMemoryFact(params.content)
		const preview = await client.memories.forgetMatching(namespace, {
			query: params.content,
			dryRun: true,
		})
		ids = preview.matches
			.filter((match) => normalizeMemoryFact(match.memory) === target)
			.map((match) => match.id)
		if (ids.length === 0) {
			throw new Error(
				`No memory exactly matching "${params.content}" was found in namespace ${namespace}.`,
			)
		}
	} else {
		throw new Error("Either memoryId or memoryContent must be provided")
	}

	const response = await client.memories.forget(namespace, { ids })
	if (response.count > 0) return response.count

	const detail = response.errors?.[0]?.error
	throw new Error(
		detail
			? `Failed to forget memory: ${detail}`
			: "Failed to forget memory: no memories matched",
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

// v5 profile and search entries are objects; plain strings are still accepted.
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
