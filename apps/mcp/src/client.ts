import Supermemory from "supermemory"

const MAX_CHARS = 200000 // ~50k tokens (character-based limit)
const DEFAULT_PROJECT_ID = "sm_project_default"
const FETCH_TIMEOUT_MS = 30_000
const FORGET_CONFIRMATION_TTL_MS = 5 * 60 * 1000
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

interface MemoryRichFields {
	metadata?: Record<string, unknown> | null
	updatedAt?: string
	context?: Record<string, unknown>
	documents?: Array<Record<string, unknown>>
	isAggregated?: boolean
}

export type Memory =
	| ({
			id: string
			memory: string
			similarity: number
			title?: string
			content?: string
	  } & MemoryRichFields)
	| ({
			id: string
			chunk: string
			similarity: number
			title?: string
			content?: string
	  } & MemoryRichFields)

export interface SearchResult {
	results: Memory[]
	total: number
	timing: number
}

export interface SearchOptions {
	searchMode?: "memories" | "hybrid" | "documents"
	rerank?: boolean
	rewriteQuery?: boolean
	include?: {
		documents?: boolean
		relatedMemories?: boolean
		summaries?: boolean
		chunks?: boolean
		forgottenMemories?: boolean
	}
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

// Documents API types
export interface DocumentMemoryEntry {
	id: string
	memory: string
	spaceId: string
	isStatic?: boolean
	isLatest?: boolean
	isForgotten?: boolean
	forgetAfter?: string | null
	forgetReason?: string | null
	version?: number
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	createdAt: string
	updatedAt: string
}

export interface DocumentWithMemories {
	id: string
	title: string | null
	summary?: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: DocumentMemoryEntry[]
}

export interface DocumentsApiResponse {
	documents: DocumentWithMemories[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

export function getMemoryText(m: Memory): string {
	return "memory" in m ? m.memory : m.chunk
}

function limitByChars(text: string, maxChars = MAX_CHARS): string {
	return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text
}

function previewByChars(text: string): string {
	return text.length > 200 ? `${text.slice(0, 100)}...${text.slice(-97)}` : text
}

// Type for SDK search result item
interface SDKResult {
	id: string
	memory?: string
	chunk?: string
	content?: string
	similarity: number
	title?: string
	metadata?: Record<string, unknown> | null
	updatedAt?: string
	context?: Record<string, unknown>
	documents?: Array<Record<string, unknown>>
	isAggregated?: boolean
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
			timeout: FETCH_TIMEOUT_MS,
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

	private toBase64Url(bytes: Uint8Array): string {
		let binary = ""
		for (const byte of bytes) binary += String.fromCharCode(byte)
		return btoa(binary)
			.replaceAll("+", "-")
			.replaceAll("/", "_")
			.replace(/=+$/, "")
	}

	private fromBase64Url(value: string): Uint8Array {
		const base64 = value.replaceAll("-", "+").replaceAll("_", "/")
		const padding = (4 - (base64.length % 4)) % 4
		const binary = atob(base64.padEnd(base64.length + padding, "="))
		return Uint8Array.from(binary, (character) => character.charCodeAt(0))
	}

	private async contentHash(content: string): Promise<string> {
		const digest = await crypto.subtle.digest(
			"SHA-256",
			textEncoder.encode(content),
		)
		return this.toBase64Url(new Uint8Array(digest))
	}

	private async confirmationKey(): Promise<CryptoKey> {
		return crypto.subtle.importKey(
			"raw",
			textEncoder.encode(this.bearerToken),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign", "verify"],
		)
	}

	private async createForgetConfirmation(
		content: string,
		memoryId: string,
	): Promise<string> {
		const payload = this.toBase64Url(
			textEncoder.encode(
				JSON.stringify({
					version: 1,
					memoryId,
					containerTag: this.containerTag,
					contentHash: await this.contentHash(content),
					expiresAt: Date.now() + FORGET_CONFIRMATION_TTL_MS,
				}),
			),
		)
		const signature = await crypto.subtle.sign(
			"HMAC",
			await this.confirmationKey(),
			textEncoder.encode(`mcp-forget-v1.${payload}`),
		)
		return `${payload}.${this.toBase64Url(new Uint8Array(signature))}`
	}

	private async verifyForgetConfirmation(
		content: string,
		confirmationToken: string,
	): Promise<string | null> {
		try {
			const parts = confirmationToken.split(".")
			if (parts.length !== 2) return null
			const [payload, signature] = parts
			if (!(payload && signature)) return null

			const valid = await crypto.subtle.verify(
				"HMAC",
				await this.confirmationKey(),
				this.fromBase64Url(signature),
				textEncoder.encode(`mcp-forget-v1.${payload}`),
			)
			if (!valid) return null

			const confirmation: Record<string, unknown> = JSON.parse(
				textDecoder.decode(this.fromBase64Url(payload)),
			)
			if (
				confirmation.version !== 1 ||
				typeof confirmation.memoryId !== "string" ||
				confirmation.containerTag !== this.containerTag ||
				typeof confirmation.contentHash !== "string" ||
				typeof confirmation.expiresAt !== "number" ||
				confirmation.expiresAt <= Date.now() ||
				confirmation.contentHash !== (await this.contentHash(content))
			) {
				return null
			}

			return confirmation.memoryId
		} catch {
			return null
		}
	}

	// Delete/forget memory by exact content or a signed preview confirmation
	async forgetMemory(
		content: string,
		confirmationToken?: string,
	): Promise<{ success: boolean; message: string; containerTag: string }> {
		try {
			if (confirmationToken) {
				const memoryId = await this.verifyForgetConfirmation(
					content,
					confirmationToken,
				)
				if (!memoryId) {
					return {
						success: false,
						message:
							"Invalid or expired forget confirmation. No changes were made. Run the forget preview again.",
						containerTag: this.containerTag,
					}
				}

				try {
					const result = await this.client.memories.forget({
						id: memoryId,
						containerTag: this.containerTag,
					})
					return {
						success: true,
						message: `Successfully forgot memory with ID: ${result.id}`,
						containerTag: this.containerTag,
					}
				} catch (error: unknown) {
					const status =
						error && typeof error === "object" && "status" in error
							? (error as Record<string, unknown>).status
							: undefined
					if (status !== 404) throw error
					return {
						success: false,
						message: `No memory exists with ID ${memoryId}. No changes were made.`,
						containerTag: this.containerTag,
					}
				}
			}

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
			} catch (error: unknown) {
				// If not 404, it's a real error - re-throw it
				const status =
					error && typeof error === "object" && "status" in error
						? (error as Record<string, unknown>).status
						: undefined
				if (status !== 404) {
					throw error
				}
				// Otherwise preview semantic candidates without deleting any of them
			}

			const SIMILARITY_THRESHOLD = 0.85
			const searchResult = await this.search(content, 5, SIMILARITY_THRESHOLD, {
				searchMode: "memories",
			})
			const candidates = searchResult.results.filter(
				(result) => "memory" in result,
			)

			if (candidates.length === 0) {
				return {
					success: false,
					message:
						"No exact memory matched. No changes were made, and no similar memory candidates were found.",
					containerTag: this.containerTag,
				}
			}

			const candidateLines = await Promise.all(
				candidates.map(async (candidate) => {
					const confirmation = await this.createForgetConfirmation(
						content,
						candidate.id,
					)
					return `- confirmationToken: ${confirmation}\n  similarity: ${candidate.similarity.toFixed(2)}\n  content: ${JSON.stringify(previewByChars(getMemoryText(candidate) || candidate.content || ""))}`
				}),
			)

			return {
				success: false,
				message: `No exact memory matched. No changes were made.\n\nSimilar memory candidates (preview only):\n${candidateLines.join("\n")}\n\nAsk the user to confirm one candidate, then call memory again with action "forget", the same content, and that confirmationToken. Confirmations expire after 5 minutes.`,
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
		options?: SearchOptions,
	): Promise<SearchResult> {
		try {
			const result = await this.client.search.memories({
				q: query,
				limit,
				containerTag: this.containerTag,
				searchMode: options?.searchMode ?? "hybrid",
				threshold, // Optional threshold parameter
				rerank: options?.rerank,
				rewriteQuery: options?.rewriteQuery,
				include: options?.include,
			})

			const results: Memory[] = (result.results as SDKResult[]).map((r) => {
				const text = limitByChars(r.content || r.memory || r.chunk || "")
				const base = {
					id: r.id,
					similarity: r.similarity,
					title: r.title,
					content: r.content,
					metadata: r.metadata,
					updatedAt: r.updatedAt,
					context: r.context,
					documents: r.documents,
					isAggregated: r.isAggregated,
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
						const text = limitByChars(r.content || r.memory || r.chunk || "")
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
	async getProjects(options?: { signal?: AbortSignal }): Promise<string[]> {
		try {
			const signal = options?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS)
			const response = await fetch(`${this.apiUrl}/v3/projects`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.bearerToken}`,
					"Content-Type": "application/json",
				},
				signal,
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

	// Fetch documents with their memory entries
	async getDocuments(
		containerTags?: string[],
		page = 1,
		limit = 10,
		options?: { signal?: AbortSignal },
	): Promise<DocumentsApiResponse> {
		try {
			const signal = options?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS)
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
				signal,
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
