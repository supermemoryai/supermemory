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

/**
 * Search result item from the Supermemory search API.
 * Contains either a memory field (for memory results) or a chunk field (for document chunks).
 */
export interface SearchResultItem {
	id: string
	similarity: number
	memory?: string
	chunk?: string
	title?: string
	content?: string
	metadata?: Record<string, unknown>
}

/**
 * Response structure from the Supermemory search API.
 */
export interface SearchResponse {
	results: SearchResultItem[]
	total: number
	timing: number
}

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
 * Performs a hybrid search using the Supermemory search API.
 * Hybrid search returns both memories AND document chunks.
 *
 * @param containerTag - The container tag/user ID for scoping memories
 * @param queryText - The search query text
 * @param searchMode - The search mode: "memories", "hybrid", or "documents"
 * @param baseUrl - The API base URL
 * @param apiKey - The API key for authentication
 * @param limit - Maximum number of results to return (default: 10)
 * @returns The search response with results containing either memory or chunk fields
 */
export const supermemoryHybridSearch = async (
	containerTag: string,
	queryText: string,
	searchMode: SearchMode,
	baseUrl: string,
	apiKey: string,
	limit = 10,
): Promise<SearchResponse> => {
	const payload = JSON.stringify({
		q: queryText,
		containerTag: containerTag,
		searchMode: searchMode,
		limit: limit,
	})

	try {
		const response = await fetch(`${baseUrl}/v4/search`, {
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
				`Supermemory search failed: ${response.status} ${response.statusText}. ${errorText}`,
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
	/**
	 * Search mode for memory retrieval:
	 * - "memories": Search only memory entries (default)
	 * - "hybrid": Search both memories AND document chunks (recommended for RAG)
	 * - "documents": Search only document chunks
	 */
	searchMode?: SearchMode
	/** Maximum number of search results to return (default: 10) */
	searchLimit?: number
}

/**
 * Formats search results (memories and/or chunks) into a readable string.
 */
const formatSearchResults = (
	results: SearchResultItem[],
	includeChunks: boolean,
): string => {
	if (results.length === 0) return ""

	const formattedResults = results.map((result) => {
		if (result.memory) {
			return `- ${result.memory}`
		}
		if (result.chunk && includeChunks) {
			return `- [Document] ${result.chunk}`
		}
		return null
	}).filter(Boolean)

	return formattedResults.join("\n")
}

/**
 * Fetches memories from the API, deduplicates them, and formats them into
 * the final string to be injected into the system prompt.
 *
 * When searchMode is "hybrid" or "documents", uses the search API to retrieve
 * both memories and document chunks. Otherwise, uses the profile API.
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

	const useHybridSearch = searchMode === "hybrid" || searchMode === "documents"

	let userMemories = ""
	let generalSearchMemories = ""

	if (useHybridSearch && queryText) {
		logger.info("Using hybrid search mode", {
			containerTag,
			searchMode,
			queryText: queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
		})

		const searchResponse = await supermemoryHybridSearch(
			containerTag,
			queryText,
			searchMode,
			baseUrl,
			apiKey,
			searchLimit,
		)

		logger.info("Hybrid search completed", {
			containerTag,
			resultCount: searchResponse.results.length,
			timing: searchResponse.timing,
			searchMode,
		})

		const includeChunks = searchMode === "hybrid" || searchMode === "documents"
		generalSearchMemories = formatSearchResults(searchResponse.results, includeChunks)

		if (generalSearchMemories) {
			generalSearchMemories = `Search results for user's recent message:\n${generalSearchMemories}`
		}

		if (mode !== "query") {
			const profileResponse = await supermemoryProfileSearch(
				containerTag,
				"",
				baseUrl,
				apiKey,
			)

			const deduplicated = deduplicateMemories({
				static: profileResponse.profile.static,
				dynamic: profileResponse.profile.dynamic,
				searchResults: [],
			})

			userMemories = convertProfileToMarkdown({
				profile: {
					static: deduplicated.static,
					dynamic: deduplicated.dynamic,
				},
				searchResults: { results: [] },
			})
		}
	} else {
		const memoriesResponse = await supermemoryProfileSearch(
			containerTag,
			queryText,
			baseUrl,
			apiKey,
		)

		const memoryCountStatic = memoriesResponse.profile.static?.length || 0
		const memoryCountDynamic = memoriesResponse.profile.dynamic?.length || 0

		logger.info("Memory search completed", {
			containerTag,
			memoryCountStatic,
			memoryCountDynamic,
			queryText:
				queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
			mode,
		})

		const deduplicated = deduplicateMemories({
			static: memoriesResponse.profile.static,
			dynamic: memoriesResponse.profile.dynamic,
			searchResults: memoriesResponse.searchResults?.results,
		})

		logger.debug("Memory deduplication completed", {
			static: {
				original: memoryCountStatic,
				deduplicated: deduplicated.static.length,
			},
			dynamic: {
				original: memoryCountDynamic,
				deduplicated: deduplicated.dynamic.length,
			},
			searchResults: {
				original: memoriesResponse.searchResults?.results?.length,
				deduplicated: deduplicated.searchResults?.length,
			},
		})

		userMemories =
			mode !== "query"
				? convertProfileToMarkdown({
						profile: {
							static: deduplicated.static,
							dynamic: deduplicated.dynamic,
						},
						searchResults: { results: [] },
					})
				: ""
		generalSearchMemories =
			mode !== "profile"
				? `Search results for user's recent message: \n${deduplicated.searchResults
						.map((memory) => `- ${memory}`)
						.join("\n")}`
				: ""
	}

	const promptData: MemoryPromptData = {
		userMemories,
		generalSearchMemories,
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
