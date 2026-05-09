import { memo, useEffect, useLayoutEffect, useRef } from "react"
import { SpatialIndex } from "../canvas/hit-test"
import { InputHandler } from "../canvas/input-handler"
import { renderFrame } from "../canvas/renderer"
import { ViewportState } from "../canvas/viewport"
import { GRAPH_SETTINGS } from "../constants"
import type { GraphCanvasProps, GraphNode, GraphThemeColors } from "../types"
import type { ForceSimulation } from "../canvas/simulation"

export interface ExtendedGraphCanvasProps extends GraphCanvasProps {
	showFps?: boolean
	variant?: "console" | "consumer"
	colors: GraphThemeColors
}

export const GraphCanvas = memo<ExtendedGraphCanvasProps>(function GraphCanvas({
	nodes,
	edges,
	width,
	height,
	colors,
	highlightDocumentIds,
	selectedNodeId = null,
	onNodeHover,
	onNodeClick,
	onNodeDragStart,
	onNodeDragEnd,
	onViewportChange,
	canvasRef: externalCanvasRef,
	simulation,
	viewportRef: externalViewportRef,
	showFps = false,
	variant = "console",
}) {
	const internalCanvasRef = useRef<HTMLCanvasElement>(null)
	const canvasRef = externalCanvasRef || internalCanvasRef

	// Engine instances — mutable, never trigger re-renders
	const viewportRef = useRef<ViewportState | null>(null)
	const spatialRef = useRef(new SpatialIndex())
	const inputRef = useRef<InputHandler | null>(null)
	const rafRef = useRef(0)
	const renderNeeded = useRef(true)
	const nodeMapRef = useRef(new Map<string, GraphNode>())

	// FPS tracking refs
	const showFpsRef = useRef(showFps)
	showFpsRef.current = showFps
	const fpsFrames = useRef(0)
	const fpsLastTime = useRef(performance.now())
	const fpsValue = useRef(0)

	// DPR ref for FPS overlay
	const dprRef = useRef(
		typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
	)

	// All mutable render state in a single ref — the rAF loop reads from here
	const s = useRef({
		nodes,
		edges,
		width,
		height,
		colors,
		selectedNodeId,
		hoveredNodeId: null as string | null,
		highlightIds: new Set(highlightDocumentIds ?? []),
		dimProgress: 0,
		dimTarget: selectedNodeId ? 1 : 0,
	})

	// Sync incoming props to mutable state (no re-renders)
	s.current.nodes = nodes
	s.current.edges = edges
	s.current.width = width
	s.current.height = height
	s.current.colors = colors

	// Stable callback refs so InputHandler never needs recreation
	const cb = useRef({
		onNodeHover,
		onNodeClick,
		onNodeDragStart,
		onNodeDragEnd,
		onViewportChange,
		simulation: simulation as ForceSimulation | undefined,
	})
	cb.current = {
		onNodeHover,
		onNodeClick,
		onNodeDragStart,
		onNodeDragEnd,
		onViewportChange,
		simulation,
	}

	// Rebuild nodeMap + spatial index when nodes change
	useEffect(() => {
		const map = nodeMapRef.current
		map.clear()
		for (const n of nodes) map.set(n.id, n)
		spatialRef.current.rebuild(nodes)
		renderNeeded.current = true
	}, [nodes])

	useEffect(() => {
		const ids = new Set(highlightDocumentIds ?? [])
		s.current.highlightIds = ids
		renderNeeded.current = true

		if (ids.size === 0) return
		const vp = viewportRef.current
		if (!vp) return
		const highlighted = s.current.nodes.filter((n) => {
			if (n.type === "document") return ids.has(n.id)
			const d = n.data as { documentId?: string }
			return typeof d.documentId === "string" && ids.has(d.documentId)
		})
		if (highlighted.length === 0) return
		vp.fitToNodes(
			highlighted.map((n) => ({ x: n.x, y: n.y, size: n.size ?? 24 })),
			s.current.width,
			s.current.height,
		)
	}, [highlightDocumentIds])

	useEffect(() => {
		s.current.selectedNodeId = selectedNodeId
		s.current.dimTarget = selectedNodeId ? 1 : 0
		renderNeeded.current = true
	}, [selectedNodeId])

	// Create viewport + input handler (once per variant)
	// biome-ignore lint/correctness/useExhaustiveDependencies: canvasRef and externalViewportRef are refs — mutations do not trigger re-renders, intentionally omitted
	useLayoutEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const cfg = GRAPH_SETTINGS[variant]
		const vp = new ViewportState(
			cfg.initialPanX,
			cfg.initialPanY,
			cfg.initialZoom,
		)
		viewportRef.current = vp
		if (externalViewportRef) {
			;(
				externalViewportRef as React.MutableRefObject<ViewportState | null>
			).current = vp
		}

		const handler = new InputHandler(canvas, vp, spatialRef.current, {
			onNodeHover: (id) => {
				s.current.hoveredNodeId = id
				cb.current.onNodeHover(id)
				renderNeeded.current = true
			},
			onNodeClick: (id) => cb.current.onNodeClick(id),
			onNodeDragStart: (id, _node) => {
				cb.current.onNodeDragStart(id)
				cb.current.simulation?.reheat()
			},
			onNodeDragEnd: () => {
				cb.current.onNodeDragEnd()
				cb.current.simulation?.coolDown()
			},
			onRequestRender: () => {
				renderNeeded.current = true
			},
		})
		inputRef.current = handler

		return () => handler.destroy()
	}, [variant])

	// High-DPI canvas sizing
	const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
	dprRef.current = dpr

	// biome-ignore lint/correctness/useExhaustiveDependencies: canvasRef is a ref — mutations do not trigger re-renders, intentionally omitted
	useLayoutEffect(() => {
		const canvas = canvasRef.current
		if (!canvas || width === 0 || height === 0) return

		const MAX = 16384
		const d = Math.min(MAX / width, MAX / height, dpr)
		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`
		canvas.width = Math.min(width * d, MAX)
		canvas.height = Math.min(height * d, MAX)

		const ctx = canvas.getContext("2d")
		if (ctx) {
			ctx.scale(d, d)
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"
		}
		renderNeeded.current = true
	}, [width, height, dpr])

	// Single render loop — runs for component lifetime, reads everything from refs
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally empty deps — all state read via refs inside tick(), not reactive props
	useEffect(() => {
		let prevVpX = 0
		let prevVpY = 0
		let prevVpZoom = 0

		const tick = () => {
			rafRef.current = requestAnimationFrame(tick)

			const vp = viewportRef.current
			const canvas = canvasRef.current
			if (!vp || !canvas) return

			const ctx = canvas.getContext("2d")
			if (!ctx) return

			const cur = s.current

			// 1. Viewport momentum / spring zoom / lerp pan
			const vpMoving = vp.tick()

			// 2. Dim animation (ease toward target)
			const dd = cur.dimTarget - cur.dimProgress
			let dimming = false
			if (Math.abs(dd) > 0.01) {
				cur.dimProgress += dd * 0.1
				dimming = true
			} else {
				cur.dimProgress = cur.dimTarget
			}

			// 3. Simulation physics
			const simActive = cb.current.simulation?.isActive() ?? false

			// 4. Spatial index rebuild (only when positions actually move)
			const spatialChanged =
				simActive || inputRef.current?.getDraggingNode()
					? spatialRef.current.rebuild(cur.nodes)
					: false

			// Skip frame if nothing changed
			if (
				!vpMoving &&
				!simActive &&
				!dimming &&
				!spatialChanged &&
				!renderNeeded.current
			)
				return
			renderNeeded.current = false

			// Report viewport changes so zoom display and popover positions update.
			const vpChanged =
				vp.panX !== prevVpX || vp.panY !== prevVpY || vp.zoom !== prevVpZoom
			if ((vpChanged || simActive) && cb.current.onViewportChange) {
				cb.current.onViewportChange(
					vp.zoom,
					!!(cur.selectedNodeId || cur.hoveredNodeId),
				)
			}
			if (vpChanged) {
				prevVpX = vp.panX
				prevVpY = vp.panY
				prevVpZoom = vp.zoom
			}

			renderFrame(
				ctx,
				cur.nodes,
				cur.edges,
				vp,
				cur.width,
				cur.height,
				{
					selectedNodeId: cur.selectedNodeId,
					hoveredNodeId: cur.hoveredNodeId,
					highlightIds: cur.highlightIds,
					dimProgress: cur.dimProgress,
				},
				nodeMapRef.current,
				cur.colors,
			)

			// FPS counter overlay
			if (showFpsRef.current) {
				const now = performance.now()
				fpsFrames.current++
				if (now - fpsLastTime.current >= 1000) {
					fpsValue.current = fpsFrames.current
					fpsFrames.current = 0
					fpsLastTime.current = now
				}
				ctx.save()
				ctx.resetTransform()
				// Scale for DPR
				const d = Math.min(
					16384 / cur.width,
					16384 / cur.height,
					dprRef.current,
				)
				ctx.scale(d, d)
				ctx.fillStyle = "rgba(0,0,0,0.7)"
				ctx.fillRect(8, 8, 140, 52)
				ctx.fillStyle = "#00ff00"
				ctx.font = "bold 14px monospace"
				ctx.fillText(`FPS: ${fpsValue.current}`, 16, 28)
				ctx.fillStyle = "#ffffff"
				ctx.font = "11px monospace"
				ctx.fillText(`Nodes: ${cur.nodes.length}`, 16, 44)
				ctx.fillText(`Edges: ${cur.edges.length}`, 16, 56)
				ctx.restore()
			}
		}

		rafRef.current = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(rafRef.current)
	}, [])

	const canvasStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		touchAction: "none",
		userSelect: "none",
	}

	return <canvas ref={canvasRef} style={canvasStyle} />
})
