import type { ToolDeps } from "./types"

/**
 * Checks whether a container tag actually exists for this user.
 * Fast path is the cached tag list from init; on a miss we re-fetch once so
 * tags created after the session started are not falsely rejected.
 */
export async function containerTagExists(
	deps: ToolDeps,
	containerTag: string,
): Promise<boolean> {
	if (deps.cachedContainerTags().includes(containerTag)) return true
	await deps.refreshContainerTags()
	return deps.cachedContainerTags().includes(containerTag)
}

export function unknownContainerTagError(containerTag: string): Error {
	return new Error(
		`Container tag '${containerTag}' does not exist. Use listSpaces to see the available container tags.`,
	)
}
