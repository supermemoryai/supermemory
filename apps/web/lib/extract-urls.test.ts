import { describe, expect, it } from "bun:test"
import { extractUrls } from "./url-helpers"

describe("extractUrls", () => {
	it("extracts bare, markdown, and angle-bracket links", () => {
		const { urls } = extractUrls(
			"see https://a.example/one, [docs](https://b.example/two) and <https://c.example/three>",
		)
		expect(urls).toEqual([
			"https://a.example/one",
			"https://b.example/two",
			"https://c.example/three",
		])
	})

	it("keeps balanced parentheses in markdown link destinations", () => {
		const { urls } = extractUrls(
			"[Function](https://en.wikipedia.org/wiki/Function_(mathematics)) and [Rust](https://en.wikipedia.org/wiki/Rust_(programming_language))",
		)
		expect(urls).toEqual([
			"https://en.wikipedia.org/wiki/Function_(mathematics)",
			"https://en.wikipedia.org/wiki/Rust_(programming_language)",
		])
	})

	it("handles nested parentheses and adjacent markdown links", () => {
		const { urls } = extractUrls(
			"[source.example](https://a.example/a_(b_(c)))[next](https://b.example/d_(e))",
		)
		expect(urls).toEqual([
			"https://a.example/a_(b_(c))",
			"https://b.example/d_(e)",
		])
	})

	it("does not extract a domain-shaped markdown label", () => {
		const { urls } = extractUrls(
			"[source.example](https://target.example/path_(section))",
		)
		expect(urls).toEqual(["https://target.example/path_(section)"])
	})

	it("masks domain-shaped labels and titles", () => {
		for (const text of [
			'[source.example](https://target.example/a_(b) "docs.example")tail.example',
			"[source.example](https://target.example/a_(b) (docs (nested.example))tail.example",
		]) {
			expect(extractUrls(text).urls).toEqual([
				"https://target.example/a_(b)",
				"https://tail.example",
			])
		}
	})

	it("keeps markdown-looking text inside quoted titles", () => {
		for (const quote of ['"', "'"]) {
			const { urls } = extractUrls(
				`[source.example](https://target.example ${quote}See [docs](https://docs.example)${quote})tail.example`,
			)
			expect(urls).toEqual(["https://target.example", "https://tail.example"])
		}
	})

	it("does not consume malformed markdown titles", () => {
		for (const text of [
			'[source.example](https://target.example\n\n"unrelated.example")tail.example',
			'[source.example](https://target.example "line one\n\nunrelated.example")tail.example',
		]) {
			expect(extractUrls(text).urls).toEqual([
				"https://source.example",
				"https://target.example",
				"https://unrelated.example",
				"https://tail.example",
			])
		}
	})

	it("masks domain-shaped labels that span lines", () => {
		const { urls } = extractUrls(
			"[source.example\ncontinued](https://target.example/path_(section))",
		)
		expect(urls).toEqual(["https://target.example/path_(section)"])
	})

	it("separates markdown destinations from adjacent text and URLs", () => {
		const { urls } = extractUrls(
			"[a](https://a.example/path)tail [b](https://b.example/path)c.example [d](https://d.example/path),https://e.example",
		)
		expect(urls).toEqual([
			"https://a.example/path",
			"https://b.example/path",
			"https://c.example",
			"https://d.example/path",
			"https://e.example",
		])
	})

	it("does not count escaped parentheses as markdown nesting", () => {
		const { urls } = extractUrls(
			String.raw`[a](https://a.example/path\(part)b.example`,
		)
		expect(urls).toEqual([
			String.raw`https://a.example/path\(part`,
			"https://b.example",
		])
	})

	it("does not treat escaped whitespace as markdown punctuation", () => {
		const { urls } = extractUrls(
			String.raw`[source.example](https://target.example/a\ b.example)`,
		)
		expect(urls).toContain("https://source.example")
	})

	it("does not consume unrelated malformed link text", () => {
		const { urls } = extractUrls(
			"[source.example] text ](https://target.example/path_(section))",
		)
		expect(urls).toEqual([
			"https://source.example",
			"https://target.example/path_(section)",
		])
	})

	it("removes only unmatched closing parentheses around bare URLs", () => {
		const { urls } = extractUrls(
			"Read (https://en.wikipedia.org/wiki/Function_(mathematics)).",
		)
		expect(urls).toEqual([
			"https://en.wikipedia.org/wiki/Function_(mathematics)",
		])
	})

	it("handles repeated unterminated markdown links efficiently", () => {
		const malformed = "[x](https://a.example/".repeat(10_000)
		const startedAt = performance.now()
		const result = extractUrls(malformed)

		expect(performance.now() - startedAt).toBeLessThan(500)
		expect(result.urls).toEqual(["https://a.example/"])
		expect(result.duplicates).toBe(9_999)
	})

	it("handles repeated unterminated markdown titles efficiently", () => {
		const malformed = "[x](https://a.example/ (unterminated ".repeat(10_000)
		const startedAt = performance.now()
		const result = extractUrls(malformed)

		expect(performance.now() - startedAt).toBeLessThan(500)
		expect(result.urls).toEqual(["https://a.example/"])
		expect(result.duplicates).toBe(9_999)
	})

	it("normalizes scheme-less URLs", () => {
		const { urls } = extractUrls("check supermemory.ai for details")
		expect(urls).toEqual(["https://supermemory.ai"])
	})

	it("does not extract URLs from email addresses", () => {
		const result = extractUrls("email me at john.doe@example.com")
		expect(result.urls).toEqual([])
		expect(result.duplicates).toBe(0)
	})

	it("keeps real URLs while skipping emails in the same text", () => {
		const { urls } = extractUrls(
			"email john.doe@example.com or visit https://supermemory.ai",
		)
		expect(urls).toEqual(["https://supermemory.ai"])
	})

	it("skips multiple email addresses", () => {
		const { urls } = extractUrls(
			"contacts: a.person@foo.example, b.person@bar.example",
		)
		expect(urls).toEqual([])
	})

	it("strips trailing punctuation", () => {
		const { urls } = extractUrls("read https://example.com/post.")
		expect(urls).toEqual(["https://example.com/post"])
	})

	it("dedupes URLs that differ only by scheme/host case or trailing slash", () => {
		const { urls, duplicates } = extractUrls(
			"HTTPS://EXAMPLE.COM/docs https://example.com/docs https://example.com/docs/",
		)
		expect(urls).toHaveLength(1)
		expect(duplicates).toBe(2)
	})

	it("keeps URLs whose paths differ only by case", () => {
		const { urls, duplicates } = extractUrls(
			"https://example.com/Page and https://example.com/page",
		)
		expect(urls).toEqual([
			"https://example.com/Page",
			"https://example.com/page",
		])
		expect(duplicates).toBe(0)
	})

	it("returns nothing for plain text", () => {
		expect(extractUrls("no links here").urls).toEqual([])
		expect(extractUrls("").urls).toEqual([])
	})
})
