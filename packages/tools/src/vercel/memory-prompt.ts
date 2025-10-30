import type { LanguageModelV2CallOptions } from "@ai-sdk/provider"
import type { Logger } from "./logger"
import { convertProfileToMarkdown, type ProfileStructure } from "./util"

const supermemoryProfileSearch = async (
	containerTag: string,
	queryText: string,
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
		const response = await fetch("https://api.supermemory.ai/v4/profile", {
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
	params: LanguageModelV2CallOptions,
	containerTag: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
) => {
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

	const profileData =
		mode !== "query" ? convertProfileToMarkdown(memoriesResponse) : ""
	const searchResultsMemories =
		mode !== "profile"
			? `Search results for user's recent message: \n${memoriesResponse.searchResults.results
					.map((result) => `- ${result.memory}`)
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
		return {
			...params,
			prompt: params.prompt.map((prompt) =>
				prompt.role === "system"
					? { ...prompt, content: `${prompt.content} \n ${memories}` }
					: prompt,
			),
		}
	}

	logger.debug(
		"System prompt does not exist, created system prompt with memories",
	)
	return {
		...params,
		prompt: [{ role: "system" as const, content: memories }, ...params.prompt],
	}
}
