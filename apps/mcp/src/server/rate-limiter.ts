import { DurableObject } from "cloudflare:workers"

// Sliding-window rate limiting state stored per key (token hash or org id).
interface RateLimitState {
	// Timestamps (ms) of requests within the current window. Kept sorted asc.
	timestamps: number[]
	// First-request timestamp for the current counting period, for alarm scheduling.
	alarmAt: number | null
}

const STATE_KEY = "rl"
// How long to keep an idle DO alive before evicting its state.
const IDLE_EVICT_MS = 5 * 60 * 1000

export interface RateLimitOptions {
	// Maximum requests allowed within the window.
	limit: number
	// Window duration in milliseconds.
	windowMs: number
}

export interface RateLimitResult {
	allowed: boolean
	// Number of requests remaining in the current window (0 if blocked).
	remaining: number
	// Seconds until the oldest request in the window expires (Retry-After).
	retryAfter: number
}

/**
 * Pure sliding-window decision. Given the prior timestamps, the current time,
 * and the limit options, returns the result and the new timestamp list to
 * persist. Extracted so it can be unit-tested without a Durable Object runtime.
 */
export function slidingWindow(
	prior: number[],
	now: number,
	options: RateLimitOptions,
): { result: RateLimitResult; nextTimestamps: number[] } {
	const windowStart = now - options.windowMs
	const active = prior.filter((ts) => ts > windowStart)

	if (active.length >= options.limit) {
		const oldest = active[0]
		const retryAfter = Math.max(
			1,
			Math.ceil((oldest + options.windowMs - now) / 1000),
		)
		return {
			result: { allowed: false, remaining: 0, retryAfter },
			nextTimestamps: active,
		}
	}

	active.push(now)
	return {
		result: {
			allowed: true,
			remaining: Math.max(0, options.limit - active.length),
			retryAfter: 0,
		},
		nextTimestamps: active,
	}
}

/**
 * Durable Object implementing per-key sliding-window rate limiting.
 *
 * One DO instance per rate-limit key (e.g. token hash or org id). Each instance
 * stores the request timestamps within the active window and enforces a limit.
 * Alarms evict idle state so cold keys don't accumulate DOs.
 */
export class RateLimiter extends DurableObject {
	/**
	 * Check whether a request is allowed under the sliding-window limit.
	 * Records the timestamp if allowed. Runs inside a storage transaction so
	 * concurrent requests within the same DO serialize correctly.
	 */
	async check(options: RateLimitOptions): Promise<RateLimitResult> {
		const now = Date.now()

		return this.ctx.storage.transaction(async (txn) => {
			const state = await txn.get<RateLimitState>(STATE_KEY)
			const timestamps = state?.timestamps ?? []

			const { result, nextTimestamps } = slidingWindow(timestamps, now, options)

			const nextEviction = now + options.windowMs + IDLE_EVICT_MS
			await txn.put<RateLimitState>(STATE_KEY, {
				timestamps: nextTimestamps,
				alarmAt: nextEviction,
			})
			if (result.allowed) {
				await txn.setAlarm(nextEviction)
			}

			return result
		})
	}

	async alarm(): Promise<void> {
		const state = await this.ctx.storage.get<RateLimitState>(STATE_KEY)
		if (!state) return
		const now = Date.now()
		// If all timestamps have expired, evict the state entirely.
		if (state.timestamps.every((ts) => ts <= now - IDLE_EVICT_MS)) {
			await this.ctx.storage.delete(STATE_KEY)
			return
		}
		// Otherwise trim expired entries and reschedule.
		const active = state.timestamps.filter((ts) => ts > now - IDLE_EVICT_MS)
		if (active.length === 0) {
			await this.ctx.storage.delete(STATE_KEY)
			return
		}
		const nextEviction = Math.max(...active) + IDLE_EVICT_MS
		await this.ctx.storage.put<RateLimitState>(STATE_KEY, {
			timestamps: active,
			alarmAt: nextEviction,
		})
		await this.ctx.storage.setAlarm(nextEviction)
	}
}

/**
 * Deterministic DO name for a rate-limit key. Hashing the key prevents a
 * user-controllable string from being used as a storage probing vector and
 * keeps the namespace tidy.
 */
export async function rateLimiterName(key: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(key),
	)
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("")
}

// Default per-organization limits. Tunable via env (RATE_LIMIT_*).
export const DEFAULT_RATE_LIMIT = 600 // requests per window
export const DEFAULT_RATE_WINDOW_MS = 60_000 // 1 minute

export function rateLimitOptions(env: {
	RATE_LIMIT_MAX?: string
	RATE_LIMIT_WINDOW_MS?: string
}): RateLimitOptions {
	const limit = env.RATE_LIMIT_MAX
		? Number.parseInt(env.RATE_LIMIT_MAX, 10)
		: DEFAULT_RATE_LIMIT
	const windowMs = env.RATE_LIMIT_WINDOW_MS
		? Number.parseInt(env.RATE_LIMIT_WINDOW_MS, 10)
		: DEFAULT_RATE_WINDOW_MS
	return {
		limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_RATE_LIMIT,
		windowMs:
			Number.isFinite(windowMs) && windowMs > 0
				? windowMs
				: DEFAULT_RATE_WINDOW_MS,
	}
}
