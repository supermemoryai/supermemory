import Supermemory from "supermemory"
import type {
	Logger,
	MemoryMode,
	SearchMode,
	MemoryPromptData,
	ProfileStructure,
	PromptTemplate,
} from "./types"
import { defaultPromptTemplate } from "./prompt-builder"
import { normalizeBaseUrl } from "./context"

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
	/**
	 * Search mode for memory retrieval:
	 * - "memories": Search only memory entries (default)
	 * - "hybrid": Search both memories AND document chunks
	 * - "documents": Search only document chunks
	 */
	searchMode?: SearchMode
	/** Maximum number of search results to return (default: 10) */
	searchLimit?: number
}

/**
 * Searches for document chunks using the Supermemory search API.
 *
 * @param client - The Supermemory client instance
 * @param containerTag - The container tag for scoping
 * @param queryText - The search query
 * @param limit - Maximum number of results
 * @returns Array of chunk content strings
 */
const searchDocumentChunks = async (
	client: Supermemory,
	containerTag: string,
	queryText: string,
	limit: number,
): Promise<string[]> => {
	if (!queryText) return []

	const response = await client.search.documents({
		q: queryText,
		containerTags: [containerTag],
		limit,
	})

	const chunks: string[] = []
	for (const result of response.results) {
		for (const chunk of result.chunks) {
			if (chunk.isRelevant) {
				chunks.push(chunk.content)
			}
		}
	}
	return chunks
}

/**
 * Searches for memories with optional document chunks using the Supermemory search API.
 *
 * @param client - The Supermemory client instance
 * @param containerTag - The container tag for scoping
 * @param queryText - The search query
 * @param limit - Maximum number of results
 * @param includeChunks - Whether to include document chunks (hybrid mode)
 * @returns Object with memories array and optional chunks array
 */
const searchMemoriesWithChunks = async (
	client: Supermemory,
	containerTag: string,
	queryText: string,
	limit: number,
	includeChunks: boolean,
): Promise<{ memories: string[]; chunks: string[] }> => {
	if (!queryText) return { memories: [], chunks: [] }

	const response = await client.search.memories({
		q: queryText,
		containerTag,
		limit,
		include: {
			chunks: includeChunks,
		},
	})

	const memories: string[] = []
	const chunks: string[] = []

	for (const result of response.results) {
		memories.push(result.memory)
		if (includeChunks && result.chunks) {
			for (const chunk of result.chunks) {
				chunks.push(chunk.content)
			}
		}
	}

	return { memories, chunks }
}

/**
 * Fetches memories from the API, deduplicates them, and formats them into
 * the final string to be injected into the system prompt.
 *
 * Memory modes (controls profile API /v4/profile):
 * - "profile": Fetches user profile without query-based filtering
 * - "query": Fetches user profile with query-based semantic search
 * - "full": Same as "query" - fetches profile with query search
 *
 * Search modes (controls search endpoints - independent of mode):
 * - "memories": Uses search.memories endpoint only (memory entries)
 * - "hybrid": Uses both search.memories AND search.documents (memories + chunks)
 * - "documents": Uses search.documents endpoint only (document chunks)
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

	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

	// Determine if we need the Supermemory client (for search operations)
	const needsSearchClient = queryText && searchMode !== undefined

	let client: Supermemory | null = null
	if (needsSearchClient) {
		client = new Supermemory({
			apiKey,
			...(normalizedBaseUrl !== "https://api.supermemory.ai"
				? { baseURL: normalizedBaseUrl }
				: {}),
		})
	}

	// 1. Fetch profile based on mode (MemoryMode)
	let profileData: ProfileStructure | null = null
	const profileQueryText = mode === "profile" ? "" : queryText

	try {
		profileData = await supermemoryProfileSearch(
			containerTag,
			profileQueryText,
			normalizedBaseUrl,
			apiKey,
		)
		logger.info("Profile search completed", {
			containerTag,
			mode,
			hasStatic: (profileData.profile?.static?.length ?? 0) > 0,
			hasDynamic: (profileData.profile?.dynamic?.length ?? 0) > 0,
			hasSearchResults: (profileData.searchResults?.results?.length ?? 0) > 0,
		})
	} catch (error) {
		logger.error("Profile search failed", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
		throw error
	}

	// 2. Execute search based on searchMode (SearchMode) - independent of profile
	let searchMemories: string[] = []
	let documentChunks: string[] = []

	if (queryText && client) {
		if (searchMode === "memories") {
			// Memories only - use search.memories
			const result = await searchMemoriesWithChunks(
				client,
				containerTag,
				queryText,
				searchLimit,
				false, // no chunks
			)
			searchMemories = result.memories
			logger.info("Memory search completed", {
				containerTag,
				searchMode,
				memoryCount: searchMemories.length,
				queryText:
					queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
			})
		} else if (searchMode === "documents") {
			// Documents only - use search.documents
			documentChunks = await searchDocumentChunks(
				client,
				containerTag,
				queryText,
				searchLimit,
			)
			logger.info("Document search completed", {
				containerTag,
				searchMode,
				chunkCount: documentChunks.length,
				queryText:
					queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
			})
		} else if (searchMode === "hybrid") {
			// Hybrid - use both search.memories AND search.documents
			const [memoriesResult, chunksResult] = await Promise.all([
				searchMemoriesWithChunks(
					client,
					containerTag,
					queryText,
					searchLimit,
					false,
				),
				searchDocumentChunks(client, containerTag, queryText, searchLimit),
			])
			searchMemories = memoriesResult.memories
			documentChunks = chunksResult
			logger.info("Hybrid search completed", {
				containerTag,
				searchMode,
				memoryCount: searchMemories.length,
				chunkCount: documentChunks.length,
				queryText:
					queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
			})
		}
	} else if (!queryText) {
		logger.debug("No query text provided, skipping search", {
			containerTag,
			searchMode,
		})
	}

	// 3. Build the combined result from profile AND search
	// Extract profile memories
	const staticMemories =
		profileData?.profile?.static?.map((m) => m.memory).filter(Boolean) ?? []
	const dynamicMemories =
		profileData?.profile?.dynamic?.map((m) => m.memory).filter(Boolean) ?? []
	const profileSearchResults =
		profileData?.searchResults?.results?.map((m) => m.memory).filter(Boolean) ??
		[]

	// Combine all profile-based memories
	const allProfileMemories = [
		...staticMemories,
		...dynamicMemories,
		...profileSearchResults,
	]

	// Deduplicate memories (profile + search)
	const allMemories = Array.from(
		new Set([...allProfileMemories, ...searchMemories]),
	)

	// Build user memories section (from profile)
	let userMemories = ""
	if (allProfileMemories.length > 0) {
		userMemories = allProfileMemories.map((memory) => `- ${memory}`).join("\n")
	}

	// Build search results section (from searchMode)
	let generalSearchMemories = ""
	if (searchMemories.length > 0) {
		generalSearchMemories = `Relevant memories:\n${searchMemories.map((memory) => `- ${memory}`).join("\n")}`
	}

	// Add document chunks section
	if (documentChunks.length > 0) {
		const prefix = generalSearchMemories ? "\n\n" : ""
		generalSearchMemories += `${prefix}Relevant document excerpts:\n${documentChunks.map((chunk) => `- ${chunk}`).join("\n")}`
	}

	const promptData: MemoryPromptData = {
		userMemories,
		generalSearchMemories,
		searchResults: allMemories.map((memory) => ({ memory })),
	}

	const result = promptTemplate(promptData)
	if (result) {
		logger.debug("Memory content preview", {
			content: result,
			fullLength: result.length,
		})
	}

	return result
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
