import { describe, expect, it } from "bun:test"
import { preparePromptForSubmission } from "./prompt-capture"

describe("preparePromptForSubmission", () => {
	it("keeps recalled memories out of the captured prompt", () => {
		const storedMemories =
			"\n\nSupermemories of user (only for the reference): Prefers TypeScript"

		expect(
			preparePromptForSubmission("Explain this code", storedMemories),
		).toEqual({
			promptToCapture: "Explain this code",
			promptToSubmit: `Explain this code${storedMemories}`,
		})
	})

	it("leaves prompts without recalled memories unchanged", () => {
		expect(preparePromptForSubmission("Explain this code")).toEqual({
			promptToCapture: "Explain this code",
			promptToSubmit: "Explain this code",
		})
	})

	it("supports platform-specific separation before recalled memories", () => {
		expect(
			preparePromptForSubmission("Explain this code", "recalled context", " "),
		).toEqual({
			promptToCapture: "Explain this code",
			promptToSubmit: "Explain this code recalled context",
		})
	})

	it("does not append recalled memories more than once", () => {
		const prompt =
			"Explain this code\n\nSupermemories of user (only for the reference): Prefers TypeScript"

		expect(preparePromptForSubmission(prompt, "ignored")).toEqual({
			promptToCapture: prompt,
			promptToSubmit: prompt,
		})
	})
})
