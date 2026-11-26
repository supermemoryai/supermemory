import {
	deduplicateMemoriesForMode,
	getMemoryText,
	normalizeMemoryFact,
} from "../tools-shared"
import type {
	Logger,
	MemoryMode,
	MemoryPromptData,
	ProfileStructure,
	PromptTemplate,
} from "./types"
import { SupermemoryError } from "supermemory"
import { type SupermemorySource, createSupermemoryClient } from "./context"
import {
	convertProfileToMarkdown,
	defaultPromptTemplate,
} from "./prompt-builder"

function describeSupermemoryError(error: unknown): string {
	if (error instanceof SupermemoryError && error.statusCode !== undefined) {
		return `${error.statusCode}. ${error.message}`
	}
	return error instanceof Error ? error.message : String(error)
}

// Matches the v4 profile search defaults (memories mode, 0.6 threshold).
export const PROFILE_SEARCH_THRESHOLD = 0.6

/**
 * Fetches the profile and runs a memories search in parallel. When one of the two fails, the other's result is kept.
 *
 * @param namespace - Namespace to read from
 * @param queryText - Search query; an empty string skips the search
 * @param baseUrl - Supermemory API base URL
 * @param apiKey - Supermemory API key
 * @param source - Integration name sent with each request
 * @param signal - Optional abort signal for both requests
 * @param includeProfile - Whether to fetch the profile (default: true)
 * @param logger - Optional logger that is warned when only one of the two requests fails
 * @returns The profile and, when a query was given, the search results
 * @throws {Error} When every request that was made fails
 */
export const supermemoryProfileSearch = async (
	namespace: string,
	queryText: string,
	baseUrl: string,
	apiKey: string,
	source: SupermemorySource,
	signal?: AbortSignal,
	includeProfile = true,
	logger?: Logger,
): Promise<ProfileStructure> => {
	const client = createSupermemoryClient({ apiKey, baseUrl, source })
	// No retries: this runs before the LLM call, and the raw v4 fetch never retried.
	const requestOptions = {
		maxRetries: 0,
		...(signal && { abortSignal: signal }),
	}

	const requests = [
		includeProfile
			? client.profile(namespace, undefined, requestOptions)
			: undefined,
		queryText
			? client.search(
					namespace,
					{
						query: queryText,
						searchMode: "memories",
						threshold: PROFILE_SEARCH_THRESHOLD,
					},
					requestOptions,
				)
			: undefined,
	] as const
	const [profileResult, searchResult] = await Promise.allSettled(requests)
	const failures = [profileResult, searchResult].flatMap((result) =>
		result.status === "rejected" ? [result.reason as unknown] : [],
	)
	if (failures.length > 0) {
		const message = `Supermemory profile search failed: ${describeSupermemoryError(failures[0])}`
		if (failures.length === requests.filter(Boolean).length) {
			throw new Error(message)
		}
		logger?.warn(`${message}; continuing with the rest`)
	}
	const profileResponse =
		profileResult.status === "fulfilled" ? profileResult.value : undefined
	const searchResponse =
		searchResult.status === "fulfilled" ? searchResult.value : undefined

	return {
		profile: profileResponse?.profile ?? { static: [], dynamic: [] },
		...(searchResponse && {
			searchResults: {
				results: searchResponse.results,
				timing: searchResponse.searchTime,
			},
		}),
	}
}

/**
 * Options for building memories text.
 */
export interface BuildMemoriesTextOptions {
	namespace: string
	queryText: string
	mode: MemoryMode
	baseUrl: string
	apiKey: string
	source: SupermemorySource
	logger: Logger
	promptTemplate?: PromptTemplate
	signal?: AbortSignal
	profile?: ProfileStructure["profile"] | Promise<ProfileStructure["profile"]>
	/** Trimmed lines of memory blocks the model already has; memories they fully cover are left out. */
	known?: ReadonlySet<string>
}

/**
 * Fetches memories from the API, deduplicates them, and formats them into
 * the final memory block string.
 *
 * @param options - Configuration for building memories text
 * @returns The final formatted memories string ready for injection
 */
export const buildMemoriesText = async (
	options: BuildMemoriesTextOptions,
): Promise<string> => {
	const {
		namespace,
		queryText,
		mode,
		baseUrl,
		apiKey,
		source,
		logger,
		promptTemplate = defaultPromptTemplate,
		signal,
	} = options

	const [memoriesResponse, profile] = await Promise.all([
		supermemoryProfileSearch(
			namespace,
			queryText,
			baseUrl,
			apiKey,
			source,
			signal,
			mode !== "query" && options.profile === undefined,
			logger,
		),
		options.profile,
	])
	if (profile !== undefined) {
		memoriesResponse.profile = profile
	}

	const memoryCountStatic = memoriesResponse.profile.static?.length || 0
	const memoryCountDynamic = memoriesResponse.profile.dynamic?.length || 0

	logger.info("Memory search completed", {
		namespace,
		memoryCountStatic,
		memoryCountDynamic,
		queryText:
			queryText.substring(0, 100) + (queryText.length > 100 ? "..." : ""),
		mode,
	})

	const rawSearchResults = memoriesResponse.searchResults?.results ?? []
	const deduplicated = deduplicateMemoriesForMode(
		mode,
		{
			static: memoriesResponse.profile.static,
			dynamic: memoriesResponse.profile.dynamic,
			searchResults: rawSearchResults,
		},
		options.known,
	)

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
	const generalSearchMemories =
		mode !== "profile" && deduplicated.searchResults.length > 0
			? `Search results for user's recent message: \n${deduplicated.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""
	const visibleSearchKeys = new Set(
		deduplicated.searchResults.map(normalizeMemoryFact),
	)
	const seenSearchKeys = new Set<string>()
	const deduplicatedSearchResults = rawSearchResults.flatMap((result) => {
		const memory = getMemoryText(result)
		if (!memory) return []
		const key = normalizeMemoryFact(memory)
		if (!visibleSearchKeys.has(key) || seenSearchKeys.has(key)) return []
		seenSearchKeys.add(key)
		return [{ ...result, memory }]
	})

	const promptData: MemoryPromptData = {
		userMemories,
		generalSearchMemories,
		searchResults: deduplicatedSearchResults,
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
