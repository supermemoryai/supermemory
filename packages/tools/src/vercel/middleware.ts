import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Middleware,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import { createLogger, type Logger } from "./logger"
import { convertProfileToMarkdown, type ProfileStructure } from "./util"

const getLastUserMessage = (params: LanguageModelV2CallOptions) => {
	const lastUserMessage = params.prompt
		.reverse()
		.find((prompt: LanguageModelV2Message) => prompt.role === "user")
	const memories = lastUserMessage?.content
		.filter((content) => content.type === "text")
		.map((content) => content.text)
		.join(" ")
	return memories
}

const supermemoryprofilesearch = async (
	containerTag: string,
	queryText: string,
): Promise<ProfileStructure> => {
	const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY

	if (!SUPERMEMORY_API_KEY) {
		throw new Error("SUPERMEMORY_API_KEY is not set")
	}

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
				Authorization: `Bearer ${SUPERMEMORY_API_KEY}`,
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

const addSystemPrompt = async (
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
					.reverse()
					.find((prompt) => prompt.role === "user")
					?.content?.filter((content) => content.type === "text")
					?.map((content) => (content.type === "text" ? content.text : ""))
					?.join(" ") || ""
			: ""

	const memoriesResponse = await supermemoryprofilesearch(
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

	const memories = `${profileData}\n${searchResultsMemories}`.trim()
	if (memories) {
		logger.debug("Memory content preview", {
			content: memories.substring(0, 200),
			fullLength: memories.length,
		})
	}

	if (systemPromptExists) {
		logger.debug("Appending memories to existing system prompt")
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
		"System prompt does not exist, creating system prompt with memories",
	)
	return {
		...params,
		prompt: [{ role: "system" as const, content: memories }, ...params.prompt],
	}
}

export const createSupermemoryMiddleware = (
	containerTag: string,
	verbose = false,
	mode: "profile" | "query" | "full" = "profile",
): LanguageModelV2Middleware => {
	const logger = createLogger(verbose)

	return {
		transformParams: async ({ params }) => {
			if (mode !== "profile") {
				const lastUserMessage = getLastUserMessage(params)
				if (!lastUserMessage) {
					logger.debug("No user message found, skipping memory search")
					return params
				}
			}

			logger.info("Starting memory search", {
				containerTag,
				mode,
			})

			const transformedParams = await addSystemPrompt(
				params,
				containerTag,
				logger,
				mode,
			)
			return transformedParams
		},
	}
}
