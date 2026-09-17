import { describe, it, expect } from "vitest"
import { SpatialIndex } from "../canvas/hit-test"
import type { GraphNode } from "../types"

function makeNode(
	id: string,
	x: number,
	y: number,
	type: "document" | "memory" = "document",
	size = 50,
): GraphNode {
	return {
		id,
		type,
		x,
		y,
		size,
		borderColor: "#fff",
		isHovered: false,
		isDragging: false,
		data: {
			id,
			title: id,
			summary: null,
			type: "text",
			createdAt: "2024-01-01",
			updatedAt: "2024-01-01",
			memories: [],
		},
	}
}

describe("SpatialIndex", () => {
	it("rebuild returns true on first build", () => {
		const idx = new SpatialIndex()
		const result = idx.rebuild([makeNode("a", 100, 100)])
		expect(result).toBe(true)
	})

	it("rebuild returns false when hash unchanged", () => {
		const idx = new SpatialIndex()
		const nodes = [makeNode("a", 100, 100)]
		idx.rebuild(nodes)
		const result = idx.rebuild(nodes)
		expect(result).toBe(false)
	})

	it("rebuild returns true when positions change", () => {
		const idx = new SpatialIndex()
		const nodes = [makeNode("a", 100, 100)]
		idx.rebuild(nodes)
		nodes[0]!.x = 500
		const result = idx.rebuild(nodes)
		expect(result).toBe(true)
	})

	it("hash guard keeps stale objects for a new generation at the same positions", () => {
		// Documents why force exists: a regenerated node array (resize,
		// theme change) carries identical ids/positions, so the content
		// hash cannot see it.
		const idx = new SpatialIndex()
		const genA = [makeNode("a", 100, 100)]
		idx.rebuild(genA)

		const genB = [makeNode("a", 100, 100)]
		expect(idx.rebuild(genB)).toBe(false)
		expect(idx.queryPoint(100, 100)).toBe(genA[0])
	})

	it("force rebuild swaps the grid to the new node generation", () => {
		const idx = new SpatialIndex()
		const genA = [makeNode("a", 100, 100)]
		idx.rebuild(genA)

		const genB = [makeNode("a", 100, 100)]
		expect(idx.rebuild(genB, true)).toBe(true)
		expect(idx.queryPoint(100, 100)).toBe(genB[0])
	})

	it("force rebuild still refreshes the hash for subsequent unforced calls", () => {
		const idx = new SpatialIndex()
		const nodes = [makeNode("a", 100, 100)]
		idx.rebuild(nodes, true)
		expect(idx.rebuild(nodes)).toBe(false)
	})

	it("rebuild detects sub-pixel movements (10x granularity)", () => {
		const idx = new SpatialIndex()
		const nodes = [makeNode("a", 100.0, 100.0)]
		idx.rebuild(nodes)
		// Move by 0.2 pixels — should be detected with 10x rounding
		nodes[0]!.x = 100.2
		const result = idx.rebuild(nodes)
		expect(result).toBe(true)
	})

	it("queryPoint finds correct node (document - square hit test)", () => {
		const idx = new SpatialIndex()
		const node = makeNode("a", 100, 100, "document", 50)
		idx.rebuild([node])
		const found = idx.queryPoint(105, 105)
		expect(found).not.toBeNull()
		expect(found!.id).toBe("a")
	})

	it("queryPoint finds correct node (memory - circle hit test)", () => {
		const idx = new SpatialIndex()
		const node = makeNode("m1", 200, 200, "memory", 36)
		idx.rebuild([node])
		// Inside the circle (radius = 18)
		const found = idx.queryPoint(210, 210)
		expect(found).not.toBeNull()
		expect(found!.id).toBe("m1")
	})

	it("queryPoint returns null for empty grid", () => {
		const idx = new SpatialIndex()
		idx.rebuild([])
		expect(idx.queryPoint(100, 100)).toBeNull()
	})

	it("queryPoint returns null for distant coordinates", () => {
		const idx = new SpatialIndex()
		idx.rebuild([makeNode("a", 100, 100)])
		expect(idx.queryPoint(5000, 5000)).toBeNull()
	})

	it("queryPoint handles overlapping nodes (returns last in render order)", () => {
		const idx = new SpatialIndex()
		const nodes = [
			makeNode("a", 100, 100, "document", 50),
			makeNode("b", 110, 110, "document", 50),
		]
		idx.rebuild(nodes)
		// Both nodes overlap at (105, 105), should return the last one (higher z)
		const found = idx.queryPoint(105, 105)
		expect(found).not.toBeNull()
		expect(found!.id).toBe("b")
	})

	it("queryPoint works across cell boundaries", () => {
		const idx = new SpatialIndex()
		// Node at cell boundary (cellSize = 200)
		const node = makeNode("edge", 199, 199, "document", 50)
		idx.rebuild([node])
		// Query from adjacent cell
		const found = idx.queryPoint(201, 201)
		expect(found).not.toBeNull()
		expect(found!.id).toBe("edge")
	})

	it("handles many nodes without errors", () => {
		const idx = new SpatialIndex()
		const nodes = Array.from({ length: 1000 }, (_, i) =>
			makeNode(`n${i}`, Math.random() * 2000, Math.random() * 2000),
		)
		expect(() => idx.rebuild(nodes)).not.toThrow()
		// Should find at least some nodes
		const found = idx.queryPoint(nodes[0]!.x, nodes[0]!.y)
		expect(found).not.toBeNull()
	})
})
