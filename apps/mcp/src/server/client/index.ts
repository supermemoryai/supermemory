import Supermemory from "supermemory"
import type {
	ContainerTag,
	DocumentMemoryEntry,
	DocumentsApiResponse,
	DocumentWithMemories,
} from "../../shared/types"

const MAX_CHARS = 200000
const DEFAULT_PROJECT_ID = "sm_project_default"

export type {
	ContainerTag,
	DocumentMemoryEntry,
	DocumentWithMemories,
	DocumentsApiResponse,
}

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

interface SDKResult {
	id: string
	memory?: string
	chunk?: string
	content?: string
	similarity: number
	title?: string
	context?: string
}

export class SupermemoryClient {
	private client: Supermemory
	private containerTag: string
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
		})
		this.containerTag = containerTag || DEFAULT_PROJECT_ID
	}

	async createMemory(
		content: string,
	): Promise<{ id: string; status: string; containerTag: string }> {
		try {
			const result = await this.client.add({
				content,
				containerTag: this.containerTag,
				metadata: { sm_source: "enterprise-mcp" },
			})
			return {
				id: result.id,
				status: "queued",
				containerTag: this.containerTag,
			}
		} catch (error) {
			this.handleError(error)
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
				const status =
					error && typeof error === "object" && "status" in error
						? (error as Record<string, unknown>).status
						: undefined
				if (status !== 404) throw error
			}

			const SIMILARITY_THRESHOLD = 0.85
			const searchResult = await this.search(content, 5, SIMILARITY_THRESHOLD)

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
			this.handleError(error)
		}
	}

	async search(
		query: string,
		limit = 10,
		threshold?: number,
	): Promise<SearchResult> {
		try {
			const result = await this.client.search.memories({
				q: query,
				limit,
				containerTag: this.containerTag,
				searchMode: "hybrid",
				threshold,
			})

			const results: Memory[] = (result.results as SDKResult[]).map((r) => {
				const text = limitByChars(
					r.content || r.memory || r.chunk || r.context || "",
				)
				const base = {
					id: r.id,
					similarity: r.similarity,
					title: r.title,
					content: r.content,
				}
				if (r.chunk && !r.memory) {
					return { ...base, chunk: text }
				}
				return { ...base, memory: text }
			})

			return { results, total: result.total, timing: result.timing }
		} catch (error) {
			this.handleError(error)
		}
	}

	async getProfile(query?: string): Promise<ProfileResponse> {
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
					results: (result.searchResults.results as SDKResult[]).map((r) => {
						const text = limitByChars(
							r.content || r.memory || r.chunk || r.context || "",
						)
						const base = {
							id: r.id,
							similarity: r.similarity,
							title: r.title,
							content: r.content,
						}
						if (r.chunk && !r.memory) return { ...base, chunk: text }
						return { ...base, memory: text }
					}),
					total: result.searchResults.total,
					timing: result.searchResults.timing,
				}
			}

			return response
		} catch (error) {
			this.handleError(error)
		}
	}

	async listContainerTags(): Promise<ContainerTag[]> {
		try {
			const response = await fetch(`${this.apiUrl}/v3/container-tags/list`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
				},
			})

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error("Authentication failed. Please re-authenticate.")
				}
				throw new Error(
					`Failed to fetch container tags: ${response.statusText}`,
				)
			}

			const data = (await response.json()) as ContainerTag[]
			return Array.isArray(data) ? data : []
		} catch (error) {
			this.handleError(error)
		}
	}

	async getDocuments(
		containerTags?: string[],
		page = 1,
		limit = 200,
	): Promise<DocumentsApiResponse> {
		try {
			const response = await fetch(`${this.apiUrl}/v3/documents/documents`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					page,
					limit,
					sort: "createdAt",
					order: "desc",
					containerTags,
				}),
			})
			if (!response.ok) {
				throw Object.assign(new Error("Failed to fetch documents"), {
					status: response.status,
				})
			}
			return (await response.json()) as DocumentsApiResponse
		} catch (error) {
			this.handleError(error)
		}
	}

	async uploadFile(
		fileData: ArrayBuffer,
		fileName: string,
		mimeType: string,
		containerTag?: string,
	): Promise<{ id: string; status: string }> {
		try {
			const formData = new FormData()
			const blob = new Blob([fileData], { type: mimeType })
			formData.append("file", blob, fileName)
			if (containerTag) {
				formData.append("containerTags", containerTag)
			}
			formData.append(
				"metadata",
				JSON.stringify({ sm_source: "enterprise-mcp" }),
			)

			const response = await fetch(`${this.apiUrl}/v3/documents/file`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
				},
				body: formData,
			})

			if (!response.ok) {
				const text = await response.text()
				throw Object.assign(new Error(text || "Upload failed"), {
					status: response.status,
				})
			}

			const result = (await response.json()) as { id: string; status: string }
			return result
		} catch (error) {
			this.handleError(error)
		}
	}

	private handleError(error: unknown): never {
		if (error instanceof TypeError) {
			if (
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				throw new Error("Network error. Please check your connection.")
			}
		}

		if (error && typeof error === "object" && "status" in error) {
			const status = (error as { status: number }).status
			const message =
				"message" in error ? (error as { message: string }).message : undefined

			switch (status) {
				case 400:
				case 422:
					throw new Error(message || "Invalid request. Check your input.")
				case 401:
					throw new Error("Authentication failed. Please re-authenticate.")
				case 402:
					throw new Error("Memory limit reached. Upgrade at supermemory.ai")
				case 403:
					throw new Error("Access forbidden.")
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
}
