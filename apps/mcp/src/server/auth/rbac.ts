import type { ContainerTagAccess, SessionInfo } from "../../shared/types"

export function effectiveContainerTagAccess(
	containerTags: string[],
	session: SessionInfo,
): ContainerTagAccess[] {
	const memberAccess = new Map(
		(session.containerTags ?? []).map((access) => [
			access.containerTag,
			access.permission,
		]),
	)
	const scopedTags = new Set(
		session.scope?.tags ?? (session.scope?.tag ? [session.scope.tag] : []),
	)

	return containerTags.map((containerTag) => {
		let permission: ContainerTagAccess["permission"] = "write"

		if (session.accessType === "restricted") {
			permission = memberAccess.get(containerTag) ?? "read"
		}

		if (
			session.scope?.type === "scoped" &&
			(session.scope.permission === "read" ||
				(scopedTags.size > 0 && !scopedTags.has(containerTag)))
		) {
			permission = "read"
		}

		return { containerTag, permission }
	})
}

// Tools that write (save/forget a memory, upload a file) must call this
// before performing the write. effectiveContainerTagAccess above is used
// elsewhere only to build picker/dropdown option lists for the widgets --
// nothing stops a client from calling a write tool directly with an
// arbitrary containerTag, bypassing whatever the UI would have offered.
export class ContainerTagAccessError extends Error {
	constructor(containerTag: string) {
		super(`You do not have write access to space "${containerTag}".`)
		this.name = "ContainerTagAccessError"
	}
}

export function assertWriteAccess(
	containerTag: string,
	session: SessionInfo,
): void {
	const [access] = effectiveContainerTagAccess([containerTag], session)
	if (access?.permission !== "write") {
		throw new ContainerTagAccessError(containerTag)
	}
}
