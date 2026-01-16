// Types for viewport-based graph API

export interface ViewportDocument {
	id: string
	customId?: string | null
	title?: string | null
	summary?: string | null
	url?: string | null
	source?: string | null
	type?: string | null
	status: string
	metadata?: Record<string, string | number | boolean> | null
	createdAt: string | Date
	updatedAt: string | Date
	containerTags?: string[] | null
	// Spatial position from PostGIS
	spatialX: number
	spatialY: number
	// Memory entries for this document
	memoryEntries: ViewportMemoryEntry[]
}

export interface ViewportMemoryEntry {
	id: string
	customId?: string | null
	documentId: string
	content: string | null
	summary?: string | null
	title?: string | null
	url?: string | null
	type?: string | null
	createdAt: string | Date
	updatedAt: string | Date
	spaceContainerTag?: string | null
	spaceId?: string | null
}

export interface ViewportEdge {
	source: string
	target: string
	similarity: number
}

export interface ViewportBounds {
	minX: number
	maxX: number
	minY: number
	maxY: number
}

export interface ViewportResponse {
	documents: ViewportDocument[]
	edges: ViewportEdge[]
	viewport: ViewportBounds
	timestamp: string
}

export interface ViewportGraphNode {
	id: string
	type: "document" | "memory"
	x: number
	y: number
	data: ViewportDocument | ViewportMemoryEntry
	size: number
	color: string
	isHovered: boolean
	isDragging?: boolean
	parentDocumentId?: string // For memory nodes, references parent document
}

export interface ViewportGraphEdge {
	id: string
	source: string | ViewportGraphNode
	target: string | ViewportGraphNode
	similarity: number
	color: string
	opacity: number
	thickness: number
	edgeType?: "doc-doc"
	visualProps?: {
		opacity: number
		thickness: number
		glow: number
		pulseDuration: number
	}
}

export interface ViewportCanvasProps {
	nodes: ViewportGraphNode[]
	edges: ViewportGraphEdge[]
	panX: number
	panY: number
	zoom: number
	width: number
	height: number
	onNodeHover: (nodeId: string | null) => void
	onNodeClick: (nodeId: string) => void
	onPanStart: (e: React.MouseEvent) => void
	onPanMove: (e: React.MouseEvent) => void
	onPanEnd: () => void
	onWheel: (e: React.WheelEvent) => void
	onDoubleClick: (e: React.MouseEvent) => void
	onTouchStart?: (e: React.TouchEvent) => void
	onTouchMove?: (e: React.TouchEvent) => void
	onTouchEnd?: (e: React.TouchEvent) => void
	highlightDocumentIds?: string[]
	selectedNodeId?: string | null
}
