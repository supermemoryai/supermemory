"use client"

import { GlassMenuEffect } from "@/ui/glass-effect"
import { AnimatePresence } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GraphCanvas } from "./graph-canvas"
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphInteractions } from "@/hooks/use-graph-interactions"
import { useForceSimulation } from "@/hooks/use-force-simulation"
import { injectStyles } from "@/lib/inject-styles"
import { Legend } from "./legend"
import { LoadingIndicator } from "./loading-indicator"
import { NavigationControls } from "./navigation-controls"
import { NodeDetailPanel } from "./node-detail-panel"
import { NodePopover } from "./node-popover"
import { SpacesDropdown } from "./spaces-dropdown"
import * as styles from "./memory-graph.css"
import { defaultTheme } from "@/styles/theme.css"

import type { MemoryGraphProps } from "@/types"

export const MemoryGraph = ({
	children,
	documents,
	isLoading = false,
	isLoadingMore = false,
	error = null,
	totalLoaded,
	hasMore = false,
	loadMoreDocuments,
	showSpacesSelector,
	variant = "console",
	legendId,
	highlightDocumentIds = [],
	highlightsVisible = true,
	occludedRightPx = 0,
	autoLoadOnViewport = true,
	themeClassName,
	selectedSpace: externalSelectedSpace,
	onSpaceChange: externalOnSpaceChange,
	memoryLimit,
	isExperimental,
	// Slideshow control
	isSlideshowActive = false,
	onSlideshowNodeChange,
}: MemoryGraphProps) => {
	// Inject styles on first render (client-side only)
	useEffect(() => {
		injectStyles()
	}, [])

	// Derive totalLoaded from documents if not provided
	const effectiveTotalLoaded = totalLoaded ?? documents.length
	// No-op for loadMoreDocuments if not provided
	const effectiveLoadMoreDocuments = loadMoreDocuments ?? (async () => {})
	// Derive showSpacesSelector from variant if not explicitly provided
	// console variant shows spaces selector, consumer variant hides it
	const finalShowSpacesSelector = showSpacesSelector ?? variant === "console"

	// Internal state for controlled/uncontrolled pattern
	const [internalSelectedSpace, setInternalSelectedSpace] =
		useState<string>("all")

	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)

	// Use external state if provided, otherwise use internal state
	const selectedSpace = externalSelectedSpace ?? internalSelectedSpace

	// Handle space change
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

	// Create data object with pagination to satisfy type requirements
	const data = useMemo(() => {
		return documents && documents.length > 0
			? {
					documents,
					pagination: {
						currentPage: 1,
						limit: documents.length,
						totalItems: documents.length,
						totalPages: 1,
					},
				}
			: null
	}, [documents])

	// Graph interactions with variant-specific settings
	const {
		panX,
		panY,
		zoom,
		/** hoveredNode currently unused within this component */
		hoveredNode: _hoveredNode,
		selectedNode,
		draggingNodeId,
		nodePositions,
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

	// Graph data
	const { nodes, edges } = useGraphData(
		data,
		selectedSpace,
		nodePositions,
		draggingNodeId,
		memoryLimit,
	)

	// State to trigger re-renders when simulation ticks
	const [, setSimulationTick] = useState(0)

	// Track drag state for physics integration
	const dragStateRef = useRef<{
		nodeId: string | null
		startX: number
		startY: number
		nodeStartX: number
		nodeStartY: number
	}>({ nodeId: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0 })

	// Force simulation - only runs during interactions (drag)
	const forceSimulation = useForceSimulation(
		nodes,
		edges,
		() => {
			// On each tick, trigger a re-render
			// D3 directly mutates node.x and node.y
			setSimulationTick((prev) => prev + 1)
		},
		true, // enabled
	)

	// Auto-fit once per unique highlight set to show the full graph for context
	const lastFittedHighlightKeyRef = useRef<string>("")
	useEffect(() => {
		const highlightKey = highlightsVisible ? highlightDocumentIds.join("|") : ""
		if (
			highlightKey &&
			highlightKey !== lastFittedHighlightKeyRef.current &&
			containerSize.width > 0 &&
			containerSize.height > 0 &&
			nodes.length > 0
		) {
			autoFitToViewport(nodes, containerSize.width, containerSize.height, {
				occludedRightPx,
				animate: true,
			})
			lastFittedHighlightKeyRef.current = highlightKey
		}
	}, [
		highlightsVisible,
		highlightDocumentIds,
		containerSize.width,
		containerSize.height,
		nodes.length,
		occludedRightPx,
		autoFitToViewport,
	])

	// Auto-fit graph when component mounts or nodes change significantly
	const hasAutoFittedRef = useRef(false)
	useEffect(() => {
		// Only auto-fit once when we have nodes and container size
		if (
			!hasAutoFittedRef.current &&
			nodes.length > 0 &&
			containerSize.width > 0 &&
			containerSize.height > 0
		) {
			// Auto-fit to show all content for both variants
			// Add a small delay to ensure the canvas is fully initialized
			const timer = setTimeout(() => {
				autoFitToViewport(nodes, containerSize.width, containerSize.height)
				hasAutoFittedRef.current = true
			}, 100)

			return () => clearTimeout(timer)
		}
	}, [nodes, containerSize.width, containerSize.height, autoFitToViewport])

	// Reset auto-fit flag when nodes array becomes empty (switching views)
	useEffect(() => {
		if (nodes.length === 0) {
			hasAutoFittedRef.current = false
		}
	}, [nodes.length])

	// Extract unique spaces from memories and calculate counts
	const { availableSpaces, spaceMemoryCounts } = useMemo(() => {
		if (!data?.documents) return { availableSpaces: [], spaceMemoryCounts: {} }

		const spaceSet = new Set<string>()
		const counts: Record<string, number> = {}

		data.documents.forEach((doc) => {
			doc.memoryEntries.forEach((memory) => {
				const spaceId = memory.spaceContainerTag || memory.spaceId || "default"
				spaceSet.add(spaceId)
				counts[spaceId] = (counts[spaceId] || 0) + 1
			})
		})

		return {
			availableSpaces: Array.from(spaceSet).sort(),
			spaceMemoryCounts: counts,
		}
	}, [data])

	// Handle container resize
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const newWidth = containerRef.current.clientWidth
				const newHeight = containerRef.current.clientHeight

				// Only update if size actually changed and is valid
				setContainerSize((prev) => {
					if (prev.width !== newWidth || prev.height !== newHeight) {
						return { width: newWidth, height: newHeight }
					}
					return prev
				})
			}
		}

		// Use a slight delay to ensure DOM is fully rendered
		const timer = setTimeout(updateSize, 0)
		updateSize() // Also call immediately

		window.addEventListener("resize", updateSize)

		// Use ResizeObserver for more accurate container size detection
		const resizeObserver = new ResizeObserver(updateSize)
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		return () => {
			clearTimeout(timer)
			window.removeEventListener("resize", updateSize)
			resizeObserver.disconnect()
		}
	}, [])

	// Physics-enabled node drag start
	const handleNodeDragStartWithNodes = useCallback(
		(nodeId: string, e: React.MouseEvent) => {
			// Find the node being dragged
			const node = nodes.find((n) => n.id === nodeId)
			if (node) {
				// Store drag start state
				dragStateRef.current = {
					nodeId,
					startX: e.clientX,
					startY: e.clientY,
					nodeStartX: node.x,
					nodeStartY: node.y,
				}

				// Pin the node at its current position (d3-force pattern)
				node.fx = node.x
				node.fy = node.y

				// Reheat simulation immediately (like d3 reference code)
				forceSimulation.reheat()
			}

			// Set dragging state (still need this for visual feedback)
			handleNodeDragStart(nodeId, e, nodes)
		},
		[handleNodeDragStart, nodes, forceSimulation],
	)

	// Physics-enabled node drag move
	const handleNodeDragMoveWithNodes = useCallback(
		(e: React.MouseEvent) => {
			if (draggingNodeId && dragStateRef.current.nodeId === draggingNodeId) {
				// Update the fixed position during drag (this is what d3 uses)
				const node = nodes.find((n) => n.id === draggingNodeId)
				if (node) {
					// Calculate new position based on drag delta
					const deltaX = (e.clientX - dragStateRef.current.startX) / zoom
					const deltaY = (e.clientY - dragStateRef.current.startY) / zoom

					// Update subject position (matches d3 reference code pattern)
					// Only update fx/fy, let simulation handle x/y
					node.fx = dragStateRef.current.nodeStartX + deltaX
					node.fy = dragStateRef.current.nodeStartY + deltaY
				}
			}
		},
		[nodes, draggingNodeId, zoom],
	)

	// Physics-enabled node drag end
	const handleNodeDragEndWithPhysics = useCallback(() => {
		if (draggingNodeId) {
			// Unpin the node (allow physics to take over) - matches d3 reference code
			const node = nodes.find((n) => n.id === draggingNodeId)
			if (node) {
				node.fx = null
				node.fy = null
			}

			// Cool down the simulation (restore target alpha to 0)
			forceSimulation.coolDown()

			// Reset drag state
			dragStateRef.current = {
				nodeId: null,
				startX: 0,
				startY: 0,
				nodeStartX: 0,
				nodeStartY: 0,
			}
		}

		// Call original handler to clear dragging state
		handleNodeDragEnd()
	}, [draggingNodeId, nodes, forceSimulation, handleNodeDragEnd])

	// Physics-aware node click - let simulation continue naturally
	const handleNodeClickWithPhysics = useCallback(
		(nodeId: string) => {
			// Just call original handler to update selected node state
			// Don't stop the simulation - let it cool down naturally
			handleNodeClick(nodeId)
		},
		[handleNodeClick],
	)

	// Navigation callbacks
	const handleCenter = useCallback(() => {
		if (nodes.length > 0) {
			// Calculate center of all nodes
			let sumX = 0
			let sumY = 0
			let count = 0

			nodes.forEach((node) => {
				sumX += node.x
				sumY += node.y
				count++
			})

			if (count > 0) {
				const centerX = sumX / count
				const centerY = sumY / count
				centerViewportOn(
					centerX,
					centerY,
					containerSize.width,
					containerSize.height,
				)
			}
		}
	}, [nodes, centerViewportOn, containerSize.width, containerSize.height])

	const handleAutoFit = useCallback(() => {
		if (
			nodes.length > 0 &&
			containerSize.width > 0 &&
			containerSize.height > 0
		) {
			autoFitToViewport(nodes, containerSize.width, containerSize.height, {
				occludedRightPx,
				animate: true,
			})
		}
	}, [
		nodes,
		containerSize.width,
		containerSize.height,
		occludedRightPx,
		autoFitToViewport,
	])

	// Get selected node data
	const selectedNodeData = useMemo(() => {
		if (!selectedNode) return null
		return nodes.find((n) => n.id === selectedNode) || null
	}, [selectedNode, nodes])

	// Calculate popover position (memoized for performance)
	const popoverPosition = useMemo(() => {
		if (!selectedNodeData) return null

		// Calculate screen position of the node
		const screenX = selectedNodeData.x * zoom + panX
		const screenY = selectedNodeData.y * zoom + panY

		// Popover dimensions (estimated)
		const popoverWidth = 320
		const popoverHeight = 400
		const padding = 16

		// Calculate node dimensions to position popover with proper gap
		const nodeSize = selectedNodeData.size * zoom
		const nodeWidth = selectedNodeData.type === "document" ? nodeSize * 1.4 : nodeSize
		const nodeHeight = selectedNodeData.type === "document" ? nodeSize * 0.9 : nodeSize
		const gap = 20 // Gap between node and popover

		// Smart positioning: flip to other side if would go off-screen
		let popoverX = screenX + nodeWidth / 2 + gap
		let popoverY = screenY - popoverHeight / 2

		// Check right edge
		if (popoverX + popoverWidth > containerSize.width - padding) {
			// Flip to left side of node
			popoverX = screenX - nodeWidth / 2 - gap - popoverWidth
		}

		// Check left edge
		if (popoverX < padding) {
			popoverX = padding
		}

		// Check bottom edge
		if (popoverY + popoverHeight > containerSize.height - padding) {
			// Move up
			popoverY = containerSize.height - popoverHeight - padding
		}

		// Check top edge
		if (popoverY < padding) {
			popoverY = padding
		}

		return { x: popoverX, y: popoverY }
	}, [selectedNodeData, zoom, panX, panY, containerSize.width, containerSize.height])

	// Viewport-based loading: load more when most documents are visible (optional)
	const checkAndLoadMore = useCallback(() => {
		if (
			isLoadingMore ||
			!hasMore ||
			!data?.documents ||
			data.documents.length === 0
		)
			return

		// Calculate viewport bounds
		const viewportBounds = {
			left: -panX / zoom - 200,
			right: (-panX + containerSize.width) / zoom + 200,
			top: -panY / zoom - 200,
			bottom: (-panY + containerSize.height) / zoom + 200,
		}

		// Count visible documents
		const visibleDocuments = data.documents.filter((doc) => {
			const docNodes = nodes.filter(
				(node) => node.type === "document" && node.data.id === doc.id,
			)
			return docNodes.some(
				(node) =>
					node.x >= viewportBounds.left &&
					node.x <= viewportBounds.right &&
					node.y >= viewportBounds.top &&
					node.y <= viewportBounds.bottom,
			)
		})

		// If 80% or more of documents are visible, load more
		const visibilityRatio = visibleDocuments.length / data.documents.length
		if (visibilityRatio >= 0.8) {
			effectiveLoadMoreDocuments()
		}
	}, [
		isLoadingMore,
		hasMore,
		data,
		panX,
		panY,
		zoom,
		containerSize.width,
		containerSize.height,
		nodes,
		effectiveLoadMoreDocuments,
	])

	// Throttled version to avoid excessive checks
	const lastLoadCheckRef = useRef(0)
	const throttledCheckAndLoadMore = useCallback(() => {
		const now = Date.now()
		if (now - lastLoadCheckRef.current > 1000) {
			// Check at most once per second
			lastLoadCheckRef.current = now
			checkAndLoadMore()
		}
	}, [checkAndLoadMore])

	// Monitor viewport changes to trigger loading
	useEffect(() => {
		if (!autoLoadOnViewport) return
		throttledCheckAndLoadMore()
	}, [throttledCheckAndLoadMore, autoLoadOnViewport])

	// Initial load trigger when graph is first rendered
	useEffect(() => {
		if (!autoLoadOnViewport) return
		if (data?.documents && data.documents.length > 0 && hasMore) {
			// Start loading more documents after initial render
			setTimeout(() => {
				throttledCheckAndLoadMore()
			}, 500) // Small delay to allow initial layout
		}
	}, [data, hasMore, throttledCheckAndLoadMore, autoLoadOnViewport])

	// Slideshow logic - simulate actual node clicks with physics
	const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const lastSelectedIndexRef = useRef<number>(-1)
	const isSlideshowActiveRef = useRef(isSlideshowActive)

	// Update slideshow active ref
	useEffect(() => {
		isSlideshowActiveRef.current = isSlideshowActive
	}, [isSlideshowActive])

	// Use refs to store current values without triggering re-renders
	const nodesRef = useRef(nodes)
	const handleNodeClickRef = useRef(handleNodeClick)
	const centerViewportOnRef = useRef(centerViewportOn)
	const containerSizeRef = useRef(containerSize)
	const onSlideshowNodeChangeRef = useRef(onSlideshowNodeChange)
	const forceSimulationRef = useRef(forceSimulation)

	// Update refs when values change
	useEffect(() => {
		nodesRef.current = nodes
		handleNodeClickRef.current = handleNodeClick
		centerViewportOnRef.current = centerViewportOn
		containerSizeRef.current = containerSize
		onSlideshowNodeChangeRef.current = onSlideshowNodeChange
		forceSimulationRef.current = forceSimulation
	}, [nodes, handleNodeClick, centerViewportOn, containerSize, onSlideshowNodeChange, forceSimulation])

	useEffect(() => {
		// Clear any existing interval when isSlideshowActive changes
		if (slideshowIntervalRef.current) {
			clearInterval(slideshowIntervalRef.current)
			slideshowIntervalRef.current = null
		}

		if (!isSlideshowActive) {
			// Close the popover when stopping slideshow
			setSelectedNode(null)
			return
		}

		// Select a random node (avoid selecting the same one twice in a row)
		const selectRandomNode = () => {
			// Double-check slideshow is still active
			if (!isSlideshowActiveRef.current) return

			const currentNodes = nodesRef.current
			if (currentNodes.length === 0) return

			let randomIndex: number
			// If we have more than one node, avoid selecting the same one
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
				// Smoothly pan to the node first
				centerViewportOnRef.current(
					randomNode.x,
					randomNode.y,
					containerSizeRef.current.width,
					containerSizeRef.current.height,
				)

				// Simulate the actual node click (triggers dimming and popover)
				handleNodeClickRef.current(randomNode.id)

				// Trigger physics animation briefly
				forceSimulationRef.current.reheat()

				// Cool down physics after 1 second
				setTimeout(() => {
					forceSimulationRef.current.coolDown()
				}, 1000)

				// Notify parent component
				onSlideshowNodeChangeRef.current?.(randomNode.id)
			}
		}

		// Start immediately
		selectRandomNode()

		// Set interval for subsequent selections (3.5 seconds)
		slideshowIntervalRef.current = setInterval(() => {
			selectRandomNode()
		}, 3500)

		return () => {
			if (slideshowIntervalRef.current) {
				clearInterval(slideshowIntervalRef.current)
				slideshowIntervalRef.current = null
			}
		}
	}, [isSlideshowActive]) // Only depend on isSlideshowActive

	if (error) {
		return (
			<div className={styles.errorContainer}>
				<div className={styles.errorCard}>
					{/* Glass effect background */}
					<GlassMenuEffect rounded="xl" />

					<div className={styles.errorContent}>
						Error loading documents: {error.message}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className={`${themeClassName ?? defaultTheme} ${styles.mainContainer}`}
		>
			{/* Spaces selector - only shown for console variant */}
			{variant === "console" && availableSpaces.length > 0 && (
				<div className={styles.spacesSelectorContainer}>
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
				isLoadingMore={isLoadingMore}
				totalLoaded={effectiveTotalLoaded}
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

			{/* Node popover - positioned near clicked node */}
			{selectedNodeData && popoverPosition && (
				<NodePopover
					node={selectedNodeData}
					x={popoverPosition.x}
					y={popoverPosition.y}
					onClose={() => setSelectedNode(null)}
					containerBounds={containerRef.current?.getBoundingClientRect()}
				/>
			)}

			{/* Show welcome screen when no memories exist */}
			{!isLoading &&
				(!data || nodes.filter((n) => n.type === "document").length === 0) && (
					<>{children}</>
				)}

			{/* Graph container */}
			<div className={styles.graphContainer} ref={containerRef}>
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
						className={styles.navControlsContainer}
					/>
				)}
			</div>
		</div>
	)
}
