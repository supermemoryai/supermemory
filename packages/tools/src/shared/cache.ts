import type { MemoryMode } from "./types"

/**
 * Generic memory cache for storing per-turn memories to avoid redundant API calls.
 * Used to cache memory retrieval results during tool-call loops within the same turn.
 */
export class MemoryCache<T = string> {
	private cache: Map<string, T> = new Map()

	/**
	 * Generates a cache key for the current turn based on context parameters.
	 * Normalizes the message by trimming and collapsing whitespace.
	 *
	 * @param containerTag - The container tag/user ID
	 * @param threadId - Optional thread/conversation ID
	 * @param mode - The memory retrieval mode
	 * @param message - The user message content
	 * @returns A unique cache key for this turn
	 */
	static makeTurnKey(
		containerTag: string,
		threadId: string | undefined,
		mode: MemoryMode,
		message: string,
	): string {
		const normalizedMessage = message.trim().replace(/\s+/g, " ")
		return `${containerTag}:${threadId || ""}:${mode}:${normalizedMessage}`
	}

	/**
	 * Retrieves a cached value by key.
	 *
	 * @param key - The cache key
	 * @returns The cached value or undefined if not found
	 */
	get(key: string): T | undefined {
		return this.cache.get(key)
	}

	/**
	 * Stores a value in the cache.
	 *
	 * @param key - The cache key
	 * @param value - The value to cache
	 */
	set(key: string, value: T): void {
		this.cache.set(key, value)
	}

	/**
	 * Checks if a key exists in the cache.
	 *
	 * @param key - The cache key
	 * @returns True if the key exists
	 */
	has(key: string): boolean {
		return this.cache.has(key)
	}

	/**
	 * Clears all cached values.
	 */
	clear(): void {
		this.cache.clear()
	}

	/**
	 * Returns the number of cached items.
	 */
	get size(): number {
		return this.cache.size
	}
}

/**
 * Convenience function to create a turn cache key.
 * @see MemoryCache.makeTurnKey
 */
export const makeTurnKey = MemoryCache.makeTurnKey
