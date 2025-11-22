// Export the main component
export { MemoryGraph } from "./components/memory-graph";

// Export style injector for manual use if needed
export { injectStyles } from "./lib/inject-styles";

// Export types for consumers
export type { MemoryGraphProps } from "./types";

export type {
	DocumentWithMemories,
	MemoryEntry,
	DocumentsResponse,
} from "./api-types";

export type {
	GraphNode,
	GraphEdge,
	MemoryRelation,
} from "./types";

// Export theme system for custom theming
export { themeContract, defaultTheme } from "./styles/theme.css";
export { sprinkles } from "./styles/sprinkles.css";
export type { Sprinkles } from "./styles/sprinkles.css";
