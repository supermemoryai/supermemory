import { describe, expect, it } from "vitest"
import { toConversationImageUrl } from "./conversations-client"
import { normalizeBaseUrl } from "./shared/context"
import {
	DEFAULT_VALUES,
	SEARCH_LIMIT_BOUNDS,
	clampSearchLimit,
	deduplicateMemoriesForMode,
	getContainerTags,
} from "./tools-shared"

describe("clampSearchLimit", () => {
	it("keeps in-range integers", () => {
		expect(clampSearchLimit(7)).toBe(7)
	})

	it("clamps into SEARCH_LIMIT_BOUNDS", () => {
		expect(clampSearchLimit(0)).toBe(SEARCH_LIMIT_BOUNDS.min)
		expect(clampSearchLimit(-5)).toBe(SEARCH_LIMIT_BOUNDS.min)
		expect(clampSearchLimit(999)).toBe(SEARCH_LIMIT_BOUNDS.max)
	})

	it("floors fractional values and coerces numeric strings", () => {
		expect(clampSearchLimit(7.9)).toBe(7)
		expect(clampSearchLimit("12")).toBe(12)
	})

	it("falls back to the default for non-numeric input", () => {
		expect(clampSearchLimit("lots")).toBe(DEFAULT_VALUES.limit)
		expect(clampSearchLimit(undefined)).toBe(DEFAULT_VALUES.limit)
		expect(clampSearchLimit(Number.POSITIVE_INFINITY)).toBe(
			DEFAULT_VALUES.limit,
		)
	})
})

describe("getContainerTags", () => {
	it("uses the default project when no config is provided", () => {
		expect(getContainerTags()).toEqual(["sm_project_default"])
	})

	it("converts projectId into a project container tag", () => {
		expect(getContainerTags({ projectId: "abc" })).toEqual(["sm_project_abc"])
	})

	it("uses explicit container tags", () => {
		expect(getContainerTags({ containerTags: ["tag-a", "tag-b"] })).toEqual([
			"tag-a",
			"tag-b",
		])
	})

	it("rejects config with both projectId and containerTags", () => {
		expect(() =>
			getContainerTags({
				projectId: "abc",
				containerTags: ["tag-a"],
			}),
		).toThrow("either projectId or containerTags")
	})
})

describe("deduplicateMemoriesForMode", () => {
	// The profile is not injected in "query" mode, so a memory that is both a
	// profile fact and a search hit must survive in the search results —
	// otherwise it is dropped from the prompt entirely.
	it("keeps a search result that duplicates a profile memory in query mode", () => {
		const deduplicated = deduplicateMemoriesForMode("query", {
			static: [{ memory: "User is allergic to peanuts" }],
			dynamic: [],
			searchResults: [{ memory: "User is allergic to peanuts" }],
		})

		expect(deduplicated.searchResults).toEqual(["User is allergic to peanuts"])
		expect(deduplicated.static).toEqual([])
		expect(deduplicated.dynamic).toEqual([])
	})

	it("still deduplicates within the search results in query mode", () => {
		const deduplicated = deduplicateMemoriesForMode("query", {
			static: [],
			dynamic: [],
			searchResults: [
				{ memory: "User likes TypeScript" },
				"User likes TypeScript",
			],
		})

		expect(deduplicated.searchResults).toEqual(["User likes TypeScript"])
	})

	it("deduplicates normalized fact variants within and across sources", () => {
		const deduplicated = deduplicateMemoriesForMode("full", {
			static: [
				{ memory: "User likes TypeScript" },
				{ memory: "  user likes typescript  " },
			],
			dynamic: [{ memory: "[2026-08-10] USER LIKES TYPESCRIPT" }],
			searchResults: [{ memory: "User prefers async/await" }],
		})

		expect(deduplicated).toEqual({
			static: ["User likes TypeScript"],
			dynamic: [],
			searchResults: ["User prefers async/await"],
		})
	})

	it("deduplicates search results against the profile in full mode", () => {
		const deduplicated = deduplicateMemoriesForMode("full", {
			static: [{ memory: "User is allergic to peanuts" }],
			dynamic: [{ memory: "User is shipping a release today" }],
			searchResults: [
				{ memory: "User is allergic to peanuts" },
				{ memory: "User prefers async/await" },
			],
		})

		expect(deduplicated.static).toEqual(["User is allergic to peanuts"])
		expect(deduplicated.dynamic).toEqual(["User is shipping a release today"])
		expect(deduplicated.searchResults).toEqual(["User prefers async/await"])
	})

	it("deduplicates search results against the profile in profile mode", () => {
		const deduplicated = deduplicateMemoriesForMode("profile", {
			static: [{ memory: "User is allergic to peanuts" }],
			dynamic: [],
			searchResults: [{ memory: "User is allergic to peanuts" }],
		})

		expect(deduplicated.static).toEqual(["User is allergic to peanuts"])
		expect(deduplicated.searchResults).toEqual([])
	})
})

describe("normalizeBaseUrl", () => {
	it("returns default URL when input is missing or empty", () => {
		expect(normalizeBaseUrl()).toBe("https://api.supermemory.ai")
		expect(normalizeBaseUrl("")).toBe("https://api.supermemory.ai")
		expect(normalizeBaseUrl("   ")).toBe("https://api.supermemory.ai")
	})

	it("collapses single and multiple trailing slashes", () => {
		expect(normalizeBaseUrl("http://localhost:6768/")).toBe(
			"http://localhost:6768",
		)
		expect(normalizeBaseUrl("http://localhost:6768///")).toBe(
			"http://localhost:6768",
		)
		expect(normalizeBaseUrl("https://api.supermemory.ai/")).toBe(
			"https://api.supermemory.ai",
		)
	})

	it("trims whitespace around URLs", () => {
		expect(normalizeBaseUrl("  http://localhost:6768/  ")).toBe(
			"http://localhost:6768",
		)
	})
})

describe("toConversationImageUrl", () => {
	it("handles string URLs and trims whitespace", () => {
		expect(toConversationImageUrl("https://example.com/image.png")).toBe(
			"https://example.com/image.png",
		)
	})

	it("handles object representations containing url", () => {
		expect(
			toConversationImageUrl({ url: "https://example.com/avatar.jpg" }),
		).toBe("https://example.com/avatar.jpg")
	})

	it("returns null for invalid or empty inputs", () => {
		expect(toConversationImageUrl("")).toBeNull()
		expect(toConversationImageUrl(null)).toBeNull()
		expect(toConversationImageUrl(undefined)).toBeNull()
	})
})
