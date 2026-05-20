import type {
	DocumentNodeData,
	GraphEdge,
	GraphNode,
	GraphThemeColors,
	MemoryNodeData,
} from "../types"
import type { ViewportState } from "./viewport"
import { drawDocIcon, roundRect } from "./document-icons"

export interface RenderState {
	selectedNodeId: string | null
	hoveredNodeId: string | null
	highlightIds: Set<string>
	dimProgress: number
}

// Module-level reusable batch map – cleared each frame instead of reallocating
const edgeBatches = new Map<string, PreparedEdge[]>()
const RELATION_LOD_ZOOM = 0.5
const RELATION_LOD_MAX_BACKGROUND_EDGES = 260
const RELATION_LOD_DENSE_COUNT = 180

function nodeMatchesDocumentHighlights(
	node: GraphNode,
	highlightIds: Set<string>,
): boolean {
	if (highlightIds.size === 0) return false
	if (node.type === "document") return highlightIds.has(node.id)
	return highlightIds.has((node.data as MemoryNodeData).documentId)
}

/** Group items by their `color` property into batches for efficient canvas drawing */
function groupByColor<T extends { color: string }>(
	items: T[],
): Map<string, T[]> {
	return groupByComputedColor(items, (item) => item.color)
}

function groupByComputedColor<T>(
	items: T[],
	getColor: (item: T) => string,
): Map<string, T[]> {
	const map = new Map<string, T[]>()
	for (const item of items) {
		const color = getColor(item)
		let batch = map.get(color)
		if (!batch) {
			batch = []
			map.set(color, batch)
		}
		batch.push(item)
	}
	return map
}

// Cache for lightenColor results to avoid per-frame hex parsing
let _lightenCache: { input: string; amount: number; result: string } | null =
	null

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	nodes: GraphNode[],
	edges: GraphEdge[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
	nodeMap: Map<string, GraphNode>,
	colors: GraphThemeColors,
): void {
	ctx.clearRect(0, 0, width, height)
	drawEdges(ctx, edges, viewport, width, height, state, nodeMap, colors)
	drawNodes(ctx, nodes, viewport, width, height, state, colors)
}

function edgeStyle(
	edge: GraphEdge,
	colors: GraphThemeColors,
): { color: string; width: number; opacity: number } {
	if (edge.edgeType === "derives")
		return { color: colors.edgeDerives, width: 1.2, opacity: 0.4 }
	if (edge.edgeType === "updates")
		return { color: colors.edgeUpdates, width: 1.45, opacity: 0.48 }
	// "extends" and any unknown edge types
	return { color: colors.edgeExtends, width: 0.8, opacity: 0.16 }
}

export function getRelationEdgeStride(
	relationEdgeCount: number,
	zoom: number,
): number {
	if (
		zoom >= RELATION_LOD_ZOOM ||
		relationEdgeCount <= RELATION_LOD_MAX_BACKGROUND_EDGES
	) {
		return 1
	}
	return Math.ceil(relationEdgeCount / RELATION_LOD_MAX_BACKGROUND_EDGES)
}

export function shouldDrawRelationEdge(
	edgeId: string,
	edgeType: string,
	stride: number,
): boolean {
	if (edgeType === "derives" || stride <= 1) return true
	return hashString(edgeId) % stride === 0
}

function applyRelationLevelOfDetail(
	style: { color: string; width: number; opacity: number },
	edgeType: string,
	relationEdgeCount: number,
	zoom: number,
	hasFocus: boolean,
	hasActiveHover: boolean,
) {
	if (edgeType === "derives") return { style, glow: true }
	if (hasFocus || hasActiveHover) {
		const isUpdate = edgeType === "updates"
		const minOpacity = hasActiveHover ? 0.9 : 0.76
		const minWidth = hasActiveHover ? 2.35 : 1.8
		return {
			style: isUpdate
				? {
						...style,
						width: Math.max(style.width, minWidth),
						opacity: Math.max(style.opacity, minOpacity),
					}
				: style,
			glow: isUpdate,
		}
	}
	if (
		zoom >= RELATION_LOD_ZOOM ||
		relationEdgeCount <= RELATION_LOD_DENSE_COUNT
	) {
		return { style, glow: edgeType === "updates" }
	}

	const densityFactor = Math.min(
		1,
		RELATION_LOD_DENSE_COUNT / relationEdgeCount,
	)
	const zoomFactor = clampNumber(zoom / RELATION_LOD_ZOOM, 0.25, 1)
	const opacityFactor = clampNumber(densityFactor * zoomFactor, 0.06, 0.24)
	const widthFactor = clampNumber(zoomFactor * 0.65, 0.22, 0.7)

	return {
		style: {
			...style,
			width: Math.max(0.45, style.width * widthFactor),
			opacity: style.opacity * opacityFactor,
		},
		glow: false,
	}
}

function hashString(value: string): number {
	let hash = 0
	for (let i = 0; i < value.length; i++) {
		hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
	}
	return hash >>> 0
}

function clampNumber(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value
}

function batchKey(style: {
	color: string
	width: number
	opacity: number
}): string {
	return `${style.color}|${style.width}|${style.opacity}`
}

interface PreparedEdge {
	startX: number
	startY: number
	endX: number
	endY: number
	connected: boolean
	style: { color: string; width: number; opacity: number }
	edgeType: string
	arrowSize: number
	glow: boolean
}

function drawEdges(
	ctx: CanvasRenderingContext2D,
	edges: GraphEdge[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
	nodeMap: Map<string, GraphNode>,
	colors: GraphThemeColors,
): void {
	const margin = 100
	const hasDim = state.selectedNodeId !== null && state.dimProgress > 0
	const relationEdgeCount = edges.reduce(
		(count, edge) => count + (edge.edgeType === "derives" ? 0 : 1),
		0,
	)
	const relationStride = getRelationEdgeStride(relationEdgeCount, viewport.zoom)

	const prepared: PreparedEdge[] = []

	for (const edge of edges) {
		const edgeType = edge.edgeType ?? "derives"
		const srcId = typeof edge.source === "string" ? edge.source : edge.source.id
		const tgtId = typeof edge.target === "string" ? edge.target : edge.target.id
		const hoverConnected =
			state.hoveredNodeId != null &&
			(srcId === state.hoveredNodeId || tgtId === state.hoveredNodeId)
		const selectedConnected =
			state.selectedNodeId != null &&
			(srcId === state.selectedNodeId || tgtId === state.selectedNodeId)
		const activeConnected = hoverConnected || selectedConnected
		const shouldAlwaysDrawActiveUpdate =
			edgeType === "updates" && activeConnected
		if (
			!shouldAlwaysDrawActiveUpdate &&
			!hasDim &&
			!shouldDrawRelationEdge(edge.id, edgeType, relationStride)
		) {
			continue
		}

		const src =
			typeof edge.source === "string" ? nodeMap.get(edge.source) : edge.source
		const tgt =
			typeof edge.target === "string" ? nodeMap.get(edge.target) : edge.target
		if (!src || !tgt) continue

		if (edgeType === "derives") {
			const mem = src.type === "memory" ? src : tgt
			if (mem.size * viewport.zoom < 3) continue
		}

		const s = viewport.worldToScreen(src.x, src.y)
		const t = viewport.worldToScreen(tgt.x, tgt.y)

		if (
			(s.x < -margin && t.x < -margin) ||
			(s.x > width + margin && t.x > width + margin) ||
			(s.y < -margin && t.y < -margin) ||
			(s.y > height + margin && t.y > height + margin)
		)
			continue

		const dx = t.x - s.x
		const dy = t.y - s.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist < 1) continue

		const ux = dx / dist
		const uy = dy / dist
		const sr = src.size * viewport.zoom * 0.5
		const tr = tgt.size * viewport.zoom * 0.5

		let connected = true
		if (hasDim) {
			connected = selectedConnected
		}
		if (
			!shouldAlwaysDrawActiveUpdate &&
			hasDim &&
			!connected &&
			!shouldDrawRelationEdge(edge.id, edgeType, relationStride)
		) {
			continue
		}

		const { style, glow } = applyRelationLevelOfDetail(
			edgeStyle(edge, colors),
			edgeType,
			relationEdgeCount,
			viewport.zoom,
			hasDim && connected,
			edgeType === "updates" && hoverConnected,
		)

		prepared.push({
			startX: s.x + ux * sr,
			startY: s.y + uy * sr,
			endX: t.x - ux * tr,
			endY: t.y - uy * tr,
			connected,
			style,
			edgeType,
			arrowSize:
				edgeType === "updates"
					? Math.max(
							shouldAlwaysDrawActiveUpdate ? 8 : 6,
							(shouldAlwaysDrawActiveUpdate ? 11 : 8) * viewport.zoom,
						)
					: 0,
			glow,
		})
	}

	// Reuse module-level batch map
	edgeBatches.clear()
	for (const e of prepared) {
		const dimKey = hasDim ? (e.connected ? "|c" : "|d") : ""
		const key = `${e.edgeType}|${batchKey(e.style)}|${e.glow ? "g" : "f"}${dimKey}`
		let batch = edgeBatches.get(key)
		if (!batch) {
			batch = []
			edgeBatches.set(key, batch)
		}
		batch.push(e)
	}

	ctx.setLineDash([])
	for (const [key, batch] of edgeBatches) {
		const first = batch[0]
		if (!first) continue
		const isDimmed = key.endsWith("|d")
		const batchEdgeType = first.edgeType

		// Draw glow pass behind structural/revision edges. Cross-cluster
		// extends edges stay flat so dense graphs do not become a mesh.
		if (!isDimmed && first.glow && batchEdgeType !== "extends") {
			const glowAlpha =
				batchEdgeType === "updates"
					? first.style.opacity * 0.4
					: first.style.opacity * 0.3
			const glowWidth =
				batchEdgeType === "updates"
					? first.style.width + 2
					: first.style.width + 1.5
			ctx.save()
			ctx.globalAlpha = glowAlpha
			ctx.strokeStyle = first.style.color
			ctx.lineWidth = glowWidth
			ctx.beginPath()
			for (const e of batch) {
				ctx.moveTo(e.startX, e.startY)
				ctx.lineTo(e.endX, e.endY)
			}
			ctx.stroke()
			ctx.restore()
		}

		const baseAlpha = first.style.opacity
		ctx.globalAlpha = isDimmed
			? baseAlpha * (1 - state.dimProgress * 0.8)
			: baseAlpha
		ctx.strokeStyle = first.style.color
		ctx.lineWidth = first.style.width

		ctx.beginPath()
		for (const e of batch) {
			ctx.moveTo(e.startX, e.startY)
			ctx.lineTo(e.endX, e.endY)
		}
		ctx.stroke()

		// Arrowheads for updates edges
		if (batchEdgeType === "updates") {
			ctx.globalAlpha = isDimmed
				? first.style.opacity * 0.6 * (1 - state.dimProgress * 0.8)
				: first.style.opacity * 0.6
			ctx.fillStyle = first.style.color
			for (const e of batch) {
				drawArrowHead(ctx, e.startX, e.startY, e.endX, e.endY, e.arrowSize)
			}
		}
	}

	ctx.globalAlpha = 1
}

function drawArrowHead(
	ctx: CanvasRenderingContext2D,
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	size: number,
): void {
	const angle = Math.atan2(toY - fromY, toX - fromX)
	ctx.beginPath()
	ctx.moveTo(toX, toY)
	ctx.lineTo(
		toX - size * Math.cos(angle - Math.PI / 6),
		toY - size * Math.sin(angle - Math.PI / 6),
	)
	ctx.lineTo(
		toX - size * Math.cos(angle + Math.PI / 6),
		toY - size * Math.sin(angle + Math.PI / 6),
	)
	ctx.closePath()
	ctx.fill()
}

function drawNodes(
	ctx: CanvasRenderingContext2D,
	nodes: GraphNode[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
	colors: GraphThemeColors,
): void {
	const margin = 60
	const memDots: {
		x: number
		y: number
		r: number
		color: string
		fillColor: string
		haloColor: string
		dimmed: boolean
		updateChain: boolean
	}[] = []
	const docDots: { x: number; y: number; s: number }[] = []

	for (const node of nodes) {
		const screen = viewport.worldToScreen(node.x, node.y)
		const screenSize = node.size * viewport.zoom

		const cullSize = Math.max(screenSize, 2)
		if (
			screen.x + cullSize < -margin ||
			screen.x - cullSize > width + margin ||
			screen.y + cullSize < -margin ||
			screen.y - cullSize > height + margin
		)
			continue

		const isSelected = node.id === state.selectedNodeId
		const isHovered = node.id === state.hoveredNodeId
		const isHighlighted = nodeMatchesDocumentHighlights(
			node,
			state.highlightIds,
		)
		const highlightFocus = state.highlightIds.size > 0
		const fadeNonHighlights =
			highlightFocus && !isSelected && !isHovered && !isHighlighted

		if (screenSize < 8 && !isSelected && !isHovered && !isHighlighted) {
			if (node.type === "document") {
				docDots.push({ x: screen.x, y: screen.y, s: Math.max(3, screenSize) })
			} else {
				const md = node.data as MemoryNodeData
				memDots.push({
					x: screen.x,
					y: screen.y,
					r: Math.max(2, screenSize * 0.45),
					color: node.borderColor || colors.memStrokeDefault,
					fillColor: getMemoryNodeFillColor(node, colors, false),
					haloColor: node.clusterColor || node.borderColor || colors.glowColor,
					dimmed: md.isLatest === false,
					updateChain: isMemoryInUpdateChain(md),
				})
			}
			continue
		}

		let alpha = 1
		if (state.selectedNodeId && state.dimProgress > 0 && !isSelected) {
			alpha = 1 - state.dimProgress * 0.7
		}
		if (fadeNonHighlights) {
			alpha *= 0.35
		}
		ctx.globalAlpha = alpha

		if (node.type === "document") {
			drawDocumentNode(
				ctx,
				screen.x,
				screen.y,
				screenSize,
				node,
				isSelected,
				isHovered,
				isHighlighted,
				colors,
			)
		} else {
			drawMemoryNode(
				ctx,
				screen.x,
				screen.y,
				screenSize,
				node,
				isSelected,
				isHovered,
				isHighlighted,
				colors,
			)
		}

		if (isSelected || isHighlighted || isHovered) {
			drawGlow(
				ctx,
				screen.x,
				screen.y,
				screenSize,
				node.type,
				colors,
				isHovered && !isSelected,
			)
		}
	}

	const dimAlpha =
		state.selectedNodeId && state.dimProgress > 0
			? 1 - state.dimProgress * 0.7
			: 1
	const hlBatchMult = state.highlightIds.size > 0 ? 0.4 : 1

	if (docDots.length > 0) {
		ctx.fillStyle = colors.docFill
		ctx.strokeStyle = colors.docStroke
		ctx.lineWidth = 1
		ctx.globalAlpha = dimAlpha * hlBatchMult
		for (const d of docDots) {
			const h = d.s * 0.5
			ctx.fillRect(d.x - h, d.y - h, d.s, d.s)
			ctx.strokeRect(d.x - h, d.y - h, d.s, d.s)
		}
	}

	if (memDots.length > 0) {
		// Draw normal (latest) memory dots
		const normalDots = memDots.filter((d) => !d.dimmed)
		const dimmedDots = memDots.filter((d) => d.dimmed)

		if (normalDots.length > 0) {
			// Subtle glow behind memory dots for luminous effect
			ctx.globalAlpha = dimAlpha * hlBatchMult * 0.25
			for (const [color, batch] of groupByComputedColor(
				normalDots,
				(d) => d.haloColor,
			)) {
				ctx.fillStyle = color
				ctx.beginPath()
				for (const d of batch) {
					ctx.moveTo(d.x + d.r * 2.5, d.y)
					ctx.arc(d.x, d.y, d.r * 2.5, 0, Math.PI * 2)
				}
				ctx.fill()
			}

			// Filled dot
			ctx.globalAlpha = dimAlpha * hlBatchMult
			for (const [fillColor, batch] of groupByComputedColor(
				normalDots,
				(d) => d.fillColor,
			)) {
				ctx.fillStyle = fillColor
				ctx.beginPath()
				for (const d of batch) {
					ctx.moveTo(d.x + d.r, d.y)
					ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
				}
				ctx.fill()
			}

			// Colored border
			ctx.lineWidth = 1.5
			for (const [color, batch] of groupByColor(normalDots)) {
				ctx.strokeStyle = color
				ctx.beginPath()
				for (const d of batch) {
					ctx.moveTo(d.x + d.r, d.y)
					ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
				}
				ctx.stroke()
			}

			const updateDots = normalDots.filter((d) => d.updateChain)
			if (updateDots.length > 0) {
				ctx.globalAlpha = dimAlpha * hlBatchMult * 0.85
				ctx.strokeStyle = colors.edgeUpdates
				ctx.lineWidth = 1.2
				ctx.beginPath()
				for (const d of updateDots) {
					const r = d.r * 1.65
					ctx.moveTo(d.x + r, d.y)
					ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
				}
				ctx.stroke()
			}
		}

		// Draw dimmed (superseded) memory dots at reduced opacity
		if (dimmedDots.length > 0) {
			ctx.globalAlpha = dimAlpha * hlBatchMult * 0.5
			for (const [fillColor, batch] of groupByComputedColor(
				dimmedDots,
				(d) => d.fillColor,
			)) {
				ctx.fillStyle = fillColor
				ctx.beginPath()
				for (const d of batch) {
					ctx.moveTo(d.x + d.r, d.y)
					ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
				}
				ctx.fill()
			}

			ctx.lineWidth = 1
			for (const [color, batch] of groupByColor(dimmedDots)) {
				ctx.strokeStyle = color
				ctx.beginPath()
				for (const d of batch) {
					ctx.moveTo(d.x + d.r, d.y)
					ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
				}
				ctx.stroke()
			}

			const updateDots = dimmedDots.filter((d) => d.updateChain)
			if (updateDots.length > 0) {
				ctx.globalAlpha = dimAlpha * hlBatchMult * 0.55
				ctx.strokeStyle = colors.edgeUpdates
				ctx.lineWidth = 1
				ctx.beginPath()
				for (const d of updateDots) {
					const r = d.r * 1.65
					ctx.moveTo(d.x + r, d.y)
					ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
				}
				ctx.stroke()
			}
		}
	}

	ctx.globalAlpha = 1
}

function drawDocumentNode(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	size: number,
	node: GraphNode,
	isSelected: boolean,
	isHovered: boolean,
	isHighlighted: boolean,
	colors: GraphThemeColors,
): void {
	const half = size * 0.5
	const cornerR = 8 * (size / 50)
	const clusterColor = node.clusterColor ?? colors.docStroke

	// Drop shadow for selected/hovered nodes
	if (isSelected || isHovered) {
		ctx.save()
		ctx.shadowColor = isSelected ? colors.accent : clusterColor
		ctx.shadowBlur = isSelected ? 16 : 10
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 0
	}

	// Subtle gradient fill for document nodes
	const grad = ctx.createLinearGradient(
		sx - half,
		sy - half,
		sx + half,
		sy + half,
	)
	grad.addColorStop(0, mixHexColors(colors.docFill, clusterColor, 0.1))
	grad.addColorStop(1, mixHexColors(colors.docFill, clusterColor, 0.22))
	ctx.fillStyle = grad

	ctx.strokeStyle =
		isSelected || isHighlighted
			? colors.accent
			: isHovered
				? clusterColor
				: node.borderColor || clusterColor
	ctx.lineWidth = isSelected || isHighlighted ? 2.5 : isHovered ? 1.5 : 1
	roundRect(ctx, sx - half, sy - half, size, size, cornerR)
	ctx.fill()
	ctx.stroke()

	if (isSelected || isHovered) {
		ctx.restore()
	}

	const innerSize = size * 0.72
	const innerHalf = innerSize * 0.5
	const innerR = 6 * (size / 50)
	ctx.fillStyle = mixHexColors(colors.docInnerFill, clusterColor, 0.08)
	roundRect(ctx, sx - innerHalf, sy - innerHalf, innerSize, innerSize, innerR)
	ctx.fill()

	const iconSize = size * 0.35
	const docType =
		node.type === "document" ? (node.data as DocumentNodeData).type : "text"
	drawDocIcon(ctx, sx, sy, iconSize, docType || "text", clusterColor)
}

function drawMemoryNode(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	size: number,
	node: GraphNode,
	isSelected: boolean,
	isHovered: boolean,
	_isHighlighted: boolean,
	colors: GraphThemeColors,
): void {
	const memData = node.data as MemoryNodeData
	const isSuperseded = memData.isLatest === false
	const isForgotten = memData.isForgotten
	const isUpdateChain = isMemoryInUpdateChain(memData)
	const radius = size * 0.5

	// Dim superseded (non-latest) memory nodes with strikethrough effect
	if (isSuperseded && !isSelected && !isHovered) {
		const prevAlpha = ctx.globalAlpha
		ctx.globalAlpha = prevAlpha * 0.5
		ctx.fillStyle = getMemoryNodeFillColor(node, colors, false)
		drawHexagon(ctx, sx, sy, radius)
		ctx.fill()
		ctx.strokeStyle = node.borderColor || colors.memStrokeDefault
		ctx.lineWidth = 1
		ctx.setLineDash([3, 3])
		ctx.stroke()
		ctx.setLineDash([])

		// Draw diagonal strikethrough for superseded nodes (visual clarity)
		const strikeR = radius * 0.55
		ctx.beginPath()
		ctx.moveTo(sx - strikeR, sy - strikeR)
		ctx.lineTo(sx + strikeR, sy + strikeR)
		ctx.strokeStyle = colors.textMuted
		ctx.lineWidth = 1.5
		ctx.stroke()

		drawUpdateMarker(ctx, sx, sy, radius, colors, 0.85)

		ctx.globalAlpha = prevAlpha
		return
	}

	// Drop shadow for selected/hovered memory nodes
	if (isSelected || isHovered) {
		ctx.save()
		const shadowColor = isSelected ? colors.accent : colors.glowColor
		ctx.shadowColor = shadowColor
		ctx.shadowBlur = isSelected ? 18 : 12
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 0
	}

	ctx.fillStyle = getMemoryNodeFillColor(node, colors, isHovered)
	drawHexagon(ctx, sx, sy, radius)
	ctx.fill()

	const borderColor = node.borderColor || colors.memStrokeDefault
	ctx.strokeStyle = isSelected ? colors.accent : borderColor
	ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5
	ctx.stroke()

	if (isUpdateChain) {
		drawUpdateMarker(
			ctx,
			sx,
			sy,
			radius,
			colors,
			isSelected || isHovered ? 1 : 0.86,
		)
	}

	if (isSelected || isHovered) {
		ctx.restore()
	}

	// Draw X icon for forgotten nodes
	if (isForgotten && size > 14) {
		const iconR = radius * 0.3
		ctx.save()
		ctx.strokeStyle = colors.memBorderForgotten
		ctx.lineWidth = Math.max(1.5, size / 20)
		ctx.lineCap = "round"
		ctx.globalAlpha = 0.9
		ctx.beginPath()
		ctx.moveTo(sx - iconR, sy - iconR)
		ctx.lineTo(sx + iconR, sy + iconR)
		ctx.moveTo(sx + iconR, sy - iconR)
		ctx.lineTo(sx - iconR, sy + iconR)
		ctx.stroke()
		ctx.restore()
	}
}

function isMemoryInUpdateChain(memData: MemoryNodeData): boolean {
	if (memData.isLatest === false || memData.parentMemoryId) return true
	if (!memData.memoryRelations) return false
	return Object.values(memData.memoryRelations).some(
		(relation) => relation === "updates",
	)
}

function drawUpdateMarker(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	radius: number,
	colors: GraphThemeColors,
	alpha: number,
) {
	const markerR = Math.max(3.5, radius * 0.22)
	const cx = sx + radius * 0.48
	const cy = sy - radius * 0.48

	ctx.save()
	ctx.globalAlpha *= alpha
	ctx.fillStyle = colors.popoverBg
	ctx.strokeStyle = colors.edgeUpdates
	ctx.lineWidth = Math.max(1.2, radius * 0.08)
	ctx.beginPath()
	ctx.arc(cx, cy, markerR, 0, Math.PI * 2)
	ctx.fill()
	ctx.stroke()

	ctx.strokeStyle = colors.edgeUpdates
	ctx.lineCap = "round"
	ctx.lineJoin = "round"
	ctx.lineWidth = Math.max(1.2, radius * 0.07)
	ctx.beginPath()
	ctx.moveTo(cx - markerR * 0.45, cy)
	ctx.lineTo(cx + markerR * 0.12, cy)
	ctx.lineTo(cx - markerR * 0.06, cy - markerR * 0.2)
	ctx.moveTo(cx + markerR * 0.12, cy)
	ctx.lineTo(cx - markerR * 0.06, cy + markerR * 0.2)
	ctx.stroke()
	ctx.restore()
}

function getMemoryNodeFillColor(
	node: GraphNode,
	colors: GraphThemeColors,
	isHovered: boolean,
): string {
	const base = isHovered ? colors.memFillHover : colors.memFill
	if (!node.clusterColor) return base
	return mixHexColors(base, node.clusterColor, isHovered ? 0.42 : 0.32)
}

function drawGlow(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	size: number,
	nodeType: "document" | "memory",
	colors: GraphThemeColors,
	isHoverOnly = false,
): void {
	ctx.strokeStyle = colors.glowColor
	ctx.lineWidth = isHoverOnly ? 1.5 : 2
	ctx.setLineDash(isHoverOnly ? [4, 4] : [3, 3])
	ctx.globalAlpha = isHoverOnly ? 0.5 : 0.8

	const scale = isHoverOnly ? 1.1 : 1.15

	if (nodeType === "document") {
		const glowSize = size * scale
		const half = glowSize * 0.5
		const r = 8 * (glowSize / 50)
		roundRect(ctx, sx - half, sy - half, glowSize, glowSize, r)
	} else {
		drawHexagon(ctx, sx, sy, size * 0.5 * scale)
	}

	ctx.stroke()
	ctx.setLineDash([])
	ctx.globalAlpha = 1
}

function drawHexagon(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	radius: number,
): void {
	ctx.beginPath()
	for (let i = 0; i < 6; i++) {
		const angle = (Math.PI / 3) * i - Math.PI / 6
		const x = cx + radius * Math.cos(angle)
		const y = cy + radius * Math.sin(angle)
		i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
	}
	ctx.closePath()
}

/** Lighten a 6-digit hex color by a fraction (0-1). Cached to avoid per-frame parsing. */
export function lightenColor(hex: string, amount: number): string {
	if (
		_lightenCache &&
		_lightenCache.input === hex &&
		_lightenCache.amount === amount
	) {
		return _lightenCache.result
	}
	const h = hex.replace("#", "")
	// Only handle standard 6-digit hex; return input unchanged for other formats
	if (h.length !== 6) return hex
	const r = Math.min(
		255,
		Number.parseInt(h.substring(0, 2), 16) + Math.round(255 * amount),
	)
	const g = Math.min(
		255,
		Number.parseInt(h.substring(2, 4), 16) + Math.round(255 * amount),
	)
	const b = Math.min(
		255,
		Number.parseInt(h.substring(4, 6), 16) + Math.round(255 * amount),
	)
	const result = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
	_lightenCache = { input: hex, amount, result }
	return result
}

export function mixHexColors(
	base: string,
	overlay: string,
	amount: number,
): string {
	const baseRgb = parseHexColor(base)
	const overlayRgb = parseHexColor(overlay)
	if (!baseRgb || !overlayRgb) return base

	const t = clampNumber(amount, 0, 1)
	const r = Math.round(baseRgb.r + (overlayRgb.r - baseRgb.r) * t)
	const g = Math.round(baseRgb.g + (overlayRgb.g - baseRgb.g) * t)
	const b = Math.round(baseRgb.b + (overlayRgb.b - baseRgb.b) * t)
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function parseHexColor(hex: string) {
	const raw = hex.startsWith("#") ? hex.slice(1) : hex
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null
	return {
		r: Number.parseInt(raw.slice(0, 2), 16),
		g: Number.parseInt(raw.slice(2, 4), 16),
		b: Number.parseInt(raw.slice(4, 6), 16),
	}
}

function toHex(value: number): string {
	return value.toString(16).padStart(2, "0")
}
