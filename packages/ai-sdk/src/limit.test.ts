import { describe, expect, it } from "vitest"
import { clampSearchLimit } from "./tools"

describe("clampSearchLimit", () => {
	it("keeps in-range integers", () => {
		expect(clampSearchLimit(1)).toBe(1)
		expect(clampSearchLimit(10)).toBe(10)
		expect(clampSearchLimit(50)).toBe(50)
	})

	it("clamps huge and negative values into range", () => {
		expect(clampSearchLimit(1e9)).toBe(50)
		expect(clampSearchLimit(-5)).toBe(1)
		expect(clampSearchLimit(0)).toBe(1)
	})

	it("floors fractional values", () => {
		expect(clampSearchLimit(7.9)).toBe(7)
	})

	it("falls back to the default on non-numeric input", () => {
		expect(clampSearchLimit(Number.NaN)).toBe(10)
		expect(clampSearchLimit(undefined)).toBe(10)
		expect(clampSearchLimit("12" as unknown as number)).toBe(12)
	})
})
