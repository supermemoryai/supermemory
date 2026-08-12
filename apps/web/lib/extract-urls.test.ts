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
