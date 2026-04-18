import Supermemory from "supermemory"
import { deduplicateMemories } from "../tools-shared"
import type {
	Logger,
	MemoryMode,
	MemoryPromptData,
	ProfileStructure,
	PromptTemplate,
	SearchMode,
} from "./types"
import {
	convertProfileToMarkdown,
	defaultPromptTemplate,
} from "./prompt-builder"
import { createSupermemoryClient } from "./context"

/**
 * Fetches profile and search results from the Supermemory API.
 *
 * @param containerTag - The container tag/user ID for scoping memories
 * @param queryText - Optional query text for semantic search
 * @param baseUrl - The API base URL
 * @param apiKey - The API key for authentication
 * @returns The profile structure with static, dynamic, and search results
 */
export const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
	baseUrl: string,
	apiKey: string,
): Promise<ProfileStructure> => {
	const payload = queryText
		? JSON.stringify({
				q: queryText,
				containerTag: containerTag,
			})
		: JSON.stringify({
				containerTag: containerTag,
			})

	try {
		const response = await fetch(`${baseUrl}/v4/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: payload,
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error")
			throw new Error(
				`Supermemory profile search failed: ${response.status} ${response.statusText}. ${errorText}`,
			)
		}

		return await response.json()
	} catch (error) {
		if (error instanceof Error) {
			throw error
		}
		throw new Error(`Supermemory API request failed: ${error}`)
	}
}

/**
 * Options for building memories text.
 */
export interface BuildMemoriesTextOptions {
	containerTag: string
	queryText: string
	mode: MemoryMode
	baseUrl: string
	apiKey: string
	logger: Logger
	promptTemplate?: PromptTemplate
	/** Search mode: "memories", "hybrid", or "documents" (default: "memories") */
	searchMode?: SearchMode
	/** Maximum number of search results (default: 10) */
	searchLimit?: number
}

/**
 * Search result structure for unified handling.
 */
interface SearchResult {
	content: string
	metadata?: Record<string, unknown>
}

/**
 * Searches for memories using the Supermemory SDK.
 *
 * @param client - Supermemory client instance
 * @param containerTag - Container tag for scoping
 * @param query - Search query text
 * @param limit - Maximum number of results
 * @returns Array of search results
 */
async function searchMemoriesSDK(
	client: Supermemory,
	containerTag: string,
	query: string,
	limit: number,
): Promise<SearchResult[]> {
	const response = await client.search.memories({
		q: query,
		containerTag,
		limit,
		include: { chunks: false },
	})
	return (response.results || []).map((r) => ({
		content: r.memory || "",
		metadata: r.metadata ?? undefined,
	}))
}

/**
 * Searches for document chunks using the Supermemory SDK.
 * Only includes chunks marked as relevant (isRelevant: true).
 *
 * @param client - Supermemory client instance
 * @param containerTag - Container tag for scoping
 * @param query - Search query text
 * @param limit - Maximum number of results
 * @returns Array of search results containing only relevant chunks
 */
async function searchDocumentsSDK(
	client: Supermemory,
	containerTag: string,
	query: string,
	limit: number,
): Promise<SearchResult[]> {
	const response = await client.search.documents({
		q: query,
		containerTags: [containerTag],
		limit,
	})
	// Extract only relevant chunks from each document result
	const results: SearchResult[] = []
	for (const doc of response.results || []) {
		for (const chunk of doc.chunks || []) {
			// Only include chunks marked as relevant
			if (chunk.isRelevant) {
				results.push({
					content: chunk.content || "",
					metadata: doc.metadata ?? undefined,
				})
			}
		}
	}
	return results
}

/**
 * Performs search based on the specified search mode.
 *
 * @param client - Supermemory client instance
 * @param containerTag - Container tag for scoping
 * @param query - Search query text
 * @param searchMode - Search mode: "memories", "hybrid", or "documents"
 * @param limit - Maximum number of results per search type
 * @param logger - Logger instance
 * @returns Combined array of search results
 */
async function performSearch(
	client: Supermemory,
	containerTag: string,
	query: string,
	searchMode: SearchMode,
	limit: number,
	logger: Logger,
): Promise<SearchResult[]> {
	logger.debug("Performing search", { searchMode, containerTag, limit })

	switch (searchMode) {
		case "memories":
			return searchMemoriesSDK(client, containerTag, query, limit)

		case "documents":
			return searchDocumentsSDK(client, containerTag, query, limit)

		case "hybrid": {
			// Run both searches in parallel
			const [memoriesResults, documentsResults] = await Promise.all([
				searchMemoriesSDK(client, containerTag, query, limit),
				searchDocumentsSDK(client, containerTag, query, limit),
			])

			logger.debug("Hybrid search completed", {
				memoriesCount: memoriesResults.length,
				documentsCount: documentsResults.length,
			})

			// Combine results, memories first
			return [...memoriesResults, ...documentsResults]
		}

		default:
			logger.warn(`Unknown search mode: ${searchMode}, defaulting to memories`)
			return searchMemoriesSDK(client, containerTag, query, limit)
	}
}

/**
 * Fetches memories from the API, deduplicates them, and formats them into
 * the final string to be injected into the system prompt.
 *
 * When searchMode is specified, uses the Supermemory SDK search endpoints:
 * - "memories": Uses search.memories() for memory entries
 * - "documents": Uses search.documents() for document chunks
 * - "hybrid": Uses both endpoints in parallel
 *
 * The mode option controls whether profile data is included:
 * - "profile": Only profile data (static/dynamic), no search
 * - "query": Only search results, no profile data
 * - "full": Both profile data and search results
 *
 * @param options - Configuration for building memories text
 * @returns The final formatted memories string ready for injection
 */
export const buildMemoriesText = async (
	options: BuildMemoriesTextOptions,
): Promise<string> => {
	const {
		containerTag,
		queryText,
		mode,
		baseUrl,
		apiKey,
		logger,
		promptTemplate = defaultPromptTemplate,
		searchMode = "memories",
		searchLimit = 10,
	} = options

	// Fetch profile data when mode includes profile (profile or full)
	let profileData: ProfileStructure | null = null
	if (mode !== "query") {
		profileData = await supermemoryProfileSearch(
			containerTag,
			mode === "profile" ? "" : queryText, // Only send query for full mode
			baseUrl,
			apiKey,
		)

		const memoryCountStatic = profileData.profile.static?.length || 0
		const memoryCountDynamic = profileData.profile.dynamic?.length || 0

		logger.info("Profile search completed", {
			containerTag,
			memoryCountStatic,
			memoryCountDynamic,
			mode,
		})
	}

	// Perform SDK-based search when mode includes query (query or full)
	let searchResults: SearchResult[] = []
	if (mode !== "profile" && queryText) {
		const client = createSupermemoryClient({ apiKey, baseUrl })
		searchResults = await performSearch(
			client,
			containerTag,
			queryText,
			searchMode,
			searchLimit,
			logger,
		)

		logger.info("Search completed", {
			containerTag,
			searchMode,
			searchLimit,
			resultCount: searchResults.length,
			queryText:
				queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
		})
	}

	// Deduplicate profile memories
	const deduplicated = deduplicateMemories({
		static: profileData?.profile.static,
		dynamic: profileData?.profile.dynamic,
		searchResults: searchResults.map((r) => ({ memory: r.content })),
	})

	logger.debug("Memory deduplication completed", {
		static: {
			original: profileData?.profile.static?.length || 0,
			deduplicated: deduplicated.static.length,
		},
		dynamic: {
			original: profileData?.profile.dynamic?.length || 0,
			deduplicated: deduplicated.dynamic.length,
		},
		searchResults: {
			original: searchResults.length,
			deduplicated: deduplicated.searchResults?.length,
		},
	})

	// Build user memories from profile (static + dynamic)
	const userMemories =
		mode !== "query"
			? convertProfileToMarkdown({
					profile: {
						static: deduplicated.static,
						dynamic: deduplicated.dynamic,
					},
					searchResults: { results: [] },
				})
			: ""

	// Build search results text
	const generalSearchMemories =
		mode !== "profile" && deduplicated.searchResults.length > 0
			? `Search results for user's recent message:\n${deduplicated.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""

	const promptData: MemoryPromptData = {
		userMemories,
		generalSearchMemories,
		searchResults: searchResults.map((r) => ({
			memory: r.content,
			metadata: r.metadata,
		})),
	}

	const memories = promptTemplate(promptData)
	if (memories) {
		logger.debug("Memory content preview", {
			content: memories,
			fullLength: memories.length,
		})
	}

	return memories
}

/**
 * Generic interface for a message with role and content.
 * Framework-agnostic to support both Vercel AI SDK and Mastra.
 */
export interface GenericMessage {
	role: string
	content: string | Array<{ type: string; text?: string }>
}

/**
 * Extracts the query text from messages based on mode.
 * For "profile" mode, returns empty string (no query needed).
 * For "query" or "full" mode, extracts the last user message text.
 *
 * This is a framework-agnostic version that works with any message array.
 *
 * @param messages - Array of messages with role and content
 * @param mode - The memory retrieval mode
 * @returns The query text for memory search
 */
export const extractQueryText = (
	messages: GenericMessage[],
	mode: MemoryMode,
): string => {
	if (mode === "profile") {
		return ""
	}

	const userMessage = messages
		.slice()
		.reverse()
		.find((msg) => msg.role === "user")

	const content = userMessage?.content
	if (!content) return ""

	if (typeof content === "string") {
		return content
	}

	if (Array.isArray(content)) {
		return content
			.filter((part) => part.type === "text")
			.map((part) => part.text || "")
			.join(" ")
	}

	const objContent = content as unknown as {
		content?: string
		parts?: Array<{ type: string; text?: string }>
	}
	if (typeof objContent === "object" && objContent !== null) {
		if ("content" in objContent && typeof objContent.content === "string") {
			return objContent.content
		}
		if ("parts" in objContent && Array.isArray(objContent.parts)) {
			return objContent.parts
				.filter((part) => part.type === "text")
				.map((part) => part.text || "")
				.join(" ")
		}
	}

	return ""
}

/**
 * Extracts text content from the last user message in a message array.
 *
 * @param messages - Array of messages with role and content
 * @returns The last user message text, or undefined if not found
 */
export const getLastUserMessageText = (
	messages: GenericMessage[],
): string | undefined => {
	const lastUserMessage = messages
		.slice()
		.reverse()
		.find((msg) => msg.role === "user")

	if (!lastUserMessage) {
		return undefined
	}

	const content = lastUserMessage.content

	if (typeof content === "string") {
		return content
	}

	if (Array.isArray(content)) {
		return content
			.filter((part) => part.type === "text")
			.map((part) => part.text || "")
			.join(" ")
	}

	const objContent = content as unknown as {
		content?: string
		parts?: Array<{ type: string; text?: string }>
	}
	if (typeof objContent === "object" && objContent !== null) {
		if ("content" in objContent && typeof objContent.content === "string") {
			return objContent.content
		}
		if ("parts" in objContent && Array.isArray(objContent.parts)) {
			return objContent.parts
				.filter((part) => part.type === "text")
				.map((part) => part.text || "")
				.join(" ")
		}
	}

	return undefined
}
