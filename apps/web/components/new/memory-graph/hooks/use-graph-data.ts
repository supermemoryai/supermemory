"use client"

import { useMemo, useRef, useEffect } from "react"
import { colors } from "../constants"
import {
	getConnectionVisualProps,
	getMagicalConnectionColor,
} from "../lib/similarity"
import type {
	GraphNode,
	GraphEdge,
	GraphApiNode,
	GraphApiEdge,
	DocumentWithMemories,
	MemoryEntry,
} from "../types"

// Simplified data types for API nodes - compatible with node-popover display
interface ApiDocumentData {
	id: string
	title: string | null
	summary: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: MemoryEntry[]
}

interface ApiMemoryData {
	id: string
	documentId: string
	memory: string | null
	content: string | null
	spaceId: string
	isStatic?: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Transform API nodes to graph nodes with visual properties
 * Uses backend-provided spatial coordinates (0-1000 range)
 */
export function useGraphData(
	apiNodes: GraphApiNode[],
	apiEdges: GraphApiEdge[],
	draggingNodeId: string | null,
	canvasWidth: number,
	canvasHeight: number,
) {
	// Cache nodes to preserve d3-force mutations (vx, vy, fx, fy) during interactions
	const nodeCache = useRef<Map<string, GraphNode>>(new Map())

	// Cleanup stale nodes from cache
	useEffect(() => {
		if (!apiNodes || apiNodes.length === 0) return

		const currentNodeIds = new Set(apiNodes.map((n) => n.id))

		for (const [id] of nodeCache.current.entries()) {
			if (!currentNodeIds.has(id)) {
				nodeCache.current.delete(id)
			}
		}
	}, [apiNodes])

	// Calculate scale factor to map 0-1000 backend coordinates to canvas
	const { scale, offsetX, offsetY } = useMemo(() => {
		if (canvasWidth === 0 || canvasHeight === 0) {
			return { scale: 1, offsetX: 0, offsetY: 0 }
		}
		// Use a consistent scale that fits the 0-1000 range into the canvas
		// with some padding for visual breathing room
		const paddingFactor = 0.8
		const s = (Math.min(canvasWidth, canvasHeight) * paddingFactor) / 1000
		const ox = (canvasWidth - 1000 * s) / 2
		const oy = (canvasHeight - 1000 * s) / 2
		return { scale: s, offsetX: ox, offsetY: oy }
	}, [canvasWidth, canvasHeight])

	// Transform API nodes to GraphNode format
	const nodes = useMemo(() => {
		if (!apiNodes || apiNodes.length === 0) {
			return []
		}

		const result: GraphNode[] = []

		for (const apiNode of apiNodes) {
			// Scale backend coordinates to canvas coordinates
			const scaledX = apiNode.x * scale + offsetX
			const scaledY = apiNode.y * scale + offsetY

			// Check cache for existing node (preserves physics state)
			let node = nodeCache.current.get(apiNode.id)

			const nodeData = createNodeData(apiNode)

			if (node) {
				// Update data while preserving physics properties
				node.data = nodeData as DocumentWithMemories | MemoryEntry
				node.isDragging = draggingNodeId === apiNode.id
				// Only update position if not being dragged and no fixed position
				if (!node.isDragging && node.fx === null && node.fy === null) {
					node.x = scaledX
					node.y = scaledY
				}
			} else {
				// Create new node
				node = {
					id: apiNode.id,
					type: apiNode.type,
					x: scaledX,
					y: scaledY,
					data: nodeData as DocumentWithMemories | MemoryEntry,
					size:
						apiNode.type === "document"
							? 58
							: calculateMemorySize(apiNode.content),
					color:
						apiNode.type === "document"
							? colors.document.primary
							: colors.memory.primary,
					isHovered: false,
					isDragging: draggingNodeId === apiNode.id,
				}
				nodeCache.current.set(apiNode.id, node)
			}

			result.push(node)
		}

		return result
	}, [apiNodes, scale, offsetX, offsetY, draggingNodeId])

	// Transform API edges to GraphEdge format with visual properties
	const edges = useMemo(() => {
		if (!apiEdges || apiEdges.length === 0) {
			return []
		}

		// Create a set of valid node IDs for quick lookup
		const validNodeIds = new Set(apiNodes.map((n) => n.id))

		const result: GraphEdge[] = []

		for (const apiEdge of apiEdges) {
			// Skip edges that reference nodes not in current viewport
			if (
				!validNodeIds.has(apiEdge.source) ||
				!validNodeIds.has(apiEdge.target)
			) {
				continue
			}

			// Determine edge type based on connected node types
			const sourceNode = apiNodes.find((n) => n.id === apiEdge.source)
			const targetNode = apiNodes.find((n) => n.id === apiEdge.target)

			let edgeType: "doc-memory" | "doc-doc" | "version" = "doc-doc"
			if (sourceNode && targetNode) {
				if (sourceNode.type === "document" && targetNode.type === "memory") {
					edgeType = "doc-memory"
				} else if (
					sourceNode.type === "memory" &&
					targetNode.type === "document"
				) {
					edgeType = "doc-memory"
				} else if (
					sourceNode.type === "memory" &&
					targetNode.type === "memory"
				) {
					edgeType = "version"
				}
			}

			// Calculate visual properties based on similarity
			const visualProps = getConnectionVisualProps(apiEdge.similarity)
			const edgeColor =
				edgeType === "doc-memory"
					? colors.connection.memory
					: getMagicalConnectionColor(apiEdge.similarity, 200)

			result.push({
				id: `edge-${apiEdge.source}-${apiEdge.target}`,
				source: apiEdge.source,
				target: apiEdge.target,
				similarity: apiEdge.similarity,
				visualProps,
				color: edgeColor,
				edgeType,
			})
		}

		return result
	}, [apiEdges, apiNodes])

	return { nodes, edges, scale, offsetX, offsetY }
}

/**
 * Create node data object from API node
 * This creates a minimal data object compatible with the existing popover/detail components
 */
function createNodeData(
	apiNode: GraphApiNode,
): ApiDocumentData | ApiMemoryData {
	if (apiNode.type === "document") {
		return {
			id: apiNode.id,
			title: apiNode.title,
			summary: apiNode.content,
			type: apiNode.documentType || "document",
			createdAt: apiNode.createdAt,
			updatedAt: apiNode.updatedAt,
			memoryEntries: [], // Documents from API don't include nested memories
		} satisfies ApiDocumentData
	}
	// Memory node
	return {
		id: apiNode.id,
		documentId: "", // Not available from API, but required for type compatibility
		memory: apiNode.content,
		content: apiNode.content,
		spaceId: apiNode.spaceId || "default",
		isStatic: apiNode.isStatic,
		createdAt: apiNode.createdAt,
		updatedAt: apiNode.updatedAt,
	} satisfies ApiMemoryData
}

/**
 * Calculate memory node size based on content length
 */
function calculateMemorySize(content: string | null): number {
	const length = content?.length || 50
	return Math.max(32, Math.min(48, length * 0.5))
}

/**
 * Convert screen coordinates to backend coordinates (0-1000 range)
 * Useful for updating viewport based on pan/zoom
 */
export function screenToBackendCoords(
	screenX: number,
	screenY: number,
	panX: number,
	panY: number,
	zoom: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	// First convert screen to canvas coordinates
	const canvasX = (screenX - panX) / zoom
	const canvasY = (screenY - panY) / zoom

	// Then convert canvas to backend coordinates
	const paddingFactor = 0.8
	const scale = (Math.min(canvasWidth, canvasHeight) * paddingFactor) / 1000
	const offsetX = (canvasWidth - 1000 * scale) / 2
	const offsetY = (canvasHeight - 1000 * scale) / 2

	return {
		x: Math.max(0, Math.min(1000, (canvasX - offsetX) / scale)),
		y: Math.max(0, Math.min(1000, (canvasY - offsetY) / scale)),
	}
}

/**
 * Calculate the visible viewport in backend coordinates based on current pan/zoom
 */
export function calculateBackendViewport(
	panX: number,
	panY: number,
	zoom: number,
	canvasWidth: number,
	canvasHeight: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
	// Calculate the four corners of the visible area in screen coordinates
	const topLeft = screenToBackendCoords(
		0,
		0,
		panX,
		panY,
		zoom,
		canvasWidth,
		canvasHeight,
	)
	const bottomRight = screenToBackendCoords(
		canvasWidth,
		canvasHeight,
		panX,
		panY,
		zoom,
		canvasWidth,
		canvasHeight,
	)

	return {
		minX: Math.max(0, Math.min(topLeft.x, bottomRight.x)),
		maxX: Math.min(1000, Math.max(topLeft.x, bottomRight.x)),
		minY: Math.max(0, Math.min(topLeft.y, bottomRight.y)),
		maxY: Math.min(1000, Math.max(topLeft.y, bottomRight.y)),
	}
}
