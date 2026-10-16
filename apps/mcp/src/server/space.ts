import type { SessionInfo } from "../shared/types"
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
