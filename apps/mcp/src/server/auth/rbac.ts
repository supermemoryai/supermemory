import type { NamespaceAccess, SessionInfo } from "../../shared/types"

export function effectiveNamespaceAccess(
	namespaces: string[],
	session: SessionInfo,
): NamespaceAccess[] {
	const memberAccess = new Map(
		(session.namespaces ?? []).map((access) => [
			access.namespace,
			access.permission,
		]),
	)
	const scopedNamespaces = new Set(
		session.scope?.tags ?? (session.scope?.tag ? [session.scope.tag] : []),
	)

	return namespaces.map((namespace) => {
		let permission: NamespaceAccess["permission"] = "write"

		if (session.accessType === "restricted") {
			permission = memberAccess.get(namespace) ?? "read"
		}

		if (session.scope?.permission === "read") {
			permission = "read"
		} else if (
			session.scope?.type === "scoped" &&
			scopedNamespaces.size > 0 &&
			!scopedNamespaces.has(namespace)
		) {
			permission = "read"
		}

		return { namespace, permission }
	})
}
