"use client"

import { MemoryGraph as MemoryGraphBase } from "@supermemory/memory-graph"
import type { GraphThemeColors } from "@supermemory/memory-graph"
import { SuperLoader } from "@/components/superloader"
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
	const isInitialLoading = externalIsLoading || apiIsLoading

	return (
		<div className="absolute inset-0 [&>div]:!h-full [&>div]:!bg-none">
			<MemoryGraphBase
				documents={documents}
				isLoading={false}
				isLoadingMore={false}
				onLoadMore={hasMore && !isLoadingMore ? () => loadMore() : undefined}
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
			{isInitialLoading && (
				<div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
					<SuperLoader
						label="Loading memory graph..."
						size={72}
						colorClassName="text-[#4BA0FA]"
						className="[&>span]:text-slate-100"
					/>
				</div>
			)}
		</div>
	)
}
