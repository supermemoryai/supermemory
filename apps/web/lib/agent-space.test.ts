import { describe, expect, it } from "bun:test"
import {
	agentSourceValues,
	groupAgentSpaces,
	isAgentContainerTag,
	isAgentsSelection,
} from "./agent-space"

describe("Agents spaces", () => {
	it("recognizes only Claude and Codex shared and legacy tags", () => {
		expect(isAgentContainerTag("user_project_0123456789abcdef")).toBe(true)
		expect(isAgentContainerTag("repo_supermemory")).toBe(true)
		expect(isAgentContainerTag("claudecode_project_0123456789abcdef")).toBe(
			true,
		)
		expect(isAgentContainerTag("codex_project_0123456789abcdef")).toBe(true)
		expect(isAgentContainerTag("codex_user_0123456789abcdef")).toBe(true)
		expect(isAgentContainerTag("opencode_project_0123456789abcdef")).toBe(false)
	})

	it("shows agent filters only for an Agents selection", () => {
		expect(
			isAgentsSelection(["user_project_0123456789abcdef", "repo_supermemory"]),
		).toBe(true)
		expect(isAgentsSelection(["repo_supermemory", "sm_project_default"])).toBe(
			false,
		)
		expect(isAgentsSelection([])).toBe(false)
	})

	it("maps filter labels to canonical and legacy document sources", () => {
		expect(agentSourceValues("claude-code")).toEqual([
			"claude-code",
			"claude-code-plugin",
		])
		expect(agentSourceValues("codex")).toEqual(["codex"])
		expect(agentSourceValues(null)).toBeUndefined()
	})

	it("groups canonical and legacy project containers without synthetic tags", () => {
		const projects = [
			{ containerTag: "repo_supermemory" },
			{ containerTag: "codex_project_0123456789abcdef" },
			{ containerTag: "claudecode_project_0123456789abcdef" },
			{ containerTag: "user_project_0123456789abcdef" },
		]
		const metadata = new Map(
			projects.map((project) => [
				project.containerTag,
				{ projectName: "supermemory" },
			]),
		)

		const groups = groupAgentSpaces(projects, metadata)

		expect(groups).toHaveLength(1)
		expect(groups[0]?.label).toBe("supermemory")
		expect(groups[0]?.representative.containerTag).toBe(
			"user_project_0123456789abcdef",
		)
		expect(groups[0]?.containerTags).toEqual([
			"user_project_0123456789abcdef",
			"claudecode_project_0123456789abcdef",
			"repo_supermemory",
			"codex_project_0123456789abcdef",
		])
	})

	it("keeps the old global Codex personal container separate", () => {
		const projects = [
			{ containerTag: "user_project_0123456789abcdef" },
			{ containerTag: "codex_user_fedcba9876543210" },
		]
		const metadata = new Map(
			projects.map((project) => [
				project.containerTag,
				{ projectName: "supermemory" },
			]),
		)

		const groups = groupAgentSpaces(projects, metadata)

		expect(groups).toHaveLength(2)
		expect(groups[0]?.label).toBe("supermemory")
		expect(groups[1]?.label).toBe("Legacy Codex personal")
		expect(groups[1]?.kind).toBe("legacy-personal")
	})

	it("groups path-scoped legacy tags even before metadata loads", () => {
		const projects = [
			{ containerTag: "claudecode_project_0123456789abcdef" },
			{ containerTag: "codex_project_0123456789abcdef" },
		]

		const groups = groupAgentSpaces(projects, new Map())

		expect(groups).toHaveLength(1)
		expect(groups[0]?.representative.containerTag).toBe(
			"claudecode_project_0123456789abcdef",
		)
	})
})
