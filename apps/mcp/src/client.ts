import Supermemory from "supermemory"

const MAX_CHARS = 200000 // ~50k tokens

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

function limitByTokens(text: string, maxChars = MAX_CHARS): string {
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
	private containerTag?: string

	constructor(apiKey: string, containerTag?: string) {
		this.client = new Supermemory({ apiKey })
		this.containerTag = containerTag || "sm_default_project"
	}

	// Create memory using SDK
	async createMemory(content: string): Promise<{ id: string; status: string }> {
		try {
			const result = await this.client.memories.add({
				content,
				containerTag: this.containerTag,
			})
			return { id: result.id, status: "queued" }
		} catch (error) {
			this.handleError(error)
			throw error
		}
	}

	// Delete/forget memory by searching first
	async forgetMemory(
		content: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			// First search for the memory
			const searchResult = await this.search(content, 5)

			if (searchResult.results.length === 0) {
				return {
					success: false,
					message: "No matching memory found to forget.",
				}
			}

			// Delete the most similar match
			const memoryToDelete = searchResult.results[0]
			await this.client.memories.delete(memoryToDelete.id)

			const memoryText = memoryToDelete.memory || memoryToDelete.content || ""
			return {
				success: true,
				message: `Forgot: "${limitByTokens(memoryText, 100)}"`,
			}
		} catch (error) {
			this.handleError(error)
			throw error
		}
	}

	// Search memories using SDK
	async search(query: string, limit = 10): Promise<SearchResult> {
		try {
			const result = await this.client.search.memories({
				q: query,
				limit,
				containerTag: this.containerTag,
				searchMode: "hybrid"
			})

			console.log(result)

			// Normalize and limit response size
			const results: Memory[] = (result.results as SDKResult[]).map((r) => ({
				id: r.id,
				memory: limitByTokens(r.content || r.memory || r.context || ""),
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
			throw error
		}
	}

	// Get user profile using SDK
	async getProfile(query?: string): Promise<ProfileResponse> {
		if (!this.containerTag) {
			return { profile: { static: [], dynamic: [] } }
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
					results: (result.searchResults.results as SDKResult[]).map((r) => ({
						id: r.id,
						memory: limitByTokens(r.content || r.context || ""),
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
			throw error
		}
	}

	// Get projects list
	async getProjects(): Promise<string[]> {
		return this.containerTag ? [this.containerTag] : []
	}

	private handleError(error: unknown): void {
		if (error && typeof error === "object" && "status" in error) {
			const status = (error as { status: number }).status
			if (status === 402) {
				throw new Error("Memory limit reached. Upgrade at supermemory.ai")
			}
			if (status === 404) {
				throw new Error("Memory not found. It may have been deleted.")
			}
			if (status === 401) {
				throw new Error("Invalid API key. Get one at supermemory.ai")
			}
		}
	}
}
