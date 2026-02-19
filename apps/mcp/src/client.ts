import Supermemory from "supermemory"

const MAX_CHARS = 200000 // ~50k tokens (character-based limit)
const DEFAULT_PROJECT_ID = "sm_project_default"

export interface Memory {
	id: string
	memory: string
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

function limitByChars(text: string, maxChars = MAX_CHARS): string {
	return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text
}

// Type for SDK search result item
interface SDKResult {
	id: string
	memory?: string
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

	// Delete/forget memory by searching first
	async forgetMemory(
		content: string,
	): Promise<{ success: boolean; message: string; containerTag: string }> {
		try {
			// First search for the memory
			const searchResult = await this.search(content, 5)

			if (searchResult.results.length === 0) {
				return {
					success: false,
					message: "No matching memory found to forget.",
					containerTag: this.containerTag,
				}
			}

			// Delete the most similar match
			const memoryToDelete = searchResult.results[0]
			await this.client.documents.delete(memoryToDelete.id)

			const memoryText = memoryToDelete.memory || memoryToDelete.content || ""
			return {
				success: true,
				message: `Forgot: "${limitByChars(memoryText, 100)}"`,
				containerTag: this.containerTag,
			}
		} catch (error) {
			this.handleError(error)
		}
	}

	// Search memories using SDK
	async search(query: string, limit = 10): Promise<SearchResult> {
		try {
			const result = await this.client.search.memories({
				q: query,
				limit,
				containerTag: this.containerTag,
				searchMode: "hybrid",
			})

			// Normalize and limit response size
			const results: Memory[] = (result.results as SDKResult[]).map((r) => ({
				id: r.id,
				memory: limitByChars(r.content || r.memory || r.context || ""),
				similarity: r.similarity,
				title: r.title,
				content: r.content,
			}))

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
					results: (result.searchResults.results as SDKResult[]).map((r) => ({
						id: r.id,
						memory: limitByChars(r.content || r.memory || r.context || ""),
						similarity: r.similarity,
						title: r.title,
						content: r.content,
					})),
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
