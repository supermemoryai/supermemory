import type { ViewportState } from "./viewport"
import type { GraphNode, GraphEdge, DocumentNodeData } from "../types"

export interface RenderState {
	selectedNodeId: string | null
	hoveredNodeId: string | null
	highlightIds: Set<string>
	dimProgress: number
}

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	nodes: GraphNode[],
	edges: GraphEdge[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
	nodeMap: Map<string, GraphNode>,
): void {
	ctx.clearRect(0, 0, width, height)
	drawDocDocLines(ctx, nodes, viewport, width, height)
	drawEdges(ctx, edges, viewport, width, height, state, nodeMap)
	drawNodes(ctx, nodes, viewport, width, height, state)
}

// Connect each visible doc to its 2 nearest neighbors
function drawDocDocLines(
	ctx: CanvasRenderingContext2D,
	nodes: GraphNode[],
	viewport: ViewportState,
	width: number,
	height: number,
): void {
	const docs: { x: number; y: number }[] = []
	for (const n of nodes) {
		if (n.type !== "document") continue
		const s = viewport.worldToScreen(n.x, n.y)
		if (s.x > -100 && s.x < width + 100 && s.y > -100 && s.y < height + 100) {
			docs.push(s)
		}
	}
	if (docs.length < 2) return

	ctx.strokeStyle = "#8DA3F4"
	ctx.lineWidth = 1
	ctx.globalAlpha = 0.3
	ctx.setLineDash([4, 6])
	ctx.beginPath()

	// Deduplicate: only draw line when i < neighbor index
	for (let i = 0; i < docs.length; i++) {
		const d = docs[i]!
		let best1 = -1
		let best2 = -1
		let dist1 = Number.POSITIVE_INFINITY
		let dist2 = Number.POSITIVE_INFINITY

		for (let j = 0; j < docs.length; j++) {
			if (j === i) continue
			const dx = docs[j]!.x - d.x
			const dy = docs[j]!.y - d.y
			const dist = dx * dx + dy * dy
			if (dist < dist1) {
				best2 = best1
				dist2 = dist1
				best1 = j
				dist1 = dist
			} else if (dist < dist2) {
				best2 = j
				dist2 = dist
			}
		}

		if (best1 >= 0 && i < best1) {
			ctx.moveTo(d.x, d.y)
			ctx.lineTo(docs[best1]!.x, docs[best1]!.y)
		}
		if (best2 >= 0 && i < best2) {
			ctx.moveTo(d.x, d.y)
			ctx.lineTo(docs[best2]!.x, docs[best2]!.y)
		}
	}

	ctx.stroke()
	ctx.setLineDash([])
	ctx.globalAlpha = 1
}

// --- Edges ---

const EDGE_STYLE: Record<string, { color: string; width: number }> = {
	"doc-memory": { color: "#4A5568", width: 1.5 },
	version: { color: "#8B5CF6", width: 2 },
}

const SIM_STRONG = { color: "#00D4B8", width: 2 } as const
const SIM_MEDIUM = { color: "#6B8FBF", width: 1.5 } as const
const SIM_WEAK = { color: "#4A6A8A", width: 1 } as const

function edgeStyle(edge: GraphEdge): { color: string; width: number } {
	const preset = EDGE_STYLE[edge.edgeType]
	if (preset) return preset
	if (edge.similarity >= 0.9) return SIM_STRONG
	if (edge.similarity >= 0.8) return SIM_MEDIUM
	return SIM_WEAK
}

// Unique key for batching: "color|width"
function batchKey(style: { color: string; width: number }): string {
	return `${style.color}|${style.width}`
}

interface PreparedEdge {
	startX: number
	startY: number
	endX: number
	endY: number
	connected: boolean
	style: { color: string; width: number }
	isVersion: boolean
	arrowSize: number
}

function drawEdges(
	ctx: CanvasRenderingContext2D,
	edges: GraphEdge[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
	nodeMap: Map<string, GraphNode>,
): void {
	const margin = 100
	const hasDim = state.selectedNodeId !== null && state.dimProgress > 0

	// Prepare all visible edges
	const prepared: PreparedEdge[] = []

	for (const edge of edges) {
		const src =
			typeof edge.source === "string" ? nodeMap.get(edge.source) : edge.source
		const tgt =
			typeof edge.target === "string" ? nodeMap.get(edge.target) : edge.target
		if (!src || !tgt) continue

		// Skip doc-memory edges when memory dots are too small to see connections
		if (edge.edgeType === "doc-memory") {
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
			const srcId =
				typeof edge.source === "string" ? edge.source : edge.source.id
			const tgtId =
				typeof edge.target === "string" ? edge.target : edge.target.id
			connected =
				srcId === state.selectedNodeId || tgtId === state.selectedNodeId
		}

		prepared.push({
			startX: s.x + ux * sr,
			startY: s.y + uy * sr,
			endX: t.x - ux * tr,
			endY: t.y - uy * tr,
			connected,
			style: edgeStyle(edge),
			isVersion: edge.edgeType === "version",
			arrowSize:
				edge.edgeType === "version" ? Math.max(6, 8 * viewport.zoom) : 0,
		})
	}

	// Batch by style + dim state: group into "key|connected" and "key|dimmed"
	const batches = new Map<string, PreparedEdge[]>()
	for (const e of prepared) {
		const dimKey = hasDim ? (e.connected ? "|c" : "|d") : ""
		const key = batchKey(e.style) + dimKey
		let batch = batches.get(key)
		if (!batch) {
			batch = []
			batches.set(key, batch)
		}
		batch.push(e)
	}

	// Draw each batch in a single beginPath/stroke
	ctx.setLineDash([])
	for (const [key, batch] of batches) {
		const first = batch[0]!
		const isDimmed = key.endsWith("|d")

		ctx.globalAlpha = isDimmed ? 1 - state.dimProgress * 0.8 : 1
		ctx.strokeStyle = first.style.color
		ctx.lineWidth = first.style.width

		ctx.beginPath()
		for (const e of batch) {
			ctx.moveTo(e.startX, e.startY)
			ctx.lineTo(e.endX, e.endY)
		}
		ctx.stroke()

		// Arrow heads for version edges (fill calls — unavoidable per-arrow)
		const versionEdges = batch.filter((e) => e.isVersion)
		if (versionEdges.length > 0) {
			ctx.fillStyle = first.style.color
			for (const e of versionEdges) {
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

// --- Nodes ---

function drawNodes(
	ctx: CanvasRenderingContext2D,
	nodes: GraphNode[],
	viewport: ViewportState,
	width: number,
	height: number,
	state: RenderState,
): void {
	const margin = 60
	const memDots: { x: number; y: number; r: number; color: string }[] = []
	const docDots: { x: number; y: number; s: number }[] = []

	for (const node of nodes) {
		const screen = viewport.worldToScreen(node.x, node.y)
		const screenSize = node.size * viewport.zoom

		// Frustum cull (use at least 2px so tiny nodes aren't culled)
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
		const isHighlighted = state.highlightIds.has(node.id)

		// LOD: tiny nodes → batched dots (but selected/highlighted always get full detail)
		if (screenSize < 8 && !isSelected && !isHovered && !isHighlighted) {
			if (node.type === "document") {
				docDots.push({ x: screen.x, y: screen.y, s: Math.max(3, screenSize) })
			} else {
				memDots.push({
					x: screen.x,
					y: screen.y,
					r: Math.max(2, screenSize * 0.45),
					color: node.borderColor || "#3B73B8",
				})
			}
			continue
		}

		let alpha = 1
		if (state.selectedNodeId && state.dimProgress > 0 && !isSelected) {
			alpha = 1 - state.dimProgress * 0.7
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
			)
		}

		if (isSelected || isHighlighted) {
			drawGlow(ctx, screen.x, screen.y, screenSize, node.type)
		}
	}

	const dimAlpha =
		state.selectedNodeId && state.dimProgress > 0
			? 1 - state.dimProgress * 0.7
			: 1

	// Batch: document dots as filled squares
	if (docDots.length > 0) {
		ctx.fillStyle = "#1B1F24"
		ctx.strokeStyle = "#2A2F36"
		ctx.lineWidth = 1
		ctx.globalAlpha = dimAlpha
		for (const d of docDots) {
			const h = d.s * 0.5
			ctx.fillRect(d.x - h, d.y - h, d.s, d.s)
			ctx.strokeRect(d.x - h, d.y - h, d.s, d.s)
		}
	}

	// Batch: memory dots — dark fill, then colored border strokes
	if (memDots.length > 0) {
		ctx.globalAlpha = dimAlpha

		// Pass 1: all dark fills in one batch
		ctx.fillStyle = "#0D2034"
		ctx.beginPath()
		for (const d of memDots) {
			ctx.moveTo(d.x + d.r, d.y)
			ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
		}
		ctx.fill()

		// Pass 2: colored strokes grouped by border color
		ctx.lineWidth = 1.5
		const byColor = new Map<string, typeof memDots>()
		for (const d of memDots) {
			let batch = byColor.get(d.color)
			if (!batch) {
				batch = []
				byColor.set(d.color, batch)
			}
			batch.push(d)
		}
		for (const [color, batch] of byColor) {
			ctx.strokeStyle = color
			ctx.beginPath()
			for (const d of batch) {
				ctx.moveTo(d.x + d.r, d.y)
				ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
			}
			ctx.stroke()
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
): void {
	const half = size * 0.5
	const cornerR = 8 * (size / 50)

	// Outer rect
	ctx.fillStyle = "#1B1F24"
	ctx.strokeStyle =
		isSelected || isHighlighted ? "#3B73B8" : isHovered ? "#3B73B8" : "#2A2F36"
	ctx.lineWidth = isSelected || isHighlighted ? 2 : 1
	roundRect(ctx, sx - half, sy - half, size, size, cornerR)
	ctx.fill()
	ctx.stroke()

	// Inner rect
	const innerSize = size * 0.72
	const innerHalf = innerSize * 0.5
	const innerR = 6 * (size / 50)
	ctx.fillStyle = "#13161A"
	roundRect(ctx, sx - innerHalf, sy - innerHalf, innerSize, innerSize, innerR)
	ctx.fill()

	// Icon
	const iconSize = size * 0.35
	const docType =
		node.type === "document" ? (node.data as DocumentNodeData).type : "text"
	drawDocIcon(ctx, sx, sy, iconSize, docType || "text")
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
): void {
	const radius = size * 0.5

	// Fill
	ctx.fillStyle = isHovered ? "#112840" : "#0D2034"
	drawHexagon(ctx, sx, sy, radius)
	ctx.fill()

	// Stroke with time-based border color
	const borderColor = node.borderColor || "#3B73B8"
	ctx.strokeStyle = isSelected ? "#3B73B8" : borderColor
	ctx.lineWidth = isHovered ? 2 : 1.5
	ctx.stroke()
}

function drawGlow(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	size: number,
	nodeType: "document" | "memory",
): void {
	ctx.strokeStyle = "#3B73B8"
	ctx.lineWidth = 2
	ctx.setLineDash([3, 3])
	ctx.globalAlpha = 0.8

	if (nodeType === "document") {
		const glowSize = size * 1.15
		const half = glowSize * 0.5
		const r = 8 * (glowSize / 50)
		roundRect(ctx, sx - half, sy - half, glowSize, glowSize, r)
	} else {
		drawHexagon(ctx, sx, sy, size * 0.5 * 1.15)
	}

	ctx.stroke()
	ctx.setLineDash([])
	ctx.globalAlpha = 1
}

// --- Shapes ---

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

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.lineTo(x + w - r, y)
	ctx.arcTo(x + w, y, x + w, y + r, r)
	ctx.lineTo(x + w, y + h - r)
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
	ctx.lineTo(x + r, y + h)
	ctx.arcTo(x, y + h, x, y + h - r, r)
	ctx.lineTo(x, y + r)
	ctx.arcTo(x, y, x + r, y, r)
	ctx.closePath()
}

// --- Document icons ---

const ICON_COLOR = "#3B73B8"

function drawDocIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	type: string,
): void {
	ctx.save()
	ctx.fillStyle = ICON_COLOR
	ctx.strokeStyle = ICON_COLOR
	ctx.lineWidth = Math.max(1, size / 12)
	ctx.lineCap = "round"
	ctx.lineJoin = "round"

	switch (type) {
		case "webpage":
		case "url":
			drawGlobeIcon(ctx, x, y, size)
			break
		case "pdf":
			drawTextLabel(ctx, x, y, size, "PDF", 0.35)
			break
		case "md":
		case "markdown":
			drawTextLabel(ctx, x, y, size, "MD", 0.3)
			break
		case "doc":
		case "docx":
			drawTextLabel(ctx, x, y, size, "DOC", 0.28)
			break
		case "csv":
			drawGridIcon(ctx, x, y, size)
			break
		case "json":
			drawBracesIcon(ctx, x, y, size)
			break
		case "notion":
		case "notion_doc":
			drawTextLabel(ctx, x, y, size, "N", 0.4)
			break
		case "google_doc":
		case "google_sheet":
		case "google_slide":
			drawTextLabel(ctx, x, y, size, "G", 0.4)
			break
		default:
			drawDocOutline(ctx, x, y, size)
			break
	}

	ctx.restore()
}

function drawTextLabel(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	text: string,
	fontRatio: number,
): void {
	ctx.font = `bold ${size * fontRatio}px sans-serif`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText(text, x, y)
}

function drawGlobeIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const r = size * 0.4
	ctx.beginPath()
	ctx.arc(x, y, r, 0, Math.PI * 2)
	ctx.stroke()
	ctx.beginPath()
	ctx.ellipse(x, y, r * 0.4, r, 0, 0, Math.PI * 2)
	ctx.stroke()
	ctx.beginPath()
	ctx.moveTo(x - r, y)
	ctx.lineTo(x + r, y)
	ctx.stroke()
}

function drawGridIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.7
	ctx.strokeRect(x - w / 2, y - h / 2, w, h)
	ctx.beginPath()
	ctx.moveTo(x, y - h / 2)
	ctx.lineTo(x, y + h / 2)
	ctx.moveTo(x - w / 2, y)
	ctx.lineTo(x + w / 2, y)
	ctx.stroke()
}

function drawBracesIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.6
	const h = size * 0.8
	ctx.beginPath()
	ctx.moveTo(x - w / 4, y - h / 2)
	ctx.quadraticCurveTo(x - w / 2, y - h / 3, x - w / 2, y)
	ctx.quadraticCurveTo(x - w / 2, y + h / 3, x - w / 4, y + h / 2)
	ctx.stroke()
	ctx.beginPath()
	ctx.moveTo(x + w / 4, y - h / 2)
	ctx.quadraticCurveTo(x + w / 2, y - h / 3, x + w / 2, y)
	ctx.quadraticCurveTo(x + w / 2, y + h / 3, x + w / 4, y + h / 2)
	ctx.stroke()
}

function drawDocOutline(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
): void {
	const w = size * 0.7
	const h = size * 0.85
	const fold = size * 0.2
	ctx.beginPath()
	ctx.moveTo(x - w / 2, y - h / 2)
	ctx.lineTo(x + w / 2 - fold, y - h / 2)
	ctx.lineTo(x + w / 2, y - h / 2 + fold)
	ctx.lineTo(x + w / 2, y + h / 2)
	ctx.lineTo(x - w / 2, y + h / 2)
	ctx.closePath()
	ctx.stroke()
	const sp = size * 0.15
	const lw = size * 0.4
	ctx.beginPath()
	ctx.moveTo(x - lw / 2, y - sp)
	ctx.lineTo(x + lw / 2, y - sp)
	ctx.moveTo(x - lw / 2, y)
	ctx.lineTo(x + lw / 2, y)
	ctx.moveTo(x - lw / 2, y + sp)
	ctx.lineTo(x + lw / 2, y + sp)
	ctx.stroke()
}
