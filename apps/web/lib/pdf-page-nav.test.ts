import { describe, expect, it } from "bun:test"
import { clampPage, parsePageInput, pickMostVisiblePage } from "./pdf-page-nav"

describe("clampPage", () => {
	it("clamps into [1, total] and rounds", () => {
		expect(clampPage(0, 10)).toBe(1)
		expect(clampPage(5, 10)).toBe(5)
		expect(clampPage(50, 10)).toBe(10)
		expect(clampPage(3.4, 10)).toBe(3)
		expect(clampPage(3.6, 10)).toBe(4)
	})

	it("never returns less than 1 even for a 0-page document", () => {
		expect(clampPage(1, 0)).toBe(1)
	})
})

describe("pickMostVisiblePage", () => {
	it("returns the fallback when nothing is visible", () => {
		expect(pickMostVisiblePage(new Map(), 1)).toBe(1)
		expect(pickMostVisiblePage(new Map([[2, 0]]), 3)).toBe(3)
	})

	it("picks the page with the highest visible ratio", () => {
		const ratios = new Map([
			[1, 0.2],
			[2, 0.7],
			[3, 0.1],
		])
		expect(pickMostVisiblePage(ratios, 1)).toBe(2)
	})

	it("breaks ties toward the lower page number", () => {
		const ratios = new Map([
			[4, 0.5],
			[3, 0.5],
		])
		expect(pickMostVisiblePage(ratios, 1)).toBe(3)
	})
})

describe("parsePageInput", () => {
	it("parses and clamps a valid page", () => {
		expect(parsePageInput("4", 10)).toBe(4)
		expect(parsePageInput(" 99 ", 10)).toBe(10)
	})

	it("rejects non-numeric or non-positive input", () => {
		expect(parsePageInput("", 10)).toBeNull()
		expect(parsePageInput("abc", 10)).toBeNull()
		expect(parsePageInput("0", 10)).toBeNull()
		expect(parsePageInput("-3", 10)).toBeNull()
		expect(parsePageInput("2.5", 10)).toBeNull()
	})
})
