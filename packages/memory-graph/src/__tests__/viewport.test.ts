import { describe, it, expect } from "vitest"
import { ViewportState } from "../canvas/viewport"
import type { GraphNode } from "../types"

function makeNode(id: string, x: number, y: number): GraphNode {
	return {
		id,
		type: "document",
		x,
		y,
		size: 50,
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

/** Run tick() until animation converges (or max iterations) */
function tickUntilSettled(vp: ViewportState, maxIter = 500): void {
	for (let i = 0; i < maxIter; i++) {
		if (!vp.tick()) break
	}
}

describe("ViewportState", () => {
	it("constructor sets initial values", () => {
		const vp = new ViewportState()
		expect(vp.panX).toBe(0)
		expect(vp.panY).toBe(0)
		expect(vp.zoom).toBe(0.5) // default initial zoom
	})

	it("constructor accepts custom initial values", () => {
		const vp = new ViewportState(10, 20, 1.5)
		expect(vp.panX).toBe(10)
		expect(vp.panY).toBe(20)
		expect(vp.zoom).toBe(1.5)
	})

	it("worldToScreen and screenToWorld are inverse operations", () => {
		const vp = new ViewportState(100, 50, 1.5)

		const worldX = 300
		const worldY = 400
		const screen = vp.worldToScreen(worldX, worldY)
		const world = vp.screenToWorld(screen.x, screen.y)

		expect(world.x).toBeCloseTo(worldX, 5)
		expect(world.y).toBeCloseTo(worldY, 5)
	})

	it("worldToScreen applies zoom and pan: screen = world * zoom + pan", () => {
		const vp = new ViewportState(10, 20, 2)

		const screen = vp.worldToScreen(100, 200)
		expect(screen.x).toBe(100 * 2 + 10) // 210
		expect(screen.y).toBe(200 * 2 + 20) // 420
	})

	it("screenToWorld reverses: world = (screen - pan) / zoom", () => {
		const vp = new ViewportState(10, 20, 2)

		const world = vp.screenToWorld(210, 420)
		expect(world.x).toBeCloseTo(100, 5)
		expect(world.y).toBeCloseTo(200, 5)
	})

	it("pan offsets correctly and accumulates", () => {
		const vp = new ViewportState(0, 0, 1)
		vp.pan(50, 30)
		expect(vp.panX).toBe(50)
		expect(vp.panY).toBe(30)

		vp.pan(10, 20)
		expect(vp.panX).toBe(60)
		expect(vp.panY).toBe(50)
	})

	it("pan cancels any animated pan target", () => {
		const vp = new ViewportState(0, 0, 1)
		vp.centerOn(500, 500, 800, 600) // sets targetPanX/Y
		vp.pan(10, 10) // should cancel the target
		// After pan, tick should return false (no animation)
		expect(vp.tick()).toBe(false)
	})

	it("zoomImmediate multiplies current zoom by delta", () => {
		const vp = new ViewportState(0, 0, 1)
		const initialZoom = vp.zoom
		vp.zoomImmediate(2, 0, 0)
		expect(vp.zoom).toBeCloseTo(initialZoom * 2)
	})

	it("zoomImmediate preserves world point under anchor", () => {
		const vp = new ViewportState(100, 50, 1)
		const anchorX = 400
		const anchorY = 300

		// Get world point under anchor before zoom
		const worldBefore = vp.screenToWorld(anchorX, anchorY)
		vp.zoomImmediate(2, anchorX, anchorY)
		// After zoom, same screen point should map to same world point
		const worldAfter = vp.screenToWorld(anchorX, anchorY)

		expect(worldAfter.x).toBeCloseTo(worldBefore.x, 3)
		expect(worldAfter.y).toBeCloseTo(worldBefore.y, 3)
	})

	it("zoomImmediate clamps to MIN_ZOOM (0.1)", () => {
		const vp = new ViewportState(0, 0, 0.5)
		// Try to zoom way down: 0.5 * 0.01 = 0.005, should clamp to 0.1
		vp.zoomImmediate(0.01, 0, 0)
		expect(vp.zoom).toBeCloseTo(0.1)
	})

	it("can lower the minimum zoom to fit a large loaded graph", () => {
		const vp = new ViewportState(0, 0, 0.5)
		const nodes = [
			makeNode("a", 0, 0),
			makeNode("b", 10_000, 0),
			makeNode("c", 0, 10_000),
			makeNode("d", 10_000, 10_000),
		]

		vp.setMinZoomForNodes(nodes, 800, 600)
		vp.zoomImmediate(0.01, 0, 0)

		expect(vp.zoom).toBeLessThan(0.1)
		expect(vp.zoom).toBeGreaterThan(0.005)
	})

	it("zoomImmediate clamps to MAX_ZOOM (5.0)", () => {
		const vp = new ViewportState(0, 0, 2)
		// Try to zoom way up: 2 * 100 = 200, should clamp to 5
		vp.zoomImmediate(100, 0, 0)
		expect(vp.zoom).toBeCloseTo(5.0)
	})

	it("zoomTo sets target zoom (animated via tick)", () => {
		const vp = new ViewportState(0, 0, 0.5)
		vp.zoomTo(2, 400, 300)
		// Zoom hasn't changed yet — it's animated
		expect(vp.zoom).toBe(0.5)
		// After ticking, zoom should approach target
		tickUntilSettled(vp)
		expect(vp.zoom).toBeCloseTo(2, 1)
	})

	it("tick returns false when no animation is active", () => {
		const vp = new ViewportState()
		expect(vp.tick()).toBe(false)
	})

	it("tick returns true during inertia", () => {
		const vp = new ViewportState()
		vp.releaseWithVelocity(10, 10)
		expect(vp.tick()).toBe(true)
	})

	it("tick returns true during zoom animation", () => {
		const vp = new ViewportState(0, 0, 0.5)
		vp.zoomTo(2, 0, 0)
		expect(vp.tick()).toBe(true)
	})

	it("tick returns true during pan animation", () => {
		const vp = new ViewportState(0, 0, 1)
		vp.centerOn(500, 500, 800, 600)
		expect(vp.tick()).toBe(true)
	})

	it("fitToNodes centers and scales to fit all nodes", () => {
		const vp = new ViewportState(0, 0, 0.5)
		const nodes = [
			makeNode("a", 0, 0),
			makeNode("b", 1000, 0),
			makeNode("c", 0, 1000),
			makeNode("d", 1000, 1000),
		]
		vp.fitToNodes(nodes, 800, 600)
		tickUntilSettled(vp)

		// After fitting, all nodes should be visible within the viewport
		for (const node of nodes) {
			const screen = vp.worldToScreen(node.x, node.y)
			expect(screen.x).toBeGreaterThan(-100)
			expect(screen.x).toBeLessThan(900)
			expect(screen.y).toBeGreaterThan(-100)
			expect(screen.y).toBeLessThan(700)
		}
	})

	it("fitToNodes handles single node without throwing", () => {
		const vp = new ViewportState()
		expect(() =>
			vp.fitToNodes([makeNode("a", 500, 500)], 800, 600),
		).not.toThrow()
	})

	it("fitToNodes handles empty nodes array without throwing", () => {
		const vp = new ViewportState()
		const zoomBefore = vp.zoom
		vp.fitToNodes([], 800, 600)
		// Should be a no-op
		expect(vp.zoom).toBe(zoomBefore)
	})

	it("centerOn animates pan to center a world point on screen", () => {
		const vp = new ViewportState(0, 0, 1)
		vp.centerOn(500, 300, 800, 600)
		tickUntilSettled(vp)

		// After settling, world point (500, 300) should map to screen center (400, 300)
		const screen = vp.worldToScreen(500, 300)
		expect(screen.x).toBeCloseTo(400, 0)
		expect(screen.y).toBeCloseTo(300, 0)
	})

	it("inertia decays to zero", () => {
		const vp = new ViewportState()
		vp.releaseWithVelocity(100, 100)
		tickUntilSettled(vp)
		// After settling, tick should return false
		expect(vp.tick()).toBe(false)
	})
})
