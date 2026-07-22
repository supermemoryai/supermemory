import { describe, expect, it } from "bun:test"
import {
	parseMemoriesFromDataset,
	serializeMemoriesForDataset,
} from "./memory-suggestion"

describe("memory dataset serialization", () => {
	it("round-trips a memory that contains a comma as a single item", () => {
		const memories = ["Lives in Austin, Texas", "Prefers dark mode"]
		const stored = serializeMemoriesForDataset(memories)
		expect(parseMemoriesFromDataset(stored)).toEqual(memories)
	})

	it("round-trips a memory that contains a newline as a single item", () => {
		const memories = ["Shipping address:\n123 Main St", "Likes coffee"]
		const stored = serializeMemoriesForDataset(memories)
		expect(parseMemoriesFromDataset(stored)).toEqual(memories)
	})

	it("trims and drops empty entries when serializing", () => {
		const stored = serializeMemoriesForDataset(["  keep  ", "", "   "])
		expect(parseMemoriesFromDataset(stored)).toEqual(["keep"])
	})

	it("serializes an empty list to an empty string for truthiness checks", () => {
		expect(serializeMemoriesForDataset([])).toBe("")
		expect(serializeMemoriesForDataset(undefined)).toBe("")
	})

	it("returns an empty array for empty or missing input", () => {
		expect(parseMemoriesFromDataset("")).toEqual([])
		expect(parseMemoriesFromDataset(null)).toEqual([])
		expect(parseMemoriesFromDataset(undefined)).toEqual([])
	})

	it("falls back to the legacy comma/newline split for non-JSON values", () => {
		expect(parseMemoriesFromDataset("first,second\nthird")).toEqual([
			"first",
			"second",
			"third",
		])
	})

	it("wraps a single non-array value into one item", () => {
		expect(
			parseMemoriesFromDataset(serializeMemoriesForDataset("solo")),
		).toEqual(["solo"])
	})
})
