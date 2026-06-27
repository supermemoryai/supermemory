import { describe, expect, it } from "bun:test"
import {
	collectValidUrls,
	isLinkedInProfileUrl,
	isTwitterUrl,
} from "./url-helpers"

describe("social URL detection", () => {
	it("matches Twitter and X by hostname only", () => {
		expect(isTwitterUrl("https://twitter.com/supermemoryai")).toBe(true)
		expect(isTwitterUrl("https://mobile.twitter.com/supermemoryai")).toBe(true)
		expect(isTwitterUrl("https://x.com/supermemoryai")).toBe(true)
		expect(isTwitterUrl("x.com/supermemoryai")).toBe(true)

		expect(isTwitterUrl("https://exampletwitter.com/supermemoryai")).toBe(false)
		expect(isTwitterUrl("https://notx.com/profile")).toBe(false)
		expect(isTwitterUrl("https://example.com/twitter.com/supermemoryai")).toBe(
			false,
		)
		expect(isTwitterUrl("https://x.com.evil.example/supermemoryai")).toBe(false)
	})

	it("matches LinkedIn profile URLs by hostname and /in/ path", () => {
		expect(isLinkedInProfileUrl("https://linkedin.com/in/supermemoryai")).toBe(
			true,
		)
		expect(
			isLinkedInProfileUrl("https://www.linkedin.com/in/supermemoryai"),
		).toBe(true)
		expect(isLinkedInProfileUrl("linkedin.com/in/supermemoryai")).toBe(true)

		expect(
			isLinkedInProfileUrl(
				"https://evil.example/linkedin.com/in/supermemoryai",
			),
		).toBe(false)
		expect(isLinkedInProfileUrl("https://linkedin.com/company/acme")).toBe(
			false,
		)
		expect(isLinkedInProfileUrl("https://notlinkedin.com/in/person")).toBe(
			false,
		)
		expect(isLinkedInProfileUrl("https://linkedin.com/in")).toBe(false)
	})
})

describe("collectValidUrls", () => {
	it("keeps non-Twitter domains that only contain x.com as text", () => {
		expect(collectValidUrls("", ["https://notx.com/profile"])).toEqual([
			"https://notx.com/profile",
		])
	})

	it("rejects LinkedIn profile URLs on unrelated hosts", () => {
		expect(
			collectValidUrls("https://evil.example/linkedin.com/in/person", []),
		).toEqual([])
	})
})
