import type { LanguageModelV2CallOptions, LanguageModelV2Message } from "@ai-sdk/provider"

export interface ProfileStructure {
	profile: {
		static?: string[]
		dynamic?: string[]
	}
	searchResults: {
		results: [
			{
				memory: string
			},
		]
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
 * Convert ProfileStructure to markdown
 * based on profile.static and profile.dynamic properties
 * @param data ProfileStructure
 * @returns Markdown string
 */
export function convertProfileToMarkdown(data: ProfileStructure): string {
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

