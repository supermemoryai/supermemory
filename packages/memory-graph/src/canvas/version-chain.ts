import type { GraphApiDocument, GraphApiMemory } from "../types"

export interface ChainEntry {
	id: string
	version: number
	memory: string
	isForgotten: boolean
	isLatest: boolean
}

export class VersionChainIndex {
	private memoryMap = new Map<string, GraphApiMemory>()
	private childrenMap = new Map<string, string[]>()
	private cache = new Map<string, ChainEntry[]>()
	private lastDocs: GraphApiDocument[] | null = null

	rebuild(documents: GraphApiDocument[]): void {
		if (documents === this.lastDocs) return
		this.lastDocs = documents
		this.memoryMap.clear()
		this.childrenMap.clear()
		this.cache.clear()

		for (const doc of documents) {
			for (const m of doc.memories) {
				this.memoryMap.set(m.id, m)
				if (m.parentMemoryId) {
					let children = this.childrenMap.get(m.parentMemoryId)
					if (!children) {
						children = []
						this.childrenMap.set(m.parentMemoryId, children)
					}
					children.push(m.id)
				}
			}
		}
	}

	getChain(memoryId: string): ChainEntry[] | null {
		const cached = this.cache.get(memoryId)
		if (cached) return cached

		const mem = this.memoryMap.get(memoryId)
		if (!mem) return null

		// Walk backward to root
		const backward: GraphApiMemory[] = []
		const visited = new Set<string>()
		let current: GraphApiMemory | undefined = mem
		while (current && !visited.has(current.id)) {
			visited.add(current.id)
			backward.push(current)
			current = current.parentMemoryId
				? this.memoryMap.get(current.parentMemoryId)
				: undefined
		}
		backward.reverse()

		// Walk forward from the selected node to find descendants.
		// Version chains are linear (each memory has one parent), so we
		// follow the first child at each step. If branching occurs, only
		// the first branch (by document order) is included.
		const forward: GraphApiMemory[] = []
		let cursor: GraphApiMemory | undefined = mem
		while (cursor) {
			const children = this.childrenMap.get(cursor.id)
			if (!children || children.length === 0) break
			const firstChildId = children[0]
			if (!firstChildId) break
			const child = this.memoryMap.get(firstChildId)
			if (!child || visited.has(child.id)) break
			visited.add(child.id)
			forward.push(child)
			cursor = child
		}

		// Combine: backward (root..selected) + forward (selected+1..latest)
		const all = [...backward, ...forward]

		// A single-entry chain (standalone v1 with no children) is not useful
		if (all.length <= 1) return null

		let lastVersion = 0
		const chain: ChainEntry[] = all.map((m) => {
			const version =
				Number.isFinite(m.version) && m.version > lastVersion
					? m.version
					: lastVersion + 1
			lastVersion = version

			return {
				id: m.id,
				version,
				memory: m.memory,
				isForgotten: m.isForgotten,
				isLatest: m.isLatest,
			}
		})

		for (const entry of chain) {
			this.cache.set(entry.id, chain)
		}

		return chain
	}
}
