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
	private cache = new Map<string, ChainEntry[]>()
	private lastDocs: GraphApiDocument[] | null = null

	rebuild(documents: GraphApiDocument[]): void {
		if (documents === this.lastDocs) return
		this.lastDocs = documents
		this.memoryMap.clear()
		this.cache.clear()

		for (const doc of documents) {
			for (const m of doc.memories) {
				this.memoryMap.set(m.id, m)
			}
		}
	}

	getChain(memoryId: string): ChainEntry[] | null {
		const cached = this.cache.get(memoryId)
		if (cached) return cached

		const mem = this.memoryMap.get(memoryId)
		if (!mem || mem.version <= 1) return null

		// Walk parentMemoryId up to the root
		const chain: ChainEntry[] = []
		const visited = new Set<string>()
		let current: GraphApiMemory | undefined = mem
		while (current && !visited.has(current.id)) {
			visited.add(current.id)
			chain.push({
				id: current.id,
				version: current.version,
				memory: current.memory,
				isForgotten: current.isForgotten,
				isLatest: current.isLatest,
			})
			current = current.parentMemoryId
				? this.memoryMap.get(current.parentMemoryId)
				: undefined
		}

		chain.reverse()

		// Cache for every member in the chain
		for (const entry of chain) {
			this.cache.set(entry.id, chain)
		}

		return chain
	}
}
