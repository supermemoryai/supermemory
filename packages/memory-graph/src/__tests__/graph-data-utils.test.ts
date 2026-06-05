import { describe, it, expect } from "vitest"
import {
	getMemoryBorderColor,
	getEdgeVisualProps,
	getMemoryOrbitOffset,
	computeClusterAssignments,
	getAppendPosition,
	getNodeBounds,
} from "../hooks/use-graph-data"
import { DEFAULT_COLORS } from "../constants"
import type { GraphApiDocument, GraphApiMemory, GraphNode } from "../types"

function makeMemory(overrides: Partial<GraphApiMemory> = {}): GraphApiMemory {
	return {
		id: "m1",
		memory: "test",
		isStatic: false,
		spaceId: "default",
		isLatest: true,
		isForgotten: false,
		forgetAfter: null,
		forgetReason: null,
		version: 1,
		parentMemoryId: null,
		rootMemoryId: null,
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		...overrides,
	}
}

function makeNode(id: string, x: number, y: number, size = 50): GraphNode {
	return {
		id,
		type: "document",
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

describe("getMemoryBorderColor", () => {
	const colors = DEFAULT_COLORS

	it("returns forgotten color for forgotten memories", () => {
		const mem = makeMemory({ isForgotten: true })
		expect(getMemoryBorderColor(mem, colors)).toBe(colors.memBorderForgotten)
	})

	it("returns expiring color for memories expiring within 7 days", () => {
		const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
		const mem = makeMemory({ forgetAfter: soon })
		expect(getMemoryBorderColor(mem, colors)).toBe(colors.memBorderExpiring)
	})

	it("returns recent color for memories created within 24 hours", () => {
		const recent = new Date(Date.now() - 1000).toISOString()
		const mem = makeMemory({ createdAt: recent })
		expect(getMemoryBorderColor(mem, colors)).toBe(colors.memBorderRecent)
	})

	it("returns default color for normal memories", () => {
		const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const mem = makeMemory({ createdAt: old })
		expect(getMemoryBorderColor(mem, colors)).toBe(colors.memStrokeDefault)
	})

	it("forgotten takes priority over expiring", () => {
		const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
		const mem = makeMemory({ isForgotten: true, forgetAfter: soon })
		expect(getMemoryBorderColor(mem, colors)).toBe(colors.memBorderForgotten)
	})
})

describe("getEdgeVisualProps", () => {
	it("returns correct props for derives edges", () => {
		const props = getEdgeVisualProps("derives")
		expect(props.opacity).toBeCloseTo(0.4)
		expect(props.thickness).toBeCloseTo(1.2)
	})

	it("returns correct props for updates edges", () => {
		const props = getEdgeVisualProps("updates")
		expect(props.opacity).toBeCloseTo(0.48)
		expect(props.thickness).toBeCloseTo(1.45)
	})

	it("returns correct props for extends edges", () => {
		const props = getEdgeVisualProps("extends")
		expect(props.opacity).toBeCloseTo(0.16)
		expect(props.thickness).toBeCloseTo(0.8)
	})

	it("returns default props for unknown edge types", () => {
		const props = getEdgeVisualProps("unknown")
		expect(props.opacity).toBeCloseTo(0.4)
		expect(props.thickness).toBeCloseTo(1.2)
	})
})

describe("cluster assignments", () => {
	it("keeps memories from the same document in the same visual cluster", () => {
		const assignments = computeClusterAssignments([
			makeDocument("doc-a", [
				makeMemory({ id: "a1" }),
				makeMemory({ id: "a2" }),
			]),
		])

		expect(assignments.get("a1")?.key).toBe(assignments.get("a2")?.key)
		expect(assignments.get("a1")?.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
	})

	it("merges cross-document relation clusters", () => {
		const assignments = computeClusterAssignments([
			makeDocument("doc-a", [makeMemory({ id: "a1" })]),
			makeDocument("doc-b", [
				makeMemory({ id: "b1", memoryRelations: { a1: "extends" } }),
			]),
		])

		expect(assignments.get("a1")?.key).toBe(assignments.get("b1")?.key)
	})
})

describe("memory orbit placement", () => {
	it("pushes high-index memories onto wider rings", () => {
		const early = getMemoryOrbitOffset(0, 80, "mem-0")
		const late = getMemoryOrbitOffset(50, 80, "mem-50")

		expect(late.radius).toBeGreaterThan(early.radius)
	})

	it("is deterministic for the same memory", () => {
		const first = getMemoryOrbitOffset(12, 40, "mem-12")
		const second = getMemoryOrbitOffset(12, 40, "mem-12")

		expect(second).toEqual(first)
	})
})

describe("append placement helpers", () => {
	it("computes bounds including node radius", () => {
		const bounds = getNodeBounds([
			makeNode("a", 100, 100, 50),
			makeNode("b", 300, 220, 40),
		])

		expect(bounds).toEqual({
			minX: 75,
			minY: 75,
			maxX: 320,
			maxY: 240,
			centerX: 197.5,
			centerY: 157.5,
		})
	})

	it("places appended nodes outside existing graph bounds", () => {
		const existing = [makeNode("a", 100, 100, 50), makeNode("b", 300, 220, 40)]
		const bounds = getNodeBounds(existing)
		const pos = getAppendPosition(existing, 0, 1000, 800)

		if (!bounds) throw new Error("Expected bounds")
		const outsideBounds =
			pos.x < bounds.minX ||
			pos.x > bounds.maxX ||
			pos.y < bounds.minY ||
			pos.y > bounds.maxY
		expect(outsideBounds).toBe(true)
	})

	it("distributes append positions across multiple surrounding areas", () => {
		const existing = [makeNode("a", 100, 100, 50), makeNode("b", 300, 220, 40)]
		const bounds = getNodeBounds(existing)
		if (!bounds) throw new Error("Expected bounds")

		const areas = new Set(
			Array.from({ length: 8 }, (_, index) => {
				const pos = getAppendPosition(existing, index, 1000, 800)
				if (pos.x < bounds.minX) return "left"
				if (pos.x > bounds.maxX) return "right"
				if (pos.y < bounds.minY) return "top"
				return "bottom"
			}),
		)

		expect(areas.size).toBeGreaterThan(2)
	})

	it("uses the canvas center when no existing nodes are available", () => {
		expect(getAppendPosition([], 0, 1000, 800)).toEqual({ x: 500, y: 400 })
	})
})

function makeDocument(
	id: string,
	memories: GraphApiMemory[],
): GraphApiDocument {
	return {
		id,
		title: id,
		summary: null,
		documentType: "text",
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		memories,
	}
}
