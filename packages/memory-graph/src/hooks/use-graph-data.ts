"use client"

import {
	calculateSemanticSimilarity,
	getConnectionVisualProps,
	getMagicalConnectionColor,
} from "@/lib/similarity"
import { useMemo, useRef, useEffect } from "react"
import { colors, LAYOUT_CONSTANTS } from "@/constants"
import type {
	DocumentsResponse,
	DocumentWithMemories,
	GraphEdge,
	GraphNode,
	MemoryEntry,
	MemoryRelation,
} from "@/types"

export function useGraphData(
	data: DocumentsResponse | null,
	selectedSpace: string,
	nodePositions: Map<string, { x: number; y: number; parentDocId?: string; offsetX?: number; offsetY?: number }>,
	draggingNodeId: string | null,
	memoryLimit?: number,
) {
	// Cache nodes to preserve d3-force mutations (x, y, vx, vy, fx, fy)
	const nodeCache = useRef<Map<string, GraphNode>>(new Map())

	// Cleanup nodeCache to prevent memory leak
	useEffect(() => {
		if (!data?.documents) return

		// Build set of current node IDs
		const currentNodeIds = new Set<string>()
		data.documents.forEach((doc) => {
			currentNodeIds.add(doc.id)
			doc.memoryEntries.forEach((mem) => {
				currentNodeIds.add(`${mem.id}`)
			})
		})

		// Remove stale nodes from cache
		for (const [id] of nodeCache.current.entries()) {
			if (!currentNodeIds.has(id)) {
				nodeCache.current.delete(id)
			}
		}
	}, [data, selectedSpace])

	return useMemo(() => {
		if (!data?.documents) return { nodes: [], edges: [] }

		const allNodes: GraphNode[] = []
		const allEdges: GraphEdge[] = []

		// Filter documents that have memories in selected space
		// AND limit memories per document when memoryLimit is provided
		const filteredDocuments = data.documents
			.map((doc) => {
				let memories =
					selectedSpace === "all"
						? doc.memoryEntries
						: doc.memoryEntries.filter(
								(memory) =>
									(memory.spaceContainerTag ?? memory.spaceId ?? "default") ===
									selectedSpace,
							)

				// Apply memory limit if provided and a specific space is selected
				if (selectedSpace !== "all" && memoryLimit && memoryLimit > 0) {
					memories = memories.slice(0, memoryLimit)
				}

				return {
					...doc,
					memoryEntries: memories,
				}
			})
			.filter((doc) => doc.memoryEntries.length > 0)

		// Group documents by space for better clustering
		const documentsBySpace = new Map<string, typeof filteredDocuments>()
		filteredDocuments.forEach((doc) => {
			const docSpace =
				doc.memoryEntries[0]?.spaceContainerTag ??
				doc.memoryEntries[0]?.spaceId ??
				"default"
			if (!documentsBySpace.has(docSpace)) {
				documentsBySpace.set(docSpace, [])
			}
			const spaceDocsArr = documentsBySpace.get(docSpace)
			if (spaceDocsArr) {
				spaceDocsArr.push(doc)
			}
		})

		// Enhanced Layout with Space Separation
		const { centerX, centerY, clusterRadius, spaceSpacing, documentSpacing } =
			LAYOUT_CONSTANTS

		/* 1. Build DOCUMENT nodes with space-aware clustering */
		const documentNodes: GraphNode[] = []
		let spaceIndex = 0

		documentsBySpace.forEach((spaceDocs) => {
			const spaceAngle = (spaceIndex / documentsBySpace.size) * Math.PI * 2
			const spaceOffsetX = Math.cos(spaceAngle) * spaceSpacing
			const spaceOffsetY = Math.sin(spaceAngle) * spaceSpacing
			const spaceCenterX = centerX + spaceOffsetX
			const spaceCenterY = centerY + spaceOffsetY

			spaceDocs.forEach((doc, docIndex) => {
				// Create proper circular layout with concentric rings
				const docsPerRing = 6 // Start with 6 docs in inner ring
				let currentRing = 0
				let docsInCurrentRing = docsPerRing
				let totalDocsInPreviousRings = 0

				// Find which ring this document belongs to
				while (totalDocsInPreviousRings + docsInCurrentRing <= docIndex) {
					totalDocsInPreviousRings += docsInCurrentRing
					currentRing++
					docsInCurrentRing = docsPerRing + currentRing * 4 // Each ring has more docs
				}

				// Position within the ring
				const positionInRing = docIndex - totalDocsInPreviousRings
				const angleInRing = (positionInRing / docsInCurrentRing) * Math.PI * 2

				// Radius increases significantly with each ring
				const baseRadius = documentSpacing * 0.8
				const radius =
					currentRing === 0
						? baseRadius
						: baseRadius + currentRing * documentSpacing * 1.2

				const defaultX = spaceCenterX + Math.cos(angleInRing) * radius
				const defaultY = spaceCenterY + Math.sin(angleInRing) * radius

				const customPos = nodePositions.get(doc.id)

				// Check if node exists in cache (preserves d3-force mutations)
				let node = nodeCache.current.get(doc.id)
				if (node) {
					// Update existing node's data, preserve physics properties (x, y, vx, vy, fx, fy)
					node.data = doc
					node.isDragging = draggingNodeId === doc.id
					// Don't reset x/y - they're managed by d3-force
				} else {
					// Create new node with initial position
					node = {
						id: doc.id,
						type: "document",
						x: customPos?.x ?? defaultX,
						y: customPos?.y ?? defaultY,
						data: doc,
						size: 58,
						color: colors.document.primary,
						isHovered: false,
						isDragging: draggingNodeId === doc.id,
					} satisfies GraphNode
					nodeCache.current.set(doc.id, node)
				}

				documentNodes.push(node)
			})

			spaceIndex++
		})

		/* 2. Manual collision avoidance removed - now handled by d3-force simulation */
		// The initial circular layout provides good starting positions
		// D3-force will handle collision avoidance and spacing dynamically

		allNodes.push(...documentNodes)

		/* 3. Add memories around documents WITH doc-memory connections */
		documentNodes.forEach((docNode) => {
			const memoryNodeMap = new Map<string, GraphNode>()
			const doc = docNode.data as DocumentWithMemories

			doc.memoryEntries.forEach((memory, memIndex) => {
				const memoryId = `${memory.id}`
				const customMemPos = nodePositions.get(memoryId)

				const clusterAngle = (memIndex / doc.memoryEntries.length) * Math.PI * 2
				const variation = Math.sin(memIndex * 2.5) * 0.3 + 0.7
				const distance = clusterRadius * variation

				const seed =
					memIndex * 12345 + Number.parseInt(docNode.id.slice(0, 6), 36)
				const offsetX = Math.sin(seed) * 0.5 * 40
				const offsetY = Math.cos(seed) * 0.5 * 40

				const defaultMemX =
					docNode.x + Math.cos(clusterAngle) * distance + offsetX
				const defaultMemY =
					docNode.y + Math.sin(clusterAngle) * distance + offsetY

				// Calculate final position
				let finalMemX = defaultMemX
				let finalMemY = defaultMemY

				if (customMemPos) {
					// If memory was manually positioned and has stored offset relative to parent
					if (customMemPos.parentDocId === docNode.id &&
						customMemPos.offsetX !== undefined &&
						customMemPos.offsetY !== undefined) {
						// Apply the stored offset to the current document position
						finalMemX = docNode.x + customMemPos.offsetX
						finalMemY = docNode.y + customMemPos.offsetY
					} else {
						// Fallback: use absolute position (for backward compatibility or if parent changed)
						finalMemX = customMemPos.x
						finalMemY = customMemPos.y
					}
				}

				if (!memoryNodeMap.has(memoryId)) {
					// Check if memory node exists in cache (preserves d3-force mutations)
					let memoryNode = nodeCache.current.get(memoryId)
					if (memoryNode) {
						// Update existing node's data, preserve physics properties
						memoryNode.data = memory
						memoryNode.isDragging = draggingNodeId === memoryId
						// Don't reset x/y - they're managed by d3-force
					} else {
						// Create new node with initial position
						memoryNode = {
							id: memoryId,
							type: "memory",
							x: finalMemX,
							y: finalMemY,
							data: memory,
							size: Math.max(
								32,
								Math.min(48, (memory.memory?.length || 50) * 0.5),
							),
							color: colors.memory.primary,
							isHovered: false,
							isDragging: draggingNodeId === memoryId,
						}
						nodeCache.current.set(memoryId, memoryNode)
					}
					memoryNodeMap.set(memoryId, memoryNode)
					allNodes.push(memoryNode)
				}

				// Create doc-memory edge with similarity
				allEdges.push({
					id: `edge-${docNode.id}-${memory.id}`,
					source: docNode.id,
					target: memoryId,
					similarity: 1,
					visualProps: getConnectionVisualProps(1),
					color: colors.connection.memory,
					edgeType: "doc-memory",
				})
			})
		})

		// Build mapping of memoryId -> nodeId for version chains
		const memNodeIdMap = new Map<string, string>()
		allNodes.forEach((n) => {
			if (n.type === "memory") {
				memNodeIdMap.set((n.data as MemoryEntry).id, n.id)
			}
		})

		// Add version-chain edges (old -> new)
		data.documents.forEach((doc) => {
			doc.memoryEntries.forEach((mem: MemoryEntry) => {
				// Support both new object structure and legacy array/single parent fields
				let parentRelations: Record<string, MemoryRelation> = {}

				if (
					mem.memoryRelations &&
					Array.isArray(mem.memoryRelations) &&
					mem.memoryRelations.length > 0
				) {
					// Convert array to Record
					parentRelations = mem.memoryRelations.reduce(
						(acc, rel) => {
							acc[rel.targetMemoryId] = rel.relationType
							return acc
						},
						{} as Record<string, MemoryRelation>,
					)
				} else if (mem.parentMemoryId) {
					parentRelations = {
						[mem.parentMemoryId]: "updates" as MemoryRelation,
					}
				}
				Object.entries(parentRelations).forEach(([pid, relationType]) => {
					const fromId = memNodeIdMap.get(pid)
					const toId = memNodeIdMap.get(mem.id)
					if (fromId && toId) {
						allEdges.push({
							id: `version-${fromId}-${toId}`,
							source: fromId,
							target: toId,
							similarity: 1,
							visualProps: {
								opacity: 0.8,
								thickness: 1,
								glow: 0,
								pulseDuration: 3000,
							},
							// choose color based on relation type
							color: colors.relations[relationType] ?? colors.relations.updates,
							edgeType: "version",
							relationType: relationType as MemoryRelation,
						})
					}
				})
			})
		})

		// Document-to-document similarity edges
		// Performance optimization: limit comparisons to prevent O(n²) scaling issues
		const MAX_DOCS_FOR_SIMILARITY = 50
		const docsToCompare = filteredDocuments.slice(0, MAX_DOCS_FOR_SIMILARITY)

		for (let i = 0; i < docsToCompare.length; i++) {
			const docI = docsToCompare[i]
			if (!docI) continue

			for (let j = i + 1; j < docsToCompare.length; j++) {
				const docJ = docsToCompare[j]
				if (!docJ) continue

				const sim = calculateSemanticSimilarity(
					docI.summaryEmbedding ? Array.from(docI.summaryEmbedding) : null,
					docJ.summaryEmbedding ? Array.from(docJ.summaryEmbedding) : null,
				)
				if (sim > 0.725) {
					allEdges.push({
						id: `doc-doc-${docI.id}-${docJ.id}`,
						source: docI.id,
						target: docJ.id,
						similarity: sim,
						visualProps: getConnectionVisualProps(sim),
						color: getMagicalConnectionColor(sim, 200),
						edgeType: "doc-doc",
					})
				}
			}
		}

		return { nodes: allNodes, edges: allEdges }
	}, [data, selectedSpace, nodePositions, draggingNodeId, memoryLimit])
}
