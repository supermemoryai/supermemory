/**
 * Shared constants and descriptions for Supermemory tools
 */

// Tool descriptions
export const TOOL_DESCRIPTIONS = {
	searchMemories:
		"Search (recall) memories/details/information about the user or other facts or entities. Run when explicitly asked or when context about user's past choices would be helpful.",
	addMemory:
		"Add (remember) memories/details/information about the user or other facts or entities. Run when explicitly asked or when the user mentions any information generalizable beyond the context of the current conversation.",
} as const

// Parameter descriptions
export const PARAMETER_DESCRIPTIONS = {
	informationToGet: "Terms to search for in the user's memories",
	includeFullDocs:
		"Whether to include the full document content in the response. Defaults to true for better AI context.",
	limit: "Maximum number of results to return",
	memory:
		"The text content of the memory to add. This should be a single sentence or a short paragraph.",
} as const

// Default values
export const DEFAULT_VALUES = {
	includeFullDocs: true,
	limit: 10,
	chunkThreshold: 0.6,
} as const

// Container tag constants
export const CONTAINER_TAG_CONSTANTS = {
	projectPrefix: "sm_project_",
	defaultTags: ["sm_project_default"] as string[],
} as const

/**
 * Helper function to generate container tags based on config
 */
export function getContainerTags(config?: {
	projectId?: string
	containerTags?: string[]
}): string[] {
	if (config?.projectId) {
		return [`${CONTAINER_TAG_CONSTANTS.projectPrefix}${config.projectId}`]
	}
	return config?.containerTags ?? CONTAINER_TAG_CONSTANTS.defaultTags
}
