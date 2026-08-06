import { describe, expect, it } from "bun:test"
import {
	buildSearchMemoriesBody,
	formatSearchHitText,
	formatSearchHitsForPrompt,
} from "./search-request"

describe("buildSearchMemoriesBody", () => {
	it("defaults to hybrid search with related memories", () => {
		expect(buildSearchMemoriesBody("deploy notes")).toEqual({
			q: "deploy notes",
			searchMode: "hybrid",
			include: { relatedMemories: true },
		})
	})

	it("includes the container tag when provided", () => {
		expect(buildSearchMemoriesBody("deploy notes", "sm_project_docs")).toEqual({
			q: "deploy notes",
			searchMode: "hybrid",
			include: { relatedMemories: true },
			containerTag: "sm_project_docs",
		})
	})
})

describe("formatSearchHitText", () => {
	it("prefers memory text over chunk text", () => {
		expect(
			formatSearchHitText({ memory: "Likes TypeScript", chunk: "doc chunk" }),
		).toBe("Likes TypeScript")
	})

	it("falls back to chunk when memory is missing", () => {
		expect(formatSearchHitText({ chunk: "  RAG chunk text  " })).toBe(
			"RAG chunk text",
		)
	})

	it("falls back to chunk when memory is only whitespace", () => {
		expect(
			formatSearchHitText({
				memory: "   ",
				chunk: "Important document text",
			}),
		).toBe("Important document text")
	})

	it("returns null for empty hits", () => {
		expect(formatSearchHitText({})).toBeNull()
		expect(formatSearchHitText({ memory: "   " })).toBeNull()
	})
})

describe("formatSearchHitsForPrompt", () => {
	it("numbers contiguous lines and skips empty hybrid hits", () => {
		expect(
			formatSearchHitsForPrompt([
				{ memory: "Prefers dark mode" },
				{ memory: undefined, chunk: undefined },
				{ chunk: "Shipping docs mention staging URLs" },
			]),
		).toEqual([
			"1. Prefers dark mode \n",
			"2. Shipping docs mention staging URLs \n",
		])
	})
})
