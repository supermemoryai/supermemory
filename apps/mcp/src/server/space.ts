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

function scopedKeyTags(session: SessionInfo): string[] | null {
	return session.scope?.type === "scoped"
		? (session.scope.tags ?? (session.scope.tag ? [session.scope.tag] : null))
		: null
}

// Mirrors the API's hard allowlist (scoped keys, restricted members), preferring a space writes can reach.
export function accessibleDefaultNamespace(session: SessionInfo): string {
	const keyTags = scopedKeyTags(session)
	const memberTags =
		session.accessType === "restricted" && session.namespaces
			? session.namespaces.map((access) => access.namespace)
			: null
	const allowed =
		keyTags && memberTags
			? keyTags.filter((tag) => memberTags.includes(tag))
			: (keyTags ?? memberTags)
	if (!allowed?.[0]) return DEFAULT_NAMESPACE
	const canWrite = (tag: string) =>
		session.scope?.permission !== "read" &&
		session.namespaces?.find((access) => access.namespace === tag)
			?.permission !== "read"
	const writable = allowed.find(canWrite)
	if (
		allowed.includes(DEFAULT_NAMESPACE) &&
		(!writable || canWrite(DEFAULT_NAMESPACE))
	) {
		return DEFAULT_NAMESPACE
	}
	return writable ?? allowed[0]
}

// Mirrors the API write guard: a new tag is writable only without a read-only grant or a hard allowlist.
export function canCreateNamespace(session: SessionInfo): boolean {
	return (
		session.scope?.permission !== "read" &&
		session.accessType !== "restricted" &&
		!scopedKeyTags(session)
	)
}

// Creators see only existing spaces (no stale active or default fallback), so with none the widget asks them to name one.
export function spaceWriteTargets(
	listed: string[],
	activeNamespace: string | undefined,
	session: SessionInfo,
) {
	const canCreate = canCreateNamespace(session)
	const writableNamespaces = canCreate
		? [...new Set(listed)]
		: listWritableNamespaces(
				[...listed, ...(activeNamespace ? [activeNamespace] : [])],
				session,
			)
	return {
		writableNamespaces,
		canCreateNamespace: canCreate,
		writeBlockedReason:
			canCreate || writableNamespaces.length > 0
				? undefined
				: writeBlockedReason(session),
	}
}

export function writeBlockedReason(session: SessionInfo): string {
	return session.scope?.permission === "read"
		? "This connection is read-only. To add memories, switch it to Read and write on the Agents page of the Supermemory console, or reconnect with a key that has write access."
		: "This account has no write access to any space. Ask an admin of this Supermemory organization to grant write access to a space."
}

export function emptySpacesMessage(session: SessionInfo): string {
	const [target] = listWritableNamespaces([], session)
	return target
		? `No spaces yet. New memories go to "${target}", which is created on the first save.`
		: `No spaces yet. ${writeBlockedReason(session)}`
}

// The default space is created on first write, so offer it even before it exists.
export function listWritableNamespaces(
	listed: string[],
	session: SessionInfo,
): string[] {
	const candidates = [
		...new Set([...listed, accessibleDefaultNamespace(session)]),
	]
	return effectiveNamespaceAccess(candidates, session)
		.filter((access) => access.permission === "write")
		.map((access) => access.namespace)
}
