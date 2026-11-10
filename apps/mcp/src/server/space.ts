import type { SessionInfo } from "../shared/types"
import { effectiveNamespaceAccess } from "./auth/rbac"
import { DEFAULT_NAMESPACE } from "./client"
import type { ActorContext } from "./types"

export function spaceStateName(
	actor: Pick<ActorContext, "organizationId" | "userId">,
): string {
	return `space:${JSON.stringify([actor.organizationId, actor.userId])}`
}

export async function resolveNamespace(
	explicit: string | undefined,
	getActiveNamespace: () => Promise<string | undefined>,
): Promise<string | undefined> {
	return explicit ?? (await getActiveNamespace())
}

// Mirrors the API's hard allowlist (scoped keys, restricted members), preferring a space writes can reach.
export function accessibleDefaultNamespace(session: SessionInfo): string {
	const keyTags =
		session.scope?.type === "scoped"
			? (session.scope.tags ?? (session.scope.tag ? [session.scope.tag] : null))
			: null
	const memberTags =
		session.accessType === "restricted" && session.namespaces
			? session.namespaces.map((access) => access.namespace)
			: null
	const allowed =
		keyTags && memberTags
			? keyTags.filter((tag) => memberTags.includes(tag))
			: (keyTags ?? memberTags)
	if (!allowed?.[0] || allowed.includes(DEFAULT_NAMESPACE)) {
		return DEFAULT_NAMESPACE
	}
	const writable =
		session.scope?.permission === "read"
			? undefined
			: allowed.find(
					(tag) =>
						session.namespaces?.find((access) => access.namespace === tag)
							?.permission !== "read",
				)
	return writable ?? allowed[0]
}

export const READ_ONLY_MESSAGE =
	"This connection is read-only, so nothing can be saved. The user can switch it to Read and write on the Agents page of the Supermemory console, or ask an admin for write access to a space."

export function emptySpacesMessage(session: SessionInfo): string {
	const [target] = listWritableNamespaces([], session)
	return target
		? `No spaces yet. New memories go to "${target}", which is created on the first save.`
		: `No spaces yet. ${READ_ONLY_MESSAGE}`
}

// The default space is created on first write, so offer it even before it exists.
export function listWritableNamespaces(
	listed: string[],
	session: SessionInfo,
): string[] {
	const fallback = accessibleDefaultNamespace(session)
	const candidates = listed.includes(fallback) ? listed : [...listed, fallback]
	return effectiveNamespaceAccess(candidates, session)
		.filter((access) => access.permission === "write")
		.map((access) => access.namespace)
}
