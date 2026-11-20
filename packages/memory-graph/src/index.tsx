// Components
export { MemoryGraph } from "./components/memory-graph.js"
export { GraphCanvas } from "./components/graph-canvas.js"

// Hooks
export { useGraphData } from "./hooks/use-graph-data.js"
export { useGraphTheme } from "./hooks/use-graph-theme.js"

// Engine classes (for advanced usage)
export { ForceSimulation } from "./canvas/simulation.js"
export { ViewportState } from "./canvas/viewport.js"
export { SpatialIndex } from "./canvas/hit-test.js"
export { VersionChainIndex } from "./canvas/version-chain.js"

// Constants
export {
	DEFAULT_COLORS,
	DEFAULT_HOVER_POPOVER_Z_INDEX,
	DEFAULT_LABELS,
	FORCE_CONFIG,
	GRAPH_SETTINGS,
} from "./constants.js"

// Types
export type {
	MemoryGraphProps,
	MemoryGraphLabels,
	MemoryGraphLayering,
	GraphAppearance,
	ResolvedMemoryGraphLabels,
	GraphNode,
	GraphEdge,
	GraphEdgeType,
	GraphThemeColors,
	GraphCanvasProps,
	GraphApiDocument,
	GraphApiMemory,
	GraphApiEdge,
	DocumentNodeData,
	MemoryNodeData,
	ChainEntry,
} from "./types.js"

// Backward-compatible API types
export type {
	DocumentWithMemories,
	MemoryEntry,
	DocumentsResponse,
	MemoryRelation,
} from "./api-types.js"
