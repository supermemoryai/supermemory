"use client"

import {
	calculateSemanticSimilarity,
	getConnectionVisualProps,
	getMagicalConnectionColor,
} from "@/lib/similarity"
import { useMemo, useRef, useEffect } from "react"
import { colors, LAYOUT_CONSTANTS, SIMILARITY_CONFIG } from "@/constants"
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
	maxNodes?: number,
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

	// Memo 1: Filter documents by selected space and apply node limits
	const filteredDocuments = useMemo(() => {
		if (!data?.documents) return []

		// Sort documents by most recent first
		const sortedDocs = [...data.documents].sort((a, b) => {
			const dateA = new Date(a.updatedAt || a.createdAt).getTime()
			const dateB = new Date(b.updatedAt || b.createdAt).getTime()
			return dateB - dateA // Most recent first
		})

		// Filter by space and prepare documents
		let processedDocs = sortedDocs
			.map((doc) => {
				let memories =
					selectedSpace === "all"
						? doc.memoryEntries
						: doc.memoryEntries.filter(
								(memory) =>
									(memory.spaceContainerTag ?? memory.spaceId ?? "default") ===
									selectedSpace,
							)

				// Sort memories by relevance score (if available) or recency
				memories = memories.sort((a, b) => {
					// Prioritize sourceRelevanceScore if available
					if (a.sourceRelevanceScore != null && b.sourceRelevanceScore != null) {
						return b.sourceRelevanceScore - a.sourceRelevanceScore // Higher score first
					}
					// Fall back to most recent
					const dateA = new Date(a.updatedAt || a.createdAt).getTime()
					const dateB = new Date(b.updatedAt || b.createdAt).getTime()
					return dateB - dateA // Most recent first
				})

				return {
					...doc,
					memoryEntries: memories,
				}
			})

		// Apply maxNodes limit using Option B (dynamic cap per document)
		if (maxNodes && maxNodes > 0) {
			const totalDocs = processedDocs.length
			if (totalDocs > 0) {
				// Calculate memories per document to stay within maxNodes budget
				const memoriesPerDoc = Math.floor(maxNodes / totalDocs)

				// If we need to limit, slice memories for each document
				if (memoriesPerDoc > 0) {
					let totalNodes = 0
					processedDocs = processedDocs.map((doc) => {
						// Limit memories to calculated amount per doc
						const limitedMemories = doc.memoryEntries.slice(0, memoriesPerDoc)
						totalNodes += limitedMemories.length
						return {
							...doc,
							memoryEntries: limitedMemories,
						}
					})

					// If we still have budget left, distribute remaining nodes to first docs
					let remainingBudget = maxNodes - totalNodes
					if (remainingBudget > 0) {
						for (let i = 0; i < processedDocs.length && remainingBudget > 0; i++) {
							const doc = processedDocs[i]
							if (!doc) continue
							const originalDoc = sortedDocs.find(d => d.id === doc.id)
							if (!originalDoc) continue

							const currentMemCount = doc.memoryEntries.length
							const originalMemCount = originalDoc.memoryEntries.filter(
								m => selectedSpace === "all" ||
								(m.spaceContainerTag ?? m.spaceId ?? "default") === selectedSpace
							).length

							// Can we add more memories to this doc?
							const canAdd = originalMemCount - currentMemCount
							if (canAdd > 0) {
								const toAdd = Math.min(canAdd, remainingBudget)
								const additionalMems = doc.memoryEntries.slice(0, currentMemCount + toAdd)
								processedDocs[i] = {
									...doc,
									memoryEntries: originalDoc.memoryEntries
										.filter(m => selectedSpace === "all" ||
											(m.spaceContainerTag ?? m.spaceId ?? "default") === selectedSpace)
										.sort((a, b) => {
											if (a.sourceRelevanceScore != null && b.sourceRelevanceScore != null) {
												return b.sourceRelevanceScore - a.sourceRelevanceScore
											}
											const dateA = new Date(a.updatedAt || a.createdAt).getTime()
											const dateB = new Date(b.updatedAt || b.createdAt).getTime()
											return dateB - dateA
										})
										.slice(0, currentMemCount + toAdd)
								}
								remainingBudget -= toAdd
							}
						}
					}
				} else {
					// If memoriesPerDoc is 0, we need to limit the number of documents shown
					// Show at least 1 memory per document, up to maxNodes documents
					processedDocs = processedDocs.slice(0, maxNodes).map((doc) => ({
						...doc,
						memoryEntries: doc.memoryEntries.slice(0, 1),
					}))
				}
			}
		}
		// Apply legacy memoryLimit if provided and a specific space is selected
		else if (selectedSpace !== "all" && memoryLimit && memoryLimit > 0) {
			processedDocs = processedDocs.map((doc) => ({
				...doc,
				memoryEntries: doc.memoryEntries.slice(0, memoryLimit),
			}))
		}

		return processedDocs
	}, [data, selectedSpace, memoryLimit, maxNodes])

	// Memo 2: Calculate similarity edges using k-NN approach
	const similarityEdges = useMemo(() => {
		const edges: GraphEdge[] = []

		// k-NN: Each document compares with k neighbors (configurable)
		const { maxComparisonsPerDoc, threshold } = SIMILARITY_CONFIG

		for (let i = 0; i < filteredDocuments.length; i++) {
			const docI = filteredDocuments[i]
			if (!docI) continue

			// Only compare with next k documents (k-nearest neighbors approach)
			const endIdx = Math.min(
				i + maxComparisonsPerDoc + 1,
				filteredDocuments.length,
			)

			for (let j = i + 1; j < endIdx; j++) {
				const docJ = filteredDocuments[j]
				if (!docJ) continue

				const sim = calculateSemanticSimilarity(
					docI.summaryEmbedding ? Array.from(docI.summaryEmbedding) : null,
					docJ.summaryEmbedding ? Array.from(docJ.summaryEmbedding) : null,
				)

				if (sim > threshold) {
					edges.push({
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

		return edges
	}, [filteredDocuments])

	// Memo 3: Build full graph data (nodes + edges)
	return useMemo(() => {
		if (!data?.documents || filteredDocuments.length === 0) {
			return { nodes: [], edges: [] }
		}

		const allNodes: GraphNode[] = []
		const allEdges: GraphEdge[] = []

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
		const { centerX, centerY, clusterRadius } =
			LAYOUT_CONSTANTS

		/* 1. Build DOCUMENT nodes with space-aware clustering */
		const documentNodes: GraphNode[] = []
		let spaceIndex = 0

		documentsBySpace.forEach((spaceDocs) => {
			spaceDocs.forEach((doc, docIndex) => {
				// Simple grid-like layout that physics will naturally organize
				// Start documents near the center with some random offset
				const gridSize = Math.ceil(Math.sqrt(spaceDocs.length))
				const row = Math.floor(docIndex / gridSize)
				const col = docIndex % gridSize

				// Loose grid spacing - physics will organize it better
				const spacing = 200
				const defaultX = centerX + (col - gridSize / 2) * spacing + (Math.random() - 0.5) * 50
				const defaultY = centerY + (row - gridSize / 2) * spacing + (Math.random() - 0.5) * 50

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

				// Simple circular positioning around parent doc
				// Physics will naturally cluster them better
				const angle = (memIndex / doc.memoryEntries.length) * Math.PI * 2
				const distance = clusterRadius * 1 // Closer to parent, let physics separate

				const defaultMemX = docNode.x + Math.cos(angle) * distance
				const defaultMemY = docNode.y + Math.sin(angle) * distance

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
				let parentRelations: Record<string, MemoryRelation> = (mem.memoryRelations ?? {}) as Record<string, MemoryRelation> 

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

		// Append similarity edges (calculated in separate memo)
		allEdges.push(...similarityEdges)

		return { nodes: allNodes, edges: allEdges }
	}, [data, filteredDocuments, nodePositions, draggingNodeId, similarityEdges])
}