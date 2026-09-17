import { describe, expect, it } from "vitest"
import type { GraphNode } from "../types"
import { searchNodes } from "../utils/node-search"

function docNode(
	id: string,
	title: string | null,
	summary: string | null = null,
	type = "document",
): GraphNode {
	return {
		id,
		type: "document",
		x: 0,
		y: 0,
		size: 40,
		borderColor: "#fff",
		isHovered: false,
		isDragging: false,
		data: {
			id,
			title,
			summary,
			type,
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
			memories: [],
		},
	}
}

function memoryNode(id: string, memory: string, content = ""): GraphNode {
	return {
		id,
		type: "memory",
		x: 0,
		y: 0,
		size: 24,
		borderColor: "#fff",
		isHovered: false,
		isDragging: false,
		data: {
			id,
			memory,
			content,
			documentId: "doc-x",
			isStatic: false,
			isLatest: true,
			isForgotten: false,
			forgetAfter: null,
			forgetReason: null,
			version: 1,
			parentMemoryId: null,
			spaceId: "space-1",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		},
	}
}

describe("searchNodes", () => {
	it("returns nothing for an empty or whitespace query", () => {
		const nodes = [docNode("d1", "Alpha")]
		expect(searchNodes(nodes, "")).toEqual([])
		expect(searchNodes(nodes, "   ")).toEqual([])
	})

	it("matches document titles case-insensitively", () => {
		const nodes = [docNode("d1", "Quarterly Report"), docNode("d2", "Recipes")]
		const result = searchNodes(nodes, "REPORT")
		expect(result.map((n) => n.id)).toEqual(["d1"])
	})

	it("matches memory text and content", () => {
		const nodes = [
			memoryNode("m1", "User prefers dark mode"),
			memoryNode("m2", "Lives in Berlin", "moved there in 2021"),
		]
		expect(searchNodes(nodes, "dark").map((n) => n.id)).toEqual(["m1"])
		expect(searchNodes(nodes, "2021").map((n) => n.id)).toEqual(["m2"])
	})

	it("ranks primary-field matches above secondary-field matches", () => {
		// d2's summary contains the term; d1's title contains it. Title wins.
		const nodes = [
			docNode("d2", "Unrelated", "a note about invoices"),
			docNode("d1", "Invoices", "quarterly totals"),
		]
		expect(searchNodes(nodes, "invoice").map((n) => n.id)).toEqual(["d1", "d2"])
	})

	it("ranks a prefix match above a mid-string match", () => {
		const nodes = [docNode("d1", "Redesign proposal"), docNode("d2", "Design")]
		expect(searchNodes(nodes, "design").map((n) => n.id)).toEqual(["d2", "d1"])
	})

	it("keeps input order for equally-scored matches", () => {
		const nodes = [
			docNode("d1", "Design system"),
			docNode("d2", "Design tokens"),
			docNode("d3", "Design review"),
		]
		expect(searchNodes(nodes, "design").map((n) => n.id)).toEqual([
			"d1",
			"d2",
			"d3",
		])
	})

	it("tolerates null titles and missing content without matching them", () => {
		const nodes = [docNode("d1", null, null), memoryNode("m1", "hello")]
		expect(searchNodes(nodes, "hello").map((n) => n.id)).toEqual(["m1"])
		expect(searchNodes(nodes, "null")).toEqual([])
	})
})
