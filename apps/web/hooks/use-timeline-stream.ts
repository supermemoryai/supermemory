"use client"

import { useCallback, useRef, useState } from "react"
import type {
	ViewportDocument,
	ViewportEdge,
	ViewportGraphNode,
	ViewportGraphEdge,
} from "@/lib/viewport-graph-types"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

interface TimelineBatch {
	type: "batch"
	batchIndex: number
	documents: ViewportDocument[]
	edges: ViewportEdge[]
	hasMore: boolean
	totalStreamed: number
}

interface TimelineComplete {
	type: "complete"
	totalDocuments: number
	totalEdges: number
}

type TimelineMessage = TimelineBatch | TimelineComplete

interface UseTimelineStreamOptions {
	containerTags?: string[]
	batchSize?: number
	delayBetweenBatches?: number
	onBatch?: (nodes: ViewportGraphNode[], edges: ViewportGraphEdge[]) => void
	onComplete?: (totalDocuments: number, totalEdges: number) => void
}

interface UseTimelineStreamReturn {
	isStreaming: boolean
	progress: { streamed: number; total: number | null }
	startStream: () => Promise<void>
	stopStream: () => void
}

const DOCUMENT_NODE_SIZE = 58
const MEMORY_NODE_SIZE = 40
const NODE_COLOR = "#4f8cff"
const MEMORY_COLOR = "#a78bfa"
const COORDINATE_SCALE = 15
const MEMORY_ORBIT_RADIUS = 80

function normalizeSimilarity(similarity: number): number {
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

function documentsToNodes(documents: ViewportDocument[]): ViewportGraphNode[] {
	const result: ViewportGraphNode[] = []

	for (const doc of documents) {
		const rawDoc = doc as unknown as Record<string, unknown>
		const rawX = Number(rawDoc.spatial_x ?? rawDoc.spatialX ?? rawDoc.x ?? 0)
		const rawY = Number(rawDoc.spatial_y ?? rawDoc.spatialY ?? rawDoc.y ?? 0)
		const docX = rawX * COORDINATE_SCALE
		const docY = rawY * COORDINATE_SCALE

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

		const memories = doc.memoryEntries || []
		const memoryCount = memories.length

		for (let i = 0; i < memoryCount; i++) {
			const memory = memories[i]!
			const angle = (2 * Math.PI * i) / memoryCount - Math.PI / 2
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

	return result
}

function edgesToGraphEdges(
	edges: ViewportEdge[],
	documents: ViewportDocument[],
): ViewportGraphEdge[] {
	const result: ViewportGraphEdge[] = []

	for (const edge of edges) {
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

	for (const doc of documents) {
		const memories = doc.memoryEntries || []
		for (const memory of memories) {
			result.push({
				id: `edge-${doc.id}-${memory.id}`,
				source: doc.id,
				target: memory.id,
				similarity: 1,
				color: "rgba(167, 139, 250, 0.4)",
				opacity: 0.4,
				thickness: 1,
			})
		}
	}

	return result
}

export function useTimelineStream({
	containerTags,
	batchSize = 5,
	delayBetweenBatches = 400,
	onBatch,
	onComplete,
}: UseTimelineStreamOptions = {}): UseTimelineStreamReturn {
	const [isStreaming, setIsStreaming] = useState(false)
	const [progress, setProgress] = useState<{ streamed: number; total: number | null }>({
		streamed: 0,
		total: null,
	})
	const abortControllerRef = useRef<AbortController | null>(null)
	const batchQueueRef = useRef<Array<{ nodes: ViewportGraphNode[]; edges: ViewportGraphEdge[]; totalStreamed: number }>>([])
	const processingRef = useRef(false)

	const processQueue = useCallback(async () => {
		if (processingRef.current) return
		processingRef.current = true

		while (batchQueueRef.current.length > 0) {
			const batch = batchQueueRef.current.shift()
			if (!batch) break

			setProgress({
				streamed: batch.totalStreamed,
				total: null,
			})
			onBatch?.(batch.nodes, batch.edges)

			if (batchQueueRef.current.length > 0) {
				await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
			}
		}

		processingRef.current = false
	}, [delayBetweenBatches, onBatch])

	const stopStream = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}
		batchQueueRef.current = []
		processingRef.current = false
		setIsStreaming(false)
	}, [])

	const startStream = useCallback(async () => {
		if (isStreaming) return

		stopStream()
		setIsStreaming(true)
		setProgress({ streamed: 0, total: null })

		const abortController = new AbortController()
		abortControllerRef.current = abortController

		try {
			const response = await fetch(`${API_BASE_URL}/v3/documents/graph/timeline`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					containerTags: containerTags?.length ? containerTags : undefined,
					batchSize,
				}),
				signal: abortController.signal,
			})

			if (!response.ok) {
				throw new Error(`Timeline stream failed: ${response.status}`)
			}

			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body")
			}

			const decoder = new TextDecoder()
			let buffer = ""

			while (true) {
				const { done, value } = await reader.read()

				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split("\n")
				buffer = lines.pop() || ""

				for (const line of lines) {
					if (!line.trim()) continue

					try {
						const message = JSON.parse(line) as TimelineMessage

						if (message.type === "batch") {
							const nodes = documentsToNodes(message.documents)
							const edges = edgesToGraphEdges(message.edges, message.documents)

							batchQueueRef.current.push({
								nodes,
								edges,
								totalStreamed: message.totalStreamed,
							})
							processQueue()
						} else if (message.type === "complete") {
							const completeCallback = () => {
								setProgress({
									streamed: message.totalDocuments,
									total: message.totalDocuments,
								})
								onComplete?.(message.totalDocuments, message.totalEdges)
							}
							if (batchQueueRef.current.length === 0 && !processingRef.current) {
								completeCallback()
							} else {
								const checkComplete = setInterval(() => {
									if (batchQueueRef.current.length === 0 && !processingRef.current) {
										clearInterval(checkComplete)
										completeCallback()
									}
								}, 100)
							}
						}
					} catch (parseError) {
						console.warn("[timeline-stream] Failed to parse line:", line, parseError)
					}
				}
			}

			if (buffer.trim()) {
				try {
					const message = JSON.parse(buffer) as TimelineMessage
					if (message.type === "complete") {
						onComplete?.(message.totalDocuments, message.totalEdges)
					}
				} catch {
					// Ignore incomplete final buffer
				}
			}
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				console.log("[timeline-stream] Stream aborted")
			} else {
				console.error("[timeline-stream] Error:", error)
			}
		} finally {
			setIsStreaming(false)
			abortControllerRef.current = null
		}
	}, [isStreaming, containerTags, batchSize, onBatch, onComplete, stopStream])

	return {
		isStreaming,
		progress,
		startStream,
		stopStream,
	}
}
