import type {
	DocumentsResponse,
	DocumentWithMemories,
	MemoryEntry,
} from "./api-types"

// Re-export for convenience
export type { DocumentsResponse, DocumentWithMemories, MemoryEntry }

export interface GraphNode {
	id: string
	type: "document" | "memory"
	x: number
	y: number
	data: DocumentWithMemories | MemoryEntry
	size: number
	color: string
	isHovered: boolean
	isDragging: boolean
	// D3-force simulation properties
	vx?: number // velocity x
	vy?: number // velocity y
	fx?: number | null // fixed x position (for pinning during drag)
	fy?: number | null // fixed y position (for pinning during drag)
}

export type MemoryRelation = "updates" | "extends" | "derives"

export interface GraphEdge {
	id: string
	// D3-force mutates source/target from string IDs to node references during simulation
	source: string | GraphNode
	target: string | GraphNode
	similarity: number
	visualProps: {
		opacity: number
		thickness: number
		glow: number
		pulseDuration: number
	}
	color: string
	edgeType: "doc-memory" | "doc-doc" | "version"
	relationType?: MemoryRelation
}

export interface SpacesDropdownProps {
	selectedSpace: string
	availableSpaces: string[]
	spaceMemoryCounts: Record<string, number>
	onSpaceChange: (space: string) => void
}

export interface NodeDetailPanelProps {
	node: GraphNode | null
	onClose: () => void
	variant?: "console" | "consumer"
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
	onNodeDragStart: (nodeId: string, e: React.MouseEvent) => void
	onNodeDragMove: (e: React.MouseEvent) => void
	onNodeDragEnd: () => void
	onPanStart: (e: React.MouseEvent) => void
	onPanMove: (e: React.MouseEvent) => void
	onPanEnd: () => void
	onWheel: (e: React.WheelEvent) => void
	onDoubleClick: (e: React.MouseEvent) => void
	onTouchStart?: (e: React.TouchEvent) => void
	onTouchMove?: (e: React.TouchEvent) => void
	onTouchEnd?: (e: React.TouchEvent) => void
	draggingNodeId: string | null
	// Optional list of document IDs (customId or internal id) to highlight
	highlightDocumentIds?: string[]
	// Physics simulation state
	isSimulationActive?: boolean
	// Selected node ID - dims all other nodes and edges
	selectedNodeId?: string | null
}

export interface MemoryGraphProps {
	/** The documents to display in the graph */
	documents: DocumentWithMemories[]
	/** Whether the initial data is loading */
	isLoading?: boolean
	/** Error that occurred during data fetching */
	error?: Error | null
	/** Optional children to render when no documents exist */
	children?: React.ReactNode
	/** Whether more data is being loaded (for pagination) */
	isLoadingMore?: boolean
	/** Total number of documents loaded */
	totalLoaded?: number
	/** Whether there are more documents to load */
	hasMore?: boolean
	/** Callback to load more documents (for pagination) */
	loadMoreDocuments?: () => Promise<void>
	/** Show/hide the spaces filter dropdown */
	showSpacesSelector?: boolean
	/** Visual variant - "console" for full view, "consumer" for embedded */
	variant?: "console" | "consumer"
	/** Optional ID for the legend component */
	legendId?: string
	/** Document IDs to highlight in the graph */
	highlightDocumentIds?: string[]
	/** Whether highlights are currently visible */
	highlightsVisible?: boolean
	/** Pixels occluded on the right side of the viewport */
	occludedRightPx?: number
	/** Whether to auto-load more documents based on viewport visibility */
	autoLoadOnViewport?: boolean
	/** Theme class name to apply */
	themeClassName?: string

	// External space control
	/** Currently selected space (for controlled component) */
	selectedSpace?: string
	/** Callback when space selection changes (for controlled component) */
	onSpaceChange?: (spaceId: string) => void

	// Memory limit control
	/** Maximum number of memories to display per document when a space is selected */
	memoryLimit?: number

	// Feature flags
	/** Enable experimental features */
	isExperimental?: boolean

	// Slideshow control
	/** Whether slideshow mode is currently active */
	isSlideshowActive?: boolean
	/** Callback when slideshow selects a new node (provides node ID) */
	onSlideshowNodeChange?: (nodeId: string | null) => void
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

export interface ControlsProps {
	onZoomIn: () => void
	onZoomOut: () => void
	onResetView: () => void
	variant?: "console" | "consumer"
}
