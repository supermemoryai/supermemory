import type { ToolDeps } from "./types"

export type ContainerTagValidation = "exists" | "missing" | "unavailable"

/**
 * Checks whether a container tag actually exists for this user.
 * Fast path is the cached tag list from init; on a miss we re-fetch once so
 * tags created after the session started are not falsely rejected.
 */
export async function validateContainerTag(
	deps: ToolDeps,
	containerTag: string,
): Promise<ContainerTagValidation> {
	if (deps.cachedContainerTags().includes(containerTag)) return "exists"
	const refreshed = await deps.refreshContainerTags()
	if (!refreshed) return "unavailable"
	return deps.cachedContainerTags().includes(containerTag) ? "exists" : "missing"
}

export function unknownContainerTagError(containerTag: string): Error {
	return new Error(
		`Container tag '${containerTag}' does not exist. Use listSpaces to see the available container tags.`,
	)
}

export function containerTagValidationUnavailableError(): Error {
	return new Error("Could not verify workspace. Please try again.")
}
