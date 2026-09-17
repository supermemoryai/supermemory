// Components
export { MemoryGraph } from "./components/memory-graph"
export { GraphCanvas } from "./components/graph-canvas"

// Hooks
export { useGraphData } from "./hooks/use-graph-data"
export { useGraphTheme } from "./hooks/use-graph-theme"

// Utilities
export { searchNodes } from "./utils/node-search"

// Engine classes (for advanced usage)
export { ForceSimulation } from "./canvas/simulation"
export { ViewportState } from "./canvas/viewport"
export { SpatialIndex } from "./canvas/hit-test"
export { VersionChainIndex } from "./canvas/version-chain"

// Constants
export {
	DEFAULT_COLORS,
	DEFAULT_HOVER_POPOVER_Z_INDEX,
	DEFAULT_LABELS,
	FORCE_CONFIG,
	GRAPH_SETTINGS,
} from "./constants"

// Types
export type {
	MemoryGraphProps,
	MemoryGraphLabels,
	MemoryGraphLayering,
	ResolvedMemoryGraphLabels,
	GraphNode,
	GraphEdge,
	GraphThemeColors,
	GraphCanvasProps,
	GraphApiDocument,
	GraphApiMemory,
	GraphApiEdge,
	DocumentNodeData,
	MemoryNodeData,
	ChainEntry,
} from "./types"

// Backward-compatible API types
export type {
	DocumentWithMemories,
	MemoryEntry,
	DocumentsResponse,
	MemoryRelation,
} from "./api-types"
