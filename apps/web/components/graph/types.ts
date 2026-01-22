"use client"

import type {
	ViewportDocument,
	ViewportMemoryEntry,
	ViewportGraphNode,
	ViewportGraphEdge,
} from "@/lib/viewport-graph-types"

export type { ViewportDocument, ViewportMemoryEntry, ViewportGraphNode, ViewportGraphEdge }

export type MemoryRelation = "updates" | "extends" | "derives"

export interface GraphNode {
	id: string
	type: "document" | "memory"
	x: number
	y: number
	data: ViewportDocument | ViewportMemoryEntry
	size: number
	color: string
	isHovered: boolean
	parentDocumentId?: string
}

export interface GraphEdge {
	id: string
	source: string | GraphNode
	target: string | GraphNode
	similarity: number
	color: string
	opacity: number
	thickness: number
	edgeType?: "doc-memory" | "doc-doc" | "version"
	relationType?: MemoryRelation
}

export interface GraphCanvasProps {
	nodes: GraphNode[]
	edges: GraphEdge[]
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

export interface GraphProps {
	containerTags?: string[]
	children?: React.ReactNode
}

export interface LegendProps {
	nodes?: GraphNode[]
	edges?: GraphEdge[]
	isLoading?: boolean
	id?: string
}

export interface LoadingIndicatorProps {
	isLoading: boolean
	isLoadingMore: boolean
	totalLoaded: number
}

export interface NavigationControlsProps {
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	onAutoFit: () => void
	onTimeline?: () => void
	isTimelineActive?: boolean
	timelineProgress?: { streamed: number; total: number | null }
	nodes: GraphNode[]
	className?: string
	zoom?: number
}

export interface NodePopoverProps {
	node: GraphNode
	x: number
	y: number
	onClose: () => void
	containerBounds?: DOMRect
}
