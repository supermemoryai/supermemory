export type MemoryRelation = "updates" | "extends" | "derives"

export interface MemoryEntry {
	id: string
	memory: string
	content?: string | null
	createdAt: string
	updatedAt: string
	spaceId?: string | null
	embedding?: number[]
	isStatic?: boolean
	isForgotten?: boolean
	forgetAfter?: string | null
	forgetReason?: string | null
	version?: number
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	isLatest?: boolean
	// Relation fields from backend
	relation?: MemoryRelation | null
	updatesMemoryId?: string | null
	nextVersionId?: string | null
	memoryRelations?: Record<string, MemoryRelation> | null
	// Source/join fields
	sourceAddedAt?: string | null
	sourceRelevanceScore?: number | null
	sourceMetadata?: Record<string, unknown> | null
	spaceContainerTag?: string | null
}

export interface DocumentWithMemories {
	id: string
	title: string | null
	url: string | null
	documentType: string
	createdAt: string
	updatedAt: string
	summary?: string | null
	memories: MemoryEntry[]
}

export interface GraphPageDocumentNode {
	kind: "document"
	id: string
	customId: string | null
	title: string | null
	summary: string | null
	type: string
	namespaces: string[]
	createdAt: string
	updatedAt: string
}

export interface GraphPageMemoryNode {
	kind: "memory"
	id: string
	memory: string
	namespace: string | null
	isStatic: boolean
	isLatest: boolean
	isForgotten: boolean
	isInference: boolean
	forgetAfter: string | null
	forgetReason: string | null
	version: number
	parentMemoryId: string | null
	rootMemoryId: string | null
	createdAt: string
	updatedAt: string
}

export type GraphPageEdge =
	| {
			type: "source"
			source: string
			target: string
			sourceAddedAt: string | null
			sourceRelevanceScore: number | null
	  }
	| {
			type: MemoryRelation
			source: string
			target: string
	  }

export interface GraphPage {
	nodes: Array<GraphPageDocumentNode | GraphPageMemoryNode>
	edges: GraphPageEdge[]
	nextCursor: string | null
}

export interface GraphApiMemory {
	id: string
	memory: string
	content?: string | null
	isStatic: boolean
	spaceId: string
	isLatest: boolean
	isForgotten: boolean
	forgetAfter: string | null
	forgetReason: string | null
	version: number
	parentMemoryId: string | null
	rootMemoryId: string | null
	createdAt: string
	updatedAt: string
	relation?: MemoryRelation | null
	updatesMemoryId?: string | null
	nextVersionId?: string | null
	memoryRelations?: Record<string, MemoryRelation> | null
	spaceContainerTag?: string | null
}

export interface GraphApiDocument {
	id: string
	title: string | null
	summary: string | null
	documentType: string
	createdAt: string
	updatedAt: string
	memories: GraphApiMemory[]
}
