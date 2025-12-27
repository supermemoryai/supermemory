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

export interface ProfileStructure {
	profile: {
		static?: Array<{ memory: string; metadata?: Record<string, unknown> }>
		dynamic?: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}
	searchResults: {
		results: Array<{ memory: string; metadata?: Record<string, unknown> }>
	}
}

export interface ProfileMarkdownData {
	profile: {
		static?: string[]
		dynamic?: string[]
	}
	searchResults: {
		results: Array<{ memory: string }>
	}
}

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

/**
 * Convert profile data to markdown format
 * @param data Profile data with string arrays for static and dynamic memories
 * @returns Markdown string with profile sections
 */
export function convertProfileToMarkdown(data: ProfileMarkdownData): string {
	const sections: string[] = []

	if (data.profile.static && data.profile.static.length > 0) {
		sections.push("## Static Profile")
		sections.push(data.profile.static.map((item) => `- ${item}`).join("\n"))
	}

	if (data.profile.dynamic && data.profile.dynamic.length > 0) {
		sections.push("## Dynamic Profile")
		sections.push(data.profile.dynamic.map((item) => `- ${item}`).join("\n"))
	}

	return sections.join("\n\n")
}

export const getLastUserMessage = (params: LanguageModelCallOptions) => {
	const lastUserMessage = params.prompt
		.slice()
		.reverse()
		.find((prompt: LanguageModelMessage) => prompt.role === "user")
	const memories = lastUserMessage?.content
		.filter((content) => content.type === "text")
		.map((content) => (content as { type: "text"; text: string }).text)
		.join(" ")
	return memories
}

export const filterOutSupermemories = (content: string) => {
	return content.split("User Supermemories: ")[0]
}
