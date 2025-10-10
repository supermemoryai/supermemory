export interface ProfileStructure {
	profile: {
		static?: string[]
		dynamic?: string[]
	},
	searchResults: {
		results: [
			{
				memory: string,
			}
		]
	}
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
