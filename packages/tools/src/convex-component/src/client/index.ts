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
}

export interface Memory {
	_id: string
	content: string
	containerTag: string
	source: "chat" | "document" | "manual"
	supermemoryId?: string
	extractedMemories?: string[]
	createdAt: number
	metadata?: Record<string, any>
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
	const action = (name: string): FunctionReference<"action"> => {
		return `${componentPath}:actions.${name}` as any
	}

	const query = (name: string): FunctionReference<"query"> => {
		return `${componentPath}:queries.${name}` as any
	}

	return {
		/**
		 * Add content to Supermemory
		 * Stores text and extracts memories from it
		 */
		add: async (args: AddMemoryArgs) => {
			return await client.action(action("add"), args)
		},

		/**
		 * Search memories
		 * Performs semantic search across all content
		 */
		search: async (args: SearchMemoriesArgs): Promise<SearchResponse> => {
			return await client.action(action("search"), args)
		},

		/**
		 * Get user profile with context
		 * Retrieves static/dynamic facts about a user
		 */
		profile: async (args: ProfileArgs): Promise<ProfileResponse> => {
			return await client.action(action("profile"), args)
		},

		/**
		 * List memories for a user
		 * Includes content and extracted memories
		 */
		listMemories: async (args: {
			containerTag: string
			source?: "chat" | "document" | "manual"
			limit?: number
		}): Promise<Memory[]> => {
			return await client.query(query("listMemories"), args)
		},

		/**
		 * Get API call logs
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
		 */
		getApiStats: async (args?: {
			containerTag?: string
			limit?: number
		}): Promise<ApiStats> => {
			return await client.query(query("getApiStats"), args || {})
		},
	}
}

/**
 * Type for the Supermemory client
 */
export type SupermemoryClient = ReturnType<typeof createSupermemoryClient>
