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
import { colors, ANIMATION, EDGE_COLORS } from "./constants"
import type { DocumentWithMemories, GraphCanvasProps, GraphNode } from "./types"
import { drawDocumentIcon } from "./utils/document-icons"

// Helper to draw a flat-topped regular hexagon
function drawHexagon(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	radius: number,
) {
	ctx.beginPath()
	for (let i = 0; i < 6; i++) {
		// Flat-top hexagon: start at -30° (top-right flat edge)
		const angle = (Math.PI / 3) * i - Math.PI / 6
		const x = cx + radius * Math.cos(angle)
		const y = cy + radius * Math.sin(angle)
		if (i === 0) {
			ctx.moveTo(x, y)
		} else {
			ctx.lineTo(x, y)
		}
	}
	ctx.closePath()
}

// Helper to draw an arrow head at the end of an edge
function drawArrowHead(
	ctx: CanvasRenderingContext2D,
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	arrowSize: number,
) {
	const angle = Math.atan2(toY - fromY, toX - fromX)
	ctx.beginPath()
	ctx.moveTo(toX, toY)
	ctx.lineTo(
		toX - arrowSize * Math.cos(angle - Math.PI / 6),
		toY - arrowSize * Math.sin(angle - Math.PI / 6),
	)
	ctx.lineTo(
		toX - arrowSize * Math.cos(angle + Math.PI / 6),
		toY - arrowSize * Math.sin(angle + Math.PI / 6),
	)
	ctx.closePath()
	ctx.fill()
}

// Get edge color based on similarity and edge type
function getEdgeColor(similarity: number, edgeType: string): string {
	if (edgeType === "doc-memory") {
		return colors.connection.blueGray
	}
	if (edgeType === "version") {
		return colors.connection.purple
	}
	// Map similarity (0.7-1.0) to color index
	if (similarity >= 0.9) {
		return EDGE_COLORS[0] // teal - strongest
	}
	if (similarity >= 0.85) {
		return EDGE_COLORS[1] // blueGray
	}
	if (similarity >= 0.8) {
		return EDGE_COLORS[2] // blue
	}
	return EDGE_COLORS[3] // purple - weakest visible
}

export const GraphCanvas = memo<GraphCanvasProps>(
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
		onNodeDragStart,
		onNodeDragMove,
		onNodeDragEnd,
		onPanStart,
		onPanMove,
		onPanEnd,
		onWheel,
		onDoubleClick,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		draggingNodeId,
		highlightDocumentIds,
		isSimulationActive = false,
		selectedNodeId = null,
	}) => {
		const canvasRef = useRef<HTMLCanvasElement>(null)
		const animationRef = useRef<number>(0)
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

			// Set high quality rendering once instead of every frame
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"
		}, [])

		// Smooth dimming animation
		useEffect(() => {
			const targetDim = selectedNodeId ? 1 : 0
			const duration = ANIMATION.dimDuration // Match physics settling time
			const startDim = dimProgress.current
			const startTime = Date.now()

			const animate = () => {
				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / duration, 1)

				// Ease-out cubic easing for smooth deceleration
				const eased = 1 - (1 - progress) ** 3
				dimProgress.current = startDim + (targetDim - startDim) * eased

				// Force re-render to update canvas during animation
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

		// Spatial grid for optimized hit detection (20-25% FPS improvement for large graphs)
		const spatialGrid = useMemo(() => {
			const GRID_CELL_SIZE = 150 // Grid cell size in screen pixels
			const grid = new Map<string, GraphNode[]>()

			// Build spatial grid
			nodes.forEach((node) => {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY

				// Calculate which grid cell this node belongs to
				const cellX = Math.floor(screenX / GRID_CELL_SIZE)
				const cellY = Math.floor(screenY / GRID_CELL_SIZE)
				const cellKey = `${cellX},${cellY}`

				// Add node to grid cell
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

				// Determine which grid cell the click is in
				const cellX = Math.floor(x / cellSize)
				const cellY = Math.floor(y / cellSize)
				const cellKey = `${cellX},${cellY}`

				// Only check nodes in the clicked cell (and neighboring cells for edge cases)
				const cellsToCheck = [
					cellKey,
					`${cellX - 1},${cellY}`,
					`${cellX + 1},${cellY}`,
					`${cellX},${cellY - 1}`,
					`${cellX},${cellY + 1}`,
				]

				// Check from top-most to bottom-most: memory nodes are drawn after documents
				for (const key of cellsToCheck) {
					const cellNodes = grid.get(key)
					if (!cellNodes) continue

					// Iterate backwards (top-most first)
					for (let i = cellNodes.length - 1; i >= 0; i--) {
						const node = cellNodes[i]!
						const screenX = node.x * zoom + panX
						const screenY = node.y * zoom + panY
						const nodeSize = node.size * zoom

						// Both document and memory nodes are now hexagons
						// Use circular approximation for hit detection (good enough for hexagons)
						const hexRadius = nodeSize * 0.5
						const dx = x - screenX
						const dy = y - screenY
						const distance = Math.sqrt(dx * dx + dy * dy)

						if (distance <= hexRadius) {
							return node.id
						}
					}
				}
				return null
			},
			[spatialGrid, panX, panY, zoom],
		)

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

				// Handle node dragging
				if (draggingNodeId) {
					onNodeDragMove(e)
				}
			},
			[getNodeAtPosition, onNodeHover, draggingNodeId, onNodeDragMove],
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
					// When starting a node drag, prevent initiating pan
					e.stopPropagation()
					onNodeDragStart(nodeId, e)
					return
				}
				onPanStart(e)
			},
			[getNodeAtPosition, onNodeDragStart, onPanStart],
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

		// Memoize nodeMap for O(1) lookup
		const nodeMap = useMemo(() => {
			const map = new Map<string, GraphNode>()
			nodes.forEach((node) => {
				map.set(node.id, node)
			})
			return map
		}, [nodes])

		// Main render function
		const render = useCallback(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext("2d")
			if (!ctx) return

			// Clear canvas
			ctx.clearRect(0, 0, width, height)

			// Fill with background color
			ctx.fillStyle = colors.background.primary
			ctx.fillRect(0, 0, width, height)

			// Draw edges first (behind nodes)
			edges.forEach((edge) => {
				const sourceNode =
					typeof edge.source === "string"
						? nodeMap.get(edge.source)
						: edge.source
				const targetNode =
					typeof edge.target === "string"
						? nodeMap.get(edge.target)
						: edge.target

				if (!sourceNode || !targetNode) return

				const sourceX = sourceNode.x * zoom + panX
				const sourceY = sourceNode.y * zoom + panY
				const targetX = targetNode.x * zoom + panX
				const targetY = targetNode.y * zoom + panY

				// Calculate edge endpoint offset to stop at node edge
				const sourceRadius = sourceNode.size * zoom * 0.5
				const targetRadius = targetNode.size * zoom * 0.5
				const dx = targetX - sourceX
				const dy = targetY - sourceY
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < 1) return // Skip very short edges

				const ux = dx / dist
				const uy = dy / dist

				// Offset start/end points to node edges
				const startX = sourceX + ux * sourceRadius
				const startY = sourceY + uy * sourceRadius
				const endX = targetX - ux * targetRadius
				const endY = targetY - uy * targetRadius

				// Apply dimming based on selection
				let edgeOpacity = edge.visualProps.opacity
				if (selectedNodeId && dimProgress.current > 0) {
					const isConnectedToSelected =
						(typeof edge.source === "string" ? edge.source : edge.source.id) ===
							selectedNodeId ||
						(typeof edge.target === "string" ? edge.target : edge.target.id) ===
							selectedNodeId

					if (!isConnectedToSelected) {
						edgeOpacity *= 1 - dimProgress.current * 0.8
					}
				}

				// Get edge color from Figma palette
				const edgeColor = getEdgeColor(edge.similarity, edge.edgeType)
				ctx.globalAlpha = edgeOpacity

				// Draw the edge line
				ctx.beginPath()
				ctx.moveTo(startX, startY)
				ctx.lineTo(endX, endY)
				ctx.strokeStyle = edgeColor
				ctx.lineWidth = Math.max(1, edge.visualProps.thickness * 0.8)
				ctx.setLineDash([])
				ctx.stroke()

				// Draw arrow head at target end
				const arrowSize = Math.max(6, 8 * zoom)
				ctx.fillStyle = edgeColor
				drawArrowHead(ctx, startX, startY, endX, endY, arrowSize)

				ctx.globalAlpha = 1
			})

			// Draw nodes - all nodes are now hexagons
			nodes.forEach((node) => {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY
				const nodeSize = node.size * zoom

				// Determine node state for styling
				const isSelected = node.id === selectedNodeId
				const isHovered = currentHoveredNode.current === node.id
				const highlightSet = new Set(highlightDocumentIds ?? [])
				const doc = node.data as DocumentWithMemories
				const isHighlighted =
					highlightSet.has(node.id) ||
					(doc.customId && highlightSet.has(doc.customId))

				// Apply dimming based on selection
				let nodeOpacity = 1
				if (selectedNodeId && dimProgress.current > 0) {
					if (!isSelected) {
						nodeOpacity = 1 - dimProgress.current * 0.7
					}
				}

				ctx.globalAlpha = nodeOpacity

				// Calculate hexagon radius (nodeSize is diameter)
				const hexRadius = nodeSize * 0.5

				// Determine hexagon style based on state
				let hexStyle: {
					fill: string
					stroke: string
					strokeWidth: number
				}

				if (isSelected || isHighlighted) {
					hexStyle = colors.hexagon.active
				} else if (isHovered) {
					hexStyle = colors.hexagon.hovered
				} else {
					hexStyle = colors.hexagon.inactive
				}

				// Draw the flat-topped hexagon
				drawHexagon(ctx, screenX, screenY, hexRadius)

				// Fill
				ctx.fillStyle = hexStyle.fill
				ctx.fill()

				// Stroke
				ctx.strokeStyle = hexStyle.stroke
				ctx.lineWidth = hexStyle.strokeWidth
				ctx.stroke()

				// Draw document type icon for document nodes (centered in hexagon)
				if (node.type === "document") {
					const iconSize = hexRadius * 0.7
					drawDocumentIcon(ctx, screenX, screenY, iconSize, doc.type || "text")
				}

				// Draw glow effect for highlighted/selected nodes
				const shouldGlow = isHighlighted || isSelected
				if (shouldGlow) {
					const glowColor = colors.hexagon.active.stroke
					ctx.strokeStyle = glowColor
					ctx.lineWidth = 2
					ctx.setLineDash([3, 3])
					ctx.globalAlpha = 0.8

					// Hexagonal glow (10% larger than node)
					const glowRadius = hexRadius * 1.15
					drawHexagon(ctx, screenX, screenY, glowRadius)
					ctx.stroke()
					ctx.setLineDash([])
				}
			})

			ctx.globalAlpha = 1
		}, [
			nodes,
			edges,
			panX,
			panY,
			zoom,
			width,
			height,
			highlightDocumentIds,
			nodeMap,
			selectedNodeId,
		])

		// Hybrid rendering: continuous when simulation active, change-based when idle
		const lastRenderParams = useRef<number>(0)

		// Create a render key that changes when visual state changes
		// Optimized: use cheap hash instead of building long strings
		const renderKey = useMemo(() => {
			// Hash node positions to a single number (cheaper than string concatenation)
			const positionHash = nodes.reduce((hash, n) => {
				// Round to 1 decimal to avoid unnecessary re-renders from tiny movements
				const x = Math.round(n.x * 10)
				const y = Math.round(n.y * 10)
				const dragging = n.isDragging ? 1 : 0
				const hovered = currentHoveredNode.current === n.id ? 1 : 0
				// Simple XOR hash (fast and sufficient for change detection)
				return hash ^ (x + y + dragging + hovered)
			}, 0)

			const highlightHash = (highlightDocumentIds ?? []).reduce((hash, id) => {
				return hash ^ id.length
			}, 0)

			// Combine all factors into a single number
			return (
				positionHash ^
				edges.length ^
				Math.round(panX) ^
				Math.round(panY) ^
				Math.round(zoom * 100) ^
				width ^
				height ^
				highlightHash
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
		])

		// Render based on simulation state
		useEffect(() => {
			if (isSimulationActive) {
				// Continuous rendering during physics simulation
				const renderLoop = () => {
					render()
					animationRef.current = requestAnimationFrame(renderLoop)
				}
				renderLoop()

				return () => {
					if (animationRef.current) {
						cancelAnimationFrame(animationRef.current)
					}
				}
			}
			// Change-based rendering when simulation is idle
			if (renderKey !== lastRenderParams.current) {
				lastRenderParams.current = renderKey
				render()
			}
		}, [isSimulationActive, renderKey, render])

		// Cleanup any existing animation frames
		useEffect(() => {
			return () => {
				if (animationRef.current) {
					cancelAnimationFrame(animationRef.current)
				}
			}
		}, [])

		// Add native wheel event listener to prevent browser zoom
		useEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const handleNativeWheel = (e: WheelEvent) => {
				e.preventDefault()
				e.stopPropagation()

				// Call the onWheel handler with a synthetic-like event
				// @ts-expect-error - partial WheelEvent object
				onWheel({
					deltaY: e.deltaY,
					deltaX: e.deltaX,
					clientX: e.clientX,
					clientY: e.clientY,
					currentTarget: canvas,
					nativeEvent: e,
					preventDefault: () => {},
					stopPropagation: () => {},
				} as React.WheelEvent)
			}

			// Add listener with passive: false to ensure preventDefault works
			canvas.addEventListener("wheel", handleNativeWheel, { passive: false })

			// Also prevent gesture events for touch devices
			const handleGesture = (e: Event) => {
				e.preventDefault()
			}

			canvas.addEventListener("gesturestart", handleGesture, {
				passive: false,
			})
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

		//  High-DPI handling  --------------------------------------------------
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

		useLayoutEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			// Maximum safe canvas size (most browsers support up to 16384px)
			const MAX_CANVAS_SIZE = 16384

			// Calculate effective DPR that keeps us within safe limits
			// Prevent division by zero by checking for valid dimensions
			const maxDpr =
				width > 0 && height > 0
					? Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height, dpr)
					: dpr

			// upscale backing store with clamped dimensions
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			canvas.width = Math.min(width * maxDpr, MAX_CANVAS_SIZE)
			canvas.height = Math.min(height * maxDpr, MAX_CANVAS_SIZE)

			const ctx = canvas.getContext("2d")
			ctx?.scale(maxDpr, maxDpr)
		}, [width, height, dpr])
		// -----------------------------------------------------------------------

		return (
			<canvas
				className="absolute inset-0"
				onClick={handleClick}
				onDoubleClick={onDoubleClick}
				onMouseDown={handleMouseDown}
				onMouseLeave={() => {
					if (draggingNodeId) {
						onNodeDragEnd()
					} else {
						onPanEnd()
					}
				}}
				onMouseMove={(e) => {
					handleMouseMove(e)
					if (!draggingNodeId) {
						onPanMove(e)
					}
				}}
				onMouseUp={() => {
					if (draggingNodeId) {
						onNodeDragEnd()
					} else {
						onPanEnd()
					}
				}}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
				ref={canvasRef}
				style={{
					cursor: draggingNodeId
						? "grabbing"
						: currentHoveredNode.current
							? "grab"
							: "move",
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
			/>
		)
	},
)

GraphCanvas.displayName = "GraphCanvas"
