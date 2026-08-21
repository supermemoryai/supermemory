/**
 * Unit tests for extractResponsesInput.
 *
 * The Responses API `input` can be a plain string or a structured array of
 * items with multi-part content. The wrapper previously collapsed anything
 * that was not a string to "", which silently skipped memory search and
 * saving for structured or multi-modal requests.
 */

import { describe, it, expect } from "vitest"
import { extractResponsesInput } from "../../src/openai/middleware"

describe("extractResponsesInput", () => {
	it("passes a plain string through as a single user message", () => {
		const result = extractResponsesInput("Where do I live?")

		expect(result.text).toBe("Where do I live?")
		expect(result.messages).toEqual([
			{ role: "user", content: "Where do I live?" },
		])
	})

	it("returns nothing for an empty string", () => {
		const result = extractResponsesInput("   ")

		expect(result.text).toBe("")
		expect(result.messages).toEqual([])
	})

	it("returns nothing for unsupported input types", () => {
		expect(extractResponsesInput(undefined)).toEqual({ text: "", messages: [] })
		expect(extractResponsesInput(null)).toEqual({ text: "", messages: [] })
		expect(extractResponsesInput(42)).toEqual({ text: "", messages: [] })
	})

	it("extracts text from structured multi-part content", () => {
		const result = extractResponsesInput([
			{
				role: "user",
				content: [
					{ type: "input_text", text: "Describe this" },
					{ type: "input_image", image_url: "https://example.com/cat.png" },
					{ type: "input_text", text: "in one word" },
				],
			},
		])

		expect(result.text).toBe("Describe this\nin one word")
		expect(result.messages).toEqual([
			{ role: "user", content: "Describe this\nin one word" },
		])
	})

	it("preserves roles across a multi-turn structured input", () => {
		const result = extractResponsesInput([
			{ role: "user", content: "Hi" },
			{ role: "assistant", content: "Hello!" },
			{ role: "user", content: [{ type: "input_text", text: "How are you?" }] },
		])

		expect(result.text).toBe("Hi\nHello!\nHow are you?")
		expect(result.messages).toEqual([
			{ role: "user", content: "Hi" },
			{ role: "assistant", content: "Hello!" },
			{ role: "user", content: "How are you?" },
		])
	})

	it("normalizes unknown or developer roles to user", () => {
		const result = extractResponsesInput([
			{ role: "developer", content: "system-ish note" },
		])

		expect(result.messages).toEqual([
			{ role: "user", content: "system-ish note" },
		])
	})

	it("skips items that carry no text", () => {
		const result = extractResponsesInput([
			{ role: "user", content: [{ type: "input_image", image_url: "x" }] },
			{ role: "user", content: "actual question" },
		])

		expect(result.text).toBe("actual question")
		expect(result.messages).toEqual([
			{ role: "user", content: "actual question" },
		])
	})
})
