import { useCallback, useEffect, useRef } from "react"
import type { ForceSimulation } from "../canvas/simulation"
import type { ViewportState } from "../canvas/viewport"
import { getNodeBounds } from "../hooks/use-graph-data"
import {
	clampToRange,
	computeMinimapLayout,
	computeViewportRect,
	minimapToWorld,
	worldToMinimap,
} from "../canvas/minimap"
import type { GraphNode, GraphThemeColors } from "../types"

interface MinimapProps {
	nodes: GraphNode[]
	colors: GraphThemeColors
	viewportRef: React.RefObject<ViewportState | null>
	canvasWidth: number
	canvasHeight: number
	simulation?: ForceSimulation | null
	width?: number
	height?: number
}

const PADDING = 8

export function Minimap({
	nodes,
	colors,
	viewportRef,
	canvasWidth,
	canvasHeight,
	simulation,
	width = 168,
	height = 116,
}: MinimapProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDraggingRef = useRef(false)

	const draw = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return

		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
		if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
			canvas.width = width * dpr
			canvas.height = height * dpr
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.clearRect(0, 0, width, height)

		const bounds = getNodeBounds(nodes)
		if (!bounds) return
		const layout = computeMinimapLayout(bounds, width, height, PADDING)

		ctx.globalAlpha = 0.55
		for (const node of nodes) {
			if (node.type !== "memory") continue
			const p = worldToMinimap(node.x, node.y, layout)
			ctx.fillStyle = node.clusterColor || node.borderColor || colors.memFill
			ctx.beginPath()
			ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2)
			ctx.fill()
		}
		ctx.globalAlpha = 1
		for (const node of nodes) {
			if (node.type !== "document") continue
			const p = worldToMinimap(node.x, node.y, layout)
			ctx.fillStyle = node.clusterColor || node.borderColor || colors.docStroke
			ctx.beginPath()
			ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2)
			ctx.fill()
		}

		const vp = viewportRef.current
		if (vp) {
			const rect = computeViewportRect(vp, canvasWidth, canvasHeight, layout)
			const x0 = clampToRange(rect.x, 0, width)
			const y0 = clampToRange(rect.y, 0, height)
			const x1 = clampToRange(rect.x + rect.width, 0, width)
			const y1 = clampToRange(rect.y + rect.height, 0, height)
			const w = Math.max(x1 - x0, 0)
			const h = Math.max(y1 - y0, 0)

			ctx.fillStyle = colors.accent
			ctx.globalAlpha = 0.14
			ctx.fillRect(x0, y0, w, h)
			ctx.globalAlpha = 1
			ctx.strokeStyle = colors.accent
			ctx.lineWidth = 1
			ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(w - 1, 0), Math.max(h - 1, 0))
		}
	}, [nodes, colors, viewportRef, canvasWidth, canvasHeight, width, height])

	// Own loop because the parent's viewportVersion only bumps while a popover is open.
	useEffect(() => {
		let raf = 0
		let lastPanX = Number.NaN
		let lastPanY = Number.NaN
		let lastZoom = Number.NaN
		let lastNodePositionVersion = -1
		let wasSimActive = true
		const loop = () => {
			const vp = viewportRef.current
			const simActive = simulation?.isActive() ?? false
			const vpChanged =
				!!vp &&
				(vp.panX !== lastPanX || vp.panY !== lastPanY || vp.zoom !== lastZoom)
			const nodesMoved =
				!!vp && vp.nodePositionVersion !== lastNodePositionVersion
			if (vpChanged || nodesMoved || simActive || wasSimActive) {
				draw()
				if (vp) {
					lastPanX = vp.panX
					lastPanY = vp.panY
					lastZoom = vp.zoom
					lastNodePositionVersion = vp.nodePositionVersion
				}
			}
			wasSimActive = simActive
			raf = requestAnimationFrame(loop)
		}
		raf = requestAnimationFrame(loop)
		return () => cancelAnimationFrame(raf)
	}, [draw, simulation, viewportRef])

	const recenterFromEvent = useCallback(
		(clientX: number, clientY: number) => {
			const canvas = canvasRef.current
			const vp = viewportRef.current
			if (!canvas || !vp) return
			const rect = canvas.getBoundingClientRect()
			const bounds = getNodeBounds(nodes)
			if (!bounds) return
			const layout = computeMinimapLayout(bounds, width, height, PADDING)
			const world = minimapToWorld(
				clientX - rect.left,
				clientY - rect.top,
				layout,
			)
			vp.centerOn(world.x, world.y, canvasWidth, canvasHeight)
		},
		[nodes, viewportRef, canvasWidth, canvasHeight, width, height],
	)

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			isDraggingRef.current = true
			e.currentTarget.setPointerCapture(e.pointerId)
			recenterFromEvent(e.clientX, e.clientY)
		},
		[recenterFromEvent],
	)

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isDraggingRef.current) return
			recenterFromEvent(e.clientX, e.clientY)
		},
		[recenterFromEvent],
	)

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			isDraggingRef.current = false
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId)
			}
		},
		[],
	)

	return (
		<canvas
			ref={canvasRef}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			style={{
				width,
				height,
				display: "block",
				cursor: "pointer",
				borderRadius: 10,
				border: `1px solid ${colors.controlBorder}`,
				background: colors.controlBg,
				boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
				touchAction: "none",
			}}
		/>
	)
}
