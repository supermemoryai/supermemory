import { describe, expect, it } from "bun:test"
import {
	isSafeSourceId,
	parseSourceAnnotatedMarkdown,
	stripSourceMarkup,
} from "./source-annotations"

describe("source annotation parsing", () => {
	it("turns allowed response source spans into internal citation links", () => {
		const parsed = parseSourceAnnotatedMarkdown(
			'Alpha <response source="S1">Beta [x]</response> Gamma',
			new Set(["S1"]),
		)

		expect(parsed.markdown).toBe("Alpha [Beta \\[x\\]](#sm-source:S1) Gamma")
	})

	it("renders repeated allowed citations as separate internal links", () => {
		const parsed = parseSourceAnnotatedMarkdown(
			'<response source="S1">First</response> and <response source="S1">Second</response>',
			new Set(["S1"]),
		)

		expect(parsed.markdown).toBe(
			"[First](#sm-source:S1) and [Second](#sm-source:S1)",
		)
	})

	it("renders unknown or unsafe source ids as plain text", () => {
		expect(
			parseSourceAnnotatedMarkdown(
				'Unknown <response source="missing">plain</response>',
				new Set(["S1"]),
			).markdown,
		).toBe("Unknown plain")

		expect(
			parseSourceAnnotatedMarkdown(
				'Unsafe <response source="bad/id">plain</response>',
				new Set(["bad/id"]),
			).markdown,
		).toBe("Unsafe plain")
	})

	it("keeps unclosed, incomplete, nested, and malformed source markup safe", () => {
		expect(
			parseSourceAnnotatedMarkdown(
				'Lead <response source="S1">unfinished answer',
				new Set(["S1"]),
			).markdown,
		).toBe("Lead unfinished answer")

		expect(
			parseSourceAnnotatedMarkdown("Lead <response", new Set(["S1"])).markdown,
		).toBe("Lead ")

		expect(
			parseSourceAnnotatedMarkdown(
				'Outer <response source="S1">A <response source="S2">B</response> C</response>',
				new Set(["S1", "S2"]),
			).markdown,
		).toBe("Outer A B C")

		expect(
			parseSourceAnnotatedMarkdown(
				"Malformed <response source=S1>plain</response>",
				new Set(["S1"]),
			).markdown,
		).toBe("Malformed plain")
	})

	it("does not mutate inline code or fenced code blocks", () => {
		const input =
			'`<response source="S1">code</response>`\n```\n<response source="S1">fenced</response>\n```'

		expect(parseSourceAnnotatedMarkdown(input, new Set(["S1"])).markdown).toBe(
			input,
		)
	})

	it("turns known bare memory ids into internal citation links", () => {
		const parsed = parseSourceAnnotatedMarkdown(
			"Fact [S1]. Combined [S1, S2]. Unknown [S3].",
			new Set(["S1", "S2"]),
		)

		expect(parsed.markdown).toBe(
			"Fact [S1](#sm-source:S1). Combined [S1](#sm-source:S1) [S2](#sm-source:S2). Unknown [S3].",
		)
	})

	it("does not reinterpret normal markdown as bare memory citations", () => {
		const input = [
			"[S1](https://example.com)",
			"[S1][ref]",
			"[S1]: https://example.com",
			"![S1](image.png)",
			"\\[S1]",
			"`[S1]`",
			"```",
			"[S1]",
			"```",
		].join("\n")

		expect(parseSourceAnnotatedMarkdown(input, new Set(["S1"])).markdown).toBe(
			input,
		)
	})

	it("strips source markup for copy text", () => {
		expect(
			stripSourceMarkup('Alpha <response source="S1">Beta</response>'),
		).toBe("Alpha Beta")
	})

	it("recovers a duplicated malformed closing tag from model output", () => {
		const input =
			'Pinki got soup <response source="S1">for dinner at the church</response> <response source="S2">today</response">today</response>.'

		expect(
			parseSourceAnnotatedMarkdown(input, new Set(["S1", "S2"])).markdown,
		).toBe(
			"Pinki got soup [for dinner at the church](#sm-source:S1) [today](#sm-source:S2).",
		)
		expect(stripSourceMarkup(input)).toBe(
			"Pinki got soup for dinner at the church today.",
		)
	})

	it("accepts a quoted malformed closing tag without duplicated text", () => {
		expect(
			parseSourceAnnotatedMarkdown(
				'Alpha <response source="S1">Beta</response"> Gamma',
				new Set(["S1"]),
			).markdown,
		).toBe("Alpha [Beta](#sm-source:S1) Gamma")
	})

	it("allows only source ids that are safe in internal fragments", () => {
		expect(isSafeSourceId("S1._:-")).toBe(true)
		expect(isSafeSourceId("bad/id")).toBe(false)
		expect(isSafeSourceId("bad space")).toBe(false)
	})
})
