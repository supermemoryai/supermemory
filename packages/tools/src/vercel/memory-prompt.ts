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

export const addSystemPrompt = async (
	params: LanguageModelCallOptions,
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
	baseUrl: string,
	apiKey: string,
	promptTemplate: PromptTemplate = defaultPromptTemplate,
): Promise<LanguageModelCallOptions> => {
	const systemPromptExists = params.prompt.some(
		(prompt) => prompt.role === "system",
	)

	const queryText =
		mode !== "profile"
			? params.prompt
					.slice()
					.reverse()
					.find((prompt: { role: string }) => prompt.role === "user")
					?.content?.filter(
						(content: { type: string }) => content.type === "text",
					)
					?.map((content: { type: string; text: string }) =>
						content.type === "text" ? content.text : "",
					)
					?.join(" ") || ""
			: ""

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
