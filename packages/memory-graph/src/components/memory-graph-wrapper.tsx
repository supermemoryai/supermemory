"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
	flattenDocuments,
	getLoadedCount,
	getTotalDocuments,
	useInfiniteDocumentsQuery,
} from "@/hooks/use-documents-query";
import { MemoryGraph } from "./memory-graph";
import { defaultTheme } from "@/styles/theme.css";
import type { ApiClientError } from "@/lib/api-client";

export interface MemoryGraphWrapperProps {
	/** API key for authentication */
	apiKey: string;
	/** Optional base URL for the API (defaults to https://api.supermemory.ai) */
	baseUrl?: string;
	/** Optional document ID to filter by */
	id?: string;
	/** Visual variant - console for full view, consumer for embedded */
	variant?: "console" | "consumer";
	/** Show/hide the spaces filter dropdown */
	showSpacesSelector?: boolean;
	/** Optional container tags to filter documents */
	containerTags?: string[];
	/** Callback when data fetching fails */
	onError?: (error: ApiClientError) => void;
	/** Callback when data is successfully loaded */
	onSuccess?: (totalDocuments: number) => void;
	/** Empty state content */
	children?: React.ReactNode;
	/** Documents to highlight */
	highlightDocumentIds?: string[];
	/** Whether highlights are visible */
	highlightsVisible?: boolean;
	/** Pixels occluded on the right side of the viewport */
	occludedRightPx?: number;
}

/**
 * Internal component that uses the query hooks
 */
function MemoryGraphWithQuery(props: MemoryGraphWrapperProps) {
	const {
		apiKey,
		baseUrl,
		containerTags,
		variant = "console",
		showSpacesSelector,
		onError,
		onSuccess,
		children,
		highlightDocumentIds,
		highlightsVisible,
		occludedRightPx,
	} = props;

	// Derive showSpacesSelector from variant if not explicitly provided
	// console variant shows spaces selector, consumer variant hides it
	const finalShowSpacesSelector = showSpacesSelector ?? (variant === "console");

	// Use infinite query for automatic pagination
	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error,
	} = useInfiniteDocumentsQuery({
		apiKey,
		baseUrl,
		containerTags,
		enabled: !!apiKey,
	});

	// Flatten documents from all pages
	const documents = useMemo(() => flattenDocuments(data), [data]);
	const totalLoaded = useMemo(() => getLoadedCount(data), [data]);
	const totalDocuments = useMemo(() => getTotalDocuments(data), [data]);

	// Eagerly load all pages to ensure complete graph data
	const isLoadingAllPages = useRef(false);

	useEffect(() => {
		// Only start loading once, when initial data is loaded
		if (isLoading || isLoadingAllPages.current || !data?.pages?.[0]) return;

		const abortController = new AbortController();

		// Start recursive page loading
		const loadAllPages = async () => {
			isLoadingAllPages.current = true;

			try {
				// Keep fetching until no more pages or aborted
				let shouldContinue = hasNextPage;

				while (shouldContinue && !abortController.signal.aborted) {
					const result = await fetchNextPage();
					shouldContinue = result.hasNextPage ?? false;

					// Throttle requests to avoid overwhelming server (50ms delay like console app)
					if (shouldContinue && !abortController.signal.aborted) {
						await new Promise(resolve => setTimeout(resolve, 50));
					}
				}
			} catch (error) {
				if (!abortController.signal.aborted) {
					console.error('[MemoryGraph] Error loading pages:', error);
				}
			}
		};

		if (hasNextPage) {
			loadAllPages();
		}

		// Cleanup on unmount
		return () => {
			abortController.abort();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Call callbacks
	if (error && onError) {
		onError(error as ApiClientError);
	}

	if (data && onSuccess && totalDocuments > 0) {
		onSuccess(totalDocuments);
	}

	// Load more function
	const loadMoreDocuments = async () => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
		}
	};

	return (
		<MemoryGraph
			documents={documents}
			isLoading={isLoading}
			isLoadingMore={isFetchingNextPage}
			error={error as Error | null}
			totalLoaded={totalLoaded}
			hasMore={hasNextPage ?? false}
			loadMoreDocuments={loadMoreDocuments}
			variant={variant}
			showSpacesSelector={finalShowSpacesSelector}
			highlightDocumentIds={highlightDocumentIds}
			highlightsVisible={highlightsVisible}
			occludedRightPx={occludedRightPx}
			autoLoadOnViewport={true}
			themeClassName={defaultTheme}
		>
			{children}
		</MemoryGraph>
	);
}

// Create a default query client for the wrapper
const defaultQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			retry: 2,
		},
	},
});

/**
 * MemoryGraph component with built-in data fetching
 *
 * This component handles all data fetching internally using the provided API key.
 * Simply pass your API key and it will fetch and render the graph automatically.
 *
 * @example
 * ```tsx
 * <MemoryGraphWrapper
 *   apiKey="your-api-key"
 *   variant="console"
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export function MemoryGraphWrapper(props: MemoryGraphWrapperProps) {
	return (
		<QueryClientProvider client={defaultQueryClient}>
			<MemoryGraphWithQuery {...props} />
		</QueryClientProvider>
	);
}
