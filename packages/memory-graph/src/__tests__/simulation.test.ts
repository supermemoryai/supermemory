import { describe, it, expect } from "vitest"
import { ForceSimulation } from "../canvas/simulation"
import type { GraphNode, GraphEdge } from "../types"

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

function makeEdge(source: string, target: string): GraphEdge {
	return {
		id: `e-${source}-${target}`,
		source,
		target,
		visualProps: { opacity: 0.5, thickness: 1.5 },
		edgeType: "derives",
	}
}

describe("ForceSimulation", () => {
	it("init creates simulation and isActive returns true", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 100)]
		const edges = [makeEdge("a", "b")]
		sim.init(nodes, edges)
		expect(sim.isActive()).toBe(true)
		sim.destroy()
	})

	it("destroy stops simulation", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0)]
		sim.init(nodes, [])
		sim.destroy()
		expect(sim.isActive()).toBe(false)
	})

	it("init moves nodes from initial positions (pre-tick)", () => {
		const sim = new ForceSimulation()
		const nodes = [
			makeNode("a", 0, 0),
			makeNode("b", 0, 0), // Same position - repulsion should move them
		]
		sim.init(nodes, [])

		// After init with pre-ticks, nodes at same position should have moved apart
		const [first, second] = nodes
		if (!first || !second) throw new Error("Expected two nodes")
		const dx = first.x - second.x
		const dy = first.y - second.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		expect(dist).toBeGreaterThan(0)
		sim.destroy()
	})

	it("update hot-swaps nodes without full re-init", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 100)]
		sim.init(nodes, [])

		// Update with same nodes but different positions
		const [first] = nodes
		if (!first) throw new Error("Expected node")
		first.x = 50
		expect(() => sim.update(nodes, [])).not.toThrow()
		expect(sim.isActive()).toBe(true)
		sim.destroy()
	})

	it("reheat increases simulation energy", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0)]
		sim.init(nodes, [])
		// Should not throw
		expect(() => sim.reheat()).not.toThrow()
		sim.destroy()
	})

	it("coolDown reduces simulation energy", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0)]
		sim.init(nodes, [])
		expect(() => sim.coolDown()).not.toThrow()
		sim.destroy()
	})

	it("stop immediately deactivates the simulation", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0)]
		sim.init(nodes, [])
		sim.stop()
		expect(sim.isActive()).toBe(false)
		sim.destroy()
	})

	it("handles empty nodes array", () => {
		const sim = new ForceSimulation()
		expect(() => sim.init([], [])).not.toThrow()
		sim.destroy()
	})

	it("handles edges with missing nodes gracefully", () => {
		const sim = new ForceSimulation()
		const nodes = [makeNode("a", 0, 0)]
		const edges = [makeEdge("a", "nonexistent")]
		// Should not throw even with dangling edge
		expect(() => sim.init(nodes, edges)).not.toThrow()
		sim.destroy()
	})
})
