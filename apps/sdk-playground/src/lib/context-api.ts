import Supermemory from "supermemory"
import {
	type MiddlewareRuntimeConfig,
	normalizeMiddlewareConfig,
} from "./middleware-config"
import {
	type MemoryMode,
	type MiddlewareFlavor,
	reconstructSdkMemoryBlock,
} from "./memory-dedupe"

export interface MemoryDebugEntry {
	type:
		| "context_reconstruction"
		| "context_preview"
		| "conversation_save_requested"
		| "conversation_save_accepted"
		| "conversation_save_failed"
		| "conversation_save_queued"
		| "conversation_save_skipped"
		| "conversation_saved"
		| "profile_fetch"
		| "context_debug_unavailable"
		| "debug_error"
		| "manual_profile"
	label: string
	detail?: Record<string, unknown>
	preview?: string
}

export interface ContainerContext {
	containerTag: string
	query?: string
	profile: {
		static: unknown[]
		dynamic: unknown[]
		searchResults: unknown[]
	}
	documents: Array<{
		id?: string
		title?: string
		status?: string
		customId?: string
		createdAt?: string
		updatedAt?: string
		summary?: string
		memoryEntries?: unknown[]
	}>
	pagination?: unknown
}

function getSupermemoryClient(apiKey: string) {
	if (!apiKey) throw new Error("Supermemory API key is required")
	return new Supermemory({
		apiKey,
		timeout: 10_000,
		maxRetries: 1,
		...(process.env.SUPERMEMORY_BASE_URL
			? { baseURL: process.env.SUPERMEMORY_BASE_URL }
			: {}),
	})
}

function normalizeMemoryEntries(record: Record<string, unknown>): unknown[] {
	const raw =
		record.memoryEntries ??
		record.memory_entries ??
		(Array.isArray(record.memories) &&
		record.memories.length > 0 &&
		typeof (record.memories[0] as Record<string, unknown>)?.memory === "string"
			? record.memories
			: undefined)

	return Array.isArray(raw) ? raw : []
}

function memoryText(item: unknown): string {
	if (typeof item === "string") return item
	if (item && typeof item === "object") {
		const record = item as Record<string, unknown>
		if (typeof record.memory === "string") return record.memory
		if (typeof record.content === "string") return record.content
		if (typeof record.chunk === "string") return record.chunk
	}
	return JSON.stringify(item)
}

function summarizeProfile(profile: ContainerContext["profile"]) {
	return {
		staticCount: profile.static.length,
		dynamicCount: profile.dynamic.length,
		searchResultCount: profile.searchResults.length,
		staticPreview: profile.static.slice(0, 5).map(memoryText),
		dynamicPreview: profile.dynamic.slice(0, 5).map(memoryText),
		searchPreview: profile.searchResults.slice(0, 5).map(memoryText),
	}
}

function normalizeSearchResults(searchResults: unknown): unknown[] {
	if (!searchResults) return []
	if (Array.isArray(searchResults)) return searchResults
	if (typeof searchResults === "object") {
		const record = searchResults as Record<string, unknown>
		if (Array.isArray(record.results)) return record.results
	}
	return []
}

export function resolveProfileQuery(
	lastUserMessage: string,
	mode: "profile" | "query" | "full",
): string | undefined {
	if (mode === "profile") return undefined
	return lastUserMessage || undefined
}

async function fetchProfileContext(
	client: ReturnType<typeof getSupermemoryClient>,
	containerTag: string,
	query?: string,
	signal?: AbortSignal,
): Promise<ContainerContext["profile"]> {
	const profileResponse = await client.post<{
		profile?: { static?: unknown[]; dynamic?: unknown[] }
		searchResults?: unknown
	}>("/v4/profile", {
		body: {
			containerTag,
			include: ["static", "dynamic"],
			...(query ? { q: query } : {}),
		},
		...(signal ? { signal } : {}),
	})
	const profileRaw = profileResponse.profile

	return {
		static: profileRaw?.static ?? [],
		dynamic: profileRaw?.dynamic ?? [],
		searchResults: normalizeSearchResults(profileResponse.searchResults),
	}
}

export async function fetchContainerContext(
	containerTag: string,
	query?: string,
	supermemoryApiKey?: string,
): Promise<ContainerContext> {
	const apiKey =
		supermemoryApiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim()
	if (!apiKey) throw new Error("Supermemory API key is required")

	const client = getSupermemoryClient(apiKey)
	const profile = await fetchProfileContext(client, containerTag, query)

	const docsResponse = await client.post<{
		documents?: unknown[]
		pagination?: unknown
	}>("/v3/documents/documents", {
		body: {
			containerTags: [containerTag],
			limit: 25,
			sort: "createdAt",
			order: "desc",
		},
	})

	const rawDocuments = docsResponse.documents ?? []
	const documents = rawDocuments.map((doc) => {
		const record = doc as Record<string, unknown>
		return {
			id: record.id as string | undefined,
			title: record.title as string | undefined,
			status: record.status as string | undefined,
			customId: record.customId as string | undefined,
			createdAt: record.createdAt as string | undefined,
			updatedAt: record.updatedAt as string | undefined,
			summary: record.summary as string | undefined,
			memoryEntries: normalizeMemoryEntries(record),
		}
	})

	return {
		containerTag,
		query,
		profile,
		documents,
		pagination: docsResponse.pagination,
	}
}

export async function buildMiddlewareMemoryDebug(
	containerTag: string,
	conversationId: string,
	memoryMode: MemoryMode,
	lastUserMessage: string,
	middlewareConfig: Partial<MiddlewareRuntimeConfig> | undefined,
	sdk: {
		flavor: MiddlewareFlavor
		includeToolCalls?: boolean
		skipMemoryOnError?: boolean
	},
	supermemoryApiKey?: string,
	signal?: AbortSignal,
): Promise<MemoryDebugEntry[]> {
	const config = normalizeMiddlewareConfig(middlewareConfig)
	const query = resolveProfileQuery(lastUserMessage, memoryMode)

	try {
		const apiKey =
			supermemoryApiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim()
		if (!apiKey) throw new Error("Supermemory API key is required")
		const profile = await fetchProfileContext(
			getSupermemoryClient(apiKey),
			containerTag,
			query,
			signal,
		)
		const reconstructed = reconstructSdkMemoryBlock(
			memoryMode,
			profile,
			sdk.flavor,
		)
		const selectedProfile = reconstructed.profile
		const summary = summarizeProfile(selectedProfile)

		return [
			{
				type: "context_reconstruction",
				label: "Post-response context reconstruction",
				detail: {
					authoritativeMiddlewareCapture: false,
					timing: "after model response",
					endpoint: "POST /v4/profile",
					containerTag,
					customId: conversationId,
					memoryMode,
					addMemory: config.addMemory,
					verbose: config.verbose,
					...(sdk.includeToolCalls !== undefined
						? { includeToolCalls: sdk.includeToolCalls }
						: {}),
					...(sdk.skipMemoryOnError !== undefined
						? { skipMemoryOnError: sdk.skipMemoryOnError }
						: {}),
					query: query ?? null,
					...summary,
				},
			},
			{
				type: "context_preview",
				label: "Reconstructed SDK-owned memory block (not middleware capture)",
				preview: reconstructed.block,
				detail: {
					totalFacts:
						summary.staticCount +
						summary.dynamicCount +
						summary.searchResultCount,
					fullLength: reconstructed.block.length,
				},
			},
			config.addMemory === "always"
				? {
						type: "conversation_save_requested",
						label: "Conversation save requested by middleware",
						detail: {
							confirmed: false,
							containerTag,
							customId: conversationId,
							addMemory: config.addMemory,
							verbose: config.verbose,
							...(sdk.includeToolCalls !== undefined
								? { includeToolCalls: sdk.includeToolCalls }
								: {}),
						},
					}
				: {
						type: "conversation_save_skipped",
						label: "Conversation saving disabled",
						detail: { addMemory: config.addMemory },
					},
		]
	} catch (error) {
		return [
			{
				type: "debug_error",
				label: "Post-response context reconstruction unavailable",
				detail: {
					nonFatal: true,
					error: error instanceof Error ? error.message : String(error),
				},
			},
		]
	}
}
