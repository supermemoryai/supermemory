import { fetchSession } from "./auth"
import { DEFAULT_NAMESPACE } from "./client"
import {
	accessibleDefaultNamespace,
	allowedNamespaces,
	usableActiveNamespace,
} from "./space"

const CACHE_TTL_MS = 60_000
const CACHE_MAX_ENTRIES = 1000

interface ConnectionAccess {
	defaultNamespace: string
	allowed: string[] | null
}

const accessCache = new Map<string, ConnectionAccess & { expiresAt: number }>()

// Stateless HTTP builds a server per request, so cache per isolate to keep the session lookup off most calls.
async function connectionAccessFor(
	bearerToken: string,
	apiUrl: string,
): Promise<ConnectionAccess | undefined> {
	const cached = accessCache.get(bearerToken)
	if (cached && cached.expiresAt > Date.now()) return cached

	const access = await fetchSession(bearerToken, apiUrl)
		.then((session) => ({
			defaultNamespace: accessibleDefaultNamespace(session),
			allowed: allowedNamespaces(session),
		}))
		.catch(() => undefined)
	if (!access) return undefined

	if (accessCache.size >= CACHE_MAX_ENTRIES) accessCache.clear()
	accessCache.set(bearerToken, {
		...access,
		expiresAt: Date.now() + CACHE_TTL_MS,
	})
	return access
}

export async function defaultNamespaceFor(
	bearerToken: string,
	apiUrl: string,
): Promise<string> {
	const access = await connectionAccessFor(bearerToken, apiUrl)
	return access?.defaultNamespace ?? DEFAULT_NAMESPACE
}

// The active space is stored once per user, so a scoped or restricted connection must ignore one it can't use.
// If the session lookup fails, keep the stored space as before.
export async function activeNamespaceFor(
	active: string | undefined,
	bearerToken: string,
	apiUrl: string,
): Promise<string | undefined> {
	if (!active) return undefined
	const access = await connectionAccessFor(bearerToken, apiUrl)
	return access ? usableActiveNamespace(active, access.allowed) : active
}
