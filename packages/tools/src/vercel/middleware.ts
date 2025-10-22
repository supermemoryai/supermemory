import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Middleware,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import Supermemory from "supermemory"
import { createLogger, type Logger } from "./logger"
import { convertProfileToMarkdown, type ProfileStructure } from "./util"

const getLastUserMessage = (params: LanguageModelV2CallOptions) => {
	const lastUserMessage = params.prompt
		.slice().reverse()
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
					.slice().reverse()
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

const getConversationContent = (params: LanguageModelV2CallOptions) => {
	return params.prompt
		.map((msg) => {
			const role = msg.role === "user" ? "User" : "Assistant"

			if (typeof msg.content === "string") {
				return `${role}: ${msg.content}`
			}

			const content = msg.content
				.filter((c) => c.type === "text")
				.map((c) => (c.type === "text" ? c.text : ""))
				.join(" ")
			return `${role}: ${content}`
		})
		.join("\n\n")
}


const addMemoryTool = async (
	client: Supermemory,
	containerTag: string,
	content: string,
	customId: string | undefined,
	logger: Logger,
): Promise<void> => {
	try {
		const response = await client.memories.add({
			content,
			containerTags: [containerTag],
			customId,
		})

		logger.info("Memory saved successfully", {
			containerTag,
			customId,
			contentLength: content.length,
			memoryId: response.id,
		})
	} catch (error) {
		logger.error("Error saving memory", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}

export const createSupermemoryMiddleware = (
	containerTag: string,
	conversationId?: string,
	verbose = false,
	mode: "profile" | "query" | "full" = "profile",
	addMemory: "always" | "never" = "never"
): LanguageModelV2Middleware => {
	const logger = createLogger(verbose)

	const client = new Supermemory({
		apiKey: process.env.SUPERMEMORY_API_KEY,
	})

	return {
		transformParams: async ({ params }) => {
			const userMessage = getLastUserMessage(params)

			if (addMemory === "always" && userMessage && userMessage.trim()) {
				const content = conversationId
					? getConversationContent(params)
					: userMessage
				const customId = conversationId
					? `conversation:${conversationId}`
					: undefined

				addMemoryTool(client, containerTag, content, customId, logger)
			}

			if (mode !== "profile") {
				if (!userMessage) {
					logger.debug("No user message found, skipping memory search")
					return params
				}
			}

			logger.info("Starting memory search", {
				containerTag,
				conversationId,
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
