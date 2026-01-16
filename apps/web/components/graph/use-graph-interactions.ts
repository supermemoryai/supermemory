"use client"

import { useCallback, useRef, useState } from "react"
import { GRAPH_SETTINGS } from "./constants"
import type { GraphNode } from "./types"

export function useGraphInteractions() {
	const [panX, setPanX] = useState(GRAPH_SETTINGS.initialPanX)
	const [panY, setPanY] = useState(GRAPH_SETTINGS.initialPanY)
	const [zoom, setZoom] = useState(GRAPH_SETTINGS.initialZoom)
	const [isPanning, setIsPanning] = useState(false)
	const [panStart, setPanStart] = useState({ x: 0, y: 0 })
	const [hoveredNode, setHoveredNode] = useState<string | null>(null)
	const [selectedNode, setSelectedNode] = useState<string | null>(null)

	const [touchState, setTouchState] = useState<{
		touches: { id: number; x: number; y: number }[]
		lastDistance: number
		lastCenter: { x: number; y: number }
		isGesturing: boolean
	}>({
		touches: [],
		lastDistance: 0,
		lastCenter: { x: 0, y: 0 },
		isGesturing: false,
	})

	const animationRef = useRef<number | null>(null)
	const [isAnimating, setIsAnimating] = useState(false)
	const [isUserInteracting, setIsUserInteracting] = useState(false)
	const interactionTimeoutRef = useRef<number | null>(null)

	const markInteracting = useCallback(() => {
		setIsUserInteracting(true)
		if (interactionTimeoutRef.current != null) {
			window.clearTimeout(interactionTimeoutRef.current)
		}
		interactionTimeoutRef.current = window.setTimeout(() => {
			setIsUserInteracting(false)
		}, 600)
	}, [])

	const animateToViewState = useCallback(
		(
			targetPanX: number,
			targetPanY: number,
			targetZoom: number,
			duration = 300,
		) => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current)
			}

			const startPanX = panX
			const startPanY = panY
			const startZoom = zoom
			const startTime = Date.now()

			setIsAnimating(true)

			const animate = () => {
				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / duration, 1)

				const easeOut = 1 - (1 - progress) ** 3

				const currentPanX = startPanX + (targetPanX - startPanX) * easeOut
				const currentPanY = startPanY + (targetPanY - startPanY) * easeOut
				const currentZoom = startZoom + (targetZoom - startZoom) * easeOut

				setPanX(currentPanX)
				setPanY(currentPanY)
				setZoom(currentZoom)

				if (progress < 1) {
					animationRef.current = requestAnimationFrame(animate)
				} else {
					setIsAnimating(false)
					animationRef.current = null
				}
			}

			animate()
		},
		[panX, panY, zoom],
	)

	const handlePanStart = useCallback(
		(e: React.MouseEvent) => {
			markInteracting()
			setIsPanning(true)
			setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
		},
		[panX, panY, markInteracting],
	)

	const handlePanMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isPanning) return
			markInteracting()
			const newPanX = e.clientX - panStart.x
			const newPanY = e.clientY - panStart.y
			setPanX(newPanX)
			setPanY(newPanY)
		},
		[isPanning, panStart, markInteracting],
	)

	const handlePanEnd = useCallback(() => {
		setIsPanning(false)
	}, [])

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault()
			e.stopPropagation()
			markInteracting()

			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const panDelta = e.deltaX * 0.5
				setPanX((prev) => prev - panDelta)
				return
			}

			const delta = e.deltaY > 0 ? 0.97 : 1.03
			const newZoom = Math.max(0.05, Math.min(3, zoom * delta))

			let mouseX = e.clientX
			let mouseY = e.clientY

			const target = e.currentTarget
			if (target && "getBoundingClientRect" in target) {
				const rect = target.getBoundingClientRect()
				mouseX = e.clientX - rect.left
				mouseY = e.clientY - rect.top
			}

			const worldX = (mouseX - panX) / zoom
			const worldY = (mouseY - panY) / zoom

			const newPanX = mouseX - worldX * newZoom
			const newPanY = mouseY - worldY * newZoom

			setZoom(newZoom)
			setPanX(newPanX)
			setPanY(newPanY)
		},
		[zoom, panX, panY, markInteracting],
	)

	const zoomIn = useCallback(
		(centerX?: number, centerY?: number) => {
			markInteracting()
			const zoomFactor = 1.2
			const newZoom = Math.min(3, zoom * zoomFactor)

			if (centerX !== undefined && centerY !== undefined) {
				const worldX = (centerX - panX) / zoom
				const worldY = (centerY - panY) / zoom
				const newPanX = centerX - worldX * newZoom
				const newPanY = centerY - worldY * newZoom
				animateToViewState(newPanX, newPanY, newZoom, 200)
			} else {
				setZoom(newZoom)
			}
		},
		[zoom, panX, panY, animateToViewState, markInteracting],
	)

	const zoomOut = useCallback(
		(centerX?: number, centerY?: number) => {
			markInteracting()
			const zoomFactor = 0.8
			const newZoom = Math.max(0.05, zoom * zoomFactor)

			if (centerX !== undefined && centerY !== undefined) {
				const worldX = (centerX - panX) / zoom
				const worldY = (centerY - panY) / zoom
				const newPanX = centerX - worldX * newZoom
				const newPanY = centerY - worldY * newZoom
				animateToViewState(newPanX, newPanY, newZoom, 200)
			} else {
				setZoom(newZoom)
			}
		},
		[zoom, panX, panY, animateToViewState, markInteracting],
	)

	const resetView = useCallback(() => {
		animateToViewState(
			GRAPH_SETTINGS.initialPanX,
			GRAPH_SETTINGS.initialPanY,
			GRAPH_SETTINGS.initialZoom,
			300,
		)
	}, [animateToViewState])

	const autoFitToViewport = useCallback(
		(
			nodes: GraphNode[],
			viewportWidth: number,
			viewportHeight: number,
			options?: { occludedRightPx?: number; animate?: boolean },
		) => {
			if (nodes.length === 0) return

			const docNodes = nodes.filter((n) => n.type === "document")
			const targetNodes = docNodes.length > 0 ? docNodes : nodes

			let minX = Number.POSITIVE_INFINITY
			let maxX = Number.NEGATIVE_INFINITY
			let minY = Number.POSITIVE_INFINITY
			let maxY = Number.NEGATIVE_INFINITY

			for (const node of targetNodes) {
				minX = Math.min(minX, node.x)
				maxX = Math.max(maxX, node.x)
				minY = Math.min(minY, node.y)
				maxY = Math.max(maxY, node.y)
			}

			const contentWidth = maxX - minX
			const contentHeight = maxY - minY
			const contentCenterX = minX + contentWidth / 2
			const contentCenterY = minY + contentHeight / 2

			const paddingX = 100
			const paddingY = 100
			const occludedRightPx = options?.occludedRightPx ?? 0
			const availableWidth = viewportWidth - occludedRightPx - paddingX * 2
			const availableHeight = viewportHeight - paddingY * 2

			const zoomToFitWidth =
				contentWidth > 0 ? availableWidth / contentWidth : 1
			const zoomToFitHeight =
				contentHeight > 0 ? availableHeight / contentHeight : 1
			const newZoom = Math.min(
				Math.max(0.1, Math.min(zoomToFitWidth, zoomToFitHeight)),
				1.5,
			)

			const availableCenterX = availableWidth / 2
			const newPanX = availableCenterX - contentCenterX * newZoom
			const newPanY = viewportHeight / 2 - contentCenterY * newZoom

			if (options?.animate) {
				const steps = 8
				const durationMs = 160
				const intervalMs = Math.max(1, Math.floor(durationMs / steps))
				const startZoom = zoom
				const startPanX = panX
				const startPanY = panY
				let i = 0
				const ease = (t: number) => 1 - (1 - t) ** 2
				const timer = setInterval(() => {
					i++
					const t = ease(i / steps)
					setZoom(startZoom + (newZoom - startZoom) * t)
					setPanX(startPanX + (newPanX - startPanX) * t)
					setPanY(startPanY + (newPanY - startPanY) * t)
					if (i >= steps) clearInterval(timer)
				}, intervalMs)
			} else {
				setZoom(newZoom)
				setPanX(newPanX)
				setPanY(newPanY)
			}
		},
		[zoom, panX, panY],
	)

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		markInteracting()
		const touches = Array.from(e.touches).map((touch) => ({
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		}))

		if (touches.length >= 2) {
			const touch1 = touches[0]!
			const touch2 = touches[1]!

			const distance = Math.sqrt(
				(touch2.x - touch1.x) ** 2 + (touch2.y - touch1.y) ** 2,
			)

			const center = {
				x: (touch1.x + touch2.x) / 2,
				y: (touch1.y + touch2.y) / 2,
			}

			setTouchState({
				touches,
				lastDistance: distance,
				lastCenter: center,
				isGesturing: true,
			})
		} else {
			setTouchState((prev) => ({ ...prev, touches, isGesturing: false }))
		}
	}, [markInteracting])

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault()
			markInteracting()

			const touches = Array.from(e.touches).map((touch) => ({
				id: touch.identifier,
				x: touch.clientX,
				y: touch.clientY,
			}))

			if (touches.length >= 2 && touchState.isGesturing) {
				const touch1 = touches[0]!
				const touch2 = touches[1]!

				const distance = Math.sqrt(
					(touch2.x - touch1.x) ** 2 + (touch2.y - touch1.y) ** 2,
				)

				const center = {
					x: (touch1.x + touch2.x) / 2,
					y: (touch1.y + touch2.y) / 2,
				}

				const distanceChange = distance / touchState.lastDistance
				const newZoom = Math.max(0.05, Math.min(3, zoom * distanceChange))

				const canvas = e.currentTarget as HTMLElement
				const rect = canvas.getBoundingClientRect()
				const centerX = center.x - rect.left
				const centerY = center.y - rect.top

				const worldX = (centerX - panX) / zoom
				const worldY = (centerY - panY) / zoom

				const newPanX = centerX - worldX * newZoom
				const newPanY = centerY - worldY * newZoom

				const centerDx = center.x - touchState.lastCenter.x
				const centerDy = center.y - touchState.lastCenter.y

				setZoom(newZoom)
				setPanX(newPanX + centerDx)
				setPanY(newPanY + centerDy)

				setTouchState({
					touches,
					lastDistance: distance,
					lastCenter: center,
					isGesturing: true,
				})
			} else if (touches.length === 1 && !touchState.isGesturing && isPanning) {
				const touch = touches[0]!
				const newPanX = touch.x - panStart.x
				const newPanY = touch.y - panStart.y
				setPanX(newPanX)
				setPanY(newPanY)
			}
		},
		[touchState, zoom, panX, panY, isPanning, panStart, markInteracting],
	)

	const handleTouchEnd = useCallback((e: React.TouchEvent) => {
		const touches = Array.from(e.touches).map((touch) => ({
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		}))

		if (touches.length < 2) {
			setTouchState((prev) => ({ ...prev, touches, isGesturing: false }))
		} else {
			setTouchState((prev) => ({ ...prev, touches }))
		}

		if (touches.length === 0) {
			setIsPanning(false)
		}
	}, [])

	const centerViewportOn = useCallback(
		(
			worldX: number,
			worldY: number,
			viewportWidth: number,
			viewportHeight: number,
			animate = true,
		) => {
			const newPanX = viewportWidth / 2 - worldX * zoom
			const newPanY = viewportHeight / 2 - worldY * zoom

			if (animate && !isAnimating) {
				animateToViewState(newPanX, newPanY, zoom, 400)
			} else {
				setPanX(newPanX)
				setPanY(newPanY)
			}
		},
		[zoom, isAnimating, animateToViewState],
	)

	const handleNodeHover = useCallback((nodeId: string | null) => {
		setHoveredNode(nodeId)
	}, [])

	const handleNodeClick = useCallback(
		(nodeId: string) => {
			setSelectedNode(selectedNode === nodeId ? null : nodeId)
		},
		[selectedNode],
	)

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			markInteracting()
			const zoomFactor = 1.5
			const newZoom = Math.min(3, zoom * zoomFactor)

			let mouseX = e.clientX
			let mouseY = e.clientY

			const target = e.currentTarget
			if (target && "getBoundingClientRect" in target) {
				const rect = target.getBoundingClientRect()
				mouseX = e.clientX - rect.left
				mouseY = e.clientY - rect.top
			}

			const worldX = (mouseX - panX) / zoom
			const worldY = (mouseY - panY) / zoom

			const newPanX = mouseX - worldX * newZoom
			const newPanY = mouseY - worldY * newZoom

			setZoom(newZoom)
			setPanX(newPanX)
			setPanY(newPanY)
		},
		[zoom, panX, panY, markInteracting],
	)

	return {
		panX,
		panY,
		zoom,
		hoveredNode,
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
		resetView,
		autoFitToViewport,
		centerViewportOn,
		setSelectedNode,
		animateToViewState,
		isUserInteracting,
	}
}
