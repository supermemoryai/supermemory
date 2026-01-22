"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GraphCanvas } from "./graph-canvas"
import { useGraphData } from "./use-graph-data"
import { useGraphInteractions } from "./use-graph-interactions"
import { Legend } from "./legend"
import { LoadingIndicator } from "./loading-indicator"
import { NavigationControls } from "./navigation-controls"
import { NodePopover } from "./node-popover"
import { useViewportGraph } from "@/hooks/use-viewport-graph"
import { useTimelineStream } from "@/hooks/use-timeline-stream"
import type { GraphProps } from "./types"
import type { ViewportBounds, ViewportGraphNode, ViewportGraphEdge } from "@/lib/viewport-graph-types"

export function Graph({ containerTags, children }: GraphProps) {
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)
	const hasAutoFittedRef = useRef(false)
	const lastFetchedViewportRef = useRef<string>("")

	const [isTimelineMode, setIsTimelineMode] = useState(false)
	const [timelineNodes, setTimelineNodes] = useState<ViewportGraphNode[]>([])
	const [timelineEdges, setTimelineEdges] = useState<ViewportGraphEdge[]>([])
	const pendingFitRef = useRef(false)

	const {
		nodes: viewportNodes,
		edges: viewportEdges,
		isLoading,
		error,
		fetchViewport,
		totalLoaded,
	} = useViewportGraph({ containerTags, limit: 200, enabled: !isTimelineMode })

	const activeNodes = isTimelineMode ? timelineNodes : viewportNodes
	const activeEdges = isTimelineMode ? timelineEdges : viewportEdges

	const { nodes, edges } = useGraphData(activeNodes, activeEdges)

	const {
		panX,
		panY,
		zoom,
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
		animateToViewState,
		isUserInteracting,
	} = useGraphInteractions()

	const getWorldViewportBounds = useCallback(() => {
		const { width, height } = containerSize
		if (width === 0 || height === 0) {
			return { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 }
		}
		const minX = (0 - panX) / zoom
		const maxX = (width - panX) / zoom
		const minY = (0 - panY) / zoom
		const maxY = (height - panY) / zoom
		return { minX, maxX, minY, maxY }
	}, [containerSize, panX, panY, zoom])

	const computeContentBounds = useCallback((nodeList: typeof nodes) => {
		const docNodes = nodeList.filter((n) => n.type === "document")
		const targetNodes = docNodes.length > 0 ? docNodes : nodeList
		if (targetNodes.length === 0) return null

		let minX = Number.POSITIVE_INFINITY
		let maxX = Number.NEGATIVE_INFINITY
		let minY = Number.POSITIVE_INFINITY
		let maxY = Number.NEGATIVE_INFINITY

		for (const node of targetNodes) {
			if (node.x < minX) minX = node.x
			if (node.x > maxX) maxX = node.x
			if (node.y < minY) minY = node.y
			if (node.y > maxY) maxY = node.y
		}

		return { minX, maxX, minY, maxY }
	}, [])

	const handleTimelineBatch = useCallback(
		(batchNodes: ViewportGraphNode[], batchEdges: ViewportGraphEdge[]) => {
			setTimelineNodes((prev) => {
				const existingIds = new Set(prev.map((n) => n.id))
				const newNodes = batchNodes.filter((n) => !existingIds.has(n.id))
				return [...prev, ...newNodes]
			})
			setTimelineEdges((prev) => {
				const existingIds = new Set(prev.map((e) => e.id))
				const newEdges = batchEdges.filter((e) => !existingIds.has(e.id))
				return [...prev, ...newEdges]
			})
			pendingFitRef.current = true
		},
		[],
	)

	const handleTimelineComplete = useCallback(
		(totalDocuments: number, _totalEdges: number) => {
			console.log("[timeline] Complete:", totalDocuments, "documents")
		},
		[],
	)

	const {
		isStreaming: isTimelineStreaming,
		progress: timelineProgress,
		startStream: startTimelineStream,
		stopStream: stopTimelineStream,
	} = useTimelineStream({
		containerTags,
		batchSize: 2,
		delayBetweenBatches: 3000,
		onBatch: handleTimelineBatch,
		onComplete: handleTimelineComplete,
	})

	const handleStartTimeline = useCallback(() => {
		setIsTimelineMode(true)
		setTimelineNodes([])
		setTimelineEdges([])
		hasAutoFittedRef.current = false
		startTimelineStream()
	}, [startTimelineStream])

	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const newWidth = containerRef.current.clientWidth
				const newHeight = containerRef.current.clientHeight
				if (
					newWidth !== containerSize.width ||
					newHeight !== containerSize.height
				) {
					setContainerSize({ width: newWidth, height: newHeight })
				}
			}
		}

		updateSize()
		window.addEventListener("resize", updateSize)

		const resizeObserver = new ResizeObserver(updateSize)
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		return () => {
			window.removeEventListener("resize", updateSize)
			resizeObserver.disconnect()
		}
	}, [containerSize.width, containerSize.height])

	const getViewportBounds = useCallback((): ViewportBounds => {
		const { width, height } = containerSize
		if (width === 0 || height === 0) {
			return { minX: -100, maxX: 100, minY: -100, maxY: 100 }
		}

		const COORDINATE_SCALE = 15
		const minX = (0 - panX) / zoom / COORDINATE_SCALE
		const maxX = (width - panX) / zoom / COORDINATE_SCALE
		const minY = (0 - panY) / zoom / COORDINATE_SCALE
		const maxY = (height - panY) / zoom / COORDINATE_SCALE

		return { minX, maxX, minY, maxY }
	}, [containerSize, panX, panY, zoom])

	useEffect(() => {
		if (containerSize.width === 0 || containerSize.height === 0) return

		const bounds = getViewportBounds()
		const boundsKey = `${Math.round(bounds.minX)},${Math.round(bounds.maxX)},${Math.round(bounds.minY)},${Math.round(bounds.maxY)}`

		if (boundsKey === lastFetchedViewportRef.current) return

		const timeoutId = setTimeout(() => {
			lastFetchedViewportRef.current = boundsKey
			fetchViewport(bounds)
		}, 200)

		return () => clearTimeout(timeoutId)
	}, [containerSize, panX, panY, zoom, getViewportBounds, fetchViewport])

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
	}, [nodes, containerSize.width, containerSize.height, autoFitToViewport])

	useEffect(() => {
		if (nodes.length === 0) {
			hasAutoFittedRef.current = false
		}
	}, [nodes.length])

	useEffect(() => {
		if (
			!isTimelineMode ||
			!pendingFitRef.current ||
			nodes.length === 0 ||
			containerSize.width === 0 ||
			containerSize.height === 0
		) {
			return
		}

		if (isUserInteracting) {
			pendingFitRef.current = false
			return
		}

		pendingFitRef.current = false

		const content = computeContentBounds(nodes)
		if (!content) return

		const viewport = getWorldViewportBounds()

		const PADDING = 120
		const fullyInside =
			content.minX >= viewport.minX + PADDING &&
			content.maxX <= viewport.maxX - PADDING &&
			content.minY >= viewport.minY + PADDING &&
			content.maxY <= viewport.maxY - PADDING

		if (fullyInside) {
			return
		}

		const { width, height } = containerSize

		const contentWidth = content.maxX - content.minX || 1
		const contentHeight = content.maxY - content.minY || 1
		const contentCenterX = content.minX + contentWidth / 2
		const contentCenterY = content.minY + contentHeight / 2

		const availableWidth = width - PADDING * 2
		const availableHeight = height - PADDING * 2

		const zoomToFitWidth = availableWidth / contentWidth
		const zoomToFitHeight = availableHeight / contentHeight
		const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight)

		const MIN_ZOOM = 0.05
		const MAX_ZOOM = 3

		const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoom, fitZoom)))

		if (Math.abs(targetZoom - zoom) < 0.01) {
			return
		}

		const currentCenterX = (width / 2 - panX) / zoom
		const currentCenterY = (height / 2 - panY) / zoom

		const CENTER_LERP = 0.4
		const targetCenterX = currentCenterX + (contentCenterX - currentCenterX) * CENTER_LERP
		const targetCenterY = currentCenterY + (contentCenterY - currentCenterY) * CENTER_LERP

		const targetPanX = width / 2 - targetCenterX * targetZoom
		const targetPanY = height / 2 - targetCenterY * targetZoom

		animateToViewState(targetPanX, targetPanY, targetZoom, 800)
	}, [
		isTimelineMode,
		nodes,
		containerSize,
		panX,
		panY,
		zoom,
		getWorldViewportBounds,
		computeContentBounds,
		animateToViewState,
		isUserInteracting,
	])

	const handleCenter = useCallback(() => {
		if (nodes.length === 0) return

		const docNodes = nodes.filter((n) => n.type === "document")
		const targetNodes = docNodes.length > 0 ? docNodes : nodes

		let sumX = 0
		let sumY = 0
		for (const node of targetNodes) {
			sumX += node.x
			sumY += node.y
		}
		const centerX = sumX / targetNodes.length
		const centerY = sumY / targetNodes.length

		centerViewportOn(
			centerX,
			centerY,
			containerSize.width,
			containerSize.height,
		)
	}, [nodes, centerViewportOn, containerSize])

	const handleAutoFit = useCallback(() => {
		autoFitToViewport(nodes, containerSize.width, containerSize.height, {
			animate: true,
		})
	}, [nodes, containerSize, autoFitToViewport])

	const selectedNodeData = useMemo(() => {
		if (!selectedNode) return null
		return nodes.find((n) => n.id === selectedNode) || null
	}, [selectedNode, nodes])

	const popoverPosition = useMemo(() => {
		if (!selectedNodeData) return null

		const screenX = selectedNodeData.x * zoom + panX
		const screenY = selectedNodeData.y * zoom + panY
		const nodeSize = selectedNodeData.size * zoom

		let popoverX = screenX + nodeSize / 2 + 20
		let popoverY = screenY - 100

		const popoverWidth = 320
		const popoverHeight = 300

		if (popoverX + popoverWidth > containerSize.width) {
			popoverX = screenX - nodeSize / 2 - popoverWidth - 20
		}

		if (popoverY < 0) {
			popoverY = 10
		}
		if (popoverY + popoverHeight > containerSize.height) {
			popoverY = containerSize.height - popoverHeight - 10
		}

		return { x: popoverX, y: popoverY }
	}, [selectedNodeData, zoom, panX, panY, containerSize])

	if (error) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-6">
					<div className="text-red-400">
						Error loading documents: {error.message}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="relative h-full w-full overflow-hidden" ref={containerRef}>
			<LoadingIndicator
				isLoading={isLoading}
				isLoadingMore={false}
				totalLoaded={totalLoaded}
			/>

			<Legend edges={edges} isLoading={isLoading} nodes={nodes} />

			{selectedNodeData && popoverPosition && (
				<NodePopover
					node={selectedNodeData}
					x={popoverPosition.x}
					y={popoverPosition.y}
					onClose={() => setSelectedNode(null)}
					containerBounds={containerRef.current?.getBoundingClientRect()}
				/>
			)}

			{!isLoading && nodes.filter((n) => n.type === "document").length === 0 && (
				<>{children}</>
			)}

			{containerSize.width > 0 && containerSize.height > 0 && (
				<GraphCanvas
					edges={edges}
					height={containerSize.height}
					nodes={nodes}
					highlightDocumentIds={[]}
					onDoubleClick={handleDoubleClick}
					onNodeClick={handleNodeClick}
					onNodeHover={handleNodeHover}
					onPanEnd={handlePanEnd}
					onPanMove={handlePanMove}
					onPanStart={handlePanStart}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onWheel={handleWheel}
					panX={panX}
					panY={panY}
					width={containerSize.width}
					zoom={zoom}
					selectedNodeId={selectedNode}
				/>
			)}

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
					onTimeline={handleStartTimeline}
					isTimelineActive={isTimelineStreaming}
					timelineProgress={timelineProgress}
					nodes={nodes}
					zoom={zoom}
				/>
			)}
		</div>
	)
}
