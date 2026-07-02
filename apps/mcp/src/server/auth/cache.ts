import type { AuthUser, ContainerTagAccess } from "."

// ── Key format ────────────────────────────────────────────────────────
//   <service>:<kind>:v<version>:<sha256-hex>
//
//   Why each segment exists:
//   - service: namespaces our keys; safe even if AUTH_CACHE is shared with
//     other workers later
//   - kind:    discriminates this cache from future kinds (e.g.,
//     `supermemory-mcp:container-tags:v1:<orgId>`)
//   - version: schema version on the value; bump to invalidate every entry
//     instantly without flushing the namespace
//   - hash:    SHA-256 hex of the bearer; deterministic, never reveals
//     the raw token

const SERVICE = "supermemory-mcp"
const KIND = "auth"
const CACHE_VERSION = 1 as const
const TTL_SECONDS = 300 // 5 min — matches Better Auth's session cookie cache

interface CachedAuth {
	v: typeof CACHE_VERSION
	user: AuthUser
	cachedAt: number // ms epoch — for observability only; KV owns TTL
}

function cacheKey(hash: string): string {
	return `${SERVICE}:${KIND}:v${CACHE_VERSION}:${hash}`
}

export async function tokenHash(token: string): Promise<string> {
	const buf = new TextEncoder().encode(token)
	const hash = await crypto.subtle.digest("SHA-256", buf)
	return [...new Uint8Array(hash)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

// ── Validators ────────────────────────────────────────────────────────
// Defensive: KV is a black box. Validate every read so a malformed entry
// (schema drift across deploys, a manual KV write, anything) becomes a
// cache miss instead of a runtime crash or corrupted props downstream.

function isValidAuthUser(u: unknown): u is AuthUser {
	if (typeof u !== "object" || u === null) return false
	const o = u as Record<string, unknown>
	if (typeof o.userId !== "string" || o.userId.length === 0) return false
	if (typeof o.apiKey !== "string" || o.apiKey.length === 0) return false
	// Optional fields — only check shape if present.
	if (o.email !== undefined && typeof o.email !== "string") return false
	if (o.name !== undefined && typeof o.name !== "string") return false
	if (o.role !== undefined && typeof o.role !== "string") return false
	if (o.accessType !== undefined && typeof o.accessType !== "string")
		return false
	if (o.containerTags !== undefined && o.containerTags !== null) {
		if (!Array.isArray(o.containerTags)) return false
		for (const tag of o.containerTags) {
			if (typeof tag !== "object" || tag === null) return false
			const t = tag as Record<string, unknown>
			if (typeof t.containerTag !== "string") return false
			if (typeof t.permission !== "string") return false
		}
	}
	return true
}

function isValidCached(c: unknown): c is CachedAuth {
	if (typeof c !== "object" || c === null) return false
	const o = c as Record<string, unknown>
	if (o.v !== CACHE_VERSION) return false
	if (typeof o.cachedAt !== "number") return false
	return isValidAuthUser(o.user)
}

// ── Public API (signature unchanged from previous version) ────────────

export async function getCachedAuth(
	kv: KVNamespace,
	token: string,
): Promise<AuthUser | null> {
	const key = cacheKey(await tokenHash(token))
	// kv.get<unknown>(key, "json") returns null on missing OR unparseable JSON.
	const cached = await kv.get<unknown>(key, "json")
	if (!isValidCached(cached)) return null
	return cached.user
}

export async function putCachedAuth(
	kv: KVNamespace,
	token: string,
	user: AuthUser,
): Promise<void> {
	// Never cache invalid data. Treat upstream-returned but-malformed user as
	// a non-event for the cache; the request still succeeds since middleware
	// already received `user` from the validator.
	if (!isValidAuthUser(user)) return
	const key = cacheKey(await tokenHash(token))
	const value: CachedAuth = {
		v: CACHE_VERSION,
		user,
		cachedAt: Date.now(),
	}
	await kv.put(key, JSON.stringify(value), { expirationTtl: TTL_SECONDS })
}

// Re-export for any future callers that want the validators directly.
export { isValidAuthUser, isValidCached, cacheKey, CACHE_VERSION, TTL_SECONDS }

// Avoid unused-import warning in some toolchains while keeping the type
// narrowing referenced by the validator.
export type { ContainerTagAccess }
