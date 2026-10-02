import { describe, expect, test } from "bun:test"
import { formatRelevanceScore } from "./relevance-score"

describe("formatRelevanceScore", () => {
	test("preserves a zero score", () => {
		expect(formatRelevanceScore(0)).toBe("0%")
	})

	test("hides an omitted score", () => {
		expect(formatRelevanceScore(undefined)).toBeUndefined()
	})

	test("rounds a fractional score to a percentage", () => {
		expect(formatRelevanceScore(0.945)).toBe("95%")
	})
})
