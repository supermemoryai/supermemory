// Graph API types matching backend response

import type { MemoryRelation } from "./api-types"

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
	// Relation fields from backend
	relation?: MemoryRelation | null
	updatesMemoryId?: string | null
	nextVersionId?: string | null
	memoryRelations?: Record<string, MemoryRelation> | null
	// Source/join fields
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

export interface GraphApiEdge {
	source: string
	target: string
	edgeType: MemoryRelation
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
	relation?: MemoryRelation | null
	memoryRelations?: Record<string, MemoryRelation> | null
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
	visualProps: {
		opacity: number
		thickness: number
	}
	edgeType: MemoryRelation
}

export interface GraphThemeColors {
	bg: string
	docFill: string
	docStroke: string
	docInnerFill: string
	memFill: string
	memFillHover: string
	memStrokeDefault: string
	accent: string
	textPrimary: string
	textSecondary: string
	textMuted: string
	edgeDerives: string
	edgeUpdates: string
	edgeExtends: string
	memBorderForgotten: string
	memBorderExpiring: string
	memBorderRecent: string
	glowColor: string
	iconColor: string
	popoverBg: string
	popoverBorder: string
	popoverTextPrimary: string
	popoverTextSecondary: string
	popoverTextMuted: string
	controlBg: string
	controlBorder: string
}

export interface GraphCanvasProps {
	nodes: GraphNode[]
	edges: GraphEdge[]
	width: number
	height: number
	colors: GraphThemeColors
	highlightDocumentIds?: string[]
	selectedNodeId?: string | null
	onNodeHover: (nodeId: string | null) => void
	onNodeClick: (nodeId: string | null) => void
	onNodeDragStart: (nodeId: string) => void
	onNodeDragEnd: () => void
	onViewportChange?: (zoom: number, popoverVisible: boolean) => void
	canvasRef?: React.RefObject<HTMLCanvasElement | null>
	simulation?: import("./canvas/simulation").ForceSimulation
	viewportRef?: React.RefObject<
		import("./canvas/viewport").ViewportState | null
	>
}

export interface MemoryGraphProps {
	/** Documents to display - pass this for direct data mode */
	documents?: GraphApiDocument[]
	/** Whether data is loading */
	isLoading?: boolean
	/** Whether more data is being loaded */
	isLoadingMore?: boolean
	/** Callback to load more documents */
	onLoadMore?: () => void
	/** Whether there are more documents to load */
	hasMore?: boolean
	/** Error from data fetching */
	error?: Error | null
	/** Children to render when no documents */
	children?: React.ReactNode
	/** Visual variant */
	variant?: "console" | "consumer"
	/** Optional legend ID */
	legendId?: string
	/** Document IDs to highlight */
	highlightDocumentIds?: string[]
	/** Whether highlights are visible */
	highlightsVisible?: boolean
	/** Container tags for filtering (used by apps with their own API hooks) */
	containerTags?: string[]
	/** Specific document IDs to show */
	documentIds?: string[]
	/** Max nodes to display */
	maxNodes?: number
	/** Show FPS counter overlay */
	showFps?: boolean
	/** Slideshow mode */
	isSlideshowActive?: boolean
	onSlideshowNodeChange?: (nodeId: string | null) => void
	onSlideshowStop?: () => void
	/** Canvas ref for external access (e.g. screenshot export) */
	canvasRef?: React.RefObject<HTMLCanvasElement | null>
	/** Custom theme colors (partial) - merged with CSS variable / default values */
	colors?: Partial<GraphThemeColors>
	/** Total count for loading indicator */
	totalCount?: number
	/** Callback when user wants to view full document content */
	onOpenDocument?: (documentId: string) => void
}

export interface ChainEntry {
	id: string
	version: number
	memory: string
	isForgotten: boolean
	isLatest: boolean
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

// Re-export api-types for backward compatibility
export type {
	DocumentWithMemories,
	MemoryEntry,
	DocumentsResponse,
} from "./api-types"
