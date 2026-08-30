import { describe, expect, it, vi } from "vitest"
import {
	DEFAULT_RATE_LIMIT,
	DEFAULT_RATE_WINDOW_MS,
	RateLimiter,
	rateLimitOptions,
	rateLimiterName,
	slidingWindow,
	type RateLimitOptions,
} from "./rate-limiter"

const WINDOW = 60_000
const LIMIT = 5
const opts: RateLimitOptions = { limit: LIMIT, windowMs: WINDOW }
const T0 = 1_000_000

describe("rate limiter sliding window", () => {
	it("persists an allowed request and schedules its eviction alarm", async () => {
		const txn = {
			get: vi.fn().mockResolvedValue(undefined),
			put: vi.fn().mockResolvedValue(undefined),
			setAlarm: vi.fn().mockResolvedValue(undefined),
		}
		const storage = {
			transaction: (callback: (transaction: typeof txn) => Promise<unknown>) =>
				callback(txn),
		}
		const now = vi.spyOn(Date, "now").mockReturnValue(T0)

		try {
			const limiter = new RateLimiter({ storage } as never, {} as never)
			await expect(limiter.check(opts)).resolves.toEqual({
				allowed: true,
				remaining: LIMIT - 1,
				retryAfter: 0,
			})
			expect(txn.put).toHaveBeenCalledOnce()
			expect(txn.setAlarm).toHaveBeenCalledWith(T0 + WINDOW + 5 * 60 * 1000)
		} finally {
			now.mockRestore()
		}
	})

	it("allows requests up to the limit", () => {
		let prior: number[] = []
		for (let i = 0; i < LIMIT; i++) {
			const now = T0 + i * 1000
			const { result, nextTimestamps } = slidingWindow(prior, now, opts)
			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(LIMIT - i - 1)
			prior = nextTimestamps
		}
	})

	it("blocks the request that exceeds the limit", () => {
		const prior = Array.from({ length: LIMIT }, (_, i) => T0 + i * 100)
		const { result, nextTimestamps } = slidingWindow(prior, T0 + 500, opts)
		expect(result.allowed).toBe(false)
		expect(result.remaining).toBe(0)
		// Blocked requests must not record a new timestamp.
		expect(nextTimestamps.length).toBe(LIMIT)
	})

	it("reports Retry-After based on the oldest active timestamp", () => {
		const prior = [T0]
		// Fill the rest near T0 so the oldest (T0) governs retry-after.
		for (let i = 1; i < LIMIT; i++) prior.push(T0 + i * 10)
		const now = T0 + 5_000
		const { result } = slidingWindow(prior, now, opts)
		expect(result.allowed).toBe(false)
		// oldest + window - now, in seconds, minimum 1.
		expect(result.retryAfter).toBe(
			Math.max(1, Math.ceil((T0 + WINDOW - now) / 1000)),
		)
	})

	it("reclaims slots once their timestamps exit the window", () => {
		// Five requests at T0..T0+400 fill the window.
		const prior = Array.from({ length: LIMIT }, (_, i) => T0 + i * 100)
		// After the full window elapses past the latest timestamp, all slots are reclaimed.
		const now = T0 + 400 + WINDOW + 1
		const { result, nextTimestamps } = slidingWindow(prior, now, opts)
		expect(result.allowed).toBe(true)
		expect(result.remaining).toBe(LIMIT - 1)
		expect(nextTimestamps).toEqual([now])
	})

	it("only drops timestamps older than the window, keeping recent ones", () => {
		const prior = [
			T0, // expired
			T0 + WINDOW - 100, // still active
			T0 + WINDOW - 50, // still active
		]
		const now = T0 + WINDOW
		const { result, nextTimestamps } = slidingWindow(prior, now, opts)
		expect(result.allowed).toBe(true)
		expect(nextTimestamps).toEqual([T0 + WINDOW - 100, T0 + WINDOW - 50, now])
	})
})

describe("rate limiter configuration", () => {
	it("returns the defaults when no env is set", () => {
		expect(rateLimitOptions({})).toEqual({
			limit: DEFAULT_RATE_LIMIT,
			windowMs: DEFAULT_RATE_WINDOW_MS,
		})
	})

	it("honours explicit env values", () => {
		expect(
			rateLimitOptions({
				RATE_LIMIT_MAX: "120",
				RATE_LIMIT_WINDOW_MS: "10000",
			}),
		).toEqual({
			limit: 120,
			windowMs: 10_000,
		})
	})

	it("falls back to defaults for non-numeric env values", () => {
		expect(
			rateLimitOptions({ RATE_LIMIT_MAX: "abc", RATE_LIMIT_WINDOW_MS: "-1" }),
		).toEqual({
			limit: DEFAULT_RATE_LIMIT,
			windowMs: DEFAULT_RATE_WINDOW_MS,
		})
	})
})

describe("rate limiter DO naming", () => {
	it("produces a stable hex hash for a key", async () => {
		const name = await rateLimiterName("org_123")
		expect(name).toMatch(/^[0-9a-f]{64}$/)
		// Same input -> same output (deterministic).
		expect(await rateLimiterName("org_123")).toBe(name)
	})

	it("produces distinct hashes for distinct keys", async () => {
		const a = await rateLimiterName("org_123")
		const b = await rateLimiterName("org_124")
		expect(a).not.toBe(b)
	})
})
