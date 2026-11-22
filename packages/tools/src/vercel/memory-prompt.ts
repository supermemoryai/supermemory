// Re-export shared types and functions
export {
	type MemoryPromptData,
	type PromptTemplate,
	defaultPromptTemplate,
	normalizeBaseUrl,
	buildMemoriesText,
	type BuildMemoriesTextOptions,
} from "../shared"

import {
	type Logger,
	type MemoryPromptData,
	replaceMemoryContext,
	stripMemoryContext,
	wrapMemoryContext,
} from "../shared"
import type { LanguageModelCallOptions } from "./util"

/**
 * Extracts the query text from params based on mode.
 * For "profile" mode, returns empty string (no query needed).
 * For "query" or "full" mode, extracts the last user message text, without any
 * Supermemory block an earlier call appended to it.
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
		return stripMemoryContext(content)
	}

	// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4
	return (content as any[])
		.filter((part) => part.type === "text")
		.map((part) => stripMemoryContext(part.text || ""))
		.filter(Boolean)
		.join(" ")
}

/**
 * Injects the profile memories string into the system prompt, replacing any Supermemory
 * block from an earlier call, or creates a system prompt when none exists.
 * Pure function - does not mutate the original params.
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
		logger.debug("Replaced Supermemory context in existing system prompt")
		let injected = false
		// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4 prompt types
		const newPrompt = params.prompt.map((prompt: any) => {
			if (prompt.role !== "system") return prompt
			const content = String(prompt.content ?? "")
			if (!injected) {
				injected = true
				return { ...prompt, content: replaceMemoryContext(content, memories) }
			}
			return { ...prompt, content: stripMemoryContext(content) }
		})
		return { ...params, prompt: newPrompt } as LanguageModelCallOptions
	}

	logger.debug(
		"System prompt does not exist, created system prompt with memories",
	)
	const memoryContext = wrapMemoryContext(memories)
	if (!memoryContext) return params
	const newPrompt = [
		{ role: "system" as const, content: memoryContext },
		...params.prompt,
		// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4 prompt types
	] as any
	return { ...params, prompt: newPrompt } as LanguageModelCallOptions
}

export const turnKey = (index: number, query: string): string =>
	JSON.stringify([index, query])

export const injectTurnMemoriesIntoParams = (
	params: LanguageModelCallOptions,
	memoryForTurn: (key: string) => string,
): LanguageModelCallOptions => {
	let turn = 0
	const prompt = params.prompt.map((message) => {
		if (message.role !== "user") return message
		const query = extractQueryText({ ...params, prompt: [message] }, "query")
		const memory = memoryForTurn(turnKey(turn++, query))
		const context = wrapMemoryContext(memory)
		const content: unknown = message.content
		if (typeof content === "string") {
			return { ...message, content: replaceMemoryContext(content, memory) }
		}
		return {
			...message,
			content: [
				...message.content
					.map((part) =>
						part.type === "text"
							? { ...part, text: stripMemoryContext(part.text) }
							: part,
					)
					.filter((part) => part.type !== "text" || part.text),
				...(context ? [{ type: "text" as const, text: context }] : []),
			],
		}
	})
	return { ...params, prompt } as LanguageModelCallOptions
}

/**
 * Adds memories to the system prompt by fetching from API and injecting.
 * This is the original combined function, now implemented via helpers.
 *
 * @deprecated Prefer using buildMemoriesText + injectMemoriesIntoParams for caching support
 */
export const addSystemPrompt = async (
	params: LanguageModelCallOptions,
	namespace: string,
	logger: Logger,
	mode: "profile" | "query" | "full",
	baseUrl: string,
	apiKey: string,
	promptTemplate?: (data: MemoryPromptData) => string,
): Promise<LanguageModelCallOptions> => {
	const { buildMemoriesText } = await import("../shared")

	const queryText = extractQueryText(params, mode)

	const memories = await buildMemoriesText({
		namespace,
		queryText,
		mode,
		baseUrl,
		apiKey,
		source: "tools-ai-sdk",
		logger,
		promptTemplate,
	})

	return injectMemoriesIntoParams(params, memories, logger)
}
