import { describe, expect, it } from "bun:test"
import { extractApiErrorMessage } from "./api-error"

describe("extractApiErrorMessage", () => {
	it("reads the API's standard error field", () => {
		expect(extractApiErrorMessage('{"error":"Memory limit reached"}')).toBe(
			"Memory limit reached",
		)
	})

	it("falls back to the message field", () => {
		expect(extractApiErrorMessage('{"message":"Invalid request"}')).toBe(
			"Invalid request",
		)
	})

	it("preserves plain-text error responses", () => {
		expect(extractApiErrorMessage("Service unavailable")).toBe(
			"Service unavailable",
		)
	})

	it.each([
		"",
		"   ",
		"{}",
		'{"error":""}',
	])("ignores an empty or unrecognized body", (raw) => {
		expect(extractApiErrorMessage(raw)).toBeUndefined()
	})
})
