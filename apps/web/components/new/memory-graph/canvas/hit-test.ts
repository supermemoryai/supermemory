import type { GraphNode } from "../types"

export class SpatialIndex {
	private grid = new Map<string, GraphNode[]>()
	private cellSize = 200
	private lastHash = 0

	rebuild(nodes: GraphNode[]): boolean {
		const hash = this.computeHash(nodes)
		if (hash === this.lastHash) return false
		this.lastHash = hash
		this.grid.clear()

		for (const node of nodes) {
			const key = `${Math.floor(node.x / this.cellSize)},${Math.floor(node.y / this.cellSize)}`
			let cell = this.grid.get(key)
			if (!cell) {
				cell = []
				this.grid.set(key, cell)
			}
			cell.push(node)
		}
		return true
	}

	queryPoint(worldX: number, worldY: number): GraphNode | null {
		const cx = Math.floor(worldX / this.cellSize)
		const cy = Math.floor(worldY / this.cellSize)

		// Check current cell + 8 neighbors
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const cell = this.grid.get(`${cx + dx},${cy + dy}`)
				if (!cell) continue

				for (let i = cell.length - 1; i >= 0; i--) {
					const node = cell[i]!
					if (this.hitTest(node, worldX, worldY)) return node
				}
			}
		}
		return null
	}

	private hitTest(node: GraphNode, wx: number, wy: number): boolean {
		const halfSize = node.size * 0.5

		if (node.type === "document") {
			// AABB rectangle hit test (50x50 node)
			return (
				Math.abs(wx - node.x) <= halfSize && Math.abs(wy - node.y) <= halfSize
			)
		}

		// Circular hit test for hexagon memory nodes
		const dx = wx - node.x
		const dy = wy - node.y
		return dx * dx + dy * dy <= halfSize * halfSize
	}

	private computeHash(nodes: GraphNode[]): number {
		let hash = nodes.length
		for (const n of nodes) {
			// Round to nearest integer to avoid false rebuilds from tiny physics jitter
			hash = (hash * 31 + (Math.round(n.x) | 0)) | 0
			hash = (hash * 31 + (Math.round(n.y) | 0)) | 0
		}
		return hash
	}
}
