import Supermemory from "supermemory"
import type {
	GetDocumentsResponse,
	ListResponseDocumentsItem,
	ListResponseMemoriesItem,
	ListResponsePagination,
	SearchResponseResultsItem,
} from "supermemory"
import {
	documentsApiResponseSchema,
	type DocumentMemoryEntry,
	type DocumentsApiResponse,
	type DocumentWithMemories,
	type MemoriesList,
	type MemoryEntry,
	type MemoryEntryHistory,
	type NamespaceInfo,
} from "../../shared/types"

const MAX_CHARS = 200000
export const DEFAULT_NAMESPACE = "sm_project_default"
const FETCH_TIMEOUT_MS = 30_000
const MCP_SOURCE = "supermemory-mcp"
const NAMESPACE_PAGE_LIMIT = 100
// v4 defaults; v5 lowered the threshold to 0.3.
const SEARCH_THRESHOLD = 0.6
// Analytics matches on this text to tag quota errors, keep them in sync.
export const OUT_OF_CREDITS_MESSAGE =
	"Out of credits. Top up or upgrade at https://console.supermemory.ai/billing"

export type {
	DocumentMemoryEntry,
	DocumentWithMemories,
	DocumentsApiResponse,
	NamespaceInfo,
}

export interface DocumentSummary {
	id: string
	title: string | null
	type: string
	status: string
	createdAt: string
	updatedAt: string
	summary: string | null
	url: string | null
}

export type DocumentDetails = GetDocumentsResponse

export interface DocumentsListResponse {
	documents: DocumentSummary[]
	pagination: ListResponsePagination
}

export type { MemoryEntry, MemoryEntryHistory }
export type MemoryEntriesResponse = MemoriesList

export type Memory =
	| { id: string; memory: string; similarity: number }
	| { id: string; chunk: string; similarity: number }

export interface SearchResult {
	results: Memory[]
	total: number
	timing: number
}

export interface Profile {
	static: string[]
	dynamic: string[]
}

export interface ProfileResponse {
	profile: Profile
}

export function getMemoryText(m: Memory): string {
	return "memory" in m ? m.memory : m.chunk
}

function limitByChars(text: string, maxChars = MAX_CHARS): string {
	return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text
}

function mapSearchResults(results: SearchResponseResultsItem[]): Memory[] {
	return results.map((result) => {
		if (result.chunk && !result.memory) {
			return {
				id: result.id,
				similarity: result.similarity,
				chunk: limitByChars(result.chunk),
			}
		}
		return {
			id: result.id,
			similarity: result.similarity,
			memory: limitByChars(result.memory ?? ""),
		}
	})
}

function mapDocumentSummary(
	document: ListResponseDocumentsItem,
): DocumentSummary {
	return {
		id: document.id,
		title: document.title,
		type: document.type,
		status: document.system.status,
		createdAt: document.system.createdAt,
		updatedAt: document.system.updatedAt,
		summary: document.summary,
		url: document.url,
	}
}

function mapMemoryEntry(memory: ListResponseMemoriesItem): MemoryEntry {
	return {
		id: memory.id,
		memory: memory.memory,
		version: memory.version,
		isLatest: memory.isLatest,
		isForgotten: memory.isForgotten,
		isStatic: memory.isStatic,
		isInference: memory.isInference,
		createdAt: memory.system.createdAt,
		updatedAt: memory.system.updatedAt,
	}
}

function objectProperty(value: unknown, key: string): unknown {
	return value && typeof value === "object"
		? Reflect.get(value, key)
		: undefined
}

// Unwrap {"error": "..."} bodies so users see the real reason, not raw JSON.
function extractApiErrorMessage(raw: unknown): string | undefined {
	if (!raw) return undefined
	if (typeof raw === "object") {
		const error = objectProperty(raw, "error")
		if (typeof error === "string" && error) return error
		const message = objectProperty(raw, "message")
		if (typeof message === "string" && message) return message
		return undefined
	}
	if (typeof raw !== "string") return undefined
	try {
		return extractApiErrorMessage(JSON.parse(raw)) ?? raw
	} catch {
		return raw
	}
}

export interface NamespaceSettings {
	namespace: string
	supportingContext: string | null
	createdAt: string
	updatedAt: string
}

const isNotFound = (error: unknown): boolean => {
	const e = error as { statusCode?: number; status?: number }
	return e?.statusCode === 404 || e?.status === 404
}

export class SupermemoryClient {
	private client: Supermemory
	private namespace: string
	private hasExplicitNamespace: boolean
	private bearerToken: string
	private apiUrl: string

	constructor(
		bearerToken: string,
		namespace?: string,
		apiUrl = "https://api.supermemory.ai",
	) {
		this.bearerToken = bearerToken
		this.apiUrl = apiUrl
		this.client = new Supermemory({
			apiKey: bearerToken,
			baseUrl: apiUrl,
			timeoutInSeconds: FETCH_TIMEOUT_MS / 1000,
			headers: { "x-sm-source": MCP_SOURCE },
		})
		this.hasExplicitNamespace = Boolean(namespace)
		this.namespace = namespace || DEFAULT_NAMESPACE
	}

	async createMemory(
		content: string,
	): Promise<{ id: string; status: string; namespace: string }> {
		try {
			const result = await this.client.add(this.namespace, {
				content,
				metadata: { sm_source: MCP_SOURCE },
			})
			return {
				id: result.id,
				status: result.status,
				namespace: this.namespace,
			}
		} catch (error) {
			this.handleOperationError("Create memory request", error)
		}
	}

	// v5 has no exact-content forget: preview semantic matches, then forget the best one by ID.
	async forgetMemory(
		content: string,
	): Promise<{ success: boolean; message: string; namespace: string }> {
		try {
			const preview = await this.client.memories.forgetMatching(
				this.namespace,
				{ query: content, dryRun: true },
			)
			const match = preview.matches[0]
			if (!match) {
				return {
					success: false,
					message: "No matching memory found to forget.",
					namespace: this.namespace,
				}
			}

			const result = await this.client.memories.forget(this.namespace, {
				ids: [match.id],
			})
			if (result.count === 0) {
				const reason = result.errors[0]?.error ?? "unknown error"
				return {
					success: false,
					message: `Could not forget memory ${match.id}: ${reason}`,
					namespace: this.namespace,
				}
			}

			return {
				success: true,
				message: `Forgot memory (ID: ${match.id}): "${limitByChars(match.memory, 100)}"`,
				namespace: this.namespace,
			}
		} catch (error) {
			this.handleOperationError("Forget memory request", error)
		}
	}

	async search(query: string, limit = 10): Promise<SearchResult> {
		try {
			const result = await this.client.search(this.namespace, {
				query,
				limit,
				searchMode: "hybrid",
				threshold: SEARCH_THRESHOLD,
			})
			const results = mapSearchResults(result.results)
			return {
				results,
				total: results.length,
				timing: result.searchTime,
			}
		} catch (error) {
			this.handleOperationError("Search request", error)
		}
	}

	async getProfile(): Promise<ProfileResponse> {
		if (!this.hasExplicitNamespace) {
			return { profile: { static: [], dynamic: [] } }
		}

		try {
			const result = await this.client.profile(this.namespace)
			return {
				profile: {
					static: result.profile.static.map((fact) => fact.memory),
					dynamic: result.profile.dynamic.map((fact) => fact.memory),
				},
			}
		} catch (error) {
			this.handleOperationError("Profile request", error)
		}
	}

	// v5 get returns settings only (no counts); null means missing or no access
	async getNamespace(namespace: string): Promise<NamespaceSettings | null> {
		try {
			const entry = await this.client.namespaces.get(namespace)
			return {
				namespace: entry.namespace,
				supportingContext: entry.supportingContext,
				createdAt: entry.system.createdAt,
				updatedAt: entry.system.updatedAt,
			}
		} catch (error) {
			if (isNotFound(error)) return null
			this.handleError(error)
		}
	}

	// One page is enough for pickers; single-namespace reads use getNamespace
	async listNamespaces(limit = NAMESPACE_PAGE_LIMIT): Promise<NamespaceInfo[]> {
		try {
			const result = await this.client.namespaces.list({ page: 1, limit })
			return result.namespaces.map((entry) => ({
				id: entry.id,
				namespace: entry.namespace,
				description: entry.description,
				documentCount: entry.documentCount,
				memoryCount: entry.memoryCount,
				createdAt: entry.system.createdAt,
				updatedAt: entry.system.updatedAt,
			}))
		} catch (error) {
			this.handleError(error)
		}
	}

	// v5 has no graph route; this stays on the legacy endpoint until one ships.
	async getGraphDocuments(
		page = 1,
		limit = 200,
		options?: { signal?: AbortSignal },
	): Promise<DocumentsApiResponse> {
		try {
			const signal = options?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS)
			const response = await fetch(`${this.apiUrl}/v3/documents/documents`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
					"x-sm-source": MCP_SOURCE,
				},
				body: JSON.stringify({
					page,
					limit,
					sort: "createdAt",
					order: "desc",
					containerTags: [this.namespace],
				}),
				signal,
			})
			if (!response.ok) {
				const message = extractApiErrorMessage(await response.text())
				throw Object.assign(new Error(message ?? ""), {
					status: response.status,
				})
			}
			return documentsApiResponseSchema.parse(await response.json())
		} catch (error) {
			this.handleError(error)
		}
	}

	async listDocuments(page = 1, limit = 50): Promise<DocumentsListResponse> {
		try {
			const result = await this.client.list(this.namespace, "documents", {
				page,
				limit,
				sort: "createdAt",
				order: "desc",
			})
			return {
				documents: result.documents.map(mapDocumentSummary),
				pagination: result.pagination,
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	async getDocument(id: string): Promise<DocumentDetails> {
		try {
			return await this.client.documents.get(this.namespace, id)
		} catch (error) {
			this.handleError(error)
		}
	}

	async listMemoryEntries(
		page = 1,
		limit = 50,
	): Promise<MemoryEntriesResponse> {
		try {
			const result = await this.client.list(this.namespace, "memories", {
				page,
				limit,
				sort: "createdAt",
				order: "desc",
			})
			return {
				memoryEntries: result.memories.map(mapMemoryEntry),
				pagination: {
					currentPage: result.pagination.currentPage,
					limit: result.pagination.limit ?? limit,
					totalItems: result.pagination.totalItems,
					totalPages: result.pagination.totalPages,
				},
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	private handleError(error: unknown): never {
		if (
			error instanceof Error &&
			(error.name === "AbortError" ||
				error.name === "TimeoutError" ||
				error.name === "SupermemoryTimeoutError")
		) {
			throw new Error("Request to Supermemory API timed out")
		}

		if (error instanceof TypeError) {
			if (
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				throw new Error("Network error. Please check your connection.")
			}
		}

		// SDK errors carry statusCode and body; raw fetch errors carry status and message.
		const statusCode = objectProperty(error, "statusCode")
		const status =
			typeof statusCode === "number"
				? statusCode
				: objectProperty(error, "status")
		if (typeof status === "number") {
			const message =
				typeof statusCode === "number"
					? extractApiErrorMessage(objectProperty(error, "body"))
					: extractApiErrorMessage(objectProperty(error, "message"))
			switch (status) {
				case 400:
				case 422:
					throw new Error(message || "Invalid request. Check your input.")
				case 401:
					throw new Error("Authentication failed. Please re-authenticate.")
				case 402:
					throw new Error(OUT_OF_CREDITS_MESSAGE)
				case 403:
					throw new Error(
						message ||
							"Access forbidden. This connection may be read-only or scoped to specific spaces — reconnect with broader access, or check your account status.",
					)
				case 404:
					throw new Error("Not found.")
				case 429:
					throw new Error("Rate limit exceeded. Please wait and try again.")
				default:
					if (status >= 500) {
						throw new Error("Server error. Please try again later.")
					}
			}
		}

		if (error instanceof Error) throw error
		throw new Error(`Unexpected error: ${String(error)}`)
	}

	private handleOperationError(operation: string, error: unknown): never {
		try {
			this.handleError(error)
		} catch (handledError) {
			const message =
				handledError instanceof Error
					? handledError.message
					: String(handledError)
			throw new Error(`${operation} failed: ${message}`)
		}
	}
}
