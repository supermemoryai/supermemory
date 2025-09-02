/**
 * Supermemory configuration
 * Only one of `projectId` or `containerTags` can be provided.
 */
export interface SupermemoryToolsConfig {
	baseUrl?: string
	containerTags?: string[]
	projectId?: string
}
