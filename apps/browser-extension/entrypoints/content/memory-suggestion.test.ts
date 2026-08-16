import { describe, expect, it } from "bun:test"
import {
	acceptMemorySuggestion,
	buildSupermemoryText,
	clearPendingMemoryState,
	createMemorySuggestionPayload,
	serializeMemoriesForDataset,
} from "./memory-suggestion"

describe("memory suggestion formatting", () => {
	it("does not build an injectable prompt for empty memories", () => {
		for (const memories of [[], [" ", "\n"], " ", null, undefined]) {
			expect(serializeMemoriesForDataset(memories)).toBe("")
			expect(buildSupermemoryText(memories)).toBe("")
			expect(createMemorySuggestionPayload(memories)).toBeNull()
		}
	})

	it("keeps the existing prompt format for non-empty memories", () => {
		const memories = ["1. First memory \n", "2. Second memory \n"]
		const suggestionText =
			"\n\nSupermemories of user (only for the reference): 1. First memory \n2. Second memory"

		expect(buildSupermemoryText(memories)).toBe(suggestionText)
		expect(createMemorySuggestionPayload(memories)).toEqual({
			suggestionText,
			memoriesData: JSON.stringify(["1. First memory", "2. Second memory"]),
		})
	})

	it("clears only pending memory state", () => {
		let popoverRemoved = false
		const input = {
			dataset: {
				supermemories: "old pending memories",
				supermemoriesInjected: "true",
			},
		}
		const icon = {
			dataset: {
				memoriesData: '["old pending memories"]',
				supermemories: "old suggestion",
			},
			querySelector(selector: string) {
				expect(selector).toBe("[data-supermemory-marker-popover]")
				return {
					remove() {
						popoverRemoved = true
					},
				}
			},
		}

		clearPendingMemoryState(input, icon)

		expect(input.dataset.supermemories).toBeUndefined()
		expect(input.dataset.supermemoriesInjected).toBe("true")
		expect(icon.dataset.memoriesData).toBeUndefined()
		expect(icon.dataset.supermemories).toBeUndefined()
		expect(popoverRemoved).toBe(true)

		let prevented = false
		const accepted = acceptMemorySuggestion(
			{
				key: "Tab",
				preventDefault() {
					prevented = true
				},
				stopPropagation() {},
			} as KeyboardEvent,
			"chatgpt",
			input as unknown as HTMLElement,
		)
		expect(accepted).toBe(false)
		expect(prevented).toBe(false)
	})
})
