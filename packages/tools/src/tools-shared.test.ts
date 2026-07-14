import { describe, expect, it } from "vitest"
import { getContainerTags } from "./tools-shared"

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
