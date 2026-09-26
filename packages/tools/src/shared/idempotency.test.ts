import { describe, expect, it } from "vitest"
import {
	buildIdempotencyHeaders,
	createRetryContext,
	generateIdempotencyKey,
} from "./idempotency"

describe("idempotency — Phase A (SDK-only, V1)", () => {
	it("same content+tags+minute → same key", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("hello", ["a", "b"], now)
		const k2 = await generateIdempotencyKey("hello", ["a", "b"], now)
		expect(k1).toBe(k2)
		expect(k1).toMatch(/^[0-9a-f]{64}$/)
	})

	it("different content → different key", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("hello", ["a"], now)
		const k2 = await generateIdempotencyKey("world", ["a"], now)
		expect(k1).not.toBe(k2)
	})

	it("different tags → different key", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("hello", ["a"], now)
		const k2 = await generateIdempotencyKey("hello", ["b"], now)
		expect(k1).not.toBe(k2)
	})

	it("minute rollover → different key", async () => {
		const k1 = await generateIdempotencyKey("hello", ["a"], 60_000 * 100)
		const k2 = await generateIdempotencyKey("hello", ["a"], 60_000 * 101)
		expect(k1).not.toBe(k2)
	})

	it("custom now injection is respected", async () => {
		const k1 = await generateIdempotencyKey("x", [], 0)
		const k2 = await generateIdempotencyKey("x", [], 60_000)
		expect(k1).not.toBe(k2)
	})

	it("header builder returns Idempotency-Key", async () => {
		const h = await buildIdempotencyHeaders("hello", ["a"], 1_700_000_000_000)
		expect(h).toHaveProperty("Idempotency-Key")
		expect(h["Idempotency-Key"]).toMatch(/^[0-9a-f]{64}$/)
	})

	it("retry helper reuses same key within same minute", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("retry me", ["t1"], now)
		// Simulate retry 10s later, same minute bucket
		const k2 = await generateIdempotencyKey("retry me", ["t1"], now + 10_000)
		expect(k1).toBe(k2)
	})

	it("empty content edge — still deterministic", async () => {
		const k1 = await generateIdempotencyKey("", [], 1_700_000_000_000)
		const k2 = await generateIdempotencyKey("", [], 1_700_000_000_000)
		expect(k1).toBe(k2)
		expect(k1).toMatch(/^[0-9a-f]{64}$/)
	})

	it("containerTags order independence (sorted)", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("hello", ["b", "a"], now)
		const k2 = await generateIdempotencyKey("hello", ["a", "b"], now)
		expect(k1).toBe(k2)
	})

	it("concurrent callers share key (parallel generation)", async () => {
		const now = 1_700_000_000_000
		const ps = Array.from({ length: 20 }, () =>
			generateIdempotencyKey("hello", ["a"], now),
		)
		const keys = await Promise.all(ps)
		expect(new Set(keys).size).toBe(1)
	})

	it("customIdempotencyKey priority — user-provided wins", async () => {
		const custom = "my-custom-key-123"
		const k = await generateIdempotencyKey(
			"hello",
			["a"],
			1_700_000_000_000,
			custom,
		)
		expect(k).toBe(custom)
		const h = await buildIdempotencyHeaders(
			"hello",
			["a"],
			1_700_000_000_000,
			custom,
		)
		expect(h["Idempotency-Key"]).toBe(custom)
	})

	it("RetryContext reuses same key across minute rollover", async () => {
		const now = 60_000 * 100
		const ctx = await createRetryContext("hello", ["a"], now)
		// 61s later — minute bucket would normally roll, but context reuses original key
		const laterKey = await generateIdempotencyKey("hello", ["a"], now + 61_000)
		expect(laterKey).not.toBe(ctx.key) // without context, key changes
		expect(ctx.getKey()).toBe(ctx.key)
		expect(ctx.getHeaders()["Idempotency-Key"]).toBe(ctx.key)
		// Simulate retry using context — still same key
		expect(ctx.headers["Idempotency-Key"]).toBe(ctx.key)
	})

	it("unicode normalization — café (NFC) and cafe\u0301 (NFD) hash to same key", async () => {
		const now = 1_700_000_000_000
		const nfc = "café" // U+00E9
		const nfd = "cafe\u0301" // e + U+0301
		expect(nfc.normalize("NFC")).toBe(nfd.normalize("NFC"))
		const k1 = await generateIdempotencyKey(nfc, ["a"], now)
		const k2 = await generateIdempotencyKey(nfd, ["a"], now)
		expect(k1).toBe(k2)
	})

	it("whitespace trimming — trailing spaces are stable", async () => {
		const now = 1_700_000_000_000
		const k1 = await generateIdempotencyKey("hello ", ["a"], now)
		const k2 = await generateIdempotencyKey("hello", ["a"], now)
		const k3 = await generateIdempotencyKey("  hello  ", ["a"], now)
		expect(k1).toBe(k2)
		expect(k2).toBe(k3)
	})
})
