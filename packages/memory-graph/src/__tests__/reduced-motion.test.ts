import { afterEach, describe, expect, it, vi } from "vitest"
import { prefersReducedMotion } from "../canvas/reduced-motion"
import { ForceSimulation } from "../canvas/simulation"
import { ViewportState } from "../canvas/viewport"
import type { GraphEdge, GraphNode } from "../types"

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("reduce") ? matches : false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		onchange: null,
		dispatchEvent: () => false,
	}))
}

afterEach(() => vi.unstubAllGlobals())

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

const nodes: GraphNode[] = [
	makeNode("a", 0, 0),
	makeNode("b", 100, 0),
	makeNode("c", 0, 100),
]
const edges: GraphEdge[] = [
	{
		id: "a-b",
		source: "a",
		target: "b",
		edgeType: "derives",
		visualProps: { opacity: 1, thickness: 1 },
	},
]

describe("prefersReducedMotion", () => {
	it("returns false when matchMedia is unavailable", () => {
		vi.stubGlobal("matchMedia", undefined)
		expect(prefersReducedMotion()).toBe(false)
	})

	it("reflects the matchMedia result", () => {
		stubReducedMotion(true)
		expect(prefersReducedMotion()).toBe(true)
		stubReducedMotion(false)
		expect(prefersReducedMotion()).toBe(false)
	})
})

describe("ForceSimulation reduced-motion", () => {
	it("leaves the layout static after init and ignores reheat", () => {
		stubReducedMotion(true)
		const sim = new ForceSimulation()
		sim.init(nodes, edges)
		expect(sim.isActive()).toBe(false)
		sim.reheat()
		expect(sim.isActive()).toBe(false)
		sim.destroy()
	})

	it("keeps the simulation running after init when motion is allowed", () => {
		stubReducedMotion(false)
		const sim = new ForceSimulation()
		sim.init(nodes, edges)
		expect(sim.isActive()).toBe(true)
		sim.destroy()
	})
})

describe("ViewportState reduced-motion", () => {
	it("drops fling momentum under reduced motion", () => {
		stubReducedMotion(true)
		const vp = new ViewportState(0, 0, 1)
		vp.releaseWithVelocity(50, 50)
		vp.tick()
		expect(vp.panX).toBe(0)
		expect(vp.panY).toBe(0)
	})

	it("keeps fling momentum when motion is allowed", () => {
		stubReducedMotion(false)
		const vp = new ViewportState(0, 0, 1)
		vp.releaseWithVelocity(50, 50)
		vp.tick()
		expect(vp.panX).toBeGreaterThan(0)
	})

	it("snaps zoom to target in a single tick under reduced motion", () => {
		stubReducedMotion(true)
		const vp = new ViewportState(0, 0, 1)
		vp.zoomTo(3, 100, 100)
		vp.tick()
		expect(vp.zoom).toBe(3)
	})

	it("eases zoom across ticks when motion is allowed", () => {
		stubReducedMotion(false)
		const vp = new ViewportState(0, 0, 1)
		vp.zoomTo(3, 100, 100)
		vp.tick()
		expect(vp.zoom).toBeGreaterThan(1)
		expect(vp.zoom).toBeLessThan(3)
	})

	it("snaps a pan target instantly under reduced motion", () => {
		stubReducedMotion(true)
		const vp = new ViewportState(0, 0, 1)
		vp.centerOn(500, 500, 800, 600)
		const moved = vp.tick()
		expect(moved).toBe(true)
		// target = width/2 - worldX*zoom = 400 - 500 = -100, etc.
		expect(vp.panX).toBe(-100)
		expect(vp.panY).toBe(-200)
	})
})
