import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
	LanguageModelV2StreamPart,
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3Message,
	LanguageModelV3StreamPart,
} from "@ai-sdk/provider"

// Re-export shared types for backward compatibility
export type {
	ProfileStructure,
	ProfileMarkdownData,
} from "../shared"

// Union types for dual SDK version support (V2 = SDK 5, V3 = SDK 6)
export type LanguageModel = LanguageModelV2 | LanguageModelV3
export type LanguageModelCallOptions =
	| LanguageModelV2CallOptions
	| LanguageModelV3CallOptions
export type LanguageModelMessage =
	| LanguageModelV2Message
	| LanguageModelV3Message
export type LanguageModelStreamPart =
	| LanguageModelV2StreamPart
	| LanguageModelV3StreamPart

export type OutputContentItem =
	| { type: "text"; text: string }
	| { type: "reasoning"; text: string }
	| {
			type: "tool-call"
			id: string
			function: { name: string; arguments: string }
	  }
	| { type: "file"; name: string; mediaType: string; data: string }
	| {
			type: "source"
			sourceType: string
			id: string
			url: string
			title: string
	  }

// Re-export convertProfileToMarkdown from shared for backward compatibility
export { convertProfileToMarkdown } from "../shared"

export const getLastUserMessage = (
	params: LanguageModelCallOptions,
): string | undefined => {
	const lastUserMessage = params.prompt
		.slice()
		.reverse()
		.find((prompt: LanguageModelMessage) => prompt.role === "user")

	if (!lastUserMessage) {
		return undefined
	}

	const content = lastUserMessage.content

	// Handle string content directly
	if (typeof content === "string") {
		return content
	}

	// Handle array content - extract text parts
	return content
		.filter((part) => part.type === "text")
		.map((part) => (part as { type: "text"; text: string }).text)
		.join(" ")
}

export const filterOutSupermemories = (content: string) => {
	return content.split("User Supermemories: ")[0]
}
