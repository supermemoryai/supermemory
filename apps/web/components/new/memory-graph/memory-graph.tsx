"use client"

import { GlassMenuEffect } from "@repo/ui/other/glass-effect"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { GraphCanvas } from "./graph-canvas"
import { useGraphApi } from "./hooks/use-graph-api"
import { useGraphData } from "./hooks/use-graph-data"
import { ForceSimulation } from "./canvas/simulation"
import { VersionChainIndex } from "./canvas/version-chain"
import type { ViewportState } from "./canvas/viewport"
import { Legend } from "./legend"
import { LoadingIndicator } from "./loading-indicator"
import { NavigationControls } from "./navigation-controls"
import { NodeHoverPopover } from "./node-hover-popover"
import { colors } from "./constants"
import type { GraphNode } from "./types"

export interface MemoryGraphProps {
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

export const MemoryGraph = ({
	children,
	isLoading: externalIsLoading = false,
	error: externalError = null,
	variant = "console",
	legendId,
	highlightDocumentIds = [],
	highlightsVisible = true,
	containerTags,
	documentIds,
	maxNodes = 200,
	isSlideshowActive = false,
	onSlideshowNodeChange,
	onSlideshowStop,
	canvasRef,
}: MemoryGraphProps) => {
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const viewportRef = useRef<ViewportState | null>(null)
	const simulationRef = useRef<ForceSimulation | null>(null)
	const chainIndex = useRef(new VersionChainIndex())

	// React state only for things that affect DOM
	const [hoveredNode, setHoveredNode] = useState<string | null>(null)
	const [selectedNode, setSelectedNode] = useState<string | null>(null)
	const [zoomDisplay, setZoomDisplay] = useState(50)

	const {
		data: apiData,
		isLoading: apiIsLoading,
		error: apiError,
	} = useGraphApi({
		containerTags,
		documentIds,
		limit: maxNodes,
		enabled: containerSize.width > 0 && containerSize.height > 0,
	})

	const { nodes, edges } = useGraphData(
		apiData.documents,
		apiData.edges,
		null,
		containerSize.width,
		containerSize.height,
	)

	// Rebuild version chain index when documents change
	useEffect(() => {
		chainIndex.current.rebuild(apiData.documents)
	}, [apiData.documents])

	// Force simulation (created once, updated when data changes)
	useEffect(() => {
		if (nodes.length === 0) return

		if (!simulationRef.current) {
			simulationRef.current = new ForceSimulation()
		}
		simulationRef.current.init(nodes, edges)

		return () => {
			simulationRef.current?.destroy()
			simulationRef.current = null
		}
	}, [nodes, edges])

	// Auto-fit when data first loads
	const hasAutoFittedRef = useRef(false)
	useEffect(() => {
		if (
			!hasAutoFittedRef.current &&
			nodes.length > 0 &&
			viewportRef.current &&
			containerSize.width > 0
		) {
			const timer = setTimeout(() => {
				viewportRef.current?.fitToNodes(
					nodes,
					containerSize.width,
					containerSize.height,
				)
				hasAutoFittedRef.current = true
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [nodes, containerSize.width, containerSize.height])

	useEffect(() => {
		if (nodes.length === 0) hasAutoFittedRef.current = false
	}, [nodes.length])

	// Container resize observer
	useEffect(() => {
		const el = containerRef.current
		if (!el) return

		const ro = new ResizeObserver(() => {
			setContainerSize({ width: el.clientWidth, height: el.clientHeight })
			setContainerBounds(el.getBoundingClientRect())
		})
		ro.observe(el)
		setContainerSize({ width: el.clientWidth, height: el.clientHeight })
		setContainerBounds(el.getBoundingClientRect())

		return () => ro.disconnect()
	}, [])

	// Callbacks for GraphCanvas
	const handleNodeHover = useCallback(
		(id: string | null) => setHoveredNode(id),
		[],
	)

	const handleNodeClick = useCallback((id: string | null) => {
		setSelectedNode((prev) => (id === null ? null : prev === id ? null : id))
	}, [])

	const handleNodeDragStart = useCallback((_id: string) => {
		// Drag is handled imperatively by InputHandler
	}, [])

	const handleNodeDragEnd = useCallback(() => {
		// Drag end handled by InputHandler
	}, [])

	const handleViewportChange = useCallback((zoom: number) => {
		setZoomDisplay(Math.round(zoom * 100))
	}, [])

	// Navigation
	const handleAutoFit = useCallback(() => {
		if (nodes.length === 0 || !viewportRef.current) return
		viewportRef.current.fitToNodes(
			nodes,
			containerSize.width,
			containerSize.height,
		)
	}, [nodes, containerSize.width, containerSize.height])

	const handleCenter = useCallback(() => {
		if (nodes.length === 0 || !viewportRef.current) return
		let sx = 0
		let sy = 0
		for (const n of nodes) {
			sx += n.x
			sy += n.y
		}
		viewportRef.current.centerOn(
			sx / nodes.length,
			sy / nodes.length,
			containerSize.width,
			containerSize.height,
		)
	}, [nodes, containerSize.width, containerSize.height])

	const handleZoomIn = useCallback(() => {
		const vp = viewportRef.current
		if (!vp) return
		vp.zoomTo(vp.zoom * 1.3, containerSize.width / 2, containerSize.height / 2)
	}, [containerSize.width, containerSize.height])

	const handleZoomOut = useCallback(() => {
		const vp = viewportRef.current
		if (!vp) return
		vp.zoomTo(vp.zoom / 1.3, containerSize.width / 2, containerSize.height / 2)
	}, [containerSize.width, containerSize.height])

	// Keyboard shortcuts
	useHotkeys("z", handleAutoFit, [handleAutoFit])
	useHotkeys("c", handleCenter, [handleCenter])
	useHotkeys("equal", handleZoomIn, [handleZoomIn])
	useHotkeys("minus", handleZoomOut, [handleZoomOut])
	useHotkeys("escape", () => setSelectedNode(null), [])

	// Arrow key navigation through nodes
	const selectAndCenter = useCallback(
		(nodeId: string) => {
			setSelectedNode(nodeId)
			const n = nodes.find((nd) => nd.id === nodeId)
			if (n && viewportRef.current)
				viewportRef.current.centerOn(
					n.x,
					n.y,
					containerSize.width,
					containerSize.height,
				)
		},
		[nodes, containerSize.width, containerSize.height],
	)

	const navigateUp = useCallback(() => {
		if (!selectedNode) return
		const chain = chainIndex.current.getChain(selectedNode)
		if (chain && chain.length > 1) {
			const idx = chain.findIndex((e) => e.id === selectedNode)
			if (idx > 0) {
				selectAndCenter(chain[idx - 1]!.id)
				return
			}
		}
		// At top of chain or no chain — go to parent document
		const node = nodes.find((n) => n.id === selectedNode)
		if (node?.type === "memory" && "documentId" in node.data) {
			selectAndCenter(node.data.documentId)
		}
	}, [selectedNode, nodes, selectAndCenter])

	const navigateDown = useCallback(() => {
		if (!selectedNode) return
		// Version chain navigation
		const chain = chainIndex.current.getChain(selectedNode)
		if (chain && chain.length > 1) {
			const idx = chain.findIndex((e) => e.id === selectedNode)
			if (idx >= 0 && idx < chain.length - 1) {
				selectAndCenter(chain[idx + 1]!.id)
				return
			}
		}
		// On a document — go to its first memory
		const node = nodes.find((n) => n.id === selectedNode)
		if (node?.type === "document") {
			const child = nodes.find(
				(n) =>
					n.type === "memory" &&
					"documentId" in n.data &&
					n.data.documentId === selectedNode,
			)
			if (child) selectAndCenter(child.id)
		}
	}, [selectedNode, nodes, selectAndCenter])

	const navigateNext = useCallback(() => {
		if (!selectedNode) return
		const node = nodes.find((n) => n.id === selectedNode)
		if (!node) return

		if (node.type === "document") {
			const docs = nodes.filter((n) => n.type === "document")
			const idx = docs.findIndex((n) => n.id === selectedNode)
			const next = docs[(idx + 1) % docs.length]!
			setSelectedNode(next.id)
			if (viewportRef.current)
				viewportRef.current.centerOn(
					next.x,
					next.y,
					containerSize.width,
					containerSize.height,
				)
		} else {
			const docId = "documentId" in node.data ? node.data.documentId : null
			const siblings = nodes.filter(
				(n) =>
					n.type === "memory" &&
					"documentId" in n.data &&
					n.data.documentId === docId,
			)
			if (siblings.length === 0) return
			const idx = siblings.findIndex((n) => n.id === selectedNode)
			const next = siblings[(idx + 1) % siblings.length]!
			setSelectedNode(next.id)
			if (viewportRef.current)
				viewportRef.current.centerOn(
					next.x,
					next.y,
					containerSize.width,
					containerSize.height,
				)
		}
	}, [selectedNode, nodes, containerSize.width, containerSize.height])

	const navigatePrev = useCallback(() => {
		if (!selectedNode) return
		const node = nodes.find((n) => n.id === selectedNode)
		if (!node) return

		if (node.type === "document") {
			const docs = nodes.filter((n) => n.type === "document")
			const idx = docs.findIndex((n) => n.id === selectedNode)
			const prev = docs[(idx - 1 + docs.length) % docs.length]!
			setSelectedNode(prev.id)
			if (viewportRef.current)
				viewportRef.current.centerOn(
					prev.x,
					prev.y,
					containerSize.width,
					containerSize.height,
				)
		} else {
			const docId = "documentId" in node.data ? node.data.documentId : null
			const siblings = nodes.filter(
				(n) =>
					n.type === "memory" &&
					"documentId" in n.data &&
					n.data.documentId === docId,
			)
			if (siblings.length === 0) return
			const idx = siblings.findIndex((n) => n.id === selectedNode)
			const prev = siblings[(idx - 1 + siblings.length) % siblings.length]!
			setSelectedNode(prev.id)
			if (viewportRef.current)
				viewportRef.current.centerOn(
					prev.x,
					prev.y,
					containerSize.width,
					containerSize.height,
				)
		}
	}, [selectedNode, nodes, containerSize.width, containerSize.height])

	useHotkeys("up", navigateUp, [navigateUp])
	useHotkeys("down", navigateDown, [navigateDown])
	useHotkeys("right", navigateNext, [navigateNext])
	useHotkeys("left", navigatePrev, [navigatePrev])

	// Slideshow
	useEffect(() => {
		if (!isSlideshowActive || nodes.length === 0) {
			if (!isSlideshowActive) {
				setSelectedNode(null)
				simulationRef.current?.coolDown()
			}
			return
		}

		let lastIdx = -1
		const pick = () => {
			if (nodes.length === 0) return
			let idx: number
			if (nodes.length > 1) {
				do {
					idx = Math.floor(Math.random() * nodes.length)
				} while (idx === lastIdx)
			} else {
				idx = 0
			}
			lastIdx = idx
			const n = nodes[idx]!
			setSelectedNode(n.id)
			viewportRef.current?.centerOn(
				n.x,
				n.y,
				containerSize.width,
				containerSize.height,
			)
			simulationRef.current?.reheat()
			onSlideshowNodeChange?.(n.id)
			setTimeout(() => simulationRef.current?.coolDown(), 1000)
		}

		pick()
		const interval = setInterval(pick, 3500)
		return () => clearInterval(interval)
	}, [
		isSlideshowActive,
		nodes,
		containerSize.width,
		containerSize.height,
		onSlideshowNodeChange,
	])

	// Active node: selected takes priority, then hovered
	const activeNodeId = selectedNode ?? hoveredNode
	const activeNodeData = useMemo(() => {
		if (!activeNodeId) return null
		return nodes.find((n) => n.id === activeNodeId) ?? null
	}, [activeNodeId, nodes])

	const activePopoverPosition = useMemo(() => {
		if (!activeNodeData || !viewportRef.current) return null
		const vp = viewportRef.current
		const screen = vp.worldToScreen(activeNodeData.x, activeNodeData.y)
		return {
			screenX: screen.x,
			screenY: screen.y,
			nodeRadius: (activeNodeData.size * vp.zoom) / 2,
		}
	}, [activeNodeData])

	const activeVersionChain = useMemo(() => {
		if (!activeNodeData || activeNodeData.type !== "memory") return null
		return chainIndex.current.getChain(activeNodeData.id)
	}, [activeNodeData])

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
		<div className="relative h-full rounded-xl overflow-hidden">
			<LoadingIndicator
				isLoading={isLoading}
				isLoadingMore={false}
				totalLoaded={apiData.totalCount}
				variant={variant}
			/>

			{!isLoading &&
				nodes.filter((n) => n.type === "document").length === 0 &&
				children}

			<div
				className="w-full h-full relative overflow-hidden touch-none select-none"
				ref={containerRef}
			>
				{containerSize.width > 0 && containerSize.height > 0 && (
					<GraphCanvas
						nodes={nodes}
						edges={edges}
						width={containerSize.width}
						height={containerSize.height}
						highlightDocumentIds={highlightsVisible ? highlightDocumentIds : []}
						selectedNodeId={selectedNode}
						onNodeHover={handleNodeHover}
						onNodeClick={handleNodeClick}
						onNodeDragStart={handleNodeDragStart}
						onNodeDragEnd={handleNodeDragEnd}
						onViewportChange={handleViewportChange}
						canvasRef={canvasRef}
						variant={variant}
						simulation={simulationRef.current ?? undefined}
						viewportRef={viewportRef}
					/>
				)}

				{activeNodeData && activePopoverPosition && (
					<NodeHoverPopover
						node={activeNodeData}
						screenX={activePopoverPosition.screenX}
						screenY={activePopoverPosition.screenY}
						nodeRadius={activePopoverPosition.nodeRadius}
						containerBounds={containerBounds ?? undefined}
						versionChain={activeVersionChain}
						onNavigateNext={navigateNext}
						onNavigatePrev={navigatePrev}
						onNavigateUp={navigateUp}
						onNavigateDown={navigateDown}
						onSelectNode={handleNodeClick}
					/>
				)}

				<div>
					{containerSize.width > 0 && (
						<NavigationControls
							onCenter={handleCenter}
							onZoomIn={handleZoomIn}
							onZoomOut={handleZoomOut}
							onAutoFit={handleAutoFit}
							nodes={nodes}
							className="absolute bottom-18 left-4 z-15"
							zoomLevel={zoomDisplay}
						/>
					)}
					<Legend
						edges={edges}
						id={legendId}
						isLoading={isLoading}
						nodes={nodes}
						variant={variant}
					/>
				</div>
			</div>
		</div>
	)
}
