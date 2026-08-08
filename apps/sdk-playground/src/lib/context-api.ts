import Supermemory from "supermemory"
import {
	type MiddlewareRuntimeConfig,
	normalizeMiddlewareConfig,
} from "./middleware-config"

export interface MemoryDebugEntry {
	type: "profile_fetch" | "context_preview" | "conversation_saved" | "manual_profile"
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

function buildContextPreview(
	profile: ContainerContext["profile"],
	mode: "profile" | "query" | "full",
	query?: string,
): string {
	const lines: string[] = [`[memory mode: ${mode}]`]
	if (query) lines.push(`[query: ${query}]`)
	if (profile.static.length) {
		lines.push("Static:")
		for (const item of profile.static.slice(0, 8)) {
			lines.push(`- ${memoryText(item)}`)
		}
	}
	if (profile.dynamic.length) {
		lines.push("Dynamic:")
		for (const item of profile.dynamic.slice(0, 8)) {
			lines.push(`- ${memoryText(item)}`)
		}
	}
	if (mode !== "profile" && profile.searchResults.length) {
		lines.push("Search results:")
		for (const item of profile.searchResults.slice(0, 8)) {
			lines.push(`- ${memoryText(item)}`)
		}
	}
	return lines.join("\n")
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

export async function fetchContainerContext(
	containerTag: string,
	query?: string,
	supermemoryApiKey?: string,
): Promise<ContainerContext> {
	const apiKey =
		supermemoryApiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim()
	if (!apiKey) throw new Error("Supermemory API key is required")

	const client = getSupermemoryClient(apiKey)

	const profileResponse = await client.profile({
		containerTag,
		...(query ? { q: query } : {}),
	})

	const profileRaw = profileResponse.profile as
		| { static?: unknown[]; dynamic?: unknown[] }
		| undefined

	const profile = {
		static: profileRaw?.static ?? [],
		dynamic: profileRaw?.dynamic ?? [],
		searchResults: normalizeSearchResults(profileResponse.searchResults),
	}

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
	memoryMode: "profile" | "query" | "full",
	lastUserMessage: string,
	middlewareConfig?: Partial<MiddlewareRuntimeConfig>,
	aiSdkExtras?: {
		includeToolCalls?: boolean
		skipMemoryOnError?: boolean
	},
	supermemoryApiKey?: string,
): Promise<MemoryDebugEntry[]> {
	const config = normalizeMiddlewareConfig(middlewareConfig)
	const query = resolveProfileQuery(lastUserMessage, memoryMode)
	const context = await fetchContainerContext(
		containerTag,
		query,
		supermemoryApiKey,
	)
	const summary = summarizeProfile(context.profile)

	const trace: MemoryDebugEntry[] = [
		{
			type: "profile_fetch",
			label: "Automatic profile fetch (middleware)",
			detail: {
				endpoint: "POST /v4/profile",
				containerTag,
				customId: conversationId,
				memoryMode,
				addMemory: config.addMemory,
				verbose: config.verbose,
				...(aiSdkExtras?.includeToolCalls !== undefined
					? { includeToolCalls: aiSdkExtras.includeToolCalls }
					: {}),
				...(aiSdkExtras?.skipMemoryOnError !== undefined
					? { skipMemoryOnError: aiSdkExtras.skipMemoryOnError }
					: {}),
				query: query ?? null,
				...summary,
			},
		},
		{
			type: "context_preview",
			label: "Context injected into prompt",
			preview: buildContextPreview(context.profile, memoryMode, query),
		},
		{
			type: "conversation_saved",
			label: "Conversation auto-saved after response",
			detail: {
				containerTag,
				customId: conversationId,
				addMemory: config.addMemory,
				verbose: config.verbose,
				...(aiSdkExtras?.includeToolCalls !== undefined
					? { includeToolCalls: aiSdkExtras.includeToolCalls }
					: {}),
			},
		},
	]

	return trace
}

export async function buildManualProfileDebug(
	containerTag: string,
	lastUserMessage: string,
	supermemoryApiKey?: string,
): Promise<MemoryDebugEntry[]> {
	const context = await fetchContainerContext(
		containerTag,
		lastUserMessage,
		supermemoryApiKey,
	)
	const summary = summarizeProfile(context.profile)

	return [
		{
			type: "manual_profile",
			label: "Manual profile() + add() pattern",
			detail: {
				containerTag,
				query: lastUserMessage,
				...summary,
			},
			preview: buildContextPreview(context.profile, "full", lastUserMessage),
		},
		{
			type: "conversation_saved",
			label: "Conversation saved via client.add()",
			detail: { containerTag, customId: "sdk-playground-direct" },
		},
	]
}
