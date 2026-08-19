import { describe, expect, it } from "bun:test"
import { isPromoCodeSpent, parseStoredPromoCode } from "./use-promo-code"

const NOW = 1_700_000_000_000

describe("parseStoredPromoCode", () => {
	it("reads a stored code with its plan and expiry", () => {
		const raw = JSON.stringify({
			code: "LAUNCH20",
			plan: "free",
			expiresAt: NOW + 1000,
		})

		expect(parseStoredPromoCode(raw, NOW)).toEqual({
			code: "LAUNCH20",
			plan: "free",
			expiresAt: NOW + 1000,
		})
	})

	it("drops a code once it has expired", () => {
		const raw = JSON.stringify({ code: "LAUNCH20", expiresAt: NOW - 1 })

		expect(parseStoredPromoCode(raw, NOW)).toBeNull()
	})

	it("still reads bare codes written before plan/expiry were stored", () => {
		expect(parseStoredPromoCode("LAUNCH20", NOW)).toEqual({
			code: "LAUNCH20",
		})
	})

	it("returns null for missing or unusable values", () => {
		expect(parseStoredPromoCode(null, NOW)).toBeNull()
		expect(parseStoredPromoCode("{oops", NOW)).toBeNull()
		expect(
			parseStoredPromoCode(JSON.stringify({ plan: "pro" }), NOW),
		).toBeNull()
	})
})

describe("isPromoCodeSpent", () => {
	it("is spent once the org moves up a plan", () => {
		expect(isPromoCodeSpent({ code: "X", plan: "free" }, "pro")).toBe(true)
		expect(isPromoCodeSpent({ code: "X", plan: "pro" }, "max")).toBe(true)
	})

	it("survives an unfinished checkout", () => {
		// `attach()` resolving only means Stripe handed back a payment URL; the
		// user can still abandon it, and the code has to be there when they retry.
		expect(isPromoCodeSpent({ code: "X", plan: "free" }, "free")).toBe(false)
	})

	it("survives a downgrade or trial expiry", () => {
		expect(isPromoCodeSpent({ code: "X", plan: "max" }, "pro")).toBe(false)
		expect(isPromoCodeSpent({ code: "X", plan: "pro" }, "free")).toBe(false)
	})

	it("is never spent while no plan has been recorded yet", () => {
		expect(isPromoCodeSpent({ code: "X" }, "max")).toBe(false)
	})
})
