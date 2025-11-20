import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api";
import type { z } from "zod";

export type DocumentsResponse = z.infer<
	typeof DocumentsWithMemoriesResponseSchema
>;
export type DocumentWithMemories = DocumentsResponse["documents"][0];
export type MemoryEntry = DocumentWithMemories["memoryEntries"][0];

export interface GraphNode {
	id: string;
	type: "document" | "memory";
	x: number;
	y: number;
	data: DocumentWithMemories | MemoryEntry;
	size: number;
	color: string;
	isHovered: boolean;
	isDragging: boolean;
}

export type MemoryRelation = "updates" | "extends" | "derives";

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	similarity: number;
	visualProps: {
		opacity: number;
		thickness: number;
		glow: number;
		pulseDuration: number;
	};
	color: string;
	edgeType: "doc-memory" | "doc-doc" | "version";
	relationType?: MemoryRelation;
}

export interface SpacesDropdownProps {
	selectedSpace: string;
	availableSpaces: string[];
	spaceMemoryCounts: Record<string, number>;
	onSpaceChange: (space: string) => void;
}

export interface NodeDetailPanelProps {
	node: GraphNode | null;
	onClose: () => void;
	variant?: "console" | "consumer";
}

export interface GraphCanvasProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	panX: number;
	panY: number;
	zoom: number;
	width: number;
	height: number;
	onNodeHover: (nodeId: string | null) => void;
	onNodeClick: (nodeId: string) => void;
	onNodeDragStart: (nodeId: string, e: React.MouseEvent) => void;
	onNodeDragMove: (e: React.MouseEvent) => void;
	onNodeDragEnd: () => void;
	onPanStart: (e: React.MouseEvent) => void;
	onPanMove: (e: React.MouseEvent) => void;
	onPanEnd: () => void;
	onWheel: (e: React.WheelEvent) => void;
	onDoubleClick: (e: React.MouseEvent) => void;
	onTouchStart?: (e: React.TouchEvent) => void;
	onTouchMove?: (e: React.TouchEvent) => void;
	onTouchEnd?: (e: React.TouchEvent) => void;
	draggingNodeId: string | null;
	// Optional list of document IDs (customId or internal id) to highlight
	highlightDocumentIds?: string[];
}

export interface MemoryGraphProps {
	children?: React.ReactNode;
	documents: DocumentWithMemories[];
	isLoading: boolean;
	isLoadingMore: boolean;
	error: Error | null;
	totalLoaded: number;
	hasMore: boolean;
	loadMoreDocuments: () => Promise<void>;
	// App-specific props
	showSpacesSelector?: boolean; // true for console, false for consumer
	variant?: "console" | "consumer"; // for different positioning and styling
	legendId?: string; // Optional ID for the legend component
	// Optional document highlight list (document custom IDs)
	highlightDocumentIds?: string[];
	// Whether highlights are currently visible (e.g., chat open)
	highlightsVisible?: boolean;
	// Pixels occluded on the right side of the viewport (e.g., chat panel)
	occludedRightPx?: number;
	// Whether to auto-load more documents based on viewport visibility
	autoLoadOnViewport?: boolean;
}

export interface LegendProps {
	variant?: "console" | "consumer";
	nodes?: GraphNode[];
	edges?: GraphEdge[];
	isLoading?: boolean;
	hoveredNode?: string | null;
}

export interface LoadingIndicatorProps {
	isLoading: boolean;
	isLoadingMore: boolean;
	totalLoaded: number;
	variant?: "console" | "consumer";
}

export interface ControlsProps {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetView: () => void;
	variant?: "console" | "consumer";
}
