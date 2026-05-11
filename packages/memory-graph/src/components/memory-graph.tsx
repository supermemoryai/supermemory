import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ForceSimulation } from "../canvas/simulation"
import { VersionChainIndex } from "../canvas/version-chain"
import type { ViewportState } from "../canvas/viewport"
import { useGraphData } from "../hooks/use-graph-data"
import { useGraphTheme } from "../hooks/use-graph-theme"
import type { GraphThemeColors, MemoryGraphProps } from "../types"
import { GraphCanvas } from "./graph-canvas"
import { Legend } from "./legend"
import { LoadingIndicator } from "./loading-indicator"
import { NavigationControls } from "./navigation-controls"
import { NodeHoverPopover } from "./node-hover-popover"

export function MemoryGraph({
	documents = [],
	isLoading: externalIsLoading = false,
	isLoadingMore = false,
	onLoadMore,
	hasMore = false,
	error: externalError = null,
	children,
	variant = "console",
	highlightDocumentIds = [],
	highlightsVisible = true,
	showFps = false,
	maxNodes,
	isSlideshowActive = false,
	onSlideshowNodeChange,
	canvasRef: externalCanvasRef,
	colors: colorOverrides,
	totalCount,
	onOpenDocument,
}: MemoryGraphProps) {
	const resolvedColors = useGraphTheme(colorOverrides)
	const colors = useMemo<GraphThemeColors>(
		() =>
			colorOverrides
				? { ...resolvedColors, ...colorOverrides }
				: resolvedColors,
		[resolvedColors, colorOverrides],
	)

	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
	const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const viewportRef = useRef<ViewportState | null>(null)
	const simulationRef = useRef<ForceSimulation | null>(null)
	const [simulation, setSimulation] = useState<ForceSimulation | null>(null)
	const chainIndex = useRef(new VersionChainIndex())

	// React state only for things that affect DOM
	const [hoveredNode, setHoveredNode] = useState<string | null>(null)
	const [selectedNode, setSelectedNode] = useState<string | null>(null)
	const [zoomDisplay, setZoomDisplay] = useState(50)
	// Monotonic counter that increments on any viewport change (pan or zoom)
	// Used as a dependency proxy to recalculate popover positions
	const [viewportVersion, setViewportVersion] = useState(0)

	// Limit documents so total node count (documents + their memories) stays under maxNodes
	const limitedDocuments = useMemo(() => {
		if (!maxNodes || documents.length === 0) return documents
		let totalNodes = 0
		let cutoff = documents.length
		for (let i = 0; i < documents.length; i++) {
			const docNodes = 1 + (documents[i]?.memories?.length ?? 0)
			if (totalNodes + docNodes > maxNodes) {
				cutoff = i
				break
			}
			totalNodes += docNodes
		}
		return cutoff === documents.length ? documents : documents.slice(0, cutoff)
	}, [documents, maxNodes])

	const { nodes, edges } = useGraphData(
		limitedDocuments,
		null,
		containerSize.width,
		containerSize.height,
		colors,
	)

	// Rebuild version chain index during render (not in an effect) so that
	// the chain data is up-to-date when getChain() is called in useMemo below.
	// rebuild() has an early-return guard (referential equality on documents)
	// that makes this a no-op on re-renders where limitedDocuments hasn't changed.
	chainIndex.current.rebuild(limitedDocuments)

	// Smart simulation re-init: track node ID set, only init() when IDs change
	const prevSimIdsRef = useRef<string>("")
	useEffect(() => {
		if (nodes.length === 0) {
			simulationRef.current?.destroy()
			simulationRef.current = null
			setSimulation(null)
			prevSimIdsRef.current = ""
			return
		}

		const idKey = nodes
			.map((n) => n.id)
			.sort()
			.join(",")

		if (!simulationRef.current) {
			const sim = new ForceSimulation()
			simulationRef.current = sim
			setSimulation(sim)
		}

		if (idKey !== prevSimIdsRef.current) {
			// IDs changed - full re-init
			prevSimIdsRef.current = idKey
			simulationRef.current.init(nodes, edges)
		} else {
			// Only metadata changed - update existing simulation
			simulationRef.current.update(nodes, edges)
		}
	}, [nodes, edges])

	// Cleanup simulation on unmount
	useEffect(() => {
		return () => {
			simulationRef.current?.destroy()
			simulationRef.current = null
			setSimulation(null)
		}
	}, [])

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

	// Load more when user zooms out enough that visible area dwarfs the node extent
	const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const loadMoreRef = useRef({ hasMore, isLoadingMore, onLoadMore })
	loadMoreRef.current = { hasMore, isLoadingMore, onLoadMore }

	const handleViewportChange = useCallback(
		(zoom: number, popoverVisible: boolean) => {
			setZoomDisplay(Math.round(zoom * 100))
			if (popoverVisible) {
				setViewportVersion((v) => v + 1)
			}

			const {
				hasMore: more,
				isLoadingMore: loading,
				onLoadMore: load,
			} = loadMoreRef.current
			if (!more || loading || !load || !viewportRef.current) return

			const vp = viewportRef.current
			const currentNodes = nodes
			if (currentNodes.length === 0) return

			const topLeft = vp.screenToWorld(0, 0)
			const bottomRight = vp.screenToWorld(
				containerSize.width,
				containerSize.height,
			)
			const viewW = bottomRight.x - topLeft.x
			const viewH = bottomRight.y - topLeft.y

			let minX = Number.POSITIVE_INFINITY
			let minY = Number.POSITIVE_INFINITY
			let maxX = Number.NEGATIVE_INFINITY
			let maxY = Number.NEGATIVE_INFINITY
			for (const n of currentNodes) {
				if (n.x < minX) minX = n.x
				if (n.y < minY) minY = n.y
				if (n.x > maxX) maxX = n.x
				if (n.y > maxY) maxY = n.y
			}

			const nodeW = maxX - minX || 1
			const nodeH = maxY - minY || 1

			// Only trigger when the visible area is 3x larger than the node extent
			// (i.e. user has zoomed out significantly past the data)
			const zoomedOut = viewW > nodeW * 3 || viewH > nodeH * 3

			if (zoomedOut && !loadMoreTimerRef.current) {
				loadMoreTimerRef.current = setTimeout(() => {
					loadMoreTimerRef.current = null
					loadMoreRef.current.onLoadMore?.()
				}, 500)
			}
		},
		[nodes, containerSize.width, containerSize.height],
	)

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

	// Wrap onOpenDocument to dismiss the popover before opening the modal.
	// Without this, the popover (z-index: 100) stays mounted on top of the
	// document modal (z-50), obscuring it and intercepting clicks.
	const handleOpenDocument = useCallback(
		(documentId: string) => {
			setSelectedNode(null)
			setHoveredNode(null)
			onOpenDocument?.(documentId)
		},
		[onOpenDocument],
	)

	// Keyboard shortcuts — using useEffect with keydown listener
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Don't handle if user is typing in an input
			const target = e.target as HTMLElement
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return

			switch (e.key) {
				case "z":
				case "Z":
					handleAutoFit()
					break
				case "c":
				case "C":
					handleCenter()
					break
				case "=":
				case "+":
					handleZoomIn()
					break
				case "-":
				case "_":
					handleZoomOut()
					break
				case "Escape":
					setSelectedNode(null)
					break
			}
		}

		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [handleAutoFit, handleCenter, handleZoomIn, handleZoomOut])

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
			const prev = chain[idx - 1]
			if (idx > 0 && prev) {
				selectAndCenter(prev.id)
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
			const next = chain[idx + 1]
			if (idx >= 0 && idx < chain.length - 1 && next) {
				selectAndCenter(next.id)
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
			const next = docs[(idx + 1) % docs.length]
			if (next) selectAndCenter(next.id)
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
			const next = siblings[(idx + 1) % siblings.length]
			if (next) selectAndCenter(next.id)
		}
	}, [selectedNode, nodes, selectAndCenter])

	const navigatePrev = useCallback(() => {
		if (!selectedNode) return
		const node = nodes.find((n) => n.id === selectedNode)
		if (!node) return

		if (node.type === "document") {
			const docs = nodes.filter((n) => n.type === "document")
			const idx = docs.findIndex((n) => n.id === selectedNode)
			const prev = docs[(idx - 1 + docs.length) % docs.length]
			if (prev) selectAndCenter(prev.id)
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
			const prev = siblings[(idx - 1 + siblings.length) % siblings.length]
			if (prev) selectAndCenter(prev.id)
		}
	}, [selectedNode, nodes, selectAndCenter])

	// Arrow key navigation
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return

			switch (e.key) {
				case "ArrowUp":
					e.preventDefault()
					navigateUp()
					break
				case "ArrowDown":
					e.preventDefault()
					navigateDown()
					break
				case "ArrowRight":
					e.preventDefault()
					navigateNext()
					break
				case "ArrowLeft":
					e.preventDefault()
					navigatePrev()
					break
			}
		}

		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [navigateUp, navigateDown, navigateNext, navigatePrev])

	// Slideshow — use refs to avoid re-creating the interval on resize or node updates
	const nodesRef = useRef(nodes)
	nodesRef.current = nodes
	const containerSizeRef = useRef(containerSize)
	containerSizeRef.current = containerSize
	const onSlideshowNodeChangeRef = useRef(onSlideshowNodeChange)
	onSlideshowNodeChangeRef.current = onSlideshowNodeChange

	useEffect(() => {
		if (!isSlideshowActive || nodes.length === 0) {
			if (!isSlideshowActive) {
				setSelectedNode(null)
				simulationRef.current?.coolDown()
			}
			return
		}

		let lastIdx = -1
		let coolDownTimer: ReturnType<typeof setTimeout> | null = null

		const pick = () => {
			const currentNodes = nodesRef.current
			if (currentNodes.length === 0) return
			let idx: number
			if (currentNodes.length > 1) {
				do {
					idx = Math.floor(Math.random() * currentNodes.length)
				} while (idx === lastIdx)
			} else {
				idx = 0
			}
			lastIdx = idx
			const n = currentNodes[idx]
			if (!n) return
			setSelectedNode(n.id)
			const sz = containerSizeRef.current
			viewportRef.current?.centerOn(n.x, n.y, sz.width, sz.height)
			simulationRef.current?.reheat()
			onSlideshowNodeChangeRef.current?.(n.id)
			// Clear any pending coolDown before scheduling a new one
			if (coolDownTimer) clearTimeout(coolDownTimer)
			coolDownTimer = setTimeout(() => {
				simulationRef.current?.coolDown()
				coolDownTimer = null
			}, 1000)
		}

		pick()
		const interval = setInterval(pick, 3500)
		return () => {
			clearInterval(interval)
			if (coolDownTimer) clearTimeout(coolDownTimer)
		}
	}, [isSlideshowActive, nodes.length])

	// Active node: selected takes priority, then hovered
	const activeNodeId = selectedNode ?? hoveredNode
	const activeNodeData = useMemo(() => {
		if (!activeNodeId) return null
		return nodes.find((n) => n.id === activeNodeId) ?? null
	}, [activeNodeId, nodes])

	// biome-ignore lint/correctness/useExhaustiveDependencies: viewportVersion intentionally used as proxy for viewport state changes
	const activePopoverPosition = useMemo(() => {
		if (!activeNodeData || !viewportRef.current) return null
		const vp = viewportRef.current
		const screen = vp.worldToScreen(activeNodeData.x, activeNodeData.y)
		return {
			screenX: screen.x,
			screenY: screen.y,
			nodeRadius: (activeNodeData.size * vp.zoom) / 2,
		}
		// viewportVersion triggers re-computation on any viewport change (pan + zoom)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeNodeData, viewportVersion])

	// biome-ignore lint/correctness/useExhaustiveDependencies: limitedDocuments triggers re-computation after chainIndex.current.rebuild() runs with new data
	const activeVersionChain = useMemo(() => {
		if (!activeNodeData || activeNodeData.type !== "memory") return null
		return chainIndex.current.getChain(activeNodeData.id)
	}, [activeNodeData, limitedDocuments])

	const isLoading = externalIsLoading

	if (externalError) {
		const errorContainerStyle: React.CSSProperties = {
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "transparent",
			borderRadius: 12,
		}

		const errorBoxStyle: React.CSSProperties = {
			color: colors.textSecondary,
			paddingLeft: 24,
			paddingRight: 24,
			paddingTop: 16,
			paddingBottom: 16,
		}

		return (
			<div style={errorContainerStyle}>
				<div style={errorBoxStyle}>
					Error loading graph: {externalError.message}
				</div>
			</div>
		)
	}

	const wrapperStyle: React.CSSProperties = {
		position: "relative",
		height: "100%",
		borderRadius: 12,
		overflow: "hidden",
		backgroundColor: "transparent",
	}

	const canvasContainerStyle: React.CSSProperties = {
		width: "100%",
		height: "100%",
		position: "relative",
		overflow: "hidden",
		touchAction: "none",
		userSelect: "none",
	}

	const emptyStateStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	}

	const navControlsStyle: React.CSSProperties = {
		position: "absolute",
		bottom: 72,
		left: 16,
		zIndex: 15,
	}

	return (
		<div style={wrapperStyle}>
			<LoadingIndicator
				isLoading={isLoading}
				isLoadingMore={isLoadingMore}
				totalLoaded={totalCount ?? documents.length}
				colors={colors}
			/>

			{!isLoading && !nodes.some((n) => n.type === "document") && children && (
				<div style={emptyStateStyle}>{children}</div>
			)}

			<div style={canvasContainerStyle} ref={containerRef}>
				{containerSize.width > 0 && containerSize.height > 0 && (
					<GraphCanvas
						colors={colors}
						edges={edges}
						height={containerSize.height}
						highlightDocumentIds={highlightsVisible ? highlightDocumentIds : []}
						nodes={nodes}
						onNodeClick={handleNodeClick}
						onNodeDragEnd={handleNodeDragEnd}
						onNodeDragStart={handleNodeDragStart}
						onNodeHover={handleNodeHover}
						onViewportChange={handleViewportChange}
						selectedNodeId={selectedNode}
						simulation={simulation ?? undefined}
						viewportRef={viewportRef}
						width={containerSize.width}
						canvasRef={externalCanvasRef}
						showFps={showFps}
						variant={variant}
					/>
				)}

				{activeNodeData && activePopoverPosition && (
					<NodeHoverPopover
						colors={colors}
						containerBounds={containerBounds ?? undefined}
						node={activeNodeData}
						nodeRadius={activePopoverPosition.nodeRadius}
						onNavigateDown={navigateDown}
						onNavigateNext={navigateNext}
						onNavigatePrev={navigatePrev}
						onNavigateUp={navigateUp}
						onSelectNode={handleNodeClick}
						onOpenDocument={onOpenDocument ? handleOpenDocument : undefined}
						screenX={activePopoverPosition.screenX}
						screenY={activePopoverPosition.screenY}
						versionChain={activeVersionChain}
					/>
				)}

				<div>
					{containerSize.width > 0 && (
						<div style={navControlsStyle}>
							<NavigationControls
								nodes={nodes}
								onAutoFit={handleAutoFit}
								onCenter={handleCenter}
								onZoomIn={handleZoomIn}
								onZoomOut={handleZoomOut}
								zoomLevel={zoomDisplay}
								colors={colors}
							/>
						</div>
					)}
					<Legend
						colors={colors}
						edges={edges}
						isLoading={isLoading}
						nodes={nodes}
					/>
				</div>
			</div>
		</div>
	)
}
