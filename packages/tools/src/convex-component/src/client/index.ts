import type { ConvexClient } from "convex/browser"
import type { FunctionReference } from "convex/server"

/**
 * Supermemory Convex Client
 *
 * Type-safe client for interacting with the Supermemory Convex component.
 * Use this in your application code to add memories, search, and get profiles.
 */

export interface AddMemoryArgs {
	content: string
	containerTag: string
	customId?: string
	metadata?: Record<string, any>
}

export interface SearchMemoriesArgs {
	q: string
	containerTag: string
	searchMode?: "hybrid" | "memories" | "documents"
	limit?: number
	threshold?: number
	rerank?: boolean
	filters?: Record<string, any>
}

export interface ProfileArgs {
	containerTag: string
	q?: string
}

export interface SearchResult {
	id: string
	memory?: string
	chunk?: string
	similarity: number
	metadata?: Record<string, any>
	updatedAt: string
	version: number
}

export interface SearchResponse {
	results: SearchResult[]
	timing: number
	total: number
	cached: boolean
}

export interface ProfileResponse {
	profile: {
		static: string[]
		dynamic: string[]
	}
	searchResults?: {
		results: Array<{
			id: string
			memory?: string
			chunk?: string
			similarity: number
			metadata?: Record<string, any>
		}>
	}
	cached: boolean
}

export interface Document {
	_id: string
	documentId: string
	customId?: string
	containerTag: string
	contentPreview: string
	metadata?: Record<string, any>
	status: "queued" | "processed" | "failed"
	addedAt: number
}

export interface ApiLog {
	_id: string
	endpoint: string
	containerTag?: string
	requestBody?: any
	responseStatus: "success" | "error" | "pending"
	responseTime?: number
	errorMessage?: string
	timestamp: number
}

export interface ApiStats {
	totalCalls: number
	successfulCalls: number
	failedCalls: number
	averageResponseTime: number
	callsByEndpoint: Record<string, number>
}

/**
 * Create a Supermemory client for use with a Convex component
 *
 * @param client - Your Convex client instance
 * @param componentPath - Path to the component in your Convex config (default: "supermemory")
 *
 * @example
 * ```typescript
 * import { ConvexHttpClient } from "convex/browser";
 * import { createSupermemoryClient } from "@supermemory/convex-component";
 *
 * const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
 * const supermemory = createSupermemoryClient(convex);
 *
 * // Add a memory
 * await supermemory.add({
 *   content: "User loves TypeScript",
 *   containerTag: "user_123"
 * });
 *
 * // Search memories
 * const results = await supermemory.search({
 *   q: "programming languages",
 *   containerTag: "user_123"
 * });
 * ```
 */
export function createSupermemoryClient(
	client: ConvexClient,
	componentPath = "supermemory",
) {
	// Helper to construct function references
	const action = (name: string): FunctionReference<"action"> => {
		return `${componentPath}:actions.${name}` as any
	}

	const query = (name: string): FunctionReference<"query"> => {
		return `${componentPath}:queries.${name}` as any
	}

	const mutation = (name: string): FunctionReference<"mutation"> => {
		return `${componentPath}:mutations.${name}` as any
	}

	return {
		/**
		 * Add content to Supermemory
		 * Stores text, conversations, files, or URLs for semantic search
		 */
		add: async (args: AddMemoryArgs) => {
			return await client.action(action("add"), args)
		},

		/**
		 * Search memories and documents
		 * Performs semantic search across all content
		 */
		search: async (args: SearchMemoriesArgs): Promise<SearchResponse> => {
			return await client.action(action("search"), args)
		},

		/**
		 * Get user profile with context
		 * Retrieves static/dynamic facts about a user plus relevant memories
		 */
		profile: async (args: ProfileArgs): Promise<ProfileResponse> => {
			return await client.action(action("profile"), args)
		},

		/**
		 * List documents added to Supermemory
		 * Query documents with optional filtering
		 */
		listDocuments: async (args?: {
			containerTag?: string
			limit?: number
		}): Promise<Document[]> => {
			return await client.query(query("listDocuments"), args || {})
		},

		/**
		 * Get a document by custom ID
		 */
		getDocumentByCustomId: async (
			customId: string,
		): Promise<Document | null> => {
			return await client.query(query("getDocumentByCustomId"), { customId })
		},

		/**
		 * Get API call logs
		 * View recent Supermemory API calls for debugging
		 */
		getApiLogs: async (args?: {
			endpoint?: string
			containerTag?: string
			limit?: number
		}): Promise<ApiLog[]> => {
			return await client.query(query("getApiLogs"), args || {})
		},

		/**
		 * Get API statistics
		 * Aggregate stats for dashboard visibility
		 */
		getApiStats: async (args?: {
			containerTag?: string
			limit?: number
		}): Promise<ApiStats> => {
			return await client.query(query("getApiStats"), args || {})
		},

		/**
		 * Search cached documents locally
		 * Fast text search across cached content
		 */
		searchCached: async (args: {
			searchText: string
			containerTag?: string
			limit?: number
		}): Promise<Document[]> => {
			return await client.query(query("searchCachedDocuments"), args)
		},

		/**
		 * Clean expired cache entries
		 * Removes old search and profile caches
		 */
		cleanCache: async () => {
			return await client.mutation(mutation("cleanExpiredCache"), {})
		},

		/**
		 * Update document status
		 */
		updateDocumentStatus: async (args: {
			documentId: string
			status: "queued" | "processed" | "failed"
		}) => {
			return await client.mutation(mutation("updateDocumentStatus"), args)
		},
	}
}

/**
 * Type for the Supermemory client
 */
export type SupermemoryClient = ReturnType<typeof createSupermemoryClient>
