import type { LanguageModelV2CallOptions, LanguageModelV2Message } from "@ai-sdk/provider"

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

export const getLastUserMessage = (params: LanguageModelV2CallOptions) => {
	const lastUserMessage = params.prompt
		.slice()
		.reverse()
		.find((prompt: LanguageModelV2Message) => prompt.role === "user")
	const memories = lastUserMessage?.content
		.filter((content) => content.type === "text")
		.map((content) => content.text)
		.join(" ")
	return memories
}


export const filterOutSupermemories = (content: string) => {
	return content.split("User Supermemories: ")[0]
}

