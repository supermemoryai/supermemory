"use client"

import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import type {
	ViewportCanvasProps,
	ViewportDocument,
	ViewportGraphNode,
} from "@/lib/viewport-graph-types"
import { colors, ANIMATION } from "./constants"
import { drawDocumentIcon } from "./document-icons"

export const ViewportCanvas = memo<ViewportCanvasProps>(
	({
		nodes,
		edges,
		panX,
		panY,
		zoom,
		width,
		height,
		onNodeHover,
		onNodeClick,
		onPanStart,
		onPanMove,
		onPanEnd,
		onWheel,
		onDoubleClick,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		highlightDocumentIds,
		selectedNodeId = null,
	}) => {
		const canvasRef = useRef<HTMLCanvasElement>(null)
		const startTimeRef = useRef<number>(Date.now())
		const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
		const currentHoveredNode = useRef<string | null>(null)
		const dimProgress = useRef<number>(selectedNodeId ? 1 : 0)
		const dimAnimationRef = useRef<number>(0)
		const [, forceRender] = useState(0)

		// Initialize start time once
		useEffect(() => {
			startTimeRef.current = Date.now()
		}, [])

		// Initialize canvas quality settings once
		useLayoutEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext("2d")
			if (!ctx) return

			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"
		}, [])

		// Smooth dimming animation
		useEffect(() => {
			const targetDim = selectedNodeId ? 1 : 0
			const duration = ANIMATION.dimDuration
			const startDim = dimProgress.current
			const startTime = Date.now()

			const animate = () => {
				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / duration, 1)
				const eased = 1 - (1 - progress) ** 3
				dimProgress.current = startDim + (targetDim - startDim) * eased
				forceRender((prev) => prev + 1)

				if (progress < 1) {
					dimAnimationRef.current = requestAnimationFrame(animate)
				}
			}

			if (dimAnimationRef.current) {
				cancelAnimationFrame(dimAnimationRef.current)
			}
			animate()

			return () => {
				if (dimAnimationRef.current) {
					cancelAnimationFrame(dimAnimationRef.current)
				}
			}
		}, [selectedNodeId])

		// Spatial grid for optimized hit detection
		const spatialGrid = useMemo(() => {
			const GRID_CELL_SIZE = 150
			const grid = new Map<string, ViewportGraphNode[]>()

			nodes.forEach((node) => {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY
				const cellX = Math.floor(screenX / GRID_CELL_SIZE)
				const cellY = Math.floor(screenY / GRID_CELL_SIZE)
				const cellKey = `${cellX},${cellY}`

				if (!grid.has(cellKey)) {
					grid.set(cellKey, [])
				}
				grid.get(cellKey)!.push(node)
			})

			return { grid, cellSize: GRID_CELL_SIZE }
		}, [nodes, panX, panY, zoom])

		// Efficient hit detection using spatial grid
		const getNodeAtPosition = useCallback(
			(x: number, y: number): string | null => {
				const { grid, cellSize } = spatialGrid
				const cellX = Math.floor(x / cellSize)
				const cellY = Math.floor(y / cellSize)
				const cellKey = `${cellX},${cellY}`

				const cellsToCheck = [
					cellKey,
					`${cellX - 1},${cellY}`,
					`${cellX + 1},${cellY}`,
					`${cellX},${cellY - 1}`,
					`${cellX},${cellY + 1}`,
				]

				for (const key of cellsToCheck) {
					const cellNodes = grid.get(key)
					if (!cellNodes) continue

					for (let i = cellNodes.length - 1; i >= 0; i--) {
						const node = cellNodes[i]!
						const screenX = node.x * zoom + panX
						const screenY = node.y * zoom + panY
						const nodeSize = node.size * zoom

						// Rectangular hit detection for documents
						const docWidth = nodeSize * 1.4
						const docHeight = nodeSize * 0.9
						const halfW = docWidth / 2
						const halfH = docHeight / 2

						if (
							x >= screenX - halfW &&
							x <= screenX + halfW &&
							y >= screenY - halfH &&
							y <= screenY + halfH
						) {
							return node.id
						}
					}
				}
				return null
			},
			[spatialGrid, panX, panY, zoom],
		)

		// Build node map for O(1) lookups
		const nodeMap = useMemo(() => {
			const map = new Map<string, ViewportGraphNode>()
			nodes.forEach((node) => map.set(node.id, node))
			return map
		}, [nodes])

		// Handle mouse events
		const handleMouseMove = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current
				if (!canvas) return

				const rect = canvas.getBoundingClientRect()
				const x = e.clientX - rect.left
				const y = e.clientY - rect.top

				mousePos.current = { x, y }

				const nodeId = getNodeAtPosition(x, y)
				if (nodeId !== currentHoveredNode.current) {
					currentHoveredNode.current = nodeId
					onNodeHover(nodeId)
				}

				onPanMove(e)
			},
			[getNodeAtPosition, onNodeHover, onPanMove],
		)

		const handleMouseDown = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current
				if (!canvas) return

				const rect = canvas.getBoundingClientRect()
				const x = e.clientX - rect.left
				const y = e.clientY - rect.top

				const nodeId = getNodeAtPosition(x, y)
				if (nodeId) {
					e.stopPropagation()
					return
				}
				onPanStart(e)
			},
			[getNodeAtPosition, onPanStart],
		)

		const handleClick = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current
				if (!canvas) return

				const rect = canvas.getBoundingClientRect()
				const x = e.clientX - rect.left
				const y = e.clientY - rect.top

				const nodeId = getNodeAtPosition(x, y)
				if (nodeId) {
					onNodeClick(nodeId)
				}
			},
			[getNodeAtPosition, onNodeClick],
		)

		// Main render function
		const render = useCallback(() => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext("2d")
			if (!ctx) return

			const dpr =
				typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

			ctx.save()
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, width, height)

			// Level-of-detail optimization based on zoom
			const useSimplifiedRendering = zoom < 0.3

			// Draw minimal background grid
			ctx.strokeStyle = "rgba(148, 163, 184, 0.03)"
			ctx.lineWidth = 1
			const gridSpacing = 100 * zoom
			const offsetX = panX % gridSpacing
			const offsetY = panY % gridSpacing

			for (let x = offsetX; x < width; x += gridSpacing) {
				ctx.beginPath()
				ctx.moveTo(x, 0)
				ctx.lineTo(x, height)
				ctx.stroke()
			}
			for (let y = offsetY; y < height; y += gridSpacing) {
				ctx.beginPath()
				ctx.moveTo(0, y)
				ctx.lineTo(width, y)
				ctx.stroke()
			}

			// Performance: calculate viewport bounds for culling
			const viewMinX = -panX / zoom - 200
			const viewMaxX = (width - panX) / zoom + 200
			const viewMinY = -panY / zoom - 200
			const viewMaxY = (height - panY) / zoom + 200

			const visibleNodes = nodes.filter(
				(n) =>
					n.x >= viewMinX &&
					n.x <= viewMaxX &&
					n.y >= viewMinY &&
					n.y <= viewMaxY,
			)

			const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))

			// Smooth edge opacity: interpolate between full and 0.05 (dimmed)
			const edgeDimOpacity = 1 - dimProgress.current * 0.95

			// Draw edges with batched rendering
			ctx.lineCap = "round"

			// Filter visible edges
			const visibleEdges = edges.filter((edge) => {
				const sourceId =
					typeof edge.source === "string" ? edge.source : edge.source.id
				const targetId =
					typeof edge.target === "string" ? edge.target : edge.target.id
				return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)
			})

			// Draw doc-doc edges with dashed lines and similarity-based styling
			ctx.setLineDash(useSimplifiedRendering ? [] : [10, 5])

			visibleEdges.forEach((edge) => {
				const sourceId =
					typeof edge.source === "string" ? edge.source : edge.source.id
				const targetId =
					typeof edge.target === "string" ? edge.target : edge.target.id
				const sourceNode = nodeMap.get(sourceId)
				const targetNode = nodeMap.get(targetId)
				if (!sourceNode || !targetNode) return

				const sourceX = sourceNode.x * zoom + panX
				const sourceY = sourceNode.y * zoom + panY
				const targetX = targetNode.x * zoom + panX
				const targetY = targetNode.y * zoom + panY

				const edgeShouldDim =
					selectedNodeId !== null &&
					sourceNode.id !== selectedNodeId &&
					targetNode.id !== selectedNodeId
				const opacity = edgeShouldDim
					? edgeDimOpacity
					: Math.max(0, edge.similarity * 0.5)
				const lineWidth = Math.max(1, edge.similarity * 2)

				// Set color based on similarity strength
				let connectionColor = colors.connection.weak
				if (edge.similarity > 0.85) connectionColor = colors.connection.strong
				else if (edge.similarity > 0.725)
					connectionColor = colors.connection.medium

				ctx.strokeStyle = connectionColor
				ctx.lineWidth = lineWidth
				ctx.globalAlpha = opacity

				if (useSimplifiedRendering) {
					// Straight lines for performance
					ctx.beginPath()
					ctx.moveTo(sourceX, sourceY)
					ctx.lineTo(targetX, targetY)
					ctx.stroke()
				} else {
					// Curved lines when zoomed in
					const midX = (sourceX + targetX) / 2
					const midY = (sourceY + targetY) / 2
					const dx = targetX - sourceX
					const dy = targetY - sourceY
					const distance = Math.sqrt(dx * dx + dy * dy)
					const controlOffset = Math.min(30, distance * 0.2)

					ctx.beginPath()
					ctx.moveTo(sourceX, sourceY)
					ctx.quadraticCurveTo(
						midX + controlOffset * (dy / distance),
						midY - controlOffset * (dx / distance),
						targetX,
						targetY,
					)
					ctx.stroke()
				}
			})

			ctx.globalAlpha = 1
			ctx.setLineDash([])

			// Prepare highlight set from provided document IDs
			const highlightSet = new Set<string>(highlightDocumentIds ?? [])

			// Draw nodes with enhanced styling
			visibleNodes.forEach((node) => {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY
				const nodeSize = node.size * zoom

				const isHovered = currentHoveredNode.current === node.id
				const isDragging = node.isDragging
				const isSelected = selectedNodeId === node.id
				const shouldDim = selectedNodeId !== null && !isSelected
				const nodeOpacity = shouldDim ? 1 - dimProgress.current * 0.9 : 1
				const isHighlightedDocument = (() => {
					if (highlightSet.size === 0) return false
					const doc = node.data as ViewportDocument
					if (doc.customId && highlightSet.has(doc.customId)) return true
					return highlightSet.has(doc.id)
				})()

				// Draw memory nodes as circles
				if (node.type === "memory") {
					const radius = nodeSize / 2
					
					ctx.globalAlpha = nodeOpacity
					ctx.fillStyle = isHovered
						? "rgba(167, 139, 250, 0.4)"
						: "rgba(167, 139, 250, 0.25)"
					ctx.strokeStyle = isHovered
						? "rgba(167, 139, 250, 0.9)"
						: "rgba(167, 139, 250, 0.6)"
					ctx.lineWidth = isHovered ? 2 : 1
					
					ctx.beginPath()
					ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
					ctx.fill()
					ctx.stroke()
					
					// Draw memory icon (small dot pattern)
					if (!useSimplifiedRendering && nodeSize > 20) {
						ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
						const dotSize = radius * 0.15
						ctx.beginPath()
						ctx.arc(screenX, screenY - dotSize * 2, dotSize, 0, Math.PI * 2)
						ctx.arc(screenX - dotSize * 1.5, screenY + dotSize, dotSize, 0, Math.PI * 2)
						ctx.arc(screenX + dotSize * 1.5, screenY + dotSize, dotSize, 0, Math.PI * 2)
						ctx.fill()
					}
					
					ctx.globalAlpha = 1
					return // Skip document rendering for memory nodes
				}

				// Enhanced glassmorphism document styling
				const docWidth = nodeSize * 1.4
				const docHeight = nodeSize * 0.9

				// Multi-layer glass effect
				ctx.fillStyle = isDragging
					? colors.document.accent
					: isHovered
						? colors.document.secondary
						: colors.document.primary
				ctx.globalAlpha = nodeOpacity

				// Enhanced border with subtle glow
				ctx.strokeStyle = isDragging
					? colors.document.glow
					: isHovered
						? colors.document.accent
						: colors.document.border
				ctx.lineWidth = isDragging ? 3 : isHovered ? 2 : 1

				// Rounded rectangle with enhanced styling
				const radius = useSimplifiedRendering ? 6 : 12
				ctx.beginPath()
				ctx.roundRect(
					screenX - docWidth / 2,
					screenY - docHeight / 2,
					docWidth,
					docHeight,
					radius,
				)
				ctx.fill()
				ctx.stroke()

				// Subtle inner highlight for glass effect (skip when zoomed out)
				if (!useSimplifiedRendering && (isHovered || isDragging)) {
					ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
					ctx.lineWidth = 1
					ctx.beginPath()
					ctx.roundRect(
						screenX - docWidth / 2 + 1,
						screenY - docHeight / 2 + 1,
						docWidth - 2,
						docHeight - 2,
						radius - 1,
					)
					ctx.stroke()
				}

				// Highlight ring for search hits
				if (isHighlightedDocument) {
					ctx.save()
					ctx.globalAlpha = 0.9
					ctx.strokeStyle = colors.accent.primary
					ctx.lineWidth = 3
					ctx.setLineDash([6, 4])
					const avgDimension = (docWidth + docHeight) / 2
					const ringPadding = avgDimension * 0.1
					ctx.beginPath()
					ctx.roundRect(
						screenX - docWidth / 2 - ringPadding,
						screenY - docHeight / 2 - ringPadding,
						docWidth + ringPadding * 2,
						docHeight + ringPadding * 2,
						radius + 6,
					)
					ctx.stroke()
					ctx.setLineDash([])
					ctx.restore()
				}

				// Draw document type icon (centered)
				if (!useSimplifiedRendering) {
					const doc = node.data as ViewportDocument
					const iconSize = docHeight * 0.4

					drawDocumentIcon(
						ctx,
						screenX,
						screenY,
						iconSize,
						doc.type || "text",
						"rgba(255, 255, 255, 0.8)",
					)
				}

				// Enhanced hover glow effect (skip when zoomed out for performance)
				if (!useSimplifiedRendering && (isHovered || isDragging)) {
					const glowColor = colors.document.glow

					ctx.strokeStyle = glowColor
					ctx.lineWidth = 1
					ctx.setLineDash([3, 3])
					ctx.globalAlpha = 0.6

					ctx.beginPath()
					const avgDimension = (docWidth + docHeight) / 2
					const glowPadding = avgDimension * 0.1
					ctx.roundRect(
						screenX - docWidth / 2 - glowPadding,
						screenY - docHeight / 2 - glowPadding,
						docWidth + glowPadding * 2,
						docHeight + glowPadding * 2,
						15,
					)
					ctx.stroke()
					ctx.setLineDash([])
				}
			})

			ctx.globalAlpha = 1
			ctx.restore()
		}, [
			nodes,
			edges,
			panX,
			panY,
			zoom,
			width,
			height,
			highlightDocumentIds,
			selectedNodeId,
			nodeMap,
		])

		// Render on changes
		const renderKey = useMemo(() => {
			const positionHash = nodes.reduce((hash, n) => {
				const x = Math.round(n.x * 10)
				const y = Math.round(n.y * 10)
				const hovered = currentHoveredNode.current === n.id ? 1 : 0
				return hash ^ (x + y + hovered)
			}, 0)

			const highlightHash = (highlightDocumentIds ?? []).reduce((hash, id) => {
				return hash ^ id.length
			}, 0)

			return (
				positionHash ^
				edges.length ^
				Math.round(panX) ^
				Math.round(panY) ^
				Math.round(zoom * 100) ^
				width ^
				height ^
				highlightHash ^
				(selectedNodeId?.length ?? 0)
			)
		}, [
			nodes,
			edges.length,
			panX,
			panY,
			zoom,
			width,
			height,
			highlightDocumentIds,
			selectedNodeId,
		])

		const lastRenderKey = useRef<number>(0)

		useEffect(() => {
			if (renderKey !== lastRenderKey.current) {
				lastRenderKey.current = renderKey
				render()
			}
		}, [renderKey, render])

		// Add native wheel event listener to prevent browser zoom
		useEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const handleNativeWheel = (e: WheelEvent) => {
				e.preventDefault()
				e.stopPropagation()

				onWheel({
					deltaY: e.deltaY,
					deltaX: e.deltaX,
					clientX: e.clientX,
					clientY: e.clientY,
					currentTarget: canvas,
					nativeEvent: e,
					preventDefault: () => {},
					stopPropagation: () => {},
				} as unknown as React.WheelEvent)
			}

			canvas.addEventListener("wheel", handleNativeWheel, { passive: false })

			const handleGesture = (e: Event) => {
				e.preventDefault()
			}

			canvas.addEventListener("gesturestart", handleGesture, { passive: false })
			canvas.addEventListener("gesturechange", handleGesture, {
				passive: false,
			})
			canvas.addEventListener("gestureend", handleGesture, { passive: false })

			return () => {
				canvas.removeEventListener("wheel", handleNativeWheel)
				canvas.removeEventListener("gesturestart", handleGesture)
				canvas.removeEventListener("gesturechange", handleGesture)
				canvas.removeEventListener("gestureend", handleGesture)
			}
		}, [onWheel])

		// High-DPI handling
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

		useLayoutEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const MAX_CANVAS_SIZE = 16384
			const maxDpr =
				width > 0 && height > 0
					? Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height, dpr)
					: dpr

			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			canvas.width = Math.min(width * maxDpr, MAX_CANVAS_SIZE)
			canvas.height = Math.min(height * maxDpr, MAX_CANVAS_SIZE)

			const ctx = canvas.getContext("2d")
			ctx?.scale(maxDpr, maxDpr)
		}, [width, height, dpr])

		return (
			<canvas
				ref={canvasRef}
				onClick={handleClick}
				onDoubleClick={onDoubleClick}
				onMouseDown={handleMouseDown}
				onMouseLeave={onPanEnd}
				onMouseMove={handleMouseMove}
				onMouseUp={onPanEnd}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
				style={{
					cursor: currentHoveredNode.current ? "pointer" : "move",
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
				className="absolute inset-0"
			/>
		)
	},
)

ViewportCanvas.displayName = "ViewportCanvas"
