/**
 * Supermemory configuration
 * Only one of `projectId` or `containerTags` can be provided.
 */
export interface SupermemoryToolsConfig {
	/**
	 * Custom base URL for the supermemory API
	 */
	baseUrl?: string
	/**
	 * Array of custom container tags (mutually exclusive with projectId)
	 */
	containerTags?: string[]
	/**
	 * Project ID which gets converted to container tag format (mutually exclusive with containerTags)
	 */
	projectId?: string
	/**
	 * Enable strict schema mode for OpenAI strict validation.
	 * When true, all schema properties are required (satisfies OpenAI strict mode).
	 * When false (default), optional fields remain optional for maximum compatibility.
	 */
	strict?: boolean
}
