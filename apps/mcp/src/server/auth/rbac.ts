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
