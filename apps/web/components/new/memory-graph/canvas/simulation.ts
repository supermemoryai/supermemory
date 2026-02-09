import * as d3 from "d3-force"
import type { GraphNode, GraphEdge } from "../types"

export class ForceSimulation {
	private sim: d3.Simulation<GraphNode, GraphEdge> | null = null

	init(nodes: GraphNode[], edges: GraphEdge[]): void {
		this.destroy()

		try {
			this.sim = d3
				.forceSimulation<GraphNode>(nodes)
				.alphaDecay(0.03)
				.alphaMin(0.001)
				.velocityDecay(0.6)

			this.sim.force(
				"link",
				d3
					.forceLink<GraphNode, GraphEdge>(edges)
					.id((d) => d.id)
					.distance((link) => (link.edgeType === "doc-memory" ? 150 : 300))
					.strength((link) => {
						if (link.edgeType === "doc-memory") return 0.8
						if (link.edgeType === "version") return 1.0
						return link.similarity * 0.3
					}),
			)

			this.sim.force("charge", d3.forceManyBody<GraphNode>().strength(-1000))

			this.sim.force(
				"collide",
				d3
					.forceCollide<GraphNode>()
					.radius((d) => (d.type === "document" ? 80 : 40))
					.strength(0.7),
			)

			this.sim.force("x", d3.forceX().strength(0.05))
			this.sim.force("y", d3.forceY().strength(0.05))

			// Pre-settle synchronously, then start the live simulation
			this.sim.stop()
			this.sim.alpha(1)
			for (let i = 0; i < 50; i++) this.sim.tick()
			this.sim.alphaTarget(0).restart()
		} catch (e) {
			console.error("ForceSimulation.init failed:", e)
			this.destroy()
		}
	}

	update(nodes: GraphNode[], edges: GraphEdge[]): void {
		if (!this.sim) return
		this.sim.nodes(nodes)
		const linkForce = this.sim.force<d3.ForceLink<GraphNode, GraphEdge>>("link")
		if (linkForce) linkForce.links(edges)
	}

	reheat(): void {
		this.sim?.alphaTarget(0.3).restart()
	}

	coolDown(): void {
		this.sim?.alphaTarget(0)
	}

	isActive(): boolean {
		return (this.sim?.alpha() ?? 0) > 0.001
	}

	destroy(): void {
		if (this.sim) {
			this.sim.stop()
			this.sim = null
		}
	}
}
