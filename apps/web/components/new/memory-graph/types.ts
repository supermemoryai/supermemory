import type {
	DocumentsResponse,
	DocumentWithMemories,
	MemoryEntry,
} from "./api-types"

export type { DocumentsResponse, DocumentWithMemories, MemoryEntry }

// Graph API types matching backend response

export interface GraphApiMemory {
	id: string
	memory: string
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
}

export interface GraphApiDocument {
	id: string
	title: string | null
	summary: string | null
	documentType: string
	createdAt: string
	updatedAt: string
	x: number // backend coordinates (dynamic range)
	y: number // backend coordinates (dynamic range)
	memories: GraphApiMemory[]
}

export interface GraphApiEdge {
	source: string
	target: string
	similarity: number // 0-1
}

export interface GraphViewportResponse {
	documents: GraphApiDocument[]
	edges: GraphApiEdge[]
	viewport: {
		minX: number
		maxX: number
		minY: number
		maxY: number
	}
	totalCount: number
}

export interface GraphBoundsResponse {
	bounds: {
		minX: number
		maxX: number
		minY: number
		maxY: number
	} | null
}

export interface GraphStatsResponse {
	totalDocuments: number
	documentsWithSpatial: number
	totalDocumentEdges: number
}

// Typed node data

export interface DocumentNodeData {
	id: string
	title: string | null
	summary: string | null
	type: string
	createdAt: string
	updatedAt: string
	memories: GraphApiMemory[]
}

export interface MemoryNodeData {
	id: string
	memory: string
	content: string
	documentId: string
	isStatic: boolean
	isLatest: boolean
	isForgotten: boolean
	forgetAfter: string | null
	forgetReason: string | null
	version: number
	parentMemoryId: string | null
	spaceId: string
	createdAt: string
	updatedAt: string
}

export interface GraphNode {
	id: string
	type: "document" | "memory"
	x: number
	y: number
	data: DocumentNodeData | MemoryNodeData
	size: number
	borderColor: string
	isHovered: boolean
	isDragging: boolean
	// D3-force simulation properties
	vx?: number
	vy?: number
	fx?: number | null
	fy?: number | null
}

export interface GraphEdge {
	id: string
	source: string | GraphNode
	target: string | GraphNode
	similarity: number
	visualProps: {
		opacity: number
		thickness: number
	}
	edgeType: "doc-memory" | "similarity" | "version"
}

export interface GraphCanvasProps {
	nodes: GraphNode[]
	edges: GraphEdge[]
	width: number
	height: number
	highlightDocumentIds?: string[]
	selectedNodeId?: string | null
	onNodeHover: (nodeId: string | null) => void
	onNodeClick: (nodeId: string | null) => void
	onNodeDragStart: (nodeId: string) => void
	onNodeDragEnd: () => void
	onViewportChange?: (zoom: number) => void
	canvasRef?: React.RefObject<HTMLCanvasElement | null>
	variant?: "console" | "consumer"
	simulation?: import("./canvas/simulation").ForceSimulation
	viewportRef?: React.RefObject<
		import("./canvas/viewport").ViewportState | null
	>
}

export interface LegendProps {
	variant?: "console" | "consumer"
	nodes?: GraphNode[]
	edges?: GraphEdge[]
	isLoading?: boolean
	hoveredNode?: string | null
}

export interface LoadingIndicatorProps {
	isLoading: boolean
	isLoadingMore: boolean
	totalLoaded: number
	variant?: "console" | "consumer"
}
