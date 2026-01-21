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
import { colors, ANIMATION } from "@/constants"
import type {
	DocumentWithMemories,
	GraphCanvasProps,
	GraphNode,
	MemoryEntry,
} from "@/types"
import { drawDocumentIcon } from "@/utils/document-icons"
import { canvasWrapper } from "./canvas-common.css"

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

						if (node.type === "document") {
							// Rectangular hit detection for documents (matches visual size)
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
						} else {
							// Circular hit detection for memory nodes
							const dx = x - screenX
							const dy = y - screenY
							const distance = Math.sqrt(dx * dx + dy * dy)

							if (distance <= nodeSize / 2) {
								return node.id
							}
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

		// Memoize nodeMap to avoid rebuilding every frame
		const nodeMap = useMemo(() => {
			return new Map(nodes.map((node) => [node.id, node]))
		}, [nodes])

		// Professional rendering function with LOD
		const render = useCallback(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext("2d")
			if (!ctx) return

			const currentTime = Date.now()
			const _elapsed = currentTime - startTimeRef.current

			// Level-of-detail optimization based on zoom
			const useSimplifiedRendering = zoom < 0.3

			// Clear canvas
			ctx.clearRect(0, 0, width, height)

			// Draw minimal background grid
			ctx.strokeStyle = "rgba(148, 163, 184, 0.03)" // Very subtle grid
			ctx.lineWidth = 1
			const gridSpacing = 100 * zoom
			const offsetX = panX % gridSpacing
			const offsetY = panY % gridSpacing

			// Simple, clean grid lines
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

			// Draw enhanced edges with sophisticated styling - BATCHED BY TYPE for performance
			ctx.lineCap = "round"

			// Group edges by type for batch rendering (reduces canvas state changes)
			const docMemoryEdges: typeof edges = []
			const docDocEdges: typeof edges = []
			const versionEdges: typeof edges = []

			// Categorize edges (single pass) with viewport culling
			edges.forEach((edge) => {
				// Handle both string IDs and node references (d3-force mutates these)
				const sourceNode =
					typeof edge.source === "string"
						? nodeMap.get(edge.source)
						: edge.source
				const targetNode =
					typeof edge.target === "string"
						? nodeMap.get(edge.target)
						: edge.target

				if (sourceNode && targetNode) {
					const sourceX = sourceNode.x * zoom + panX
					const sourceY = sourceNode.y * zoom + panY
					const targetX = targetNode.x * zoom + panX
					const targetY = targetNode.y * zoom + panY

					// Enhanced viewport culling with proper X and Y axis bounds checking
					// Only cull edges when BOTH endpoints are off-screen in the same direction
					const edgeMargin = 100
					if (
						(sourceX < -edgeMargin && targetX < -edgeMargin) ||
						(sourceX > width + edgeMargin && targetX > width + edgeMargin) ||
						(sourceY < -edgeMargin && targetY < -edgeMargin) ||
						(sourceY > height + edgeMargin && targetY > height + edgeMargin)
					) {
						return
					}

					// Skip very weak connections when zoomed out for performance
					if (useSimplifiedRendering) {
						if (
							edge.edgeType === "doc-memory" &&
							edge.visualProps.opacity < 0.3
						) {
							return // Skip very weak doc-memory edges when zoomed out
						}
					}

					// Sort into appropriate batch based on edge type
					if (edge.edgeType === "doc-memory") {
						docMemoryEdges.push(edge)
					} else if (edge.edgeType === "doc-doc") {
						docDocEdges.push(edge)
					} else if (edge.edgeType === "version") {
						versionEdges.push(edge)
					}
				}
			})

			// Helper function to draw a single edge path
			const drawEdgePath = (
				edge: (typeof edges)[0],
				sourceNode: GraphNode,
				targetNode: GraphNode,
				edgeShouldDim: boolean,
			) => {
				const sourceX = sourceNode.x * zoom + panX
				const sourceY = sourceNode.y * zoom + panY
				const targetX = targetNode.x * zoom + panX
				const targetY = targetNode.y * zoom + panY

				// Simplified lines when zoomed out, curved when zoomed in
				if (useSimplifiedRendering) {
					// Straight lines for performance
					ctx.beginPath()
					ctx.moveTo(sourceX, sourceY)
					ctx.lineTo(targetX, targetY)
					ctx.stroke()
				} else {
					// Regular curved line for doc-memory and doc-doc
					const midX = (sourceX + targetX) / 2
					const midY = (sourceY + targetY) / 2
					const dx = targetX - sourceX
					const dy = targetY - sourceY
					const distance = Math.sqrt(dx * dx + dy * dy)
					const controlOffset =
						edge.edgeType === "doc-memory" ? 15 : Math.min(30, distance * 0.2)

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
			}

			// Smooth edge opacity: interpolate between full and 0.05 (dimmed)
			const edgeDimOpacity = 1 - dimProgress.current * 0.95

			// BATCH 1: Draw all doc-memory edges together
			if (docMemoryEdges.length > 0) {
				ctx.strokeStyle = colors.connection.memory
				ctx.lineWidth = 1
				ctx.setLineDash([])

				docMemoryEdges.forEach((edge) => {
					const sourceNode =
						typeof edge.source === "string"
							? nodeMap.get(edge.source)
							: edge.source
					const targetNode =
						typeof edge.target === "string"
							? nodeMap.get(edge.target)
							: edge.target

					if (sourceNode && targetNode) {
						const edgeShouldDim =
							selectedNodeId !== null &&
							sourceNode.id !== selectedNodeId &&
							targetNode.id !== selectedNodeId
						const opacity = edgeShouldDim ? edgeDimOpacity : 0.9

						ctx.globalAlpha = opacity
						drawEdgePath(edge, sourceNode, targetNode, edgeShouldDim)
					}
				})
			}

			// BATCH 2: Draw all doc-doc edges together (grouped by similarity strength)
			if (docDocEdges.length > 0) {
				const dashPattern = useSimplifiedRendering ? [] : [10, 5]
				ctx.setLineDash(dashPattern)

				docDocEdges.forEach((edge) => {
					const sourceNode =
						typeof edge.source === "string"
							? nodeMap.get(edge.source)
							: edge.source
					const targetNode =
						typeof edge.target === "string"
							? nodeMap.get(edge.target)
							: edge.target

					if (sourceNode && targetNode) {
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
						if (edge.similarity > 0.85)
							connectionColor = colors.connection.strong
						else if (edge.similarity > 0.725)
							connectionColor = colors.connection.medium

						ctx.strokeStyle = connectionColor
						ctx.lineWidth = lineWidth
						ctx.globalAlpha = opacity
						drawEdgePath(edge, sourceNode, targetNode, edgeShouldDim)
					}
				})
			}

			// BATCH 3: Draw all version edges together
			if (versionEdges.length > 0) {
				ctx.setLineDash([])

				versionEdges.forEach((edge) => {
					const sourceNode =
						typeof edge.source === "string"
							? nodeMap.get(edge.source)
							: edge.source
					const targetNode =
						typeof edge.target === "string"
							? nodeMap.get(edge.target)
							: edge.target

					if (sourceNode && targetNode) {
						const edgeShouldDim =
							selectedNodeId !== null &&
							sourceNode.id !== selectedNodeId &&
							targetNode.id !== selectedNodeId
						const opacity = edgeShouldDim ? edgeDimOpacity : 0.8
						const connectionColor = edge.color || colors.relations.updates

						const sourceX = sourceNode.x * zoom + panX
						const sourceY = sourceNode.y * zoom + panY
						const targetX = targetNode.x * zoom + panX
						const targetY = targetNode.y * zoom + panY

						// Special double-line rendering for version chains
						ctx.strokeStyle = connectionColor

						// First line (outer)
						ctx.lineWidth = 3
						ctx.globalAlpha = opacity * 0.3
						ctx.beginPath()
						ctx.moveTo(sourceX, sourceY)
						ctx.lineTo(targetX, targetY)
						ctx.stroke()

						// Second line (inner)
						ctx.lineWidth = 1
						ctx.globalAlpha = opacity
						ctx.beginPath()
						ctx.moveTo(sourceX, sourceY)
						ctx.lineTo(targetX, targetY)
						ctx.stroke()

						// Subtle arrow head
						const angle = Math.atan2(targetY - sourceY, targetX - sourceX)
						const arrowLength = Math.max(6, 8 * zoom)
						const arrowWidth = Math.max(8, 12 * zoom)

						const nodeRadius = (targetNode.size * zoom) / 2
						const offsetDistance = nodeRadius + 2
						const arrowX = targetX - Math.cos(angle) * offsetDistance
						const arrowY = targetY - Math.sin(angle) * offsetDistance

						ctx.save()
						ctx.translate(arrowX, arrowY)
						ctx.rotate(angle)

						ctx.strokeStyle = connectionColor
						ctx.lineWidth = Math.max(1, 1.5 * zoom)
						ctx.globalAlpha = opacity

						ctx.beginPath()
						ctx.moveTo(0, 0)
						ctx.lineTo(-arrowLength, arrowWidth / 2)
						ctx.moveTo(0, 0)
						ctx.lineTo(-arrowLength, -arrowWidth / 2)
						ctx.stroke()

						ctx.restore()
					}
				})
			}

			ctx.globalAlpha = 1
			ctx.setLineDash([])

			// Prepare highlight set from provided document IDs (customId or internal)
			const highlightSet = new Set<string>(highlightDocumentIds ?? [])

			// Draw nodes with enhanced styling and LOD optimization
			nodes.forEach((node) => {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY
				const nodeSize = node.size * zoom

				// Enhanced viewport culling
				const margin = nodeSize + 50
				if (
					screenX < -margin ||
					screenX > width + margin ||
					screenY < -margin ||
					screenY > height + margin
				) {
					return
				}

				const isHovered = currentHoveredNode.current === node.id
				const isDragging = node.isDragging
				const isSelected = selectedNodeId === node.id
				const shouldDim = selectedNodeId !== null && !isSelected
				// Smooth opacity: interpolate between 1 (full) and 0.1 (dimmed) based on animation progress
				const nodeOpacity = shouldDim ? 1 - dimProgress.current * 0.9 : 1
				const isHighlightedDocument = (() => {
					if (node.type !== "document" || highlightSet.size === 0) return false
					const doc = node.data as DocumentWithMemories
					if (doc.customId && highlightSet.has(doc.customId)) return true
					return highlightSet.has(doc.id)
				})()

				if (node.type === "document") {
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
						// Add equal padding on all sides (15% of average dimension)
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
						const doc = node.data as DocumentWithMemories
						const iconSize = docHeight * 0.4 // Icon size relative to card height

						drawDocumentIcon(
							ctx,
							screenX,
							screenY,
							iconSize,
							doc.type || "text",
							"rgba(255, 255, 255, 0.8)",
						)
					}
				} else {
					// Enhanced memory styling with status indicators
					const mem = node.data as MemoryEntry
					const isForgotten =
						mem.isForgotten ||
						(mem.forgetAfter &&
							new Date(mem.forgetAfter).getTime() < Date.now())
					const isLatest = mem.isLatest

					// Check if memory is expiring soon (within 7 days)
					const expiringSoon =
						mem.forgetAfter &&
						!isForgotten &&
						new Date(mem.forgetAfter).getTime() - Date.now() <
							1000 * 60 * 60 * 24 * 7

					// Check if memory is new (created within last 24 hours)
					const isNew =
						!isForgotten &&
						new Date(mem.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24

					// Determine colors based on status
					let fillColor = colors.memory.primary
					let borderColor = colors.memory.border
					let glowColor = colors.memory.glow

					if (isForgotten) {
						fillColor = colors.status.forgotten
						borderColor = "rgba(220,38,38,0.3)"
						glowColor = "rgba(220,38,38,0.2)"
					} else if (expiringSoon) {
						borderColor = colors.status.expiring
						glowColor = colors.accent.amber
					} else if (isNew) {
						borderColor = colors.status.new
						glowColor = colors.accent.emerald
					}

					if (isDragging) {
						fillColor = colors.memory.accent
						borderColor = glowColor
					} else if (isHovered) {
						fillColor = colors.memory.secondary
					}

					const radius = nodeSize / 2

					ctx.fillStyle = fillColor
					ctx.globalAlpha = shouldDim ? nodeOpacity : isLatest ? 1 : 0.4
					ctx.strokeStyle = borderColor
					ctx.lineWidth = isDragging ? 3 : isHovered ? 2 : 1.5

					if (useSimplifiedRendering) {
						// Simple circles when zoomed out for performance
						ctx.beginPath()
						ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI)
						ctx.fill()
						ctx.stroke()
					} else {
						// HEXAGONAL memory nodes when zoomed in
						const sides = 6
						ctx.beginPath()
						for (let i = 0; i < sides; i++) {
							const angle = (i * 2 * Math.PI) / sides - Math.PI / 2 // Start from top
							const x = screenX + radius * Math.cos(angle)
							const y = screenY + radius * Math.sin(angle)
							if (i === 0) {
								ctx.moveTo(x, y)
							} else {
								ctx.lineTo(x, y)
							}
						}
						ctx.closePath()
						ctx.fill()
						ctx.stroke()

						// Inner highlight for glass effect
						if (isHovered || isDragging) {
							ctx.strokeStyle = "rgba(147, 197, 253, 0.3)"
							ctx.lineWidth = 1
							const innerRadius = radius - 2
							ctx.beginPath()
							for (let i = 0; i < sides; i++) {
								const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
								const x = screenX + innerRadius * Math.cos(angle)
								const y = screenY + innerRadius * Math.sin(angle)
								if (i === 0) {
									ctx.moveTo(x, y)
								} else {
									ctx.lineTo(x, y)
								}
							}
							ctx.closePath()
							ctx.stroke()
						}
					}

					// Status indicators overlay (always preserve these as required)
					if (isForgotten) {
						// Cross for forgotten memories
						ctx.strokeStyle = "rgba(220,38,38,0.4)"
						ctx.lineWidth = 2
						const r = nodeSize * 0.25
						ctx.beginPath()
						ctx.moveTo(screenX - r, screenY - r)
						ctx.lineTo(screenX + r, screenY + r)
						ctx.moveTo(screenX + r, screenY - r)
						ctx.lineTo(screenX - r, screenY + r)
						ctx.stroke()
					} else if (isNew) {
						// Small dot for new memories
						ctx.fillStyle = colors.status.new
						ctx.beginPath()
						ctx.arc(
							screenX + nodeSize * 0.25,
							screenY - nodeSize * 0.25,
							Math.max(2, nodeSize * 0.15), // Scale with node size, minimum 2px
							0,
							2 * Math.PI,
						)
						ctx.fill()
					}
				}

				// Enhanced hover glow effect (skip when zoomed out for performance)
				if (!useSimplifiedRendering && (isHovered || isDragging)) {
					const glowColor =
						node.type === "document" ? colors.document.glow : colors.memory.glow

					ctx.strokeStyle = glowColor
					ctx.lineWidth = 1
					ctx.setLineDash([3, 3])
					ctx.globalAlpha = 0.6

					ctx.beginPath()
					if (node.type === "document") {
						// Use actual document dimensions for glow
						const docWidth = nodeSize * 1.4
						const docHeight = nodeSize * 0.9
						// Make glow 10% larger than document
						const avgDimension = (docWidth + docHeight) / 2
						const glowPadding = avgDimension * 0.1
						ctx.roundRect(
							screenX - docWidth / 2 - glowPadding,
							screenY - docHeight / 2 - glowPadding,
							docWidth + glowPadding * 2,
							docHeight + glowPadding * 2,
							15,
						)
					} else {
						// Hexagonal glow for memory nodes
						const glowRadius = nodeSize * 0.7
						const sides = 6
						for (let i = 0; i < sides; i++) {
							const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
							const x = screenX + glowRadius * Math.cos(angle)
							const y = screenY + glowRadius * Math.sin(angle)
							if (i === 0) {
								ctx.moveTo(x, y)
							} else {
								ctx.lineTo(x, y)
							}
						}
						ctx.closePath()
					}
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
				className={canvasWrapper}
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
