"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { $fetch } from "@repo/lib/api"
import type {
	ViewportDocument,
	ViewportEdge,
	ViewportBounds,
	ViewportGraphNode,
	ViewportGraphEdge,
} from "@/lib/viewport-graph-types"

interface UseViewportGraphOptions {
	containerTags?: string[]
	limit?: number
	enabled?: boolean
}

interface UseViewportGraphReturn {
	documents: Map<string, ViewportDocument>
	nodes: ViewportGraphNode[]
	edges: ViewportGraphEdge[]
	isLoading: boolean
	error: Error | null
	fetchViewport: (bounds: ViewportBounds) => Promise<void>
	currentViewport: ViewportBounds | null
	totalLoaded: number
}

const DOCUMENT_NODE_SIZE = 58
const MEMORY_NODE_SIZE = 40
const NODE_COLOR = "#4f8cff"
const MEMORY_COLOR = "#a78bfa" // Purple for memories
// Backend returns small coordinate values (typically -50 to +50 range)
// Scale up to create visual separation between nodes
const COORDINATE_SCALE = 15
// Distance from parent document for memory nodes
const MEMORY_ORBIT_RADIUS = 80

// Normalize similarity to 0-1 range
// Backend may return similarity as 0-1000 (integer) or 0-1 (float)
function normalizeSimilarity(similarity: number): number {
	// If > 1, assume it's in 0-1000 range
	return similarity > 1 ? similarity / 1000 : similarity
}

function getEdgeColor(similarity: number): string {
	const normalizedSim = normalizeSimilarity(similarity)
	const alpha = 0.2 + normalizedSim * 0.6
	return `rgba(100, 149, 237, ${alpha})`
}

function getEdgeThickness(similarity: number): number {
	const normalizedSim = normalizeSimilarity(similarity)
	return 0.5 + normalizedSim * 2
}

export function useViewportGraph({
	containerTags,
	limit = 200,
	enabled = true,
}: UseViewportGraphOptions = {}): UseViewportGraphReturn {
	const [documents, setDocuments] = useState<Map<string, ViewportDocument>>(
		new Map(),
	)
	const [rawEdges, setRawEdges] = useState<ViewportEdge[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [currentViewport, setCurrentViewport] = useState<ViewportBounds | null>(
		null,
	)

	const fetchInProgressRef = useRef(false)
	const lastFetchParamsRef = useRef<string>("")

	const fetchViewport = useCallback(
		async (bounds: ViewportBounds) => {
			if (!enabled) return
			if (fetchInProgressRef.current) return

			// Guard against invalid bounds (NaN or Infinity)
			if (
				!Number.isFinite(bounds.minX) ||
				!Number.isFinite(bounds.maxX) ||
				!Number.isFinite(bounds.minY) ||
				!Number.isFinite(bounds.maxY)
			) {
				console.warn("[viewport-graph] Skipping fetch with invalid bounds:", bounds)
				return
			}

			const fetchParams = JSON.stringify({
				bounds,
				containerTags,
				limit,
			})
			if (fetchParams === lastFetchParamsRef.current) return

			fetchInProgressRef.current = true
			lastFetchParamsRef.current = fetchParams
			setIsLoading(true)
			setError(null)

			try {
				const requestBody = {
					viewport: {
						minX: bounds.minX,
						maxX: bounds.maxX,
						minY: bounds.minY,
						maxY: bounds.maxY,
					},
					containerTags: containerTags?.length ? containerTags : undefined,
					limit,
				}
				console.log("[viewport-graph] Fetching with body:", requestBody)

				const response = await $fetch("@post/documents/graph/viewport", {
					body: requestBody,
					disableValidation: true,
				})

				console.log("[viewport-graph] Response:", response)

				if (response.error) {
					console.error("[viewport-graph] Error:", response.error)
					throw new Error(response.error?.message || "Failed to fetch viewport")
				}

				const data = response.data as {
					documents: ViewportDocument[]
					edges: ViewportEdge[]
					viewport: ViewportBounds
				}

				console.log("[viewport-graph] Documents received:", data.documents?.length)
				console.log("[viewport-graph] Edges received:", data.edges?.length)
				if (data.documents?.length > 0) {
					console.log("[viewport-graph] Sample document:", data.documents[0])
				}

				setDocuments((prev) => {
					const next = new Map(prev)
					for (const doc of data.documents) {
						next.set(doc.id, doc)
					}
					return next
				})

				setRawEdges(data.edges)
				setCurrentViewport(data.viewport)
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Unknown error"))
			} finally {
				setIsLoading(false)
				fetchInProgressRef.current = false
			}
		},
		[containerTags, limit, enabled],
	)

	// Reset when containerTags change
	useEffect(() => {
		setDocuments(new Map())
		setRawEdges([])
		setCurrentViewport(null)
		lastFetchParamsRef.current = ""
	}, [containerTags?.join(",")])

	// Convert documents and memories to nodes
	const nodes = useMemo((): ViewportGraphNode[] => {
		const result: ViewportGraphNode[] = []
		
		for (const doc of documents.values()) {
			// Handle different possible field names from backend (snake_case from API)
			const rawDoc = doc as unknown as Record<string, unknown>
			const rawX = Number(rawDoc.spatial_x ?? rawDoc.spatialX ?? rawDoc.x ?? 0)
			const rawY = Number(rawDoc.spatial_y ?? rawDoc.spatialY ?? rawDoc.y ?? 0)
			// Scale up coordinates to create visual separation
			const docX = rawX * COORDINATE_SCALE
			const docY = rawY * COORDINATE_SCALE
			
			// Add document node
			result.push({
				id: doc.id,
				type: "document" as const,
				x: docX,
				y: docY,
				data: { ...doc, spatialX: docX, spatialY: docY },
				size: DOCUMENT_NODE_SIZE,
				color: NODE_COLOR,
				isHovered: false,
			})
			
			// Add memory nodes orbiting around the document
			const memories = doc.memoryEntries || []
			const memoryCount = memories.length
			
			for (let i = 0; i < memoryCount; i++) {
				const memory = memories[i]!
				// Position memories in a circle around the parent document
				const angle = (2 * Math.PI * i) / memoryCount - Math.PI / 2 // Start from top
				const memX = docX + Math.cos(angle) * MEMORY_ORBIT_RADIUS
				const memY = docY + Math.sin(angle) * MEMORY_ORBIT_RADIUS
				
				result.push({
					id: memory.id,
					type: "memory" as const,
					x: memX,
					y: memY,
					data: memory,
					size: MEMORY_NODE_SIZE,
					color: MEMORY_COLOR,
					isHovered: false,
					parentDocumentId: doc.id,
				})
			}
		}
		
		// Debug: log coordinate range
		if (result.length > 0) {
			const docNodes = result.filter(n => n.type === "document")
			const memNodes = result.filter(n => n.type === "memory")
			console.log("[viewport-graph] Nodes:", {
				documents: docNodes.length,
				memories: memNodes.length,
				total: result.length,
			})
		}
		
		return result
	}, [documents])

	// Convert raw edges to graph edges, including doc-doc and doc-memory connections
	const edges = useMemo((): ViewportGraphEdge[] => {
		const docIds = new Set(documents.keys())
		const result: ViewportGraphEdge[] = []

		// Add doc-doc edges from API
		for (const edge of rawEdges) {
			if (docIds.has(edge.source) && docIds.has(edge.target)) {
				const normalizedSim = normalizeSimilarity(edge.similarity)
				result.push({
					id: `edge-${edge.source}-${edge.target}`,
					source: edge.source,
					target: edge.target,
					similarity: normalizedSim,
					color: getEdgeColor(edge.similarity),
					opacity: 0.2 + normalizedSim * 0.6,
					thickness: getEdgeThickness(edge.similarity),
					edgeType: "doc-doc",
				})
			}
		}

		// Add doc-memory edges (connecting documents to their memories)
		for (const doc of documents.values()) {
			const memories = doc.memoryEntries || []
			for (const memory of memories) {
				result.push({
					id: `edge-${doc.id}-${memory.id}`,
					source: doc.id,
					target: memory.id,
					similarity: 1, // Strong connection
					color: "rgba(167, 139, 250, 0.4)",
					opacity: 0.4,
					thickness: 1,
				})
			}
		}

		return result
	}, [rawEdges, documents])

	return {
		documents,
		nodes,
		edges,
		isLoading,
		error,
		fetchViewport,
		currentViewport,
		totalLoaded: documents.size,
	}
}
