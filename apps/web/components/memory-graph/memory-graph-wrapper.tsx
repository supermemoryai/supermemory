"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { MemoryGraph as MemoryGraphBase } from "@supermemory/memory-graph"
import type { GraphThemeColors } from "@supermemory/memory-graph"
import { useGraphApi } from "./hooks/use-graph-api"
import { cn } from "@lib/utils"

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
	autoFetchAll?: boolean
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
	autoFetchAll = false,
	...rest
}: MemoryGraphWrapperProps) {
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = containerRef.current
		if (!el) return
		const ro = new ResizeObserver(() => {
			setContainerSize({ width: el.clientWidth, height: el.clientHeight })
		})
		ro.observe(el)
		setContainerSize({ width: el.clientWidth, height: el.clientHeight })
		return () => ro.disconnect()
	}, [])

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
		enabled: containerSize.width > 0 && containerSize.height > 0,
		autoFetchAll,
	})

	const loadedDocCount = documents.length
	const loadedMemoryCount = useMemo(
		() => documents.reduce((sum, doc) => sum + doc.memories.length, 0),
		[documents],
	)
	const showProgress =
		autoFetchAll &&
		!apiIsLoading &&
		totalCount > 0 &&
		(hasMore || isLoadingMore || loadedDocCount < totalCount)

	return (
		<div ref={containerRef} className="relative size-full [&>div]:!bg-none">
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
			{showProgress && (
				<div
					className={cn(
						"absolute right-3 top-3 z-15 md:right-4 md:top-4",
						"flex items-center gap-2 rounded-full",
						"bg-background/85 px-3 py-1.5 text-xs backdrop-blur-md",
						"border border-border/60 shadow-sm",
					)}
					aria-live="polite"
				>
					<Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
					<span className="tabular-nums">
						{loadedMemoryCount.toLocaleString()} memories ·{" "}
						{loadedDocCount.toLocaleString()}/{totalCount.toLocaleString()}{" "}
						documents
					</span>
				</div>
			)}
		</div>
	)
}
