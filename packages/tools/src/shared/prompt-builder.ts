import type {
	MemoryPromptData,
	PromptTemplate,
	ProfileMarkdownData,
} from "./types"

/**
 * Default prompt template that formats memories in the original "User Supermemories" format.
 */
export const defaultPromptTemplate: PromptTemplate = (data) =>
	`User Supermemories: \n${data.userMemories}\n${data.generalSearchMemories}`.trim()

/**
 * Convert profile data to markdown format with sections for static and dynamic memories.
 *
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

/**
 * Formats memories into the final prompt string using the provided template.
 *
 * @param data - The memory prompt data containing userMemories and generalSearchMemories
 * @param template - Optional custom template function (defaults to defaultPromptTemplate)
 * @returns The formatted memories string ready for prompt injection
 */
export function formatMemoriesForPrompt(
	data: MemoryPromptData,
	template: PromptTemplate = defaultPromptTemplate,
): string {
	return template(data)
}

export type { MemoryPromptData, PromptTemplate }
