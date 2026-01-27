"use client"

import { GlassMenuEffect } from "@repo/ui/other/glass-effect"
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react"
import { GraphCanvas } from "./graph-canvas"
import { useGraphApi } from "./hooks/use-graph-api"
import { useGraphData, calculateBackendViewport } from "./hooks/use-graph-data"
import { useGraphInteractions } from "./hooks/use-graph-interactions"
import { useForceSimulation } from "./hooks/use-force-simulation"
import { Legend } from "./legend"
import { LoadingIndicator } from "./loading-indicator"
import { NavigationControls } from "./navigation-controls"
import { NodeHoverPopover } from "./node-hover-popover"
import { NodePopover } from "./node-popover"
import { SpacesDropdown } from "./spaces-dropdown"
import { colors } from "./constants"

export interface MemoryGraphProps {
	children?: React.ReactNode
	isLoading?: boolean
	error?: Error | null
	variant?: "console" | "consumer"
	legendId?: string
	highlightDocumentIds?: string[]
	highlightsVisible?: boolean
	occludedRightPx?: number
	// External space control
	selectedSpace?: string
	onSpaceChange?: (spaceId: string) => void
	// Container/project filtering
	containerTags?: string[]
	// Include memories in the graph
	includeMemories?: boolean
	// Maximum nodes to fetch
	maxNodes?: number
	// Slideshow control
	isSlideshowActive?: boolean
	onSlideshowNodeChange?: (nodeId: string | null) => void
	onSlideshowStop?: () => void
}

/**
 * Memory Graph component powered by the Graph API
 * Uses backend-computed spatial positions and pre-computed edges
 */
export const MemoryGraph = ({
	children,
	isLoading: externalIsLoading = false,
	error: externalError = null,
	variant = "console",
	legendId,
	highlightDocumentIds = [],
	highlightsVisible = true,
	occludedRightPx: _occludedRightPx = 0,
	selectedSpace: externalSelectedSpace,
	onSpaceChange: externalOnSpaceChange,
	containerTags,
	includeMemories = true,
	maxNodes = 200,
	isSlideshowActive = false,
	onSlideshowNodeChange,
	onSlideshowStop,
}: MemoryGraphProps) => {
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)

	// Internal state for space selection
	const [internalSelectedSpace, setInternalSelectedSpace] =
		useState<string>("all")
	const selectedSpace = externalSelectedSpace ?? internalSelectedSpace

	const handleSpaceChange = useCallback(
		(spaceId: string) => {
			if (externalOnSpaceChange) {
				externalOnSpaceChange(spaceId)
			} else {
				setInternalSelectedSpace(spaceId)
			}
		},
		[externalOnSpaceChange],
	)

	// Graph API hook
	const {
		data: apiData,
		isLoading: apiIsLoading,
		error: apiError,
		updateViewport,
	} = useGraphApi({
		containerTags,
		spaceId: selectedSpace !== "all" ? selectedSpace : undefined,
		includeMemories,
		limit: maxNodes,
		enabled: containerSize.width > 0 && containerSize.height > 0,
	})

	// Graph interactions
	const {
		panX,
		panY,
		zoom,
		hoveredNode,
		selectedNode,
		draggingNodeId,
		nodePositions: _nodePositions,
		handlePanStart,
		handlePanMove,
		handlePanEnd,
		handleWheel,
		handleNodeHover,
		handleNodeClick,
		handleNodeDragStart,
		handleNodeDragMove,
		handleNodeDragEnd,
		handleDoubleClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		setSelectedNode,
		autoFitToViewport,
		centerViewportOn,
		zoomIn,
		zoomOut,
	} = useGraphInteractions(variant)

	// Transform API data to graph nodes/edges
	const { nodes, edges } = useGraphData(
		apiData.nodes,
		apiData.edges,
		draggingNodeId,
		containerSize.width,
		containerSize.height,
	)

	// State to trigger re-renders when simulation ticks
	const [, forceRender] = useReducer((x: number) => x + 1, 0)

	// Track drag state for physics integration
	const dragStateRef = useRef<{
		nodeId: string | null
		startX: number
		startY: number
		nodeStartX: number
		nodeStartY: number
	}>({ nodeId: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0 })

	// Force simulation for interactive physics
	const forceSimulation = useForceSimulation(
		nodes,
		edges,
		() => forceRender(),
		true,
	)

	// Update backend viewport when pan/zoom changes
	const lastViewportRef = useRef<string>("")
	useEffect(() => {
		if (containerSize.width === 0 || containerSize.height === 0) return

		const backendViewport = calculateBackendViewport(
			panX,
			panY,
			zoom,
			containerSize.width,
			containerSize.height,
		)

		// Debounce by checking if viewport significantly changed
		const viewportKey = `${Math.round(backendViewport.minX)}-${Math.round(backendViewport.maxX)}-${Math.round(backendViewport.minY)}-${Math.round(backendViewport.maxY)}`
		if (viewportKey !== lastViewportRef.current) {
			lastViewportRef.current = viewportKey
			updateViewport(backendViewport)
		}
	}, [
		panX,
		panY,
		zoom,
		containerSize.width,
		containerSize.height,
		updateViewport,
	])

	// Auto-fit graph when data first loads
	const hasAutoFittedRef = useRef(false)
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

	// Reset auto-fit flag when nodes become empty
	useEffect(() => {
		if (nodes.length === 0) {
			hasAutoFittedRef.current = false
		}
	}, [nodes.length])

	// Extract unique spaces from nodes
	const { availableSpaces, spaceMemoryCounts } = useMemo(() => {
		const spaceSet = new Set<string>()
		const counts: Record<string, number> = {}

		for (const node of apiData.nodes) {
			if (node.type === "memory" && node.spaceId) {
				spaceSet.add(node.spaceId)
				counts[node.spaceId] = (counts[node.spaceId] || 0) + 1
			}
		}

		return {
			availableSpaces: Array.from(spaceSet).sort(),
			spaceMemoryCounts: counts,
		}
	}, [apiData.nodes])

	// Handle container resize
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

		const resizeObserver = new ResizeObserver(() => updateSize())
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		return () => resizeObserver.disconnect()
	}, [containerSize.width, containerSize.height])

	// Handle node drag with physics
	const handleNodeDragStartWithNodes = useCallback(
		(nodeId: string, e: React.MouseEvent) => {
			const node = nodes.find((n) => n.id === nodeId)
			if (node) {
				dragStateRef.current = {
					nodeId,
					startX: e.clientX,
					startY: e.clientY,
					nodeStartX: node.x,
					nodeStartY: node.y,
				}
				node.fx = node.x
				node.fy = node.y
				forceSimulation.reheat()
			}
			handleNodeDragStart(nodeId, e, nodes)
		},
		[nodes, handleNodeDragStart, forceSimulation],
	)

	const handleNodeDragMoveWithNodes = useCallback(
		(e: React.MouseEvent) => {
			const { nodeId, startX, startY, nodeStartX, nodeStartY } =
				dragStateRef.current
			if (!nodeId) return

			const node = nodes.find((n) => n.id === nodeId)
			if (node) {
				const dx = (e.clientX - startX) / zoom
				const dy = (e.clientY - startY) / zoom
				node.fx = nodeStartX + dx
				node.fy = nodeStartY + dy
				node.x = node.fx
				node.y = node.fy
			}

			handleNodeDragMove(e, nodes)
		},
		[nodes, handleNodeDragMove, zoom],
	)

	const handleNodeDragEndWithPhysics = useCallback(() => {
		const { nodeId } = dragStateRef.current
		if (nodeId) {
			const node = nodes.find((n) => n.id === nodeId)
			if (node) {
				node.fx = null
				node.fy = null
			}
		}

		dragStateRef.current = {
			nodeId: null,
			startX: 0,
			startY: 0,
			nodeStartX: 0,
			nodeStartY: 0,
		}

		forceSimulation.coolDown()
		handleNodeDragEnd()
	}, [nodes, handleNodeDragEnd, forceSimulation])

	const handleNodeClickWithPhysics = useCallback(
		(nodeId: string) => {
			handleNodeClick(nodeId)
			forceSimulation.reheat()
			setTimeout(() => forceSimulation.coolDown(), 500)
		},
		[handleNodeClick, forceSimulation],
	)

	// Calculate popover position
	const selectedNodeData = useMemo(() => {
		if (!selectedNode) return null
		return nodes.find((n) => n.id === selectedNode) || null
	}, [selectedNode, nodes])

	const popoverPosition = useMemo(() => {
		if (!selectedNodeData || !containerRef.current) return null

		const containerRect = containerRef.current.getBoundingClientRect()
		const screenX = selectedNodeData.x * zoom + panX + containerRect.left
		const screenY = selectedNodeData.y * zoom + panY + containerRect.top

		const nodeSize = selectedNodeData.size * zoom
		const popoverWidth = 320
		const popoverHeight = 400

		let x = screenX + nodeSize / 2 + 16
		let y = screenY - popoverHeight / 4

		if (x + popoverWidth > window.innerWidth - 20) {
			x = screenX - nodeSize / 2 - popoverWidth - 16
		}
		if (y + popoverHeight > window.innerHeight - 20) {
			y = window.innerHeight - popoverHeight - 20
		}
		if (y < 20) {
			y = 20
		}

		return { x, y }
	}, [selectedNodeData, zoom, panX, panY])

	// Calculate hover popover position
	const hoveredNodeData = useMemo(() => {
		if (!hoveredNode || selectedNode) return null // Don't show hover when selected popover is open
		return nodes.find((n) => n.id === hoveredNode) || null
	}, [hoveredNode, selectedNode, nodes])

	const hoverPopoverPosition = useMemo(() => {
		if (!hoveredNodeData || !containerRef.current) return null

		// Calculate screen position relative to the container
		const screenX = hoveredNodeData.x * zoom + panX
		const screenY = hoveredNodeData.y * zoom + panY
		const nodeRadius = (hoveredNodeData.size * zoom) / 2

		return { screenX, screenY, nodeRadius }
	}, [hoveredNodeData, zoom, panX, panY])

	// Navigation controls
	const handleCenter = useCallback(() => {
		if (nodes.length === 0) return

		let sumX = 0
		let sumY = 0
		nodes.forEach((node) => {
			sumX += node.x
			sumY += node.y
		})
		const centerX = sumX / nodes.length
		const centerY = sumY / nodes.length

		centerViewportOn(
			centerX,
			centerY,
			containerSize.width,
			containerSize.height,
		)
	}, [nodes, centerViewportOn, containerSize.width, containerSize.height])

	const handleAutoFit = useCallback(() => {
		if (nodes.length === 0) return
		autoFitToViewport(nodes, containerSize.width, containerSize.height)
	}, [nodes, autoFitToViewport, containerSize.width, containerSize.height])

	// Slideshow logic
	const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const physicsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastSelectedIndexRef = useRef<number>(-1)
	const isSlideshowActiveRef = useRef(isSlideshowActive)

	useEffect(() => {
		isSlideshowActiveRef.current = isSlideshowActive
	}, [isSlideshowActive])

	const nodesRef = useRef(nodes)
	const handleNodeClickRef = useRef(handleNodeClick)
	const centerViewportOnRef = useRef(centerViewportOn)
	const containerSizeRef = useRef(containerSize)
	const onSlideshowNodeChangeRef = useRef(onSlideshowNodeChange)
	const forceSimulationRef = useRef(forceSimulation)

	useEffect(() => {
		nodesRef.current = nodes
		handleNodeClickRef.current = handleNodeClick
		centerViewportOnRef.current = centerViewportOn
		containerSizeRef.current = containerSize
		onSlideshowNodeChangeRef.current = onSlideshowNodeChange
		forceSimulationRef.current = forceSimulation
	}, [
		nodes,
		handleNodeClick,
		centerViewportOn,
		containerSize,
		onSlideshowNodeChange,
		forceSimulation,
	])

	useEffect(() => {
		if (slideshowIntervalRef.current) {
			clearInterval(slideshowIntervalRef.current)
			slideshowIntervalRef.current = null
		}
		if (physicsTimeoutRef.current) {
			clearTimeout(physicsTimeoutRef.current)
			physicsTimeoutRef.current = null
		}

		if (!isSlideshowActive) {
			setSelectedNode(null)
			forceSimulation.coolDown()
			return
		}

		const selectRandomNode = () => {
			if (!isSlideshowActiveRef.current) return

			const currentNodes = nodesRef.current
			if (currentNodes.length === 0) return

			let randomIndex: number
			if (currentNodes.length > 1) {
				do {
					randomIndex = Math.floor(Math.random() * currentNodes.length)
				} while (randomIndex === lastSelectedIndexRef.current)
			} else {
				randomIndex = 0
			}

			lastSelectedIndexRef.current = randomIndex
			const randomNode = currentNodes[randomIndex]

			if (randomNode) {
				centerViewportOnRef.current(
					randomNode.x,
					randomNode.y,
					containerSizeRef.current.width,
					containerSizeRef.current.height,
				)
				handleNodeClickRef.current(randomNode.id)
				forceSimulationRef.current.reheat()

				if (physicsTimeoutRef.current) {
					clearTimeout(physicsTimeoutRef.current)
				}
				physicsTimeoutRef.current = setTimeout(() => {
					forceSimulationRef.current.coolDown()
					physicsTimeoutRef.current = null
				}, 1000)

				onSlideshowNodeChangeRef.current?.(randomNode.id)
			}
		}

		selectRandomNode()
		slideshowIntervalRef.current = setInterval(() => selectRandomNode(), 3500)

		return () => {
			if (slideshowIntervalRef.current) {
				clearInterval(slideshowIntervalRef.current)
				slideshowIntervalRef.current = null
			}
			if (physicsTimeoutRef.current) {
				clearTimeout(physicsTimeoutRef.current)
				physicsTimeoutRef.current = null
			}
		}
	}, [isSlideshowActive, setSelectedNode, forceSimulation])

	// Combined loading and error states
	const isLoading = externalIsLoading || apiIsLoading
	const error = externalError || apiError

	if (error) {
		return (
			<div
				className="h-full flex items-center justify-center"
				style={{ backgroundColor: colors.background.primary }}
			>
				<div className="rounded-xl overflow-hidden">
					<GlassMenuEffect rounded="rounded-xl" />
					<div className="relative z-10 text-slate-300 px-6 py-4">
						Error loading graph: {error.message}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="relative h-full rounded-xl overflow-hidden"
			style={{ backgroundColor: colors.background.primary }}
		>
			{/* Spaces selector */}
			{variant === "console" && availableSpaces.length > 0 && (
				<div className="absolute top-4 left-4 z-[15]">
					<SpacesDropdown
						availableSpaces={availableSpaces}
						onSpaceChange={handleSpaceChange}
						selectedSpace={selectedSpace}
						spaceMemoryCounts={spaceMemoryCounts}
					/>
				</div>
			)}

			{/* Loading indicator */}
			<LoadingIndicator
				isLoading={isLoading}
				isLoadingMore={false}
				totalLoaded={apiData.totalCount}
				variant={variant}
			/>

			{/* Legend */}
			<Legend
				edges={edges}
				id={legendId}
				isLoading={isLoading}
				nodes={nodes}
				variant={variant}
			/>

			{/* Node popover */}
			{selectedNodeData && popoverPosition && (
				<NodePopover
					node={selectedNodeData}
					x={popoverPosition.x}
					y={popoverPosition.y}
					onClose={() => setSelectedNode(null)}
					containerBounds={containerRef.current?.getBoundingClientRect()}
					onBackdropClick={isSlideshowActive ? onSlideshowStop : undefined}
				/>
			)}

			{/* Empty state */}
			{!isLoading &&
				nodes.filter((n) => n.type === "document").length === 0 &&
				children}

			{/* Graph container */}
			<div
				className="w-full h-full relative overflow-hidden touch-none select-none"
				ref={containerRef}
			>
				{containerSize.width > 0 && containerSize.height > 0 && (
					<GraphCanvas
						draggingNodeId={draggingNodeId}
						edges={edges}
						height={containerSize.height}
						nodes={nodes}
						highlightDocumentIds={highlightsVisible ? highlightDocumentIds : []}
						isSimulationActive={forceSimulation.isActive()}
						onDoubleClick={handleDoubleClick}
						onNodeClick={handleNodeClickWithPhysics}
						onNodeDragEnd={handleNodeDragEndWithPhysics}
						onNodeDragMove={handleNodeDragMoveWithNodes}
						onNodeDragStart={handleNodeDragStartWithNodes}
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

				{/* Hover popover */}
				{hoveredNodeData && hoverPopoverPosition && (
					<NodeHoverPopover
						node={hoveredNodeData}
						screenX={hoverPopoverPosition.screenX}
						screenY={hoverPopoverPosition.screenY}
						nodeRadius={hoverPopoverPosition.nodeRadius}
						containerBounds={containerRef.current?.getBoundingClientRect()}
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
						className="absolute bottom-4 left-4 z-[15]"
					/>
				)}
			</div>
		</div>
	)
}
