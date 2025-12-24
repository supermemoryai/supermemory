import { deduplicateMemories } from "../shared"
import type { Logger } from "./logger"
import {
	type LanguageModelCallOptions,
	convertProfileToMarkdown,
	type ProfileStructure,
} from "./util"

export const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	if (!url) return defaultUrl
	return url.endsWith("/") ? url.slice(0, -1) : url
}

const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
	baseUrl: string,
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
				Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
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
	baseUrl = "https://api.supermemory.ai",
): Promise<LanguageModelCallOptions> => {
	const systemPromptExists = params.prompt.some(
		(prompt) => prompt.role === "system",
	)

	const queryText =
		mode !== "profile"
			? params.prompt
					.slice()
					.reverse()
					.find((prompt) => prompt.role === "user")
					?.content?.filter((content) => content.type === "text")
					?.map((content) => (content.type === "text" ? content.text : ""))
					?.join(" ") || ""
			: ""

	const memoriesResponse = await supermemoryProfileSearch(
		containerTag,
		queryText,
		baseUrl,
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
			original: memoriesResponse.searchResults.results.length,
			deduplicated: deduplicated.searchResults?.length,
		},
	})

	const profileData =
		mode !== "query"
			? convertProfileToMarkdown({
					profile: {
						static: deduplicated.static,
						dynamic: deduplicated.dynamic,
					},
					searchResults: { results: [] },
				})
			: ""
	const searchResultsMemories =
		mode !== "profile"
			? `Search results for user's recent message: \n${deduplicated.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""

	const memories =
		`User Supermemories: \n${profileData}\n${searchResultsMemories}`.trim()
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
