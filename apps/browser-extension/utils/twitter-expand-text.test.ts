import { describe, expect, it } from "bun:test"
import { expandTweetText } from "./twitter-utils"

const link = (url: string, expanded_url: string, display_url: string) => ({
	url,
	expanded_url,
	display_url,
	indices: [0, url.length] as [number, number],
})

describe("expandTweetText", () => {
	it("returns the text unchanged when there are no url entities", () => {
		expect(expandTweetText("just text", undefined)).toBe("just text")
		expect(expandTweetText("just text", [])).toBe("just text")
	})

	it("replaces a t.co shortlink with a markdown link to the expanded url", () => {
		const text = "check this https://t.co/abc123 out"
		const urls = [
			link(
				"https://t.co/abc123",
				"https://example.com/article",
				"example.com/article",
			),
		]
		expect(expandTweetText(text, urls)).toBe(
			"check this [example.com/article](https://example.com/article) out",
		)
	})

	it("expands multiple shortlinks including repeats", () => {
		const text = "a https://t.co/aaa b https://t.co/bbb c https://t.co/aaa"
		const urls = [
			link("https://t.co/aaa", "https://a.com", "a.com"),
			link("https://t.co/bbb", "https://b.com", "b.com"),
		]
		expect(expandTweetText(text, urls)).toBe(
			"a [a.com](https://a.com) b [b.com](https://b.com) c [a.com](https://a.com)",
		)
	})

	it("falls back to the expanded url as label when display_url is empty", () => {
		const text = "see https://t.co/xyz"
		const urls = [link("https://t.co/xyz", "https://long.example.com/path", "")]
		expect(expandTweetText(text, urls)).toBe(
			"see [https://long.example.com/path](https://long.example.com/path)",
		)
	})

	it("skips entries missing a url or expanded_url", () => {
		const text = "keep https://t.co/keep here"
		const urls = [
			link("", "https://nope.com", "nope.com"),
			link("https://t.co/keep", "", "keep.com"),
		]
		expect(expandTweetText(text, urls)).toBe("keep https://t.co/keep here")
	})
})
