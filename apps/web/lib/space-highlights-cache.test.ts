import { describe, expect, it } from "bun:test"
import {
	getSpaceHighlightsCacheKey,
	LEGACY_SPACE_HIGHLIGHTS_CACHE_NAME,
	SPACE_HIGHLIGHTS_CACHE_NAME,
} from "./space-highlights-cache"

describe("space highlights cache", () => {
	it("does not reuse the legacy account-agnostic cache", () => {
		expect(SPACE_HIGHLIGHTS_CACHE_NAME).toBe("space-highlights-v2")
		expect(SPACE_HIGHLIGHTS_CACHE_NAME).not.toBe(
			LEGACY_SPACE_HIGHLIGHTS_CACHE_NAME,
		)
	})

	it("scopes cache keys by user, organization, and space", () => {
		const cacheKey = getSpaceHighlightsCacheKey({
			backendUrl: "https://api.supermemory.ai",
			spaceId: "sm_project_default",
			userId: "user-1",
			organizationId: "org-1",
		})

		expect(cacheKey).toBe(
			"https://api.supermemory.ai/v3/space-highlights?spaceId=sm_project_default&userId=user-1&organizationId=org-1",
		)
	})

	it("produces different keys for different accounts sharing a project tag", () => {
		const firstAccount = getSpaceHighlightsCacheKey({
			backendUrl: "https://api.supermemory.ai",
			spaceId: "sm_project_default",
			userId: "user-1",
			organizationId: "org-1",
		})
		const secondAccount = getSpaceHighlightsCacheKey({
			backendUrl: "https://api.supermemory.ai",
			spaceId: "sm_project_default",
			userId: "user-2",
			organizationId: "org-2",
		})

		expect(firstAccount).not.toBe(secondAccount)
	})

	it("safely encodes identifiers used in cache keys", () => {
		const cacheKey = getSpaceHighlightsCacheKey({
			backendUrl: "http://localhost:8787/",
			spaceId: "project&shared=true",
			userId: "user?admin=true",
			organizationId: "org/name",
		})
		const url = new URL(cacheKey)

		expect(url.searchParams.get("spaceId")).toBe("project&shared=true")
		expect(url.searchParams.get("userId")).toBe("user?admin=true")
		expect(url.searchParams.get("organizationId")).toBe("org/name")
	})
})
