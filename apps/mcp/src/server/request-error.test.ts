import { describe, expect, it } from "vitest"
import { describeThrownError } from "./request-error"

describe("describeThrownError", () => {
	it("keeps the name, message, and stack of a well-formed Error", () => {
		const error = new Error("something broke")
		const described = describeThrownError(error)

		expect(described).toContain("Error: something broke")
		expect(described).toContain(error.stack ?? "")
	})

	it("surfaces a placeholder for an empty-message Error", () => {
		// The exact shape the incident produced: the SDK reports a stack-only Error
		// with no message, so the log line was previously blank.
		const error = new Error("")
		const described = describeThrownError(error)

		expect(described).toContain("Error: (no message)")
	})

	it("includes the HTTP status and code carried on API-style errors", () => {
		const error = Object.assign(new Error("Bad upstream"), {
			status: 409,
			code: "conflict",
		})

		const described = describeThrownError(error)

		expect(described).toContain("Error: Bad upstream")
		expect(described).toContain("status=409")
		expect(described).toContain("code=conflict")
	})

	it("preserves a custom error name", () => {
		class TransientAuthError extends Error {
			override name = "TransientAuthError"
		}

		const described = describeThrownError(new TransientAuthError("retry later"))

		expect(described).toContain("TransientAuthError: retry later")
	})

	it("summarizes a chained cause", () => {
		const error = new Error("wrapper", { cause: new Error("root reason") })

		const described = describeThrownError(error)

		expect(described).toContain("Error: wrapper")
		expect(described).toContain("caused by Error: root reason")
	})

	it("describes an undefined throw", () => {
		expect(describeThrownError(undefined)).toBe(
			"non-Error value thrown: undefined",
		)
	})

	it("describes a null throw", () => {
		expect(describeThrownError(null)).toBe("non-Error value thrown: null")
	})

	it("describes a thrown string", () => {
		expect(describeThrownError("boom")).toBe(
			"non-Error value thrown (string): boom",
		)
	})

	it("serializes a thrown plain object", () => {
		const described = describeThrownError({ reason: "nope", status: 500 })

		expect(described).toContain("non-Error value thrown (object):")
		expect(described).toContain('"reason":"nope"')
		expect(described).toContain('"status":500')
	})

	it("falls back gracefully for a circular object", () => {
		const circular: Record<string, unknown> = {}
		circular.self = circular

		const described = describeThrownError(circular)

		expect(described).toContain("non-Error value thrown (object):")
		// Must not throw and must still produce a non-empty description.
		expect(described.length).toBeGreaterThan(0)
	})
})
