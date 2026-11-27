// Re-export shared types and functions
export {
	type MemoryPromptData,
	type PromptTemplate,
	defaultPromptTemplate,
	normalizeBaseUrl,
	buildMemoriesText,
	type BuildMemoriesTextOptions,
} from "../shared"

import { stripMemoryContext } from "../shared"
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
