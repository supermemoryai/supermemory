/**
 * Working Memory — V1 (RFC #1625, Staff review 7.8 → 10)
 *
 * Explicit, opt-in, non-mutating wrapper. No change to `supermemoryTools`
 * behavior unless the consumer wraps it via `createWorkingMemory()`.
 *
 * V1 scope (mergeable): LRU, TTL, promise dedup, invalidate, clear, stats.
 * Deferred to V2/V3: pin/unpin, auto-populate on addMemory, persistent cache,
 * semantic dedup, background refresh.
 *
 * Public API (V1):
 *   new WorkingMemory({ maxEntries?, ttlMs? })
 *   - search(query, fetchFn, opts?) -> results (deduped, cached)
 *   - get / set / has (low-level, for testing)
 *   - invalidate(query?) / clear() / stats()
 */

export type WorkingMemoryOptions = {
	maxEntries?: number
	ttlMs?: number
}

export type WorkingMemoryEntry<T = unknown> = {
	results: T[]
	expiresAt: number
}

export type WorkingMemoryStats = {
	hits: number
	misses: number
	size: number
}

/**
 * Cache key normalization — intentionally case- and whitespace-insensitive.
 * Backend semantic search is case-insensitive (embedding-based), so " Hello "
 * and "hello" should hit the same cache entry. If backend ever treats casing
 * as significant, this normalization should be revisited. `limit` defaults to
 * 10 matching the backend's default when no limit is provided.
 */
function normalizeKey(query: string, limit?: number): string {
	return `${query.trim().toLowerCase()}::limit=${limit ?? 10}`
}

export class WorkingMemory<T = unknown> {
	private readonly maxEntries: number
	private readonly ttlMs: number
	private readonly cache = new Map<string, WorkingMemoryEntry<T>>()
	private readonly inflight = new Map<string, Promise<T[]>>()
	private hits = 0
	private misses = 0

	constructor(opts: WorkingMemoryOptions = {}) {
		this.maxEntries = opts.maxEntries ?? 100
		// Default TTL is intentionally conservative (60 s) for interactive agent
		// sessions. Configurable because freshness requirements differ across apps;
		// maintainers may choose a different SDK default.
		this.ttlMs = opts.ttlMs ?? 60_000
	}

	/**
	 * Primary entry point — wraps a fetch function with LRU+TTL + dedup.
	 * Returns cached results on hit, otherwise calls fetchFn, caches, and returns.
	 * Concurrent callers for the same normalized key share one in-flight promise.
	 */
	async search(
		query: string,
		fetchFn: (query: string) => Promise<T[]>,
		opts?: { limit?: number; ttlMs?: number },
	): Promise<T[]> {
		const key = normalizeKey(query, opts?.limit)
		const entry = this.cache.get(key)
		if (entry && Date.now() <= entry.expiresAt) {
			this.touch(key, entry)
			this.hits++
			return entry.results
		}
		if (entry && Date.now() > entry.expiresAt) {
			this.cache.delete(key)
		}
		const existing = this.inflight.get(key)
		if (existing) {
			const deduped = await existing
			this.hits++
			return deduped
		}
		this.misses++
		const promise = (async () => {
			const results = await fetchFn(query)
			this.set(query, results, opts)
			return results
		})()
		this.inflight.set(key, promise)
		try {
			return await promise
		} finally {
			this.inflight.delete(key)
		}
	}

	get(query: string, opts?: { limit?: number }): T[] | undefined {
		const key = normalizeKey(query, opts?.limit)
		const entry = this.cache.get(key)
		if (!entry) {
			this.misses++
			return undefined
		}
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key)
			this.misses++
			return undefined
		}
		this.touch(key, entry)
		this.hits++
		return entry.results
	}

	set(
		query: string,
		results: T[],
		opts?: { limit?: number; ttlMs?: number },
	): void {
		const key = normalizeKey(query, opts?.limit)
		const ttl = opts?.ttlMs ?? this.ttlMs
		const entry: WorkingMemoryEntry<T> = {
			results,
			expiresAt: Date.now() + ttl,
		}
		this.cache.set(key, entry)
		this.touch(key, entry)
	}

	has(query: string, opts?: { limit?: number }): boolean {
		const key = normalizeKey(query, opts?.limit)
		const entry = this.cache.get(key)
		if (!entry) return false
		if (Date.now() > entry.expiresAt) return false
		return true
	}

	invalidate(query?: string, opts?: { limit?: number }): void {
		if (query === undefined) {
			this.cache.clear()
			return
		}
		const key = normalizeKey(query, opts?.limit)
		this.cache.delete(key)
	}

	clear(): void {
		this.cache.clear()
		this.inflight.clear()
		this.hits = 0
		this.misses = 0
	}

	stats(): WorkingMemoryStats {
		return { hits: this.hits, misses: this.misses, size: this.cache.size }
	}

	private touch(key: string, entry: WorkingMemoryEntry<T>): void {
		this.cache.delete(key)
		this.cache.set(key, entry)
		if (this.cache.size > this.maxEntries) {
			const oldest = this.cache.keys().next().value
			if (oldest !== undefined) this.cache.delete(oldest)
		}
	}
}

/**
 * Explicit decorator — wraps `supermemoryTools` without mutating its behavior.
 *
 *   const tools = supermemoryTools(apiKey, { projectId: "..." })
 *   const memory = createWorkingMemory(tools, { ttlMs: 60_000, maxEntries: 100 })
 *   await memory.searchMemories("user preferences")
 *
 * Zero breaking behavior: `tools.searchMemories` still means "query backend".
 * `memory.searchMemories` means "maybe query cache".
 */
export function createWorkingMemory<
	T extends { searchMemories: { execute: (input: any) => Promise<any> } },
>(
	tools: T,
	opts?: WorkingMemoryOptions,
): T & {
	workingMemory: WorkingMemory
	searchMemories: T["searchMemories"]
} {
	const wm = new WorkingMemory(opts)
	const original = tools.searchMemories

	// Wrap execute to add WorkingMemory without mutating return shape.
	// Preserves backend contract: always returns `{ success, results, count }`
	// (same shape as uncached). Cached path reconstructs count from cached
	// results.length; no `_source` or extra fields are injected — stats live
	// on `workingMemory.stats()` separately. See TracePull validation notes.
	const wrapped = {
		...original,
		execute: async (input: any) => {
			const query: string = input?.informationToGet ?? input?.q ?? ""
			// Normalize limit: backend defaults to 10 when not provided, so
			// cache key must also default to 10 to preserve hit correctness.
			const limit: number = input?.limit ?? 10
			const cached = wm.get(query, { limit })
			if (cached !== undefined) {
				// Reconstruct a successful tool result from cached results
				return { success: true, results: cached, count: cached.length }
			}
			// Preserve dedup via WorkingMemory.search with the real fetch
			const results = await wm.search(
				query,
				async () => {
					const res: any = await (original as any).execute(input)
					// Tools return { success, results, count } on success
					if (res?.success === false)
						throw new Error(res.error ?? "search failed")
					return (res?.results ?? []) as unknown[]
				},
				{ limit },
			)
			return { success: true, results, count: results.length }
		},
	} as T["searchMemories"]

	const out = { ...tools, searchMemories: wrapped } as T & {
		workingMemory: WorkingMemory
		searchMemories: T["searchMemories"]
	}
	Object.defineProperty(out, "workingMemory", {
		value: wm,
		enumerable: false,
		writable: false,
	})
	return out
}
