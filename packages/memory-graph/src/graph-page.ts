import type {
	GraphPage,
	GraphPageMemoryNode,
	MemoryRelation,
} from "./api-types"
import type { GraphApiDocument } from "./api-types"

// MemoryGraph takes documents with nested memories, so fold one POST /ns/{namespace}/graph page back into that shape.
export function graphPageToDocuments(page: GraphPage): GraphApiDocument[] {
	const memories = new Map<string, GraphPageMemoryNode>()
	for (const node of page.nodes) {
		if (node.kind === "memory") memories.set(node.id, node)
	}
	const relations = new Map<string, Record<string, MemoryRelation>>()
	const sources = new Map<string, string[]>()
	for (const edge of page.edges) {
		if (edge.type === "source") {
			sources.set(edge.source, [
				...(sources.get(edge.source) ?? []),
				edge.target,
			])
			continue
		}
		relations.set(edge.target, {
			...relations.get(edge.target),
			[edge.source]: edge.type,
		})
	}
	return page.nodes.flatMap((node) => {
		if (node.kind !== "document") return []
		return {
			id: node.id,
			title: node.title,
			summary: node.summary,
			documentType: node.type,
			createdAt: node.createdAt,
			updatedAt: node.updatedAt,
			memories: (sources.get(node.id) ?? []).flatMap((memoryId) => {
				const memory = memories.get(memoryId)
				if (!memory) return []
				return {
					id: memory.id,
					memory: memory.memory,
					isStatic: memory.isStatic,
					spaceId: memory.namespace ?? "",
					isLatest: memory.isLatest,
					isForgotten: memory.isForgotten,
					forgetAfter: memory.forgetAfter,
					forgetReason: memory.forgetReason,
					version: memory.version,
					parentMemoryId: memory.parentMemoryId,
					rootMemoryId: memory.rootMemoryId,
					createdAt: memory.createdAt,
					updatedAt: memory.updatedAt,
					memoryRelations: relations.get(memory.id) ?? {},
					spaceContainerTag: memory.namespace,
				}
			}),
		}
	})
}
