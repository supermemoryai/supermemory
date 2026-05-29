"use client"

import { MemoryGraph as MemoryGraphBase } from "@supermemory/memory-graph"
import type { GraphThemeColors } from "@supermemory/memory-graph"
import { useGraphApi } from "./hooks/use-graph-api"

export interface MemoryGraphWrapperProps {
	children?: React.ReactNode
	isLoading?: boolean
	error?: Error | null
	variant?: "console" | "consumer"
	legendId?: string
	highlightDocumentIds?: string[]
	highlightsVisible?: boolean
	containerTags?: string[]
	documentIds?: string[]
	maxNodes?: number
	isSlideshowActive?: boolean
	onSlideshowNodeChange?: (nodeId: string | null) => void
	onSlideshowStop?: () => void
	canvasRef?: React.RefObject<HTMLCanvasElement | null>
	onOpenDocument?: (documentId: string) => void
}

export function MemoryGraph({
	children,
	isLoading: externalIsLoading = false,
	error: externalError = null,
	variant = "console",
	containerTags,
	documentIds,
	maxNodes,
	canvasRef,
	...rest
}: MemoryGraphWrapperProps) {
	const {
		documents,
		isLoading: apiIsLoading,
		isLoadingMore,
		error: apiError,
		hasMore,
		loadMore,
		totalCount,
	} = useGraphApi({
		containerTags,
		documentIds,
		maxNodes,
	})

	return (
		<div className="absolute inset-0 [&>div]:!h-full [&>div]:!bg-none">
			<MemoryGraphBase
				documents={documents}
				isLoading={externalIsLoading || apiIsLoading}
				isLoadingMore={isLoadingMore}
				onLoadMore={hasMore ? () => loadMore() : undefined}
				hasMore={hasMore}
				error={externalError || apiError}
				variant={variant}
				maxNodes={maxNodes}
				canvasRef={canvasRef}
				totalCount={totalCount}
				colors={
					{
						bg: "transparent",
						edgeDerives: "#9ca3af",
					} satisfies Partial<GraphThemeColors>
				}
				{...rest}
			>
				{children}
			</MemoryGraphBase>
		</div>
	)
}
