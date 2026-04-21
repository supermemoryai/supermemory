"use client"

import { useEffect, useRef, useState } from "react"
import { MemoryGraph as MemoryGraphBase } from "@supermemory/memory-graph"
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
}

export function MemoryGraph({
	children,
	isLoading: externalIsLoading = false,
	error: externalError = null,
	variant = "console",
	containerTags,
	maxNodes,
	canvasRef,
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
		enabled: containerSize.width > 0 && containerSize.height > 0,
	})

	return (
		<div ref={containerRef} className="w-full h-full [&>div]:!bg-none">
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
					} as any
				}
				{...rest}
			>
				{children}
			</MemoryGraphBase>
		</div>
	)
}
