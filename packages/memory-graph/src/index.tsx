// Auto-inject global styles (side effect import)
import "./styles";

// Export the main component
export { MemoryGraphWrapper as MemoryGraph } from "./components/memory-graph-wrapper";

// Export types for consumers
export type {
	MemoryGraphWrapperProps as MemoryGraphProps,
} from "./components/memory-graph-wrapper";

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

// Export API client for advanced usage
export {
	fetchDocuments,
	fetchDocumentsPage,
	validateApiKey,
	type FetchDocumentsOptions,
	type ApiClientError,
} from "./lib/api-client";

// Export hooks for advanced usage (if users want to bring their own QueryClient)
export {
	useDocumentsQuery,
	useInfiniteDocumentsQuery,
	flattenDocuments,
	getTotalDocuments,
	getLoadedCount,
	type UseDocumentsQueryOptions,
} from "./hooks/use-documents-query";

// Export theme system for custom theming
export { themeContract, defaultTheme } from "./styles/theme.css";
export { sprinkles } from "./styles/sprinkles.css";
export type { Sprinkles } from "./styles/sprinkles.css";
