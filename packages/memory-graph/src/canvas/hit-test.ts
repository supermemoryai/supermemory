import type { GraphNode } from "../types"

export class SpatialIndex {
	private grid = new Map<string, GraphNode[]>()
	private cellSize = 200
	private lastHash = 0

	/**
	 * Rebuild the grid from the given nodes.
	 *
	 * The content hash only covers node ids and positions, so it cannot
	 * detect a new generation of node objects at the same coordinates
	 * (e.g. after useGraphData re-runs on resize or theme change). Callers
	 * reacting to a node-array identity change must pass force=true, or
	 * hit-testing keeps returning stale objects the renderer no longer
	 * draws.
	 */
	rebuild(nodes: GraphNode[], force = false): boolean {
		const hash = this.computeHash(nodes)
		if (!force && hash === this.lastHash) return false
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

		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const cell = this.grid.get(`${cx + dx},${cy + dy}`)
				if (!cell) continue

				for (let i = cell.length - 1; i >= 0; i--) {
					const node = cell[i]
					if (node && this.hitTest(node, worldX, worldY)) return node
				}
			}
		}
		return null
	}

	private hitTest(node: GraphNode, wx: number, wy: number): boolean {
		const halfSize = node.size * 0.5

		if (node.type === "document") {
			return (
				Math.abs(wx - node.x) <= halfSize && Math.abs(wy - node.y) <= halfSize
			)
		}

		const dx = wx - node.x
		const dy = wy - node.y
		return dx * dx + dy * dy <= halfSize * halfSize
	}

	private computeHash(nodes: GraphNode[]): number {
		let hash = nodes.length
		for (const n of nodes) {
			// Use finer granularity (10x) to detect sub-pixel movements
			// and incorporate a simple string hash of the ID to avoid
			// false matches when nodes swap positions
			let idHash = 0
			for (let i = 0; i < n.id.length; i++) {
				idHash = ((idHash << 5) - idHash + n.id.charCodeAt(i)) | 0
			}
			hash = (hash * 31 + idHash) | 0
			hash = (hash * 31 + (Math.round(n.x * 10) | 0)) | 0
			hash = (hash * 31 + (Math.round(n.y * 10) | 0)) | 0
		}
		return hash
	}
}
