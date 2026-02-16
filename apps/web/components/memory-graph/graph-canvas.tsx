"use client"

import { memo, useEffect, useLayoutEffect, useRef } from "react"
import type { GraphCanvasProps, GraphNode } from "./types"
import { ViewportState } from "./canvas/viewport"
import { SpatialIndex } from "./canvas/hit-test"
import { InputHandler } from "./canvas/input-handler"
import { renderFrame } from "./canvas/renderer"
import { GRAPH_SETTINGS } from "./constants"

export const GraphCanvas = memo<GraphCanvasProps>(function GraphCanvas({
	nodes,
	edges,
	width,
	height,
	highlightDocumentIds,
	selectedNodeId = null,
	onNodeHover,
	onNodeClick,
	onNodeDragStart,
	onNodeDragEnd,
	onViewportChange,
	canvasRef: externalCanvasRef,
	variant = "console",
	simulation,
	viewportRef: externalViewportRef,
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

	// All mutable render state in a single ref — the rAF loop reads from here
	const s = useRef({
		nodes,
		edges,
		width,
		height,
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

	// Stable callback refs so InputHandler never needs recreation
	const cb = useRef({
		onNodeHover,
		onNodeClick,
		onNodeDragStart,
		onNodeDragEnd,
		onViewportChange,
		simulation,
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
		s.current.highlightIds = new Set(highlightDocumentIds ?? [])
		renderNeeded.current = true
	}, [highlightDocumentIds])

	useEffect(() => {
		s.current.selectedNodeId = selectedNodeId
		s.current.dimTarget = selectedNodeId ? 1 : 0
		renderNeeded.current = true
	}, [selectedNodeId])

	// Create viewport + input handler (once per variant)
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
			onNodeDragStart: (id, node) => {
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
	useEffect(() => {
		let lastReportedZoom = 0

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

			// Throttled zoom reporting for NavigationControls
			if (
				vpMoving &&
				cb.current.onViewportChange &&
				Math.abs(vp.zoom - lastReportedZoom) > 0.005
			) {
				lastReportedZoom = vp.zoom
				cb.current.onViewportChange(vp.zoom)
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
			)
		}

		rafRef.current = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(rafRef.current)
	}, [])

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0"
			style={{ touchAction: "none", userSelect: "none" }}
		/>
	)
})
