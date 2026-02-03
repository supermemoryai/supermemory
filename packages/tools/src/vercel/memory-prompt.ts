// Re-export shared types and functions
export {
	type MemoryPromptData,
	type PromptTemplate,
	defaultPromptTemplate,
	normalizeBaseUrl,
	buildMemoriesText,
	type BuildMemoriesTextOptions,
} from "../shared"

import type { Logger } from "../shared"
import type { LanguageModelCallOptions } from "./util"

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
	promptTemplate?: (data: {
		userMemories: string
		generalSearchMemories: string
	}) => string,
): Promise<LanguageModelCallOptions> => {
	const { buildMemoriesText } = await import("../shared")

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
