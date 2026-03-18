import { deduplicateMemories } from "../tools-shared"
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
	} = options

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
		mode !== "profile"
			? `Search results for user's recent message: \n${deduplicated.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""

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

export const joinTextParts = (
	parts: Array<{ type: string; text?: string }>,
): string =>
	parts
		.filter((p) => p.type === "text")
		.map((p) => p.text ?? "")
		.join(" ")

export const findLastUserMessage = <T extends { role: string }>(
	messages: T[],
): T | undefined => {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === "user") return messages[i]
	}
	return undefined
}

export const extractTextFromMessageContent = (
	content: unknown,
): string | undefined => {
	if (typeof content === "string") {
		return content
	}

	if (Array.isArray(content)) {
		return joinTextParts(content as Array<{ type: string; text?: string }>)
	}

	const objContent = content as {
		content?: string
		parts?: Array<{ type: string; text?: string }>
	} | null
	if (typeof objContent === "object" && objContent !== null) {
		if (typeof objContent.content === "string") {
			return objContent.content
		}
		if (Array.isArray(objContent.parts)) {
			return joinTextParts(objContent.parts)
		}
	}

	return undefined
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

	const userMessage = findLastUserMessage(messages)
	if (!userMessage) return ""
	return extractTextFromMessageContent(userMessage.content) ?? ""
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
	const userMessage = findLastUserMessage(messages)
	if (!userMessage) return undefined
	return extractTextFromMessageContent(userMessage.content)
}
