import { describe, expect, it } from "bun:test"
import { buildSearchMemoriesBody } from "./search-request"

describe("buildSearchMemoriesBody", () => {
	it("builds the default related-memory search body", () => {
		expect(buildSearchMemoriesBody("deploy notes")).toEqual({
			q: "deploy notes",
			include: { relatedMemories: true },
		})
	})

	it("includes the container tag when provided", () => {
		expect(buildSearchMemoriesBody("deploy notes", "sm_project_docs")).toEqual({
			q: "deploy notes",
			include: { relatedMemories: true },
			containerTag: "sm_project_docs",
		})
	})
})
