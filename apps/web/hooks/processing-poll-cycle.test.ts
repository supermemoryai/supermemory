import { describe, expect, it } from "bun:test"
import {
	decideProcessingPoll,
	MAX_PROCESSING_POLLS,
	type ProcessingPollCycle,
} from "./processing-poll-cycle"

function activeSnapshot(
	documentIds: readonly string[],
	dataUpdateCount: number,
	queryHash = "processing-scope-a",
) {
	return {
		documentIds,
		totalCount: documentIds.length,
		dataUpdateCount,
		queryHash,
	}
}

describe("processing document poll cycles", () => {
	it("stops the same processing job at the 60-update cap", () => {
		let cycle: ProcessingPollCycle | null = null

		for (
			let updateCount = 1;
			updateCount < MAX_PROCESSING_POLLS;
			updateCount++
		) {
			const decision = decideProcessingPoll(
				cycle,
				activeSnapshot(
					updateCount % 2 === 0
						? ["document-a", "document-b"]
						: ["document-b", "document-a"],
					updateCount,
				),
			)
			cycle = decision.cycle
			expect(decision.shouldPoll).toBe(true)
		}

		const capped = decideProcessingPoll(
			cycle,
			activeSnapshot(["document-a", "document-b"], MAX_PROCESSING_POLLS),
		)
		expect(capped.shouldPoll).toBe(false)
	})

	it("restarts after an idle response even when the absolute count exceeds 60", () => {
		let decision = decideProcessingPoll(null, activeSnapshot(["document-a"], 1))
		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(["document-a"], MAX_PROCESSING_POLLS),
		)
		expect(decision.shouldPoll).toBe(false)

		decision = decideProcessingPoll(decision.cycle, {
			documentIds: [],
			totalCount: 0,
			dataUpdateCount: MAX_PROCESSING_POLLS + 1,
			queryHash: "processing-scope-a",
		})
		expect(decision.shouldPoll).toBe(false)

		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(["document-a"], MAX_PROCESSING_POLLS + 2),
		)
		expect(decision.shouldPoll).toBe(true)
	})

	it("starts a fresh budget when the query scope changes", () => {
		let decision = decideProcessingPoll(
			null,
			activeSnapshot(["shared-document-id"], 1, "processing-scope-a"),
		)
		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(
				["shared-document-id"],
				MAX_PROCESSING_POLLS,
				"processing-scope-a",
			),
		)
		expect(decision.shouldPoll).toBe(false)

		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(
				["shared-document-id"],
				MAX_PROCESSING_POLLS,
				"processing-scope-b",
			),
		)
		expect(decision.shouldPoll).toBe(true)
	})

	it("starts a fresh budget when the processing document IDs change", () => {
		let decision = decideProcessingPoll(null, activeSnapshot(["document-a"], 1))
		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(["document-a"], MAX_PROCESSING_POLLS),
		)
		expect(decision.shouldPoll).toBe(false)

		decision = decideProcessingPoll(
			decision.cycle,
			activeSnapshot(["document-b"], MAX_PROCESSING_POLLS + 1),
		)
		expect(decision.shouldPoll).toBe(true)
	})

	it("does not spend the budget when the callback re-evaluates unchanged data", () => {
		let decision = decideProcessingPoll(null, activeSnapshot(["document-a"], 1))

		for (
			let evaluation = 0;
			evaluation < MAX_PROCESSING_POLLS * 2;
			evaluation++
		) {
			decision = decideProcessingPoll(
				decision.cycle,
				activeSnapshot(["document-a"], 1),
			)
			expect(decision.shouldPoll).toBe(true)
		}
	})
})
