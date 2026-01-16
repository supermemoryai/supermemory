"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useViewportGraph } from "@/hooks/use-viewport-graph"
import { useViewportInteractions } from "@/hooks/use-viewport-interactions"
import type {
	ViewportBounds,
	ViewportGraphNode,
} from "@/lib/viewport-graph-types"
import { ViewportCanvas } from "./viewport-canvas"
import { NodePopover } from "./node-popover"
import { NavigationControls } from "./navigation-controls"
import { LoadingIndicator } from "./loading-indicator"
import { GRAPH_SETTINGS } from "./constants"

interface ViewportGraphProps {
	containerTags?: string[]
	children?: React.ReactNode
}

const INITIAL_VIEWPORT_SIZE = 2000

export function ViewportGraph({ containerTags, children }: ViewportGraphProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const hasInitialFetchRef = useRef(false)
	const hasAutoFittedRef = useRef(false)

	const {
		documents,
		nodes,
		edges,
		isLoading,
		error,
		fetchViewport,
		totalLoaded,
	} = useViewportGraph({
		containerTags,
		limit: 200,
	})

	const handleViewportChange = useCallback(
		(bounds: ViewportBounds) => {
			fetchViewport(bounds)
		},
		[fetchViewport],
	)

	const {
		panX,
		panY,
		zoom,
		hoveredNode: _hoveredNode,
		selectedNode,
		handlePanStart,
		handlePanMove,
		handlePanEnd,
		handleWheel,
		handleNodeHover,
		handleNodeClick,
		handleDoubleClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		zoomIn,
		zoomOut,
		autoFitToViewport,
		centerViewportOn,
		setSelectedNode,
		setContainerSize: setInteractionContainerSize,
		getWorldBounds,
	} = useViewportInteractions({
		variant: "consumer",
		onViewportChange: handleViewportChange,
	})

	// Handle container resize
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const newWidth = containerRef.current.clientWidth
				const newHeight = containerRef.current.clientHeight

				setContainerSize((prev) => {
					if (prev.width !== newWidth || prev.height !== newHeight) {
						return { width: newWidth, height: newHeight }
					}
					return prev
				})
				setInteractionContainerSize(newWidth, newHeight)
			}
		}

		updateSize()

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(updateSize)
		})

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		return () => resizeObserver.disconnect()
	}, [setInteractionContainerSize])

	// Initial fetch - centered on origin with large viewport
	useEffect(() => {
		if (
			!hasInitialFetchRef.current &&
			containerSize.width > 0 &&
			containerSize.height > 0
		) {
			hasInitialFetchRef.current = true

			const initialBounds: ViewportBounds = {
				minX: -INITIAL_VIEWPORT_SIZE / 2,
				maxX: INITIAL_VIEWPORT_SIZE / 2,
				minY: -INITIAL_VIEWPORT_SIZE / 2,
				maxY: INITIAL_VIEWPORT_SIZE / 2,
			}
			fetchViewport(initialBounds)
		}
	}, [containerSize.width, containerSize.height, fetchViewport])

	// Auto-fit once nodes are loaded
	useEffect(() => {
		if (
			!hasAutoFittedRef.current &&
			nodes.length > 0 &&
			containerSize.width > 0 &&
			containerSize.height > 0
		) {
			const timer = setTimeout(() => {
				autoFitToViewport(nodes, containerSize.width, containerSize.height)
				hasAutoFittedRef.current = true
			}, 100)

			return () => clearTimeout(timer)
		}
	}, [
		nodes.length,
		containerSize.width,
		containerSize.height,
		autoFitToViewport,
	])

	// Reset auto-fit flag when containerTags change
	useEffect(() => {
		hasAutoFittedRef.current = false
		hasInitialFetchRef.current = false
	}, [containerTags?.join(",")])

	// Find selected node data
	const selectedNodeData = useMemo(() => {
		if (!selectedNode) return null
		return nodes.find((n) => n.id === selectedNode) ?? null
	}, [selectedNode, nodes])

	// Calculate popover position
	const popoverPosition = useMemo(() => {
		if (!selectedNodeData) return null

		const screenX = selectedNodeData.x * zoom + panX
		const screenY = selectedNodeData.y * zoom + panY
		const nodeSize = selectedNodeData.size * zoom
		const docWidth = nodeSize * 1.4

		// Position popover to the right of the node, or left if near edge
		const popoverWidth = 320
		const popoverHeight = 400

		let x = screenX + docWidth / 2 + 16
		let y = screenY - popoverHeight / 2

		// Adjust if overflowing right edge
		if (x + popoverWidth > containerSize.width) {
			x = screenX - docWidth / 2 - popoverWidth - 16
		}

		// Adjust if overflowing top or bottom
		if (y < 16) {
			y = 16
		} else if (y + popoverHeight > containerSize.height - 16) {
			y = containerSize.height - popoverHeight - 16
		}

		return { x, y }
	}, [selectedNodeData, zoom, panX, panY, containerSize])

	// Control handlers
	const handleCenter = useCallback(() => {
		if (nodes.length === 0) return

		// Find center of all nodes
		let sumX = 0
		let sumY = 0
		for (const node of nodes) {
			sumX += node.x
			sumY += node.y
		}
		const centerX = sumX / nodes.length
		const centerY = sumY / nodes.length

		centerViewportOn(
			centerX,
			centerY,
			containerSize.width,
			containerSize.height,
		)
	}, [nodes, centerViewportOn, containerSize])

	const handleAutoFit = useCallback(() => {
		if (nodes.length > 0) {
			autoFitToViewport(nodes, containerSize.width, containerSize.height)
		}
	}, [nodes, autoFitToViewport, containerSize])

	if (error) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-slate-900">
				<div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
					<p className="text-red-400">Error loading graph: {error.message}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="relative w-full h-full bg-slate-900 overflow-hidden">
			{/* Loading indicator */}
			<LoadingIndicator isLoading={isLoading} totalLoaded={totalLoaded} />

			{/* Node popover */}
			{selectedNodeData && popoverPosition && (
				<NodePopover
					node={selectedNodeData}
					x={popoverPosition.x}
					y={popoverPosition.y}
					onClose={() => setSelectedNode(null)}
					containerBounds={containerRef.current?.getBoundingClientRect()}
				/>
			)}

			{/* Empty state */}
			{!isLoading && nodes.length === 0 && <>{children}</>}

			{/* Graph container */}
			<div ref={containerRef} className="absolute inset-0">
				{containerSize.width > 0 && containerSize.height > 0 && (
					<ViewportCanvas
						nodes={nodes}
						edges={edges}
						panX={panX}
						panY={panY}
						zoom={zoom}
						width={containerSize.width}
						height={containerSize.height}
						onNodeHover={handleNodeHover}
						onNodeClick={handleNodeClick}
						onPanStart={handlePanStart}
						onPanMove={handlePanMove}
						onPanEnd={handlePanEnd}
						onWheel={handleWheel}
						onDoubleClick={handleDoubleClick}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						selectedNodeId={selectedNode}
					/>
				)}

				{/* Navigation controls */}
				{containerSize.width > 0 && (
					<NavigationControls
						onCenter={handleCenter}
						onZoomIn={() =>
							zoomIn(containerSize.width / 2, containerSize.height / 2)
						}
						onZoomOut={() =>
							zoomOut(containerSize.width / 2, containerSize.height / 2)
						}
						onAutoFit={handleAutoFit}
						nodes={nodes}
					/>
				)}
			</div>
		</div>
	)
}
