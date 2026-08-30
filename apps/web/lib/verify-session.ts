import { getBackendUrl } from "./url-helpers"

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

// `bun run dev:local` serves localhost while auth lives on api.supermemory.ai, so its cookie never arrives.
function isLocalDevRequest(request: Request): boolean {
	if (process.env.NODE_ENV !== "development") {
		return false
	}
	try {
		return LOCAL_DEV_HOSTS.has(new URL(request.url).hostname)
	} catch {
		return false
	}
}

// In-process cache for verified sessions. The cookie is the identity; hashing it
// gives a fixed-length cache key without decoding the session. Short TTL keeps
// revocation latency low; promise deduplication absorbs burst traffic without
// fanning out to N concurrent backend hits.
const POSITIVE_TTL_MS = 10_000
const NEGATIVE_TTL_MS = 5_000
const MAX_ENTRIES = 1_000

type Entry = {
	value: boolean
	expiresAt: number
	inflight?: Promise<boolean>
}

type ComputeResult =
	| { kind: "valid" } // session present, user is set
	| { kind: "no_user" } // valid response but no user (cached negatively)
	| { kind: "unauthorized" } // 401/403 — definitive: invalidate, do not cache
	| { kind: "transient" } // 5xx/timeout/parse — fall back to stale; do not overwrite

const cache = new Map<string, Entry>()

async function hashKey(cookie: string): Promise<string> {
	// SubtleCrypto is available in Cloudflare Workers and Node 20+; this repo
	// requires node >=20 per the root package.json engines field.
	const bytes = new TextEncoder().encode(cookie)
	const digest = await crypto.subtle.digest("SHA-256", bytes)
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

function touch(key: string, entry: Entry) {
	// LRU: re-insert to move the key to the most-recent end of Map's insertion order.
	cache.delete(key)
	cache.set(key, entry)
	if (cache.size > MAX_ENTRIES) {
		// Oldest entry is the first key in iteration order; drop it.
		const oldest = cache.keys().next().value
		if (oldest !== undefined) cache.delete(oldest)
	}
}

/**
 * Manually invalidate the cache entry for a cookie. Useful on logout or
 * after a server-side session revocation.
 */
export async function invalidateSession(cookie: string): Promise<void> {
	if (!cookie) return
	cache.delete(await hashKey(cookie))
}

async function performVerification(cookie: string): Promise<ComputeResult> {
	try {
		const response = await fetch(`${getBackendUrl()}/api/auth/get-session`, {
			headers: { cookie },
			redirect: "error",
			cache: "no-store",
		})
		if (response.status === 401 || response.status === 403) {
			return { kind: "unauthorized" }
		}
		if (!response.ok) {
			return { kind: "transient" }
		}
		const session: unknown = await response.json()
		const hasUser = Boolean(
			session &&
				typeof session === "object" &&
				"user" in session &&
				session.user,
		)
		return hasUser ? { kind: "valid" } : { kind: "no_user" }
	} catch {
		return { kind: "transient" }
	}
}

/**
 * Look up or compute the verification result for a cookie. Concurrent callers
 * for the same cookie share a single in-flight fetch.
 *
 * - valid: caches as positive (POSITIVE_TTL_MS).
 * - no_user: caches as negative (NEGATIVE_TTL_MS).
 * - unauthorized: invalidates any prior entry; returns false; does not cache.
 * - transient: returns the last cached value if any (stale-while-error),
 *   otherwise false. Does not overwrite the cache.
 */
async function getOrCompute(cookie: string): Promise<boolean> {
	const key = await hashKey(cookie)
	const now = Date.now()
	const existing = cache.get(key)
	if (existing && existing.expiresAt > now && !existing.inflight) {
		touch(key, existing)
		return existing.value
	}
	if (existing?.inflight) {
		return existing.inflight
	}
	// Snapshot stale value before placeholder overwrites it — needed for
	// stale-while-error on transient failures after TTL expiry.
	const staleSnapshot = existing ? { value: existing.value } : undefined
	const inflight = (async () => {
		const result = await performVerification(cookie)
		switch (result.kind) {
			case "valid": {
				const entry: Entry = {
					value: true,
					expiresAt: Date.now() + POSITIVE_TTL_MS,
				}
				cache.set(key, entry)
				touch(key, entry)
				return true
			}
			case "no_user": {
				const entry: Entry = {
					value: false,
					expiresAt: Date.now() + NEGATIVE_TTL_MS,
				}
				cache.set(key, entry)
				touch(key, entry)
				return false
			}
			case "unauthorized": {
				cache.delete(key)
				return false
			}
			case "transient": {
				// Stale-while-error: return last known value if any.
				if (staleSnapshot) return staleSnapshot.value
				const prior = cache.get(key)
				// prior is the placeholder here; prefer snapshot.
				if (prior && prior.value !== false) return prior.value
				return false
			}
		}
	})()
	const placeholder: Entry = { value: false, expiresAt: 0, inflight }
	cache.set(key, placeholder)
	try {
		return await inflight
	} catch (error) {
		cache.delete(key)
		throw error
	} finally {
		const settled = cache.get(key)
		if (settled) settled.inflight = undefined
	}
}

// middleware.ts only checks the cookie is present; metered/proxy routes must verify it server-side.
export async function hasVerifiedSession(request: Request): Promise<boolean> {
	if (isLocalDevRequest(request)) {
		return true
	}
	const cookie = request.headers.get("cookie")
	if (!cookie) {
		return false
	}
	return getOrCompute(cookie)
}
