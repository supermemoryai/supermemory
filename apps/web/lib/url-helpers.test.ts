import { describe, expect, it } from "bun:test"
import {
	collectValidUrls,
	extractUrls,
	getPublicRequestUrl,
	resolveAuthRedirectUrl,
} from "./url-helpers"

describe("url helpers", () => {
	it("reconstructs public request URLs from forwarded headers", () => {
		const request = new Request("http://localhost:3000/settings?tab=billing", {
			headers: {
				"x-forwarded-host": "app.dev.supermemory.ai",
				"x-forwarded-proto": "https",
			},
		})

		expect(getPublicRequestUrl(request).toString()).toBe(
			"https://app.dev.supermemory.ai/settings?tab=billing",
		)
	})

	it("maps localhost auth redirects back to the current public origin", () => {
		const resolved = resolveAuthRedirectUrl(
			"http://localhost:3000/settings?tab=billing",
			"https://app.dev.supermemory.ai",
		)

		expect(resolved.toString()).toBe(
			"https://app.dev.supermemory.ai/settings?tab=billing",
		)
	})

	it("extracts distinct URLs from markdown, angle links, and bare links", () => {
		const result = extractUrls(
			"Read [docs](https://example.com/docs), <https://example.com/docs>, and example.org/path.",
		)

		expect(result.urls).toEqual([
			"https://example.com/docs",
			"https://example.org/path",
		])
		expect(result.duplicates).toBe(1)
	})

	it("keeps LinkedIn profile URLs and excludes X/Twitter links", () => {
		expect(
			collectValidUrls("linkedin.com/in/sam", [
				"https://x.com/sam",
				"example.com",
			]),
		).toEqual(["https://linkedin.com/in/sam", "https://example.com"])
	})
})
