import Supermemory from "supermemory"

const MAX_CHARS = 200000 // ~50k tokens (character-based limit)
const DEFAULT_PROJECT_ID = "sm_project_default"

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

export interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental: boolean
	documentCount?: number
}

// Graph API types
export interface GraphApiMemory {
	id: string
	memory: string
	isStatic: boolean
	isLatest: boolean
	isForgotten: boolean
	forgetAfter: string | null
	version: number
	parentMemoryId: string | null
	createdAt: string
	updatedAt: string
}

export interface GraphApiDocument {
	id: string
	title: string | null
	summary: string | null
	documentType: string
	createdAt: string
	updatedAt: string
	x: number
	y: number
	memories: GraphApiMemory[]
}

export interface GraphApiEdge {
	source: string
	target: string
	similarity: number
}

export interface GraphViewportResponse {
	documents: GraphApiDocument[]
	edges: GraphApiEdge[]
	viewport: { minX: number; maxX: number; minY: number; maxY: number }
	totalCount: number
}

export interface GraphBoundsResponse {
	bounds: {
		minX: number
		maxX: number
		minY: number
		maxY: number
	} | null
}

export function getMemoryText(m: Memory): string {
	return "memory" in m ? m.memory : m.chunk
}

function limitByChars(text: string, maxChars = MAX_CHARS): string {
	return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text
}

// Type for SDK search result item
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

	// Create memory using SDK
	async createMemory(
		content: string,
	): Promise<{ id: string; status: string; containerTag: string }> {
		try {
			const result = await this.client.add({
				content,
				containerTag: this.containerTag,
				metadata: {
					sm_source: "mcp",
				},
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

	// Delete/forget memory - try exact match first, then semantic search
	async forgetMemory(
		content: string,
	): Promise<{ success: boolean; message: string; containerTag: string }> {
		try {
			// Try exact content matching first
			try {
				const result = await this.client.memories.forget({
					content: content,
					containerTag: this.containerTag,
				})

				return {
					success: true,
					message: `Successfully forgot memory (exact match) with ID: ${result.id}`,
					containerTag: this.containerTag,
				}
			} catch (error: any) {
				// If not 404, it's a real error - re-throw it
				if (error?.status !== 404) {
					throw error
				}
				// Otherwise continue to semantic search fallback
			}

			// Fallback to semantic search if exact match fails
			const SIMILARITY_THRESHOLD = 0.85 // High threshold - only very similar memories
			const searchResult = await this.search(content, 5, SIMILARITY_THRESHOLD)

			if (searchResult.results.length === 0) {
				return {
					success: false,
					message: `No matching memory found to forget. Tried exact match and semantic search with similarity threshold ${SIMILARITY_THRESHOLD}.`,
					containerTag: this.containerTag,
				}
			}

			// Only actual memories (not chunks) can be forgotten
			const memoryToDelete = searchResult.results.find((r) => "memory" in r)
			if (!memoryToDelete) {
				return {
					success: false,
					message:
						"No matching memory found to forget (only document chunks matched in semantic search).",
					containerTag: this.containerTag,
				}
			}

			// Delete using the ID from semantic search
			await this.client.memories.forget({
				id: memoryToDelete.id,
				containerTag: this.containerTag,
			})

			const memoryText =
				getMemoryText(memoryToDelete) || memoryToDelete.content || ""
			return {
				success: true,
				message: `Forgot similar memory (semantic match, similarity: ${memoryToDelete.similarity.toFixed(2)}): "${limitByChars(memoryText, 100)}"`,
				containerTag: this.containerTag,
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	// Search memories using SDK
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
				threshold, // Optional threshold parameter
			})

			// Normalize and limit response size — preserve memory vs chunk distinction
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

			return {
				results,
				total: result.total,
				timing: result.timing,
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	// Get user profile using SDK
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
						if (r.chunk && !r.memory) {
							return { ...base, chunk: text }
						}
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

	// Get projects list
	async getProjects(): Promise<string[]> {
		try {
			const response = await fetch(`${this.apiUrl}/v3/projects`, {
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
				throw new Error(`Failed to fetch projects: ${response.statusText}`)
			}

			const data = (await response.json()) as {
				projects: Project[]
			}
			return data.projects?.map((p) => p.containerTag) || []
		} catch (error) {
			this.handleError(error)
		}
	}

	// Fetch graph bounds for coordinate range
	async getGraphBounds(containerTags?: string[]): Promise<GraphBoundsResponse> {
		try {
			const params = new URLSearchParams()
			if (containerTags?.length) {
				params.set("containerTags", JSON.stringify(containerTags))
			}
			const url = `${this.apiUrl}/v3/graph/bounds${params.toString() ? `?${params}` : ""}`
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
				},
			})
			if (!response.ok) {
				throw Object.assign(new Error("Failed to fetch graph bounds"), {
					status: response.status,
				})
			}
			return (await response.json()) as GraphBoundsResponse
		} catch (error) {
			this.handleError(error)
		}
	}

	// Fetch graph data for a viewport region
	async getGraphViewport(
		viewport: { minX: number; maxX: number; minY: number; maxY: number },
		containerTags?: string[],
		limit = 200,
	): Promise<GraphViewportResponse> {
		try {
			const response = await fetch(`${this.apiUrl}/v3/graph/viewport`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ viewport, containerTags, limit }),
			})
			if (!response.ok) {
				throw Object.assign(new Error("Failed to fetch graph viewport"), {
					status: response.status,
				})
			}
			return (await response.json()) as GraphViewportResponse
		} catch (error) {
			this.handleError(error)
		}
	}

	private handleError(error: unknown): never {
		// Handle network/fetch errors
		if (error instanceof TypeError) {
			if (
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				throw new Error(
					"Network error. Please check your connection and try again.",
				)
			}
		}

		// Handle HTTP status errors from SDK/fetch
		if (error && typeof error === "object" && "status" in error) {
			const status = (error as { status: number }).status
			const message =
				"message" in error ? (error as { message: string }).message : undefined

			switch (status) {
				case 400:
				case 422:
					throw new Error(
						message || "Invalid request parameters. Please check your input.",
					)
				case 401:
					throw new Error("Authentication failed. Please re-authenticate.")
				case 402:
					throw new Error("Memory limit reached. Upgrade at supermemory.ai")
				case 403:
					throw new Error(
						"Access forbidden. Your account may be restricted or blocked.",
					)
				case 404:
					throw new Error("Memory not found. It may have been deleted.")
				case 429:
					throw new Error(
						"Rate limit exceeded. Please wait a moment and try again.",
					)
				default:
					if (status >= 500) {
						throw new Error(
							"Server error. The service may be temporarily unavailable. Please try again later.",
						)
					}
			}
		}

		// Re-throw Error instances as-is
		if (error instanceof Error) {
			throw error
		}

		// Wrap unknown errors
		throw new Error(`An unexpected error occurred: ${String(error)}`)
	}
}
