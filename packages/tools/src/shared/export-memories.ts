const DEFAULT_BASE_URL = "https://api.supermemory.ai"
const FETCH_TIMEOUT_MS = 30_000
const DEFAULT_PAGE_SIZE = 50

export interface MemoryEntryHistory {
	id: string
	memory: string
	version: number
	createdAt: string
	updatedAt: string
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	isLatest?: boolean
	isForgotten?: boolean
}

export interface MemoryEntry {
	id: string
	memory: string
	version: number
	isLatest: boolean
	isForgotten: boolean
	isStatic?: boolean
	isInference?: boolean
	createdAt: string
	updatedAt: string
	sourceCount?: number
	documentIds?: string[]
	history?: MemoryEntryHistory[]
}

export interface MemoriesListResponse {
	memoryEntries: MemoryEntry[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

export interface ListMemoriesParams {
	containerTags: string[]
	page?: number
	limit?: number
	sort?: "createdAt" | "updatedAt"
	order?: "asc" | "desc"
	filters?: unknown
}

export interface ListMemoriesRequestOptions {
	signal?: AbortSignal
	fetchFn?: typeof fetch
}

export interface ExportMemoriesOptions {
	baseUrl?: string
	apiKey?: string
	pageSize?: number
	maxPages?: number
	includeForgotten?: boolean
	signal?: AbortSignal
	fetchFn?: typeof fetch
}

export interface MemoriesExportData {
	containerTag: string
	exportedAt: string
	totalCount: number
	baseUrl: string
	memories: MemoryEntry[]
}

/**
 * Fetch a page of memory entries directly from the `/v4/memories/list` endpoint.
 * Works with both hosted platform (`https://api.supermemory.ai`) and
 * self-hosted Supermemory server (`http://localhost:6767`).
 */
export async function listMemoriesRequest(
	apiKey: string,
	params: ListMemoriesParams,
	baseUrl: string = DEFAULT_BASE_URL,
	options?: ListMemoriesRequestOptions,
): Promise<MemoriesListResponse> {
	const customFetch = options?.fetchFn ?? fetch
	const cleanBase = baseUrl.replace(/\/+$/, "")
	const response = await customFetch(`${cleanBase}/v4/memories/list`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			"x-sm-source": "tools-export",
		},
		body: JSON.stringify({
			containerTags: params.containerTags,
			page: params.page ?? 1,
			limit: params.limit ?? DEFAULT_PAGE_SIZE,
			sort: params.sort ?? "createdAt",
			order: params.order ?? "desc",
			...(params.filters ? { filters: params.filters } : {}),
		}),
		signal: options?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Supermemory list memories failed: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}

	return (await response.json()) as MemoriesListResponse
}

/**
 * Iteratively fetch all memory entries for a specific containerTag across all pages.
 */
export async function fetchAllMemories(
	containerTag: string,
	options?: ExportMemoriesOptions,
): Promise<MemoryEntry[]> {
	const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL
	const apiKey = options?.apiKey ?? ""
	const limit = options?.pageSize ?? DEFAULT_PAGE_SIZE
	const maxPages = options?.maxPages ?? 1000
	const includeForgotten = options?.includeForgotten ?? false

	const allMemories: MemoryEntry[] = []
	let currentPage = 1
	let hasMore = true

	while (hasMore && currentPage <= maxPages) {
		const response = await listMemoriesRequest(
			apiKey,
			{
				containerTags: [containerTag],
				page: currentPage,
				limit,
				sort: "createdAt",
				order: "desc",
			},
			baseUrl,
			{
				signal: options?.signal,
				fetchFn: options?.fetchFn,
			},
		)

		const entries = response.memoryEntries ?? []
		for (const entry of entries) {
			if (!includeForgotten && entry.isForgotten) {
				continue
			}
			allMemories.push(entry)
		}

		const totalPages = response.pagination?.totalPages ?? 1
		if (currentPage >= totalPages || entries.length === 0) {
			hasMore = false
		} else {
			currentPage++
		}
	}

	return allMemories
}

/**
 * Export all memories for a container tag formatted as JSON with backup metadata.
 */
export async function exportMemoriesAsJson(
	containerTag: string,
	options?: ExportMemoriesOptions,
): Promise<string> {
	const memories = await fetchAllMemories(containerTag, options)
	const exportData: MemoriesExportData = {
		containerTag,
		exportedAt: new Date().toISOString(),
		totalCount: memories.length,
		baseUrl: options?.baseUrl ?? DEFAULT_BASE_URL,
		memories,
	}
	return JSON.stringify(exportData, null, 2)
}

/**
 * Export all memories for a container tag formatted as human-readable Markdown.
 */
export async function exportMemoriesAsMarkdown(
	containerTag: string,
	options?: ExportMemoriesOptions,
): Promise<string> {
	const memories = await fetchAllMemories(containerTag, options)
	const lines: string[] = [
		`# Supermemory Backup: ${containerTag}`,
		"",
		`- **Exported At:** ${new Date().toISOString()}`,
		`- **Total Memories:** ${memories.length}`,
		`- **Server:** ${options?.baseUrl ?? DEFAULT_BASE_URL}`,
		"",
		"---",
		"",
	]

	if (memories.length === 0) {
		lines.push("_No memories found for this container tag._")
		return lines.join("\n")
	}

	for (let i = 0; i < memories.length; i++) {
		const m = memories[i]
		const status = m.isForgotten ? " [FORGOTTEN]" : ""
		const type = m.isStatic ? "Static" : "Dynamic"
		lines.push(`### ${i + 1}. ${m.memory}${status}`)
		lines.push(`- **ID:** \`${m.id}\``)
		lines.push(`- **Type:** ${type}`)
		lines.push(`- **Version:** ${m.version}`)
		lines.push(`- **Created:** ${m.createdAt}`)
		lines.push(`- **Updated:** ${m.updatedAt}`)
		if (m.documentIds && m.documentIds.length > 0) {
			lines.push(`- **Source Documents:** ${m.documentIds.map((d) => `\`${d}\``).join(", ")}`)
		}
		if (m.history && m.history.length > 0) {
			lines.push(`- **Previous Revisions:** ${m.history.length}`)
		}
		lines.push("")
	}

	return lines.join("\n")
}
