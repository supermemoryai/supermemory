import { describe, expect, it } from "bun:test"
import {
	assertHybridRecallPass,
	evaluateHybridRecallFixtures,
	formatSearchHitsLegacy,
	renderHybridRecallReport,
	summarizeHybridRecallEval,
} from "./hybrid-recall.eval"
import { formatSearchHitsForPrompt } from "./search-request"

describe("hybrid recall evaluation", () => {
	it("prints a before/after report and meets pass thresholds", () => {
		const summary = summarizeHybridRecallEval()
		const report = renderHybridRecallReport(summary)
		console.log(`\n${report}\n`)

		const failures = assertHybridRecallPass(summary)
		expect(failures).toEqual([])
	})

	it("proves the legacy gap on every fixture that has chunk-only hits", () => {
		for (const row of evaluateHybridRecallFixtures()) {
			if (row.next.chunkOnlyTotal === 0) continue
			expect(row.legacy.recoveredChunkOnly).toBe(0)
			expect(row.next.recoveredChunkOnly).toBe(row.next.chunkOnlyTotal)
			expect(row.legacy.undefinedLines).toBeGreaterThan(0)
			expect(row.next.undefinedLines).toBe(0)
		}
	})

	it("keeps contiguous numbering after skipping empty hits", () => {
		const lines = formatSearchHitsForPrompt([
			{ memory: "A" },
			{},
			{ chunk: "B" },
		])
		expect(lines.map((line) => line.match(/^(\d+)\./)?.[1])).toEqual(["1", "2"])
		expect(
			formatSearchHitsLegacy([{ memory: "A" }, {}, { chunk: "B" }]),
		).toEqual(["1. A \n", "2. undefined \n", "3. undefined \n"])
	})
})
