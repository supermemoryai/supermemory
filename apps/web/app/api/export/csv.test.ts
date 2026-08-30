import { describe, expect, it } from "bun:test"
import { csvEscape } from "./csv"

describe("csvEscape", () => {
	it("neutralizes spreadsheet formula prefixes", () => {
		for (const value of ["=1+1", "+1+1", "-1+1", "@SUM(A1:A2)"]) {
			expect(csvEscape(value)).toBe(`'${value}`)
		}
	})

	it("quotes formula-prefixed values containing CSV delimiters", () => {
		expect(csvEscape("=SUM(1,2)")).toBe('"\'=SUM(1,2)"')
	})

	it("preserves ordinary values and standard CSV escaping", () => {
		expect(csvEscape(null)).toBe("")
		expect(csvEscape(undefined)).toBe("")
		expect(csvEscape("Document title")).toBe("Document title")
		expect(csvEscape("hello, world")).toBe('"hello, world"')
		expect(csvEscape('He said "hello"')).toBe('"He said ""hello"""')
		expect(csvEscape("line 1\nline 2")).toBe('"line 1\nline 2"')
	})
})
