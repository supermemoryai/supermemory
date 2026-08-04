import Supermemory from "supermemory"
import type {
	DocumentGetResponse,
	DocumentListResponse as SdkDocumentListResponse,
} from "supermemory/resources/documents"
import { z } from "zod"
import {
	containerTagSchema,
	documentsApiResponseSchema,
	paginationSchema,
	type ContainerTag,
	type DocumentMemoryEntry,
	type DocumentsApiResponse,
	type DocumentWithMemories,
} from "../../shared/types"

const MAX_CHARS = 200000
export const DEFAULT_PROJECT_ID = "sm_project_default"
const FETCH_TIMEOUT_MS = 30_000
const MCP_SOURCE = "supermemory-mcp"

export type {
	ContainerTag,
	DocumentMemoryEntry,
	DocumentWithMemories,
	DocumentsApiResponse,
}

export type DocumentSummary = SdkDocumentListResponse["memories"][number]
export type DocumentDetails = DocumentGetResponse

export interface DocumentsListResponse {
	documents: DocumentSummary[]
	pagination: SdkDocumentListResponse["pagination"]
}

const memoryEntryHistorySchema = z.looseObject({
	id: z.string(),
	memory: z.string(),
	version: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
	parentMemoryId: z.string().nullish(),
	rootMemoryId: z.string().nullish(),
	isLatest: z.boolean().optional(),
	isForgotten: z.boolean().optional(),
})

export type MemoryEntryHistory = z.infer<typeof memoryEntryHistorySchema>

const memoryEntrySchema = z.looseObject({
	id: z.string(),
	memory: z.string(),
	version: z.number(),
	isLatest: z.boolean(),
	isForgotten: z.boolean(),
	isStatic: z.boolean().optional(),
	isInference: z.boolean().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	sourceCount: z.number().optional(),
	documentIds: z.array(z.string()).optional(),
	history: z.array(memoryEntryHistorySchema).optional(),
})

export type MemoryEntry = z.infer<typeof memoryEntrySchema>

const memoryEntriesResponseSchema = z.object({
	memoryEntries: z.array(memoryEntrySchema),
	pagination: paginationSchema,
})

export type MemoryEntriesResponse = z.infer<typeof memoryEntriesResponseSchema>

export type Memory =
	| {
			id: string
			memory: string
			similarity: number
			title?: string
			content?: string
	  }
	| {
			id: string
			chunk: string
			similarity: number
			title?: string
			content?: string
	  }

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
	searchResults?: SearchResult
}

export function getMemoryText(m: Memory): string {
	return "memory" in m ? m.memory : m.chunk
}

function limitByChars(text: string, maxChars = MAX_CHARS): string {
	return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text
}

const sdkResultSchema = z.looseObject({
	id: z.string(),
	memory: z.string().nullish(),
	chunk: z.string().nullish(),
	content: z.string().nullish(),
	similarity: z.number(),
	title: z.string().nullish(),
	context: z.string().nullish(),
})

function mapSdkResults(value: unknown): Memory[] {
	return z
		.array(sdkResultSchema)
		.parse(value)
		.map((result) => {
			const text = limitByChars(
				result.content || result.memory || result.chunk || result.context || "",
			)
			const base = {
				id: result.id,
				similarity: result.similarity,
				...(result.title ? { title: result.title } : {}),
				...(result.content ? { content: result.content } : {}),
			}
			if (result.chunk && !result.memory) {
				return { ...base, chunk: text }
			}
			return { ...base, memory: text }
		})
}

function objectProperty(value: unknown, key: string): unknown {
	return value && typeof value === "object"
		? Reflect.get(value, key)
		: undefined
}

export class SupermemoryClient {
	private client: Supermemory
	private containerTag: string
	private hasExplicitContainerTag: boolean
	private bearerToken: string
	private apiUrl: string

	constructor(
		bearerToken: string,
		containerTag?: string,
		apiUrl = "https://api.supermemory.ai",
	) {
		this.bearerToken = bearerToken
		this.apiUrl = apiUrl
		this.client = new Supermemory({
			apiKey: bearerToken,
			baseURL: apiUrl,
			timeout: FETCH_TIMEOUT_MS,
			defaultHeaders: { "x-sm-source": MCP_SOURCE },
		})
		this.hasExplicitContainerTag = Boolean(containerTag)
		this.containerTag = containerTag || DEFAULT_PROJECT_ID
	}

	async createMemory(
		content: string,
	): Promise<{ id: string; status: string; containerTag: string }> {
		try {
			const result = await this.client.add({
				content,
				containerTag: this.containerTag,
				metadata: { sm_source: MCP_SOURCE },
			})
			return {
				id: result.id,
				status: "queued",
				containerTag: this.containerTag,
			}
		} catch (error) {
			this.handleOperationError("Create memory request", error)
		}
	}

	async forgetMemory(
		content: string,
	): Promise<{ success: boolean; message: string; containerTag: string }> {
		try {
			try {
				const result = await this.client.memories.forget({
					content,
					containerTag: this.containerTag,
				})
				return {
					success: true,
					message: `Successfully forgot memory (exact match) with ID: ${result.id}`,
					containerTag: this.containerTag,
				}
			} catch (error: unknown) {
				const status = objectProperty(error, "status")
				if (status !== 404) throw error
			}

			const SIMILARITY_THRESHOLD = 0.85
			const searchResult = await this.search(
				content,
				5,
				SIMILARITY_THRESHOLD,
				this.containerTag,
			)

			if (searchResult.results.length === 0) {
				return {
					success: false,
					message: "No matching memory found to forget.",
					containerTag: this.containerTag,
				}
			}

			const memoryToDelete = searchResult.results.find((r) => "memory" in r)
			if (!memoryToDelete) {
				return {
					success: false,
					message: "No matching memory found (only chunks matched).",
					containerTag: this.containerTag,
				}
			}

			await this.client.memories.forget({
				id: memoryToDelete.id,
				containerTag: this.containerTag,
			})

			const memoryText =
				getMemoryText(memoryToDelete) || memoryToDelete.content || ""
			return {
				success: true,
				message: `Forgot similar memory (similarity: ${memoryToDelete.similarity.toFixed(2)}): "${limitByChars(memoryText, 100)}"`,
				containerTag: this.containerTag,
			}
		} catch (error) {
			this.handleOperationError("Forget memory request", error)
		}
	}

	async search(
		query: string,
		limit = 10,
		threshold?: number,
		containerTagOverride?: string,
	): Promise<SearchResult> {
		try {
			const containerTag =
				containerTagOverride ??
				(this.hasExplicitContainerTag ? this.containerTag : undefined)
			const result = await this.client.search.memories({
				q: query,
				limit,
				...(containerTag ? { containerTag } : {}),
				searchMode: "hybrid",
				threshold,
			})

			return {
				results: mapSdkResults(result.results),
				total: result.total,
				timing: result.timing,
			}
		} catch (error) {
			this.handleOperationError("Search request", error)
		}
	}

	async getProfile(query?: string): Promise<ProfileResponse> {
		if (!this.hasExplicitContainerTag) {
			return {
				profile: {
					static: [],
					dynamic: [],
				},
			}
		}

		try {
			const result = await this.client.profile({
				containerTag: this.containerTag,
				q: query,
			})

			const response: ProfileResponse = {
				profile: {
					static: result.profile?.static || [],
					dynamic: result.profile?.dynamic || [],
				},
			}

			if (result.searchResults) {
				response.searchResults = {
					results: mapSdkResults(result.searchResults.results),
					total: result.searchResults.total,
					timing: result.searchResults.timing,
				}
			}

			return response
		} catch (error) {
			this.handleOperationError("Profile request", error)
		}
	}

	async listContainerTags(): Promise<ContainerTag[]> {
		try {
			const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
			const response = await fetch(`${this.apiUrl}/v3/container-tags/list`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
					"x-sm-source": MCP_SOURCE,
				},
				signal,
			})

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error("Authentication failed. Please re-authenticate.")
				}
				throw new Error(
					`Failed to fetch container tags: ${response.statusText}`,
				)
			}

			return z.array(containerTagSchema).parse(await response.json())
		} catch (error) {
			this.handleError(error)
		}
	}

	async getDocuments(
		containerTags?: string[],
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
					containerTags,
				}),
				signal,
			})
			if (!response.ok) {
				throw Object.assign(new Error("Failed to fetch documents"), {
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
			const result = await this.client.documents.list({
				containerTags: [this.containerTag],
				page,
				limit,
				sort: "createdAt",
				order: "desc",
				includeContent: false,
			})

			return {
				documents: result.memories ?? [],
				pagination: result.pagination,
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	async getDocument(id: string): Promise<DocumentDetails> {
		try {
			return await this.client.documents.get(id)
		} catch (error) {
			this.handleError(error)
		}
	}

	async listMemoryEntries(
		page = 1,
		limit = 50,
	): Promise<MemoryEntriesResponse> {
		try {
			const response = await fetch(`${this.apiUrl}/v4/memories/list`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
					"x-sm-source": MCP_SOURCE,
				},
				body: JSON.stringify({
					containerTags: [this.containerTag],
					page,
					limit,
					sort: "createdAt",
					order: "desc",
				}),
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			})

			if (!response.ok) {
				const message = await response.text()
				throw Object.assign(
					new Error(message || "Failed to fetch memory entries"),
					{ status: response.status },
				)
			}

			return memoryEntriesResponseSchema.parse(await response.json())
		} catch (error) {
			this.handleError(error)
		}
	}

	private handleError(error: unknown): never {
		// Handle request timeout (AbortSignal.timeout or explicit abort)
		if (
			error instanceof Error &&
			(error.name === "AbortError" || error.name === "TimeoutError")
		) {
			throw new Error("Request to Supermemory API timed out")
		}

		// Handle network/fetch errors
		if (error instanceof TypeError) {
			if (
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				throw new Error("Network error. Please check your connection.")
			}
		}

		const status = objectProperty(error, "status")
		if (typeof status === "number") {
			const rawMessage = objectProperty(error, "message")
			const message = typeof rawMessage === "string" ? rawMessage : undefined
			switch (status) {
				case 400:
				case 422:
					throw new Error(message || "Invalid request. Check your input.")
				case 401:
					throw new Error("Authentication failed. Please re-authenticate.")
				case 402:
					throw new Error("Memory limit reached. Upgrade at supermemory.ai")
				case 403:
					throw new Error(
						message ||
							"Access forbidden. Your account may be restricted or blocked.",
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
