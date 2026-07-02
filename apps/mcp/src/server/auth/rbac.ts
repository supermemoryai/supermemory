import type { ContainerTagAccess, Props } from "../../shared/types"

export interface RbacContext {
	isRestricted: boolean
	assignedTags: ContainerTagAccess[]
	writeTags: ContainerTagAccess[]
	hasWriteAccess: boolean
	hasRootContainerTag: boolean
	// Defense-in-depth: short-circuit before hitting the API so we surface a
	// clear permission-denied to the model instead of a downstream 403.
	// API still enforces authoritatively via containerTagGuard.
	canRead: (containerTag: string) => boolean
	canWrite: (containerTag: string) => boolean
}

export function buildRbacContext(props: Props | undefined): RbacContext {
	const isRestricted = props?.accessType === "restricted"
	const assignedTags: ContainerTagAccess[] = props?.assignedTags ?? []
	const writeTags = assignedTags.filter((t) => t.permission === "write")
	const hasWriteAccess = !isRestricted || writeTags.length > 0
	const hasRootContainerTag = !!props?.containerTag

	const canRead = (containerTag: string): boolean => {
		if (!isRestricted) return true
		return assignedTags.some((t) => t.containerTag === containerTag)
	}

	const canWrite = (containerTag: string): boolean => {
		if (!isRestricted) return true
		return writeTags.some((t) => t.containerTag === containerTag)
	}

	return {
		isRestricted,
		assignedTags,
		writeTags,
		hasWriteAccess,
		hasRootContainerTag,
		canRead,
		canWrite,
	}
}
