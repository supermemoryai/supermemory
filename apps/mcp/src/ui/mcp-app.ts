/**
 * Memory Graph MCP App - Interactive force-directed graph visualization
 */
import {
	App,
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
	type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import ForceGraph, { type LinkObject, type NodeObject } from "force-graph"
import {
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
} from "d3-force-3d"
import "./global.css"
import "./mcp-app.css"

// =============================================================================
// Types
// =============================================================================
interface GraphApiMemory {
	id: string
	memory: string
	isStatic: boolean
	spaceId: string
	isLatest: boolean
	isForgotten: boolean
	forgetAfter: string | null
	forgetReason: string | null
	version: number
	parentMemoryId: string | null
	rootMemoryId: string | null
	createdAt: string
	updatedAt: string
	relation?: "updates" | "extends" | "derives" | null
	memoryRelations?: Record<string, "updates" | "extends" | "derives"> | null
}

interface GraphApiDocument {
	id: string
	title: string | null
	summary: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: GraphApiMemory[]
}

interface ToolResultData {
	containerTag?: string
	documents: GraphApiDocument[]
	totalCount: number
}

interface MemoryNode extends NodeObject {
	id: string
	nodeType: "memory"
	memory: string
	documentId: string
	isLatest: boolean
	isForgotten: boolean
	forgetAfter: string | null
	version: number
	parentMemoryId: string | null
	createdAt: string
	borderColor: string
}

interface DocumentNode extends NodeObject {
	id: string
	nodeType: "document"
	title: string
	summary: string | null
	docType: string
	createdAt: string
	memoryCount: number
}

type GraphNode = MemoryNode | DocumentNode

interface GraphLink extends LinkObject {
	source: string | GraphNode
	target: string | GraphNode
	edgeType: "derives" | "updates" | "extends"
}

// =============================================================================
// Constants
// =============================================================================
const MEMORY_BORDER = {
	forgotten: "#EF4444",
	expiring: "#F59E0B",
	recent: "#10B981",
	default: "#3B73B8",
}

const EDGE_COLORS = {
	dark: { derives: "#FBBF24", updates: "#A78BFA", extends: "#38BDF8" },
	light: { derives: "#FBBF24", updates: "#A78BFA", extends: "#38BDF8" },
}

const EDGE_OPACITY: Record<string, number> = {
	derives: 0.4,
	updates: 0.7,
	extends: 0.55,
}
const EDGE_WIDTH: Record<string, number> = {
	derives: 1.2,
	updates: 2,
	extends: 1.5,
}

// Node sizes
const MEM_RADIUS = 12
const DOC_SIZE = 28

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const CLUSTER_SPREAD = 120

// =============================================================================
// State
// =============================================================================
let isDark = true
let selectedNode: GraphNode | null = null
let hoveredNode: GraphNode | null = null

// =============================================================================
// DOM References (elements are guaranteed to exist in mcp-app.html)
// =============================================================================
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const container = document.getElementById("graph")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const popup = document.getElementById("popup")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const popupType = document.getElementById("popup-type")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const popupTitle = document.getElementById("popup-title")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const popupContent = document.getElementById("popup-content")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const popupMeta = document.getElementById("popup-meta")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const loadingEl = document.getElementById("loading")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const statsEl = document.getElementById("stats")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const zoomInBtn = document.getElementById("zoom-in")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const zoomOutBtn = document.getElementById("zoom-out")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const fitBtn = document.getElementById("fit-btn")!

// =============================================================================
// Helpers
// =============================================================================
function getMemoryBorderColor(mem: GraphApiMemory): string {
	if (mem.isForgotten) return MEMORY_BORDER.forgotten
	if (mem.forgetAfter) {
		const msLeft = new Date(mem.forgetAfter).getTime() - Date.now()
		if (msLeft < SEVEN_DAYS_MS) return MEMORY_BORDER.expiring
	}
	const age = Date.now() - new Date(mem.createdAt).getTime()
	if (age < ONE_DAY_MS) return MEMORY_BORDER.recent
	return MEMORY_BORDER.default
}

/** Simple hash to get deterministic initial positions from doc ID */
function hashCode(s: string): number {
	let h = 0
	for (let i = 0; i < s.length; i++) {
		h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
	}
	return h
}

function initialPosition(id: string, spread: number): { x: number; y: number } {
	const h = hashCode(id)
	const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2
	const radius = (((h >>> 16) & 0xffff) / 0xffff) * spread
	return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

function transformData(data: ToolResultData): {
	nodes: GraphNode[]
	links: GraphLink[]
} {
	const nodes: GraphNode[] = []
	const links: GraphLink[] = []
	const SPREAD = 50

	// Pre-populate all node IDs so edge targets are always resolvable
	// regardless of iteration order.
	const nodeIds = new Set<string>()
	for (const doc of data.documents) {
		nodeIds.add(doc.id)
		for (const mem of doc.memoryEntries) nodeIds.add(mem.id)
	}

	for (const doc of data.documents) {
		const pos = initialPosition(doc.id, SPREAD)
		nodes.push({
			id: doc.id,
			nodeType: "document",
			title: doc.title || "Untitled",
			summary: doc.summary,
			docType: doc.type,
			createdAt: doc.createdAt,
			memoryCount: doc.memoryEntries.length,
			x: pos.x,
			y: pos.y,
		} as DocumentNode)

		const memCount = doc.memoryEntries.length
		for (let i = 0; i < memCount; i++) {
			// biome-ignore lint/style/noNonNullAssertion: index is always valid within loop bounds
			const mem = doc.memoryEntries[i]!
			const angle = (i / memCount) * 2 * Math.PI

			nodes.push({
				id: mem.id,
				nodeType: "memory",
				memory: mem.memory,
				documentId: doc.id,
				isLatest: mem.isLatest,
				isForgotten: mem.isForgotten,
				forgetAfter: mem.forgetAfter,
				version: mem.version,
				parentMemoryId: mem.parentMemoryId,
				createdAt: mem.createdAt,
				borderColor: getMemoryBorderColor(mem),
				x: pos.x + Math.cos(angle) * CLUSTER_SPREAD,
				y: pos.y + Math.sin(angle) * CLUSTER_SPREAD,
			} as MemoryNode)

			// Derives link (doc -> memory)
			links.push({ source: doc.id, target: mem.id, edgeType: "derives" })

			// Memory-to-memory relation edges from backend data.
			// Uses memoryRelations as primary source, falls back to parentMemoryId.
			// Keep in sync with packages/memory-graph/src/hooks/use-graph-data.ts
			let relations: Record<string, string> = {}
			if (
				// Defensive: data comes from structuredContent cast, may be unexpected type
				mem.memoryRelations &&
				typeof mem.memoryRelations === "object" &&
				Object.keys(mem.memoryRelations).length > 0
			) {
				relations = mem.memoryRelations
			} else if (mem.parentMemoryId) {
				relations = { [mem.parentMemoryId]: "updates" }
			}

			for (const [targetId, relationType] of Object.entries(relations)) {
				if (!nodeIds.has(targetId)) continue
				const edgeType =
					relationType === "updates" ||
					relationType === "extends" ||
					relationType === "derives"
						? relationType
						: "updates"
				links.push({ source: targetId, target: mem.id, edgeType })
			}
		}
	}

	return { nodes, links }
}

// =============================================================================
// Drawing
// =============================================================================
function hexPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
) {
	ctx.beginPath()
	for (let i = 0; i < 6; i++) {
		const angle = (Math.PI / 3) * i - Math.PI / 6
		ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle))
	}
	ctx.closePath()
}

function lightenColor(hex: string, amount: number): string {
	const h = hex.replace("#", "")
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
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function drawMemoryNode(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	screenSize: number,
	borderColor: string,
	isHovered: boolean,
	isSelected: boolean,
	isForgotten: boolean,
	isLatest: boolean,
) {
	const accent = isDark ? "#3B73B8" : "#2563eb"
	const memFill = isDark ? "#0D2034" : "#E8F0FE"

	// Dot mode at very small screen sizes
	if (screenSize < 8) {
		const r = Math.max(2, screenSize * 0.45)
		// Glow halo
		ctx.save()
		ctx.globalAlpha = 0.25
		ctx.beginPath()
		ctx.arc(x, y, r * 2.5, 0, Math.PI * 2)
		ctx.fillStyle = borderColor
		ctx.fill()
		ctx.restore()
		// Dot
		ctx.beginPath()
		ctx.arc(x, y, r, 0, Math.PI * 2)
		ctx.fillStyle = memFill
		ctx.fill()
		ctx.strokeStyle = borderColor
		ctx.lineWidth = 1.5
		ctx.stroke()
		return
	}

	// Superseded (non-latest) memory: dimmed with dashed border
	if (!isLatest && !isSelected && !isHovered) {
		ctx.save()
		ctx.globalAlpha = 0.5
		hexPath(ctx, x, y, radius)
		ctx.fillStyle = memFill
		ctx.fill()
		ctx.strokeStyle = borderColor
		ctx.lineWidth = 1
		ctx.setLineDash([3, 3])
		ctx.stroke()
		ctx.setLineDash([])
		// Strikethrough
		const sr = radius * 0.55
		ctx.beginPath()
		ctx.moveTo(x - sr, y - sr)
		ctx.lineTo(x + sr, y + sr)
		ctx.strokeStyle = isDark ? "#94a3b8" : "#64748b"
		ctx.lineWidth = 1.5
		ctx.stroke()
		ctx.restore()
		return
	}

	// Shadow for hover/selected
	if (isSelected || isHovered) {
		ctx.save()
		ctx.shadowColor = isSelected ? accent : isDark ? "#3B73B8" : "#2563eb"
		ctx.shadowBlur = isSelected ? 18 : 12
		hexPath(ctx, x, y, radius)
		ctx.fillStyle = memFill
		ctx.fill()
		ctx.restore()

		// Dashed glow ring
		ctx.save()
		const scale = isSelected ? 1.15 : 1.1
		hexPath(ctx, x, y, radius * scale)
		ctx.strokeStyle = accent
		ctx.lineWidth = isSelected ? 2 : 1.5
		ctx.globalAlpha = isSelected ? 0.8 : 0.5
		ctx.setLineDash(isSelected ? [3, 3] : [4, 4])
		ctx.stroke()
		ctx.setLineDash([])
		ctx.restore()
	}

	// Main hexagon
	hexPath(ctx, x, y, radius)
	ctx.fillStyle = isHovered ? (isDark ? "#112840" : "#dbeafe") : memFill
	ctx.fill()
	ctx.strokeStyle = isSelected ? accent : borderColor
	ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5
	ctx.stroke()

	// Forgotten X icon
	if (isForgotten && radius > 7) {
		const iconR = radius * 0.3
		ctx.save()
		ctx.lineCap = "round"
		ctx.beginPath()
		ctx.moveTo(x - iconR, y - iconR)
		ctx.lineTo(x + iconR, y + iconR)
		ctx.moveTo(x + iconR, y - iconR)
		ctx.lineTo(x - iconR, y + iconR)
		ctx.strokeStyle = MEMORY_BORDER.forgotten
		ctx.lineWidth = Math.max(1.5, radius / 10)
		ctx.stroke()
		ctx.restore()
	}
}

function drawDocumentNode(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	screenSize: number,
	isHovered: boolean,
	isSelected: boolean,
) {
	const accent = isDark ? "#3B73B8" : "#2563eb"
	const docFill = isDark ? "#1B1F24" : "#F1F5F9"
	const docStroke = isDark ? "#2A2F36" : "#CBD5E1"
	const half = size / 2
	const cornerR = Math.round(8 * (size / 50))

	// Dot mode at very small screen sizes
	if (screenSize < 8) {
		const s = Math.max(3, screenSize)
		ctx.fillStyle = docFill
		ctx.fillRect(x - s / 2, y - s / 2, s, s)
		return
	}

	// Shadow for hover/selected
	if (isSelected || isHovered) {
		ctx.save()
		ctx.shadowColor = accent
		ctx.shadowBlur = isSelected ? 16 : 10
		ctx.beginPath()
		ctx.roundRect(x - half, y - half, size, size, cornerR)
		ctx.fillStyle = docFill
		ctx.fill()
		ctx.restore()

		// Dashed glow ring
		ctx.save()
		const scale = isSelected ? 1.15 : 1.1
		const gh = (size * scale) / 2
		ctx.beginPath()
		ctx.roundRect(
			x - gh,
			y - gh,
			size * scale,
			size * scale,
			Math.round(8 * ((size * scale) / 50)),
		)
		ctx.strokeStyle = accent
		ctx.lineWidth = isSelected ? 2 : 1.5
		ctx.globalAlpha = isSelected ? 0.8 : 0.5
		ctx.setLineDash(isSelected ? [3, 3] : [4, 4])
		ctx.stroke()
		ctx.setLineDash([])
		ctx.restore()
	}

	// Outer rect with gradient
	ctx.beginPath()
	ctx.roundRect(x - half, y - half, size, size, cornerR)
	const gradient = ctx.createLinearGradient(
		x - half,
		y - half,
		x + half,
		y + half,
	)
	gradient.addColorStop(0, docFill)
	gradient.addColorStop(1, lightenColor(docFill, 0.08))
	ctx.fillStyle = gradient
	ctx.fill()
	ctx.strokeStyle = isSelected || isHovered ? accent : docStroke
	ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.5 : 1
	ctx.stroke()

	// Inner area
	const innerSize = size * 0.72
	const innerHalf = innerSize / 2
	const innerCornerR = Math.round(6 * (size / 50))
	ctx.beginPath()
	ctx.roundRect(
		x - innerHalf,
		y - innerHalf,
		innerSize,
		innerSize,
		innerCornerR,
	)
	ctx.fillStyle = isDark ? "#13161A" : "#E2E8F0"
	ctx.fill()

	// Document icon (page with fold)
	const iconS = size * 0.35
	const iconColor = isDark ? "#3B73B8" : "#2563eb"
	const w = iconS * 0.7
	const h = iconS * 0.85
	const fold = iconS * 0.2
	const ix = x - w / 2
	const iy = y - h / 2
	ctx.save()
	ctx.strokeStyle = iconColor
	ctx.lineWidth = Math.max(1, iconS / 12)
	ctx.lineCap = "round"
	ctx.lineJoin = "round"
	ctx.beginPath()
	ctx.moveTo(ix, iy)
	ctx.lineTo(ix + w - fold, iy)
	ctx.lineTo(ix + w, iy + fold)
	ctx.lineTo(ix + w, iy + h)
	ctx.lineTo(ix, iy + h)
	ctx.closePath()
	ctx.stroke()
	ctx.beginPath()
	ctx.moveTo(ix + w - fold, iy)
	ctx.lineTo(ix + w - fold, iy + fold)
	ctx.lineTo(ix + w, iy + fold)
	ctx.stroke()
	ctx.restore()
}

// =============================================================================
// Force Graph Setup
// =============================================================================
const graph = new ForceGraph<GraphNode, GraphLink>(container)
	.nodeId("id")
	.nodeCanvasObject(
		(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
			// biome-ignore lint/style/noNonNullAssertion: force-graph guarantees x/y during render
			const x = node.x!
			// biome-ignore lint/style/noNonNullAssertion: force-graph guarantees x/y during render
			const y = node.y!
			const isHovered = hoveredNode?.id === node.id
			const isSelected = selectedNode?.id === node.id

			// Dim non-connected nodes when something is selected
			if (selectedNode && !isSelected && !isHovered) {
				ctx.globalAlpha = 0.3
			}

			if (node.nodeType === "memory") {
				const mem = node as MemoryNode
				const screenSize = MEM_RADIUS * 2 * globalScale
				drawMemoryNode(
					ctx,
					x,
					y,
					MEM_RADIUS,
					screenSize,
					mem.borderColor,
					isHovered,
					isSelected,
					mem.isForgotten,
					mem.isLatest,
				)
			} else {
				const screenSize = DOC_SIZE * globalScale
				drawDocumentNode(ctx, x, y, DOC_SIZE, screenSize, isHovered, isSelected)
			}

			ctx.globalAlpha = 1
		},
	)
	.nodeCanvasObjectMode(() => "replace")
	.nodePointerAreaPaint(
		(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
			ctx.fillStyle = color
			ctx.beginPath()
			ctx.arc(
				// biome-ignore lint/style/noNonNullAssertion: force-graph guarantees x/y during render
				node.x!,
				// biome-ignore lint/style/noNonNullAssertion: force-graph guarantees x/y during render
				node.y!,
				node.nodeType === "document" ? DOC_SIZE / 2 + 1 : MEM_RADIUS + 1,
				0,
				Math.PI * 2,
			)
			ctx.fill()
		},
	)
	.linkCanvasObject(
		(link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
			const source = link.source as GraphNode
			const target = link.target as GraphNode
			if (!source.x || !source.y || !target.x || !target.y) return

			const { edgeType } = link
			const palette = isDark ? EDGE_COLORS.dark : EDGE_COLORS.light
			const color = palette[edgeType] || palette.derives
			const width = EDGE_WIDTH[edgeType] || 1.2
			const opacity = EDGE_OPACITY[edgeType] || 0.4
			const isDimmed = !!selectedNode

			// Culling: extends edges at very low zoom
			if (edgeType === "extends" && globalScale < 0.08) return

			const dimFactor = isDimmed ? 0.3 : 1
			const isExtends = edgeType === "extends"

			// Glow pass (behind main edge)
			if (!isDimmed) {
				ctx.save()
				ctx.globalAlpha = edgeType === "updates" ? opacity * 0.4 : opacity * 0.3
				ctx.strokeStyle = color
				ctx.lineWidth = edgeType === "updates" ? width + 2 : width + 1.5
				if (isExtends) ctx.setLineDash([6, 4])
				ctx.beginPath()
				ctx.moveTo(source.x, source.y)
				ctx.lineTo(target.x, target.y)
				ctx.stroke()
				if (isExtends) ctx.setLineDash([])
				ctx.restore()
			}

			// Main edge
			ctx.save()
			ctx.globalAlpha = opacity * dimFactor
			ctx.strokeStyle = color
			ctx.lineWidth = width
			if (isExtends) ctx.setLineDash([6, 4])
			ctx.beginPath()
			ctx.moveTo(source.x, source.y)
			ctx.lineTo(target.x, target.y)
			ctx.stroke()
			if (isExtends) ctx.setLineDash([])
			ctx.restore()

			// Arrowhead for updates edges
			if (edgeType === "updates") {
				const arrowSize = Math.max(6, 8 * globalScale)
				const angle = Math.atan2(target.y - source.y, target.x - source.x)
				ctx.save()
				ctx.globalAlpha = opacity * 0.6 * dimFactor
				ctx.fillStyle = color
				ctx.beginPath()
				ctx.moveTo(target.x, target.y)
				ctx.lineTo(
					target.x - arrowSize * Math.cos(angle - Math.PI / 6),
					target.y - arrowSize * Math.sin(angle - Math.PI / 6),
				)
				ctx.lineTo(
					target.x - arrowSize * Math.cos(angle + Math.PI / 6),
					target.y - arrowSize * Math.sin(angle + Math.PI / 6),
				)
				ctx.closePath()
				ctx.fill()
				ctx.restore()
			}
		},
	)
	.linkCanvasObjectMode(() => "replace")
	.onNodeHover((node: GraphNode | null) => {
		hoveredNode = node
		container.style.cursor = node ? "pointer" : "default"
	})
	.onNodeClick(handleNodeClick)
	.onBackgroundClick(() => hidePopup())
	.d3Force(
		"charge",
		forceManyBody().strength((node: GraphNode) =>
			node.nodeType === "document" ? -15 : -200,
		),
	)
	.d3Force(
		"link",
		forceLink()
			.distance((l: GraphLink) => (l.edgeType === "derives" ? 40 : 80))
			.strength((l: GraphLink) => {
				if (l.edgeType === "derives") return 0.8
				if (l.edgeType === "updates") return 1.0
				return 0.15 // extends
			}),
	)
	.d3Force("collide", forceCollide(18))
	.d3Force("center", forceCenter())
	.d3Force("bound", forceRadial(60).strength(0.3))
	.d3VelocityDecay(0.4)
	.warmupTicks(50)
	.cooldownTime(3000)

// =============================================================================
// Resize
// =============================================================================
function handleResize() {
	const { width, height } = container.getBoundingClientRect()
	graph.width(width).height(height)
}
window.addEventListener("resize", handleResize)
handleResize()

// =============================================================================
// Popup
// =============================================================================
function handleNodeClick(node: GraphNode, event: MouseEvent) {
	if (selectedNode?.id === node.id) {
		hidePopup()
		return
	}
	selectedNode = node
	showPopup(node, event.clientX, event.clientY)
}

function showPopup(node: GraphNode, x: number, y: number) {
	if (node.nodeType === "document") {
		const doc = node as DocumentNode
		popupType.textContent = "Document"
		popupType.className = "document"
		popupTitle.textContent = doc.title
		popupContent.textContent = doc.summary || "No summary available"
		popupMeta.textContent = `${doc.memoryCount} memories \u00b7 ${doc.docType} \u00b7 ${new Date(doc.createdAt).toLocaleDateString()}`
	} else {
		const mem = node as MemoryNode
		const typeLabel = mem.isForgotten
			? "Forgotten"
			: mem.isLatest
				? "Latest"
				: `v${mem.version}`
		popupType.textContent = typeLabel
		popupType.className = `memory${mem.isForgotten ? " forgotten" : mem.isLatest ? " latest" : ""}`
		popupTitle.textContent =
			mem.memory.length > 120 ? `${mem.memory.slice(0, 120)}...` : mem.memory
		popupContent.textContent = mem.memory.length > 120 ? mem.memory : ""

		const statusParts: string[] = [`Version ${mem.version}`]
		if (mem.isForgotten) statusParts.push("Forgotten")
		else if (mem.forgetAfter)
			statusParts.push(
				`Expires ${new Date(mem.forgetAfter).toLocaleDateString()}`,
			)
		statusParts.push(new Date(mem.createdAt).toLocaleDateString())
		popupMeta.textContent = statusParts.join(" \u00b7 ")
	}

	popup.style.display = "block"

	// Smart quadrant positioning (right > left > below > above)
	const rect = popup.getBoundingClientRect()
	const gap = 24
	const vw = window.innerWidth
	const vh = window.innerHeight
	let left: number
	let top: number

	// Try right
	if (x + gap + rect.width < vw - 8) {
		left = x + gap
	} else if (x - gap - rect.width > 8) {
		// Try left
		left = x - gap - rect.width
	} else {
		// Fallback center
		left = Math.max(8, (vw - rect.width) / 2)
	}

	if (y - rect.height / 2 > 8 && y + rect.height / 2 < vh - 8) {
		top = y - rect.height / 2
	} else if (y + gap + rect.height < vh - 8) {
		top = y + gap
	} else {
		top = y - gap - rect.height
	}

	popup.style.left = `${Math.max(8, left)}px`
	popup.style.top = `${Math.max(8, top)}px`
}

function hidePopup() {
	popup.style.display = "none"
	selectedNode = null
}

// =============================================================================
// Controls
// =============================================================================
const ZOOM_FACTOR = 1.3
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const centerBtn = document.getElementById("center-btn")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const zoomDisplay = document.getElementById("zoom-display")!

zoomInBtn.addEventListener("click", () =>
	graph.zoom(graph.zoom() * ZOOM_FACTOR, 200),
)
zoomOutBtn.addEventListener("click", () =>
	graph.zoom(graph.zoom() / ZOOM_FACTOR, 200),
)
fitBtn.addEventListener("click", () => graph.zoomToFit(400, 40))
centerBtn.addEventListener("click", () => graph.centerAt(0, 0, 400))

// Update zoom display
graph.onZoom(({ k }) => {
	zoomDisplay.textContent = `${Math.round(k * 100)}%`
})

document.addEventListener("keydown", (e) => {
	const tag = (e.target as HTMLElement).tagName
	if (tag === "INPUT" || tag === "TEXTAREA") return

	switch (e.key) {
		case "Escape":
			hidePopup()
			break
		case "z":
		case "Z":
			graph.zoomToFit(400, 40)
			break
		case "c":
		case "C":
			graph.centerAt(0, 0, 400)
			break
		case "+":
		case "=":
			graph.zoom(graph.zoom() * ZOOM_FACTOR, 200)
			break
		case "-":
		case "_":
			graph.zoom(graph.zoom() / ZOOM_FACTOR, 200)
			break
	}
})

// Legend toggle
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const legendEl = document.getElementById("legend")!
// biome-ignore lint/style/noNonNullAssertion: DOM element guaranteed to exist in HTML
const legendToggle = document.getElementById("legend-toggle")!
legendToggle.addEventListener("click", () =>
	legendEl.classList.toggle("collapsed"),
)

// =============================================================================
// Theme
// =============================================================================
function applyTheme(theme: "light" | "dark") {
	isDark = theme === "dark"
	document.documentElement.setAttribute("data-theme", theme)
	graph.backgroundColor(isDark ? "#0f1419" : "#ffffff")
}

// Detect system theme
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)")
applyTheme(prefersDark.matches ? "dark" : "light")
prefersDark.addEventListener("change", (e) =>
	applyTheme(e.matches ? "dark" : "light"),
)

// =============================================================================
// MCP App SDK
// =============================================================================
const app = new App({ name: "Memory Graph", version: "1.0.0" })

app.ontoolinput = () => {
	loadingEl.style.display = "flex"
	statsEl.textContent = "Loading graph data..."
}

app.ontoolresult = (result: CallToolResult) => {
	loadingEl.style.display = "none"

	if (result.isError) {
		statsEl.textContent = "Error loading graph"
		return
	}

	const data = result.structuredContent as unknown as ToolResultData
	if (!data?.documents) {
		statsEl.textContent = "No graph data available"
		return
	}

	const { nodes, links } = transformData(data)
	const memCount = nodes.filter((n) => n.nodeType === "memory").length
	const docCount = nodes.filter((n) => n.nodeType === "document").length

	statsEl.textContent = `${docCount} docs \u00b7 ${memCount} memories \u00b7 ${links.length} connections`

	// Update legend counts
	const docCountEl = document.getElementById("legend-doc-count")
	const memCountEl = document.getElementById("legend-mem-count")
	if (docCountEl) docCountEl.textContent = String(docCount)
	if (memCountEl) memCountEl.textContent = String(memCount)

	graph.graphData({ nodes, links })

	// Fit to view after layout stabilizes
	setTimeout(() => graph.zoomToFit(400, 40), 600)
}

app.ontoolcancelled = () => {
	loadingEl.style.display = "none"
	statsEl.textContent = "Cancelled"
}

function handleHostContext(ctx: McpUiHostContext) {
	if (ctx.theme) {
		applyDocumentTheme(ctx.theme)
		applyTheme(ctx.theme)
	}
	if (ctx.styles?.variables) {
		applyHostStyleVariables(ctx.styles.variables)
	}
	if (ctx.styles?.css?.fonts) {
		applyHostFonts(ctx.styles.css.fonts)
	}
	if (ctx.safeAreaInsets) {
		const { top, right, bottom, left } = ctx.safeAreaInsets
		document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`
	}
}

app.onhostcontextchanged = handleHostContext

app.onteardown = async () => ({})

app.onerror = console.error

// Connect to host
app.connect().then(() => {
	const ctx = app.getHostContext()
	if (ctx) handleHostContext(ctx)
})
