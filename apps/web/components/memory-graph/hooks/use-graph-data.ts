"use client"

import { useMemo, useRef, useEffect } from "react"
import { MEMORY_BORDER, EDGE_COLORS } from "../constants"
import type {
	GraphNode,
	GraphEdge,
	GraphApiDocument,
	GraphApiMemory,
	GraphApiEdge,
	DocumentNodeData,
	MemoryNodeData,
} from "../types"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MEMORY_CLUSTER_SPREAD = 150

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

function getEdgeVisualProps(similarity: number) {
	return {
		opacity: 0.3 + similarity * 0.5,
		thickness: 1 + similarity * 1.5,
	}
}

function normalizeDocCoordinates(
	documents: GraphApiDocument[],
): GraphApiDocument[] {
	if (documents.length <= 1) return documents

	let minX = Number.POSITIVE_INFINITY
	let maxX = Number.NEGATIVE_INFINITY
	let minY = Number.POSITIVE_INFINITY
	let maxY = Number.NEGATIVE_INFINITY

	for (const doc of documents) {
		minX = Math.min(minX, doc.x)
		maxX = Math.max(maxX, doc.x)
		minY = Math.min(minY, doc.y)
		maxY = Math.max(maxY, doc.y)
	}

	const rangeX = maxX - minX || 1
	const rangeY = maxY - minY || 1
	const PAD = 100

	return documents.map((doc) => ({
		...doc,
		x: PAD + ((doc.x - minX) / rangeX) * (1000 - 2 * PAD),
		y: PAD + ((doc.y - minY) / rangeY) * (1000 - 2 * PAD),
	}))
}

export function useGraphData(
	documents: GraphApiDocument[],
	apiEdges: GraphApiEdge[],
	draggingNodeId: string | null,
	canvasWidth: number,
	canvasHeight: number,
) {
	const nodeCache = useRef<Map<string, GraphNode>>(new Map())

	useEffect(() => {
		if (!documents || documents.length === 0) return

		const currentIds = new Set<string>()
		for (const doc of documents) {
			currentIds.add(doc.id)
			for (const mem of doc.memories) currentIds.add(mem.id)
		}

		for (const [id] of nodeCache.current.entries()) {
			if (!currentIds.has(id)) nodeCache.current.delete(id)
		}
	}, [documents])

	const { scale, offsetX, offsetY } = useMemo(() => {
		if (canvasWidth === 0 || canvasHeight === 0) {
			return { scale: 1, offsetX: 0, offsetY: 0 }
		}
		const paddingFactor = 0.8
		const s = (Math.min(canvasWidth, canvasHeight) * paddingFactor) / 1000
		const ox = (canvasWidth - 1000 * s) / 2
		const oy = (canvasHeight - 1000 * s) / 2
		return { scale: s, offsetX: ox, offsetY: oy }
	}, [canvasWidth, canvasHeight])

	const normalizedDocs = useMemo(
		() => normalizeDocCoordinates(documents),
		[documents],
	)

	const nodes = useMemo(() => {
		if (!normalizedDocs || normalizedDocs.length === 0) return []

		const result: GraphNode[] = []

		for (const doc of normalizedDocs) {
			const initialX = doc.x * scale + offsetX
			const initialY = doc.y * scale + offsetY

			let docNode = nodeCache.current.get(doc.id)
			const docData: DocumentNodeData = {
				id: doc.id,
				title: doc.title,
				summary: doc.summary,
				type: doc.documentType,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
				memories: doc.memories,
			}

			if (docNode) {
				docNode.data = docData
				docNode.isDragging = draggingNodeId === doc.id
			} else {
				docNode = {
					id: doc.id,
					type: "document",
					x: initialX,
					y: initialY,
					data: docData,
					size: 50,
					borderColor: "#2A2F36",
					isHovered: false,
					isDragging: false,
				}
				nodeCache.current.set(doc.id, docNode)
			}
			result.push(docNode)

			const memCount = doc.memories.length
			for (let i = 0; i < memCount; i++) {
				const mem = doc.memories[i]!
				let memNode = nodeCache.current.get(mem.id)
				const memData: MemoryNodeData = {
					...mem,
					documentId: doc.id,
					content: mem.memory,
				}

				if (memNode) {
					memNode.data = memData
					memNode.borderColor = getMemoryBorderColor(mem)
					memNode.isDragging = draggingNodeId === mem.id
				} else {
					const angle = (i / memCount) * 2 * Math.PI
					memNode = {
						id: mem.id,
						type: "memory",
						x: docNode.x + Math.cos(angle) * MEMORY_CLUSTER_SPREAD,
						y: docNode.y + Math.sin(angle) * MEMORY_CLUSTER_SPREAD,
						data: memData,
						size: 36,
						borderColor: getMemoryBorderColor(mem),
						isHovered: false,
						isDragging: false,
					}
					nodeCache.current.set(mem.id, memNode)
				}
				result.push(memNode)
			}
		}

		return result
	}, [normalizedDocs, scale, offsetX, offsetY, draggingNodeId])

	const edges = useMemo(() => {
		if (!normalizedDocs || normalizedDocs.length === 0) return []

		const result: GraphEdge[] = []
		const allNodeIds = new Set(nodes.map((n) => n.id))

		for (const doc of normalizedDocs) {
			for (const mem of doc.memories) {
				result.push({
					id: `dm-${doc.id}-${mem.id}`,
					source: doc.id,
					target: mem.id,
					similarity: 1,
					visualProps: { opacity: 0.3, thickness: 1.5 },
					edgeType: "doc-memory",
				})
			}
		}

		for (const doc of normalizedDocs) {
			for (const mem of doc.memories) {
				if (mem.parentMemoryId && allNodeIds.has(mem.parentMemoryId)) {
					result.push({
						id: `ver-${mem.parentMemoryId}-${mem.id}`,
						source: mem.parentMemoryId,
						target: mem.id,
						similarity: 1,
						visualProps: { opacity: 0.6, thickness: 2 },
						edgeType: "version",
					})
				}
			}
		}

		for (const apiEdge of apiEdges) {
			if (!allNodeIds.has(apiEdge.source) || !allNodeIds.has(apiEdge.target)) {
				continue
			}

			result.push({
				id: `sim-${apiEdge.source}-${apiEdge.target}`,
				source: apiEdge.source,
				target: apiEdge.target,
				similarity: apiEdge.similarity,
				visualProps: getEdgeVisualProps(apiEdge.similarity),
				edgeType: "similarity",
			})
		}

		return result
	}, [normalizedDocs, apiEdges, nodes])

	return { nodes, edges, scale, offsetX, offsetY }
}

export function screenToBackendCoords(
	screenX: number,
	screenY: number,
	panX: number,
	panY: number,
	zoom: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	const canvasX = (screenX - panX) / zoom
	const canvasY = (screenY - panY) / zoom

	const paddingFactor = 0.8
	const s = (Math.min(canvasWidth, canvasHeight) * paddingFactor) / 1000
	const ox = (canvasWidth - 1000 * s) / 2
	const oy = (canvasHeight - 1000 * s) / 2

	return {
		x: (canvasX - ox) / s,
		y: (canvasY - oy) / s,
	}
}

export function calculateBackendViewport(
	panX: number,
	panY: number,
	zoom: number,
	canvasWidth: number,
	canvasHeight: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
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
		maxX: Math.max(topLeft.x, bottomRight.x),
		minY: Math.max(0, Math.min(topLeft.y, bottomRight.y)),
		maxY: Math.max(topLeft.y, bottomRight.y),
	}
}
