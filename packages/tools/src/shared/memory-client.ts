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
import {
	convertProfileToMarkdown,
	defaultPromptTemplate,
} from "./prompt-builder"

/**
 * Upper bound for a single `/v4/profile` request, matching the budget the other
 * Supermemory calls in this package already use (`/v4/conversations` and
 * `/v4/memories`). Without it a stalled connection has no deadline at all: the
 * Mastra and VoltAgent integrations, and the exported `buildMemoriesText` /
 * `addSystemPrompt` helpers, call this function with no signal of their own, so
 * a hung socket would block the agent turn forever.
 */
export const PROFILE_REQUEST_TIMEOUT_MS = 30_000

/**
 * Bound a request by the package timeout, keeping any caller signal live.
 *
 * The caller signal is composed with the timeout rather than replacing it, so
 * a caller-supplied deadline can only ever shorten the request, never remove
 * its upper bound.
 */
const withRequestTimeout = (signal?: AbortSignal): AbortSignal => {
	const timeout = AbortSignal.timeout(PROFILE_REQUEST_TIMEOUT_MS)
	return signal ? AbortSignal.any([signal, timeout]) : timeout
}

/**
 * Fetches profile and search results from the Supermemory API.
 *
 * @param containerTag - The container tag/user ID for scoping memories
 * @param queryText - Optional query text for semantic search
 * @param baseUrl - The API base URL
 * @param apiKey - The API key for authentication
 * @param signal - Optional AbortSignal to cancel the request early (e.g. a
 *   caller-side retrieval budget). It is composed with the package timeout, so
 *   it can shorten the request but never leaves it unbounded.
 * @returns The profile structure with static, dynamic, and search results
 */
export const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
	baseUrl: string,
	apiKey: string,
	signal?: AbortSignal,
): Promise<ProfileStructure> => {
	const payload = queryText
		? JSON.stringify({
				q: queryText,
				containerTag: containerTag,
				include: ["static", "dynamic"],
			})
		: JSON.stringify({
				containerTag: containerTag,
				include: ["static", "dynamic"],
			})

	try {
		const response = await fetch(`${baseUrl}/v4/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: payload,
			// The request carries the API key in an Authorization header, so a
			// redirect is refused rather than followed to an unverified host.
			redirect: "error",
			signal: withRequestTimeout(signal),
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
	signal?: AbortSignal
}

/**
 * Fetches memories from the API, deduplicates them, and formats them into
 * the final string to be injected into the system prompt.
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
		signal,
	} = options

	const memoriesResponse = await supermemoryProfileSearch(
		containerTag,
		queryText,
		baseUrl,
		apiKey,
		signal,
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

	const rawSearchResults = memoriesResponse.searchResults?.results ?? []
	const deduplicated = deduplicateMemoriesForMode(mode, {
		static: memoriesResponse.profile.static,
		dynamic: memoriesResponse.profile.dynamic,
		searchResults: rawSearchResults,
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
