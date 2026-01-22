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
import { colors, ANIMATION } from "./constants"
import type { GraphCanvasProps, GraphNode } from "./types"
import type { ViewportDocument, ViewportMemoryEntry } from "@/lib/viewport-graph-types"
import { drawDocumentIcon } from "./document-icons"

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
		const animationRef = useRef<number>(0)
		const startTimeRef = useRef<number>(Date.now())
		const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
		const currentHoveredNode = useRef<string | null>(null)
		const dimProgress = useRef<number>(selectedNodeId ? 1 : 0)
		const dimAnimationRef = useRef<number>(0)
		const [, forceRender] = useState(0)

		useEffect(() => {
			startTimeRef.current = Date.now()
		}, [])

		useLayoutEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext("2d")
			if (!ctx) return

			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"
		}, [])

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

		const spatialGrid = useMemo(() => {
			const GRID_CELL_SIZE = 150
			const grid = new Map<string, GraphNode[]>()

			for (const node of nodes) {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY

				const cellX = Math.floor(screenX / GRID_CELL_SIZE)
				const cellY = Math.floor(screenY / GRID_CELL_SIZE)
				const cellKey = `${cellX},${cellY}`

				if (!grid.has(cellKey)) {
					grid.set(cellKey, [])
				}
				grid.get(cellKey)!.push(node)
			}

			return { grid, cellSize: GRID_CELL_SIZE }
		}, [nodes, panX, panY, zoom])

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

						// All nodes are hexagons now, use circular hit detection
						const radius = node.type === "document" ? nodeSize * 0.6 : nodeSize / 2
						const dx = x - screenX
						const dy = y - screenY
						const distance = Math.sqrt(dx * dx + dy * dy)

						if (distance <= radius) {
							return node.id
						}
					}
				}
				return null
			},
			[spatialGrid, panX, panY, zoom],
		)

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
			},
			[getNodeAtPosition, onNodeHover],
		)

		const handleMouseDown = useCallback(
			(e: React.MouseEvent) => {
				onPanStart(e)
			},
			[onPanStart],
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

		const nodeMap = useMemo(() => {
			return new Map(nodes.map((node) => [node.id, node]))
		}, [nodes])

		const render = useCallback(() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext("2d")
			if (!ctx) return

			const useSimplifiedRendering = zoom < 0.3

			ctx.clearRect(0, 0, width, height)

			// Draw dotted background pattern
			const dotSpacing = 30 * Math.max(zoom, 0.5) // Maintain reasonable spacing
			const offsetX = panX % dotSpacing
			const offsetY = panY % dotSpacing
			const dotRadius = 1

			ctx.fillStyle = "rgba(0, 180, 216, 0.15)"

			for (let x = offsetX; x < width; x += dotSpacing) {
				for (let y = offsetY; y < height; y += dotSpacing) {
					ctx.beginPath()
					ctx.arc(x, y, dotRadius, 0, 2 * Math.PI)
					ctx.fill()
				}
			}

			ctx.lineCap = "round"

			const docMemoryEdges: typeof edges = []
			const docDocEdges: typeof edges = []

			for (const edge of edges) {
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

					const edgeMargin = 100
					if (
						(sourceX < -edgeMargin && targetX < -edgeMargin) ||
						(sourceX > width + edgeMargin && targetX > width + edgeMargin) ||
						(sourceY < -edgeMargin && targetY < -edgeMargin) ||
						(sourceY > height + edgeMargin && targetY > height + edgeMargin)
					) {
						continue
					}

					if (edge.edgeType === "doc-doc") {
						docDocEdges.push(edge)
					} else {
						docMemoryEdges.push(edge)
					}
				}
			}

			const drawEdgePath = (
				edge: (typeof edges)[0],
				sourceNode: GraphNode,
				targetNode: GraphNode,
			) => {
				const sourceX = sourceNode.x * zoom + panX
				const sourceY = sourceNode.y * zoom + panY
				const targetX = targetNode.x * zoom + panX
				const targetY = targetNode.y * zoom + panY

				if (useSimplifiedRendering) {
					ctx.beginPath()
					ctx.moveTo(sourceX, sourceY)
					ctx.lineTo(targetX, targetY)
					ctx.stroke()
				} else {
					const midX = (sourceX + targetX) / 2
					const midY = (sourceY + targetY) / 2
					const dx = targetX - sourceX
					const dy = targetY - sourceY
					const distance = Math.sqrt(dx * dx + dy * dy)
					const controlOffset =
						edge.edgeType === "doc-doc" ? Math.min(30, distance * 0.2) : 15

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

			const edgeDimOpacity = 1 - dimProgress.current * 0.95

			if (docMemoryEdges.length > 0) {
				ctx.strokeStyle = colors.connection.memory
				ctx.lineWidth = 1
				ctx.setLineDash([])

				for (const edge of docMemoryEdges) {
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
						drawEdgePath(edge, sourceNode, targetNode)
					}
				}
			}

			if (docDocEdges.length > 0) {
				const dashPattern = useSimplifiedRendering ? [] : [10, 5]
				ctx.setLineDash(dashPattern)

				for (const edge of docDocEdges) {
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

						let connectionColor = colors.connection.weak
						if (edge.similarity > 0.85)
							connectionColor = colors.connection.strong
						else if (edge.similarity > 0.725)
							connectionColor = colors.connection.medium

						ctx.strokeStyle = connectionColor
						ctx.lineWidth = lineWidth
						ctx.globalAlpha = opacity
						drawEdgePath(edge, sourceNode, targetNode)
					}
				}
			}

			ctx.globalAlpha = 1
			ctx.setLineDash([])

			const highlightSet = new Set<string>(highlightDocumentIds ?? [])

			for (const node of nodes) {
				const screenX = node.x * zoom + panX
				const screenY = node.y * zoom + panY
				const nodeSize = node.size * zoom

				const margin = nodeSize + 50
				if (
					screenX < -margin ||
					screenX > width + margin ||
					screenY < -margin ||
					screenY > height + margin
				) {
					continue
				}

				const isHovered = currentHoveredNode.current === node.id
				const isSelected = selectedNodeId === node.id
				const shouldDim = selectedNodeId !== null && !isSelected
				const nodeOpacity = shouldDim ? 1 - dimProgress.current * 0.9 : 1
				const isHighlightedDocument = (() => {
					if (node.type !== "document" || highlightSet.size === 0) return false
					const doc = node.data as ViewportDocument
					if (doc.customId && highlightSet.has(doc.customId)) return true
					return highlightSet.has(doc.id)
				})()

				// All nodes are now rendered as hexagons
				const isDocument = node.type === "document"
				const isMemory = node.type === "memory"

				// Get node data for status checks
				let isNew = false
				if (isMemory) {
					const mem = node.data as ViewportMemoryEntry
					isNew = new Date(mem.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24
				}

				// Use consistent node colors for all nodes
				let fillColor = colors.node.primary
				let borderColor = colors.node.border

				if (isHovered) {
					fillColor = colors.node.secondary
				}

				if (isNew) {
					borderColor = colors.status.new
				}

				// Document nodes are slightly larger
				const radius = isDocument ? nodeSize * 0.6 : nodeSize / 2

				ctx.fillStyle = fillColor
				ctx.globalAlpha = shouldDim ? nodeOpacity : 1
				ctx.strokeStyle = borderColor
				ctx.lineWidth = isHovered ? 2 : 1.5

				if (useSimplifiedRendering) {
					// Simple circle for low zoom
					ctx.beginPath()
					ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI)
					ctx.fill()
					ctx.stroke()
				} else {
					// Hexagon for normal zoom
					const sides = 6
					ctx.beginPath()
					for (let i = 0; i < sides; i++) {
						const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
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

					// Inner highlight on hover
					if (isHovered) {
						ctx.strokeStyle = "rgba(0, 180, 216, 0.3)"
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

				// Highlighted document indicator
				if (isHighlightedDocument) {
					ctx.save()
					ctx.globalAlpha = 0.9
					ctx.strokeStyle = colors.accent.primary
					ctx.lineWidth = 3
					ctx.setLineDash([6, 4])
					const highlightRadius = radius * 1.2
					const sides = 6
					ctx.beginPath()
					for (let i = 0; i < sides; i++) {
						const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
						const x = screenX + highlightRadius * Math.cos(angle)
						const y = screenY + highlightRadius * Math.sin(angle)
						if (i === 0) {
							ctx.moveTo(x, y)
						} else {
							ctx.lineTo(x, y)
						}
					}
					ctx.closePath()
					ctx.stroke()
					ctx.setLineDash([])
					ctx.restore()
				}

				// New item indicator dot
				if (isNew) {
					ctx.fillStyle = colors.status.new
					ctx.beginPath()
					ctx.arc(
						screenX + nodeSize * 0.25,
						screenY - nodeSize * 0.25,
						Math.max(2, nodeSize * 0.15),
						0,
						2 * Math.PI,
					)
					ctx.fill()
				}

				// Unified glow effect for all nodes (hexagon)
				if (!useSimplifiedRendering && isHovered) {
					const glowColor = colors.node.glow

					ctx.strokeStyle = glowColor
					ctx.lineWidth = 1
					ctx.setLineDash([3, 3])
					ctx.globalAlpha = 0.6

					const glowRadius = (node.type === "document" ? nodeSize * 0.6 : nodeSize / 2) * 1.3
					const sides = 6
					ctx.beginPath()
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
					ctx.stroke()
					ctx.setLineDash([])
				}
			}

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

		const lastRenderParams = useRef<number>(0)

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
				highlightHash
			)
		}, [nodes, edges.length, panX, panY, zoom, width, height, highlightDocumentIds])

		useEffect(() => {
			if (renderKey !== lastRenderParams.current) {
				lastRenderParams.current = renderKey
				render()
			}
		}, [renderKey, render])

		useEffect(() => {
			return () => {
				if (animationRef.current) {
					cancelAnimationFrame(animationRef.current)
				}
			}
		}, [])

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
			canvas.addEventListener("gesturechange", handleGesture, { passive: false })
			canvas.addEventListener("gestureend", handleGesture, { passive: false })

			return () => {
				canvas.removeEventListener("wheel", handleNativeWheel)
				canvas.removeEventListener("gesturestart", handleGesture)
				canvas.removeEventListener("gesturechange", handleGesture)
				canvas.removeEventListener("gestureend", handleGesture)
			}
		}, [onWheel])

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
				className="absolute inset-0 z-0"
				onClick={handleClick}
				onDoubleClick={onDoubleClick}
				onMouseDown={handleMouseDown}
				onMouseLeave={onPanEnd}
				onMouseMove={(e) => {
					handleMouseMove(e)
					onPanMove(e)
				}}
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
			/>
		)
	},
)

GraphCanvas.displayName = "GraphCanvas"
