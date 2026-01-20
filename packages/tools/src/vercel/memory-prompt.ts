import { deduplicateMemories } from "../shared"
import type { Logger } from "./logger"
import {
	type LanguageModelCallOptions,
	convertProfileToMarkdown,
	type ProfileStructure,
} from "./util"

/**
 * Data provided to the prompt template function for customizing memory injection.
 */
export interface MemoryPromptData {
	/**
	 * Pre-formatted markdown combining static and dynamic profile memories.
	 * Contains core user facts (name, preferences, goals) and recent context (projects, interests).
	 */
	userMemories: string
	/**
	 * Pre-formatted search results text for the current query.
	 * Contains memories retrieved based on semantic similarity to the conversation.
	 * Empty string if mode is "profile" only.
	 */
	generalSearchMemories: string
}

/**
 * Function type for customizing the memory prompt injection.
 * Return the full string to be injected into the system prompt.
 *
 * @example
 * ```typescript
 * const promptTemplate: PromptTemplate = (data) => `
 * <user_memories>
 * Here is some information about your past conversations:
 * ${data.userMemories}
 * ${data.generalSearchMemories}
 * </user_memories>
 * `.trim()
 * ```
 */
export type PromptTemplate = (data: MemoryPromptData) => string

/**
 * Default prompt template that replicates the original behavior.
 */
export const defaultPromptTemplate: PromptTemplate = (data) =>
	`User Supermemories: \n${data.userMemories}\n${data.generalSearchMemories}`.trim()

export const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	if (!url) return defaultUrl
	return url.endsWith("/") ? url.slice(0, -1) : url
}

const supermemoryProfileSearch = async (
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
	mode: "profile" | "query" | "full"
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
 * Injects memories string into params by appending to existing system prompt
 * or creating a new one. Pure function - does not mutate the original params.
 *
 * @param params - The language model call options
 * @param memories - The formatted memories string to inject
 * @param logger - Logger for debug output
 * @returns New params with memories injected into the system prompt
 */
export const injectMemoriesIntoParams = (
	params: LanguageModelCallOptions,
	memories: string,
	logger: Logger,
): LanguageModelCallOptions => {
	const systemPromptExists = params.prompt.some(
		(prompt) => prompt.role === "system",
	)

	if (systemPromptExists) {
		logger.debug("Added memories to existing system prompt")
		// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3 prompt types
		const newPrompt = params.prompt.map((prompt: any) =>
			prompt.role === "system"
				? { ...prompt, content: `${prompt.content} \n ${memories}` }
				: prompt,
		)
		return { ...params, prompt: newPrompt } as LanguageModelCallOptions
	}

	logger.debug(
		"System prompt does not exist, created system prompt with memories",
	)
	const newPrompt = [
		{ role: "system" as const, content: memories },
		...params.prompt,
		// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3 prompt types
	] as any
	return { ...params, prompt: newPrompt } as LanguageModelCallOptions
}

/**
 * Extracts the query text from params based on mode.
 * For "profile" mode, returns empty string (no query needed).
 * For "query" or "full" mode, extracts the last user message text.
 *
 * @param params - The language model call options
 * @param mode - The memory retrieval mode
 * @returns The query text for memory search
 */
export const extractQueryText = (
	params: LanguageModelCallOptions,
	mode: "profile" | "query" | "full",
): string => {
	if (mode === "profile") {
		return ""
	}

	const userMessage = params.prompt
		.slice()
		.reverse()
		.find((prompt: { role: string }) => prompt.role === "user")

	const content = userMessage?.content
	if (!content) return ""

	if (typeof content === "string") {
		return content
	}

	// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility between V2 and V3
	return (content as any[])
		.filter((part) => part.type === "text")
		.map((part) => part.text || "")
		.join(" ")
}

/**
 * Adds memories to the system prompt by fetching from API and injecting.
 * This is the original combined function, now implemented via helpers.
 *
 * @deprecated Prefer using buildMemoriesText + injectMemoriesIntoParams for caching support
 */
export const addSystemPrompt = async (
	params: LanguageModelCallOptions,
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
	baseUrl: string,
	apiKey: string,
	promptTemplate: PromptTemplate = defaultPromptTemplate,
): Promise<LanguageModelCallOptions> => {
	const queryText = extractQueryText(params, mode)

	const memories = await buildMemoriesText({
		containerTag,
		queryText,
		mode,
		baseUrl,
		apiKey,
		logger,
		promptTemplate,
	})

	return injectMemoriesIntoParams(params, memories, logger)
}
