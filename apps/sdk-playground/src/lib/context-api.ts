import { Supermemory } from "supermemory"
import { supermemoryProfileSearch } from "../../../../packages/tools/src/shared/memory-client"
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

export interface NamespaceContext {
	namespace: string
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
		createdAt?: string
		updatedAt?: string
		summary?: string
		memoryEntries?: unknown[]
	}>
	pagination?: unknown
}

const REQUEST_TIMEOUT_SECONDS = 10
const DOCUMENT_LIST_LIMIT = 25

function getSupermemoryClient(apiKey: string) {
	if (!apiKey) throw new Error("Supermemory API key is required")
	return new Supermemory({
		apiKey,
		timeoutInSeconds: REQUEST_TIMEOUT_SECONDS,
		maxRetries: 1,
		...(process.env.SUPERMEMORY_BASE_URL
			? { baseUrl: process.env.SUPERMEMORY_BASE_URL }
			: {}),
	})
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

function summarizeProfile(profile: NamespaceContext["profile"]) {
	return {
		staticCount: profile.static.length,
		dynamicCount: profile.dynamic.length,
		searchResultCount: profile.searchResults.length,
		staticPreview: profile.static.slice(0, 5).map(memoryText),
		dynamicPreview: profile.dynamic.slice(0, 5).map(memoryText),
		searchPreview: profile.searchResults.slice(0, 5).map(memoryText),
	}
}

export function resolveProfileQuery(
	lastUserMessage: string,
	mode: "profile" | "query" | "full",
): string | undefined {
	if (mode === "profile") return undefined
	return lastUserMessage || undefined
}

// Same profile + memories search the middlewares run before the model call.
async function fetchProfileContext(
	apiKey: string,
	namespace: string,
	query?: string,
	signal?: AbortSignal,
): Promise<NamespaceContext["profile"]> {
	const response = await supermemoryProfileSearch(
		namespace,
		query ?? "",
		process.env.SUPERMEMORY_BASE_URL ?? "",
		apiKey,
		signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_SECONDS * 1_000),
	)

	return {
		static: response.profile.static ?? [],
		dynamic: response.profile.dynamic ?? [],
		searchResults: response.searchResults?.results ?? [],
	}
}

export async function fetchNamespaceContext(
	namespace: string,
	query?: string,
	supermemoryApiKey?: string,
): Promise<NamespaceContext> {
	const apiKey =
		supermemoryApiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim()
	if (!apiKey) throw new Error("Supermemory API key is required")

	const client = getSupermemoryClient(apiKey)
	const [profile, listResponse] = await Promise.all([
		fetchProfileContext(apiKey, namespace, query),
		client.list(namespace, "documents", {
			limit: DOCUMENT_LIST_LIMIT,
			sort: "createdAt",
			order: "desc",
		}),
	])

	// v5 lists omit memories, so each document is fetched with include=memories.
	const documents = await Promise.all(
		listResponse.documents.map(async (doc) => {
			const memories = await client.documents
				.get(namespace, doc.id, { include: ["memories"] })
				.then((full) => full.memories ?? [])
				.catch(() => [])
			return {
				id: doc.id,
				title: doc.title ?? undefined,
				status: doc.system.status,
				createdAt: doc.system.createdAt,
				updatedAt: doc.system.updatedAt,
				summary: doc.summary ?? undefined,
				memoryEntries: memories,
			}
		}),
	)

	return {
		namespace,
		query,
		profile,
		documents,
		pagination: listResponse.pagination,
	}
}

export async function buildMiddlewareMemoryDebug(
	namespace: string,
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
		const profile = await fetchProfileContext(apiKey, namespace, query, signal)
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
					endpoint:
						"POST /ns/{namespace}/profile + POST /ns/{namespace}/search",
					namespace,
					id: conversationId,
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
							namespace,
							id: conversationId,
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
