import { describe, expect, it } from "bun:test"
import { formatUsageNumber } from "./billing-utils"

describe("formatUsageNumber", () => {
	it("formats plain numbers below a thousand", () => {
		expect(formatUsageNumber(0)).toBe("0")
		expect(formatUsageNumber(999)).toBe("999")
	})

	it("formats thousands and millions", () => {
		expect(formatUsageNumber(50_000)).toBe("50K")
		expect(formatUsageNumber(1_500)).toBe("1.5K")
		expect(formatUsageNumber(1_500_000)).toBe("1.5M")
		expect(formatUsageNumber(2_000_000)).toBe("2M")
	})

	it("promotes to the next unit instead of rendering 1000.0K", () => {
		expect(formatUsageNumber(999_950)).toBe("1.0M")
		expect(formatUsageNumber(999_999)).toBe("1.0M")
	})

	it("still rounds within the thousands band just below the boundary", () => {
		expect(formatUsageNumber(999_949)).toBe("999.9K")
	})

	it("promotes to billions instead of rendering 1000.0M", () => {
		expect(formatUsageNumber(999_999_950)).toBe("1.0B")
		expect(formatUsageNumber(2_000_000_000)).toBe("2B")
	})
})
