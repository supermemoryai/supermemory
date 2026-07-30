import { describe, expect, it } from "vitest"
import type { ContainerTag } from "../shared/types"
import {
	compactDescription,
	formatFactSection,
	formatSpaceRow,
	sortSpaces,
} from "./space-presentation"

const space = (
	containerTag: string,
	lastActivityAt: string | null,
): ContainerTag => ({
	id: containerTag,
	name: `Space ${containerTag}`,
	containerTag,
	description: "A compact space description.",
	visibility: "private",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	isExperimental: false,
	isNova: false,
	documentCount: 2,
	memoryCount: 3,
	lastActivityAt,
})

describe("space presentation", () => {
	it("keeps the active space first, then sorts by activity", () => {
		const sorted = sortSpaces(
			[
				space("older", "2026-01-01T00:00:00.000Z"),
				space("active", "2025-01-01T00:00:00.000Z"),
				space("newer", "2026-02-01T00:00:00.000Z"),
			],
			"active",
		)

		expect(sorted.map((item) => item.containerTag)).toEqual([
			"active",
			"newer",
			"older",
		])
	})

	it("formats compact rows without internal database IDs", () => {
		const row = formatSpaceRow(
			space("project-key", "2026-07-29T19:44:28.177Z"),
			"project-key",
		)

		expect(row).toContain("[project-key] · Active")
		expect(row).toContain("2 documents · 3 memories")
		expect(row).toContain("Last active Jul 29, 2026")
		expect(row).not.toContain('"id"')
	})

	it("caps descriptions and fact lists", () => {
		expect(compactDescription("A".repeat(30), 12)).toBe("AAAAAAAAA...")
		expect(
			formatFactSection("Recent Context", ["one", "two", "three"], 2),
		).toEqual(["## Recent Context", "- one", "- two", "- +1 more"])
	})
})
