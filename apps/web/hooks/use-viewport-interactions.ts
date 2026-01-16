"use client"

import { useCallback, useRef, useState } from "react"
import type {
	ViewportBounds,
	ViewportGraphNode,
} from "@/lib/viewport-graph-types"
import { GRAPH_SETTINGS } from "@/components/viewport-graph/constants"

type Variant = "console" | "consumer"

interface ViewportInteractionsOptions {
	variant?: Variant
	initialZoom?: number
	initialPanX?: number
	initialPanY?: number
	onViewportChange?: (bounds: ViewportBounds) => void
}

export function useViewportInteractions({
	variant = "consumer",
	initialZoom,
	initialPanX,
	initialPanY,
	onViewportChange,
}: ViewportInteractionsOptions = {}) {
	const settings = GRAPH_SETTINGS[variant]

	const [panX, setPanX] = useState(initialPanX ?? settings.initialPanX)
	const [panY, setPanY] = useState(initialPanY ?? settings.initialPanY)
	const [zoom, setZoom] = useState(initialZoom ?? settings.initialZoom)
	const [isPanning, setIsPanning] = useState(false)
	const [panStart, setPanStart] = useState({ x: 0, y: 0 })
	const [hoveredNode, setHoveredNode] = useState<string | null>(null)
	const [selectedNode, setSelectedNode] = useState<string | null>(null)

	// Animation state for smooth transitions
	const animationRef = useRef<number | null>(null)
	const [isAnimating, setIsAnimating] = useState(false)

	// Smooth animation helper
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

	// Touch gesture state
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

	// Debounce viewport change callbacks
	const viewportChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const containerSizeRef = useRef({ width: 0, height: 0 })

	// Calculate world bounds from screen viewport
	const getWorldBounds = useCallback(
		(width: number, height: number): ViewportBounds => {
			const minX = -panX / zoom
			const minY = -panY / zoom
			const maxX = (width - panX) / zoom
			const maxY = (height - panY) / zoom
			return { minX, maxX, minY, maxY }
		},
		[panX, panY, zoom],
	)

	// Trigger viewport change with debounce
	const triggerViewportChange = useCallback(() => {
		if (!onViewportChange) return

		if (viewportChangeTimeoutRef.current) {
			clearTimeout(viewportChangeTimeoutRef.current)
		}

		viewportChangeTimeoutRef.current = setTimeout(() => {
			const { width, height } = containerSizeRef.current
			if (width > 0 && height > 0) {
				const bounds = getWorldBounds(width, height)
				// Validate bounds before calling callback
				if (
					Number.isFinite(bounds.minX) &&
					Number.isFinite(bounds.maxX) &&
					Number.isFinite(bounds.minY) &&
					Number.isFinite(bounds.maxY)
				) {
					onViewportChange(bounds)
				}
			}
		}, 150)
	}, [onViewportChange, getWorldBounds])

	// Update container size ref
	const setContainerSize = useCallback((width: number, height: number) => {
		containerSizeRef.current = { width, height }
	}, [])

	// Pan handlers
	const handlePanStart = useCallback(
		(e: React.MouseEvent) => {
			setIsPanning(true)
			setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
		},
		[panX, panY],
	)

	const handlePanMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isPanning) return

			const newPanX = e.clientX - panStart.x
			const newPanY = e.clientY - panStart.y
			setPanX(newPanX)
			setPanY(newPanY)
		},
		[isPanning, panStart],
	)

	const handlePanEnd = useCallback(() => {
		if (isPanning) {
			setIsPanning(false)
			triggerViewportChange()
		}
	}, [isPanning, triggerViewportChange])

	// Zoom handlers
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault()
			e.stopPropagation()

			// Handle horizontal scrolling (trackpad swipe) by converting to pan
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const panDelta = e.deltaX * 0.5
				setPanX((prev) => prev - panDelta)
				triggerViewportChange()
				return
			}

			// Vertical scroll - zoom behavior
			const delta = e.deltaY > 0 ? 0.97 : 1.03
			const newZoom = Math.max(0.05, Math.min(3, zoom * delta))

			// Get mouse position relative to the viewport
			let mouseX = e.clientX
			let mouseY = e.clientY

			const target = e.currentTarget
			if (target && "getBoundingClientRect" in target) {
				const rect = target.getBoundingClientRect()
				mouseX = e.clientX - rect.left
				mouseY = e.clientY - rect.top
			}

			// Calculate the world position of the mouse cursor
			const worldX = (mouseX - panX) / zoom
			const worldY = (mouseY - panY) / zoom

			// Calculate new pan to keep the mouse position stationary
			const newPanX = mouseX - worldX * newZoom
			const newPanY = mouseY - worldY * newZoom

			setZoom(newZoom)
			setPanX(newPanX)
			setPanY(newPanY)
			triggerViewportChange()
		},
		[zoom, panX, panY, triggerViewportChange],
	)

	const zoomIn = useCallback(
		(centerX?: number, centerY?: number) => {
			const zoomFactor = 1.2
			const newZoom = Math.min(3, zoom * zoomFactor)

			if (centerX !== undefined && centerY !== undefined) {
				const worldX = (centerX - panX) / zoom
				const worldY = (centerY - panY) / zoom
				const newPanX = centerX - worldX * newZoom
				const newPanY = centerY - worldY * newZoom

				setZoom(newZoom)
				setPanX(newPanX)
				setPanY(newPanY)
			} else {
				setZoom(newZoom)
			}
			triggerViewportChange()
		},
		[zoom, panX, panY, triggerViewportChange],
	)

	const zoomOut = useCallback(
		(centerX?: number, centerY?: number) => {
			const zoomFactor = 0.8
			const newZoom = Math.max(0.05, zoom * zoomFactor)

			if (centerX !== undefined && centerY !== undefined) {
				const worldX = (centerX - panX) / zoom
				const worldY = (centerY - panY) / zoom
				const newPanX = centerX - worldX * newZoom
				const newPanY = centerY - worldY * newZoom

				setZoom(newZoom)
				setPanX(newPanX)
				setPanY(newPanY)
			} else {
				setZoom(newZoom)
			}
			triggerViewportChange()
		},
		[zoom, panX, panY, triggerViewportChange],
	)

	// Auto-fit to show all nodes
	const autoFitToViewport = useCallback(
		(
			nodes: ViewportGraphNode[],
			viewportWidth: number,
			viewportHeight: number,
			options?: { padding?: number },
		) => {
			if (nodes.length === 0) return

			const padding = options?.padding ?? 100

			// Calculate bounding box of all nodes
			let minX = Number.POSITIVE_INFINITY
			let maxX = Number.NEGATIVE_INFINITY
			let minY = Number.POSITIVE_INFINITY
			let maxY = Number.NEGATIVE_INFINITY

			for (const node of nodes) {
				minX = Math.min(minX, node.x - node.size)
				maxX = Math.max(maxX, node.x + node.size)
				minY = Math.min(minY, node.y - node.size)
				maxY = Math.max(maxY, node.y + node.size)
			}

			const contentWidth = maxX - minX
			const contentHeight = maxY - minY
			const contentCenterX = (minX + maxX) / 2
			const contentCenterY = (minY + maxY) / 2

			// Calculate zoom to fit content with padding
			const scaleX = (viewportWidth - padding * 2) / contentWidth
			const scaleY = (viewportHeight - padding * 2) / contentHeight
			const newZoom = Math.min(Math.max(0.05, Math.min(scaleX, scaleY)), 2)

			// Center content
			const newPanX = viewportWidth / 2 - contentCenterX * newZoom
			const newPanY = viewportHeight / 2 - contentCenterY * newZoom

			setZoom(newZoom)
			setPanX(newPanX)
			setPanY(newPanY)
			triggerViewportChange()
		},
		[triggerViewportChange],
	)

	// Center viewport on specific world position
	const centerViewportOn = useCallback(
		(
			worldX: number,
			worldY: number,
			viewportWidth: number,
			viewportHeight: number,
		) => {
			const newPanX = viewportWidth / 2 - worldX * zoom
			const newPanY = viewportHeight / 2 - worldY * zoom

			setPanX(newPanX)
			setPanY(newPanY)
			triggerViewportChange()
		},
		[zoom, triggerViewportChange],
	)

	// Touch gesture handlers
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
	}, [])

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault()

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
		[touchState, zoom, panX, panY, isPanning, panStart],
	)

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
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
				triggerViewportChange()
			}
		},
		[triggerViewportChange],
	)

	// Double-click to zoom in
	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
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
			triggerViewportChange()
		},
		[zoom, panX, panY, triggerViewportChange],
	)

	// Reset view to initial settings
	const resetView = useCallback(
		(animate = true) => {
			if (animate && !isAnimating) {
				animateToViewState(
					settings.initialPanX,
					settings.initialPanY,
					settings.initialZoom,
					300,
				)
			} else {
				setPanX(settings.initialPanX)
				setPanY(settings.initialPanY)
				setZoom(settings.initialZoom)
			}
			triggerViewportChange()
		},
		[settings, isAnimating, animateToViewState, triggerViewportChange],
	)

	// Node interaction handlers
	const handleNodeHover = useCallback((nodeId: string | null) => {
		setHoveredNode(nodeId)
	}, [])

	const handleNodeClick = useCallback(
		(nodeId: string) => {
			setSelectedNode(selectedNode === nodeId ? null : nodeId)
		},
		[selectedNode],
	)

	return {
		// State
		panX,
		panY,
		zoom,
		hoveredNode,
		selectedNode,
		isPanning,
		isAnimating,
		// Handlers
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
		// Controls
		zoomIn,
		zoomOut,
		resetView,
		autoFitToViewport,
		centerViewportOn,
		setSelectedNode,
		setContainerSize,
		getWorldBounds,
	}
}
