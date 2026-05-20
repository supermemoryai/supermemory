import { useMemo, useRef } from "react"
import type {
	DocumentNodeData,
	GraphApiDocument,
	GraphApiMemory,
	GraphEdge,
	GraphNode,
	GraphThemeColors,
	MemoryNodeData,
} from "../types"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MEMORY_ORBIT_BASE = 260
const MEMORY_ORBIT_GAP = 110
const MEMORY_ORBIT_SPACING = 84
const APPEND_CLUSTER_RADIUS = MEMORY_ORBIT_BASE + 180
const APPEND_AREA_GAP = 160
const APPEND_CANDIDATES_PER_RING = 18
const APPEND_MAX_RINGS = 8
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const CLUSTER_COLORS = [
	"#58C7E8",
	"#E7BC52",
	"#74D680",
	"#D47B75",
	"#A789E8",
	"#62C5A8",
	"#74ABD8",
	"#C78AC8",
	"#D18A58",
	"#8BCB6F",
]

export interface ClusterAssignment {
	key: string
	color: string
	size: number
}

export function getMemoryBorderColor(
	mem: GraphApiMemory,
	colors: GraphThemeColors,
): string {
	if (mem.isForgotten) return colors.memBorderForgotten
	if (mem.forgetAfter) {
		const msLeft = new Date(mem.forgetAfter).getTime() - Date.now()
		if (msLeft < SEVEN_DAYS_MS) return colors.memBorderExpiring
	}
	const age = Date.now() - new Date(mem.createdAt).getTime()
	if (age < ONE_DAY_MS) return colors.memBorderRecent
	return colors.memStrokeDefault
}

export function getEdgeVisualProps(edgeType: string) {
	switch (edgeType) {
		case "derives":
			return { opacity: 0.4, thickness: 1.2 }
		case "updates":
			return { opacity: 0.48, thickness: 1.45 }
		case "extends":
			return { opacity: 0.16, thickness: 0.8 }
		default:
			return { opacity: 0.4, thickness: 1.2 }
	}
}

export function getMemoryOrbitOffset(
	index: number,
	count: number,
	memoryId: string,
) {
	const safeCount = Math.max(1, count)
	let remaining = index
	let ring = 0
	let ringStart = 0
	let ringCapacity = getMemoryRingCapacity(ring)

	while (remaining >= ringCapacity) {
		remaining -= ringCapacity
		ringStart += ringCapacity
		ring++
		ringCapacity = getMemoryRingCapacity(ring)
	}

	const radius =
		MEMORY_ORBIT_BASE +
		ring * MEMORY_ORBIT_GAP +
		hashToUnit(`${memoryId}-r`) * Math.min(54, MEMORY_ORBIT_GAP * 0.45)
	const angleStep =
		(2 * Math.PI) / Math.max(1, Math.min(ringCapacity, safeCount))
	const phase = hashToUnit(`${memoryId}-phase`) * angleStep * 0.75
	const angle =
		(remaining + ringStart * 0.17) * angleStep + ring * GOLDEN_ANGLE + phase

	return {
		x: Math.cos(angle) * radius,
		y: Math.sin(angle) * radius,
		radius,
	}
}

function getMemoryRingCapacity(ring: number): number {
	const radius = MEMORY_ORBIT_BASE + ring * MEMORY_ORBIT_GAP
	return Math.max(8, Math.floor((2 * Math.PI * radius) / MEMORY_ORBIT_SPACING))
}

export function getClusterColor(key: string): string {
	return CLUSTER_COLORS[hashString(key) % CLUSTER_COLORS.length] as string
}

export function computeClusterAssignments(
	documents: GraphApiDocument[],
): Map<string, ClusterAssignment> {
	const adjacency = new Map<string, Set<string>>()
	const docByMemory = new Map<string, string>()
	const orderByMemory = new Map<string, number>()
	const allMemoryIds = new Set<string>()
	let order = 0

	for (const doc of documents) {
		let firstMemoryId: string | null = null
		for (const mem of doc.memories) {
			allMemoryIds.add(mem.id)
			docByMemory.set(mem.id, doc.id)
			orderByMemory.set(mem.id, order++)
			ensureAdjacency(adjacency, mem.id)

			if (!firstMemoryId) {
				firstMemoryId = mem.id
			} else {
				connect(adjacency, firstMemoryId, mem.id)
			}
		}
	}

	for (const doc of documents) {
		for (const mem of doc.memories) {
			for (const targetId of Object.keys(getMemoryRelationTargets(mem))) {
				if (!allMemoryIds.has(targetId)) continue
				connect(adjacency, mem.id, targetId)
			}
		}
	}

	const assignments = new Map<string, ClusterAssignment>()
	const visited = new Set<string>()
	const memoryIdsByOrder = [...allMemoryIds].sort(
		(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
	)

	for (const startId of memoryIdsByOrder) {
		if (visited.has(startId)) continue

		const component: string[] = []
		const queue = [startId]
		visited.add(startId)

		while (queue.length > 0) {
			const id = queue.shift() as string
			component.push(id)
			for (const nextId of adjacency.get(id) ?? []) {
				if (visited.has(nextId)) continue
				visited.add(nextId)
				queue.push(nextId)
			}
		}

		component.sort(
			(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
		)
		const firstId = component[0] ?? startId
		const docIds = new Set(component.map((id) => docByMemory.get(id)))
		const firstDocId = docByMemory.get(firstId) ?? "unknown"
		const key =
			docIds.size <= 1
				? `doc:${firstDocId}`
				: `relation:${firstDocId}:${firstId}`
		const assignment = {
			key,
			color: getClusterColor(key),
			size: component.length,
		}

		for (const id of component) assignments.set(id, assignment)
	}

	return assignments
}

function getMemoryRelationTargets(mem: GraphApiMemory): Record<string, string> {
	if (
		mem.memoryRelations &&
		typeof mem.memoryRelations === "object" &&
		Object.keys(mem.memoryRelations).length > 0
	) {
		return mem.memoryRelations
	}
	if (mem.parentMemoryId) return { [mem.parentMemoryId]: "updates" }
	return {}
}

function getDocumentClusterAssignment(
	doc: GraphApiDocument,
	assignments: Map<string, ClusterAssignment>,
): ClusterAssignment {
	const counts = new Map<
		string,
		{ assignment: ClusterAssignment; count: number }
	>()
	for (const mem of doc.memories) {
		const assignment = assignments.get(mem.id)
		if (!assignment) continue
		const entry = counts.get(assignment.key)
		if (entry) {
			entry.count++
		} else {
			counts.set(assignment.key, { assignment, count: 1 })
		}
	}

	let best: { assignment: ClusterAssignment; count: number } | null = null
	for (const entry of counts.values()) {
		if (!best || entry.count > best.count) best = entry
	}

	return (
		best?.assignment ?? {
			key: `doc:${doc.id}`,
			color: getClusterColor(`doc:${doc.id}`),
			size: 1,
		}
	)
}

function getMemoryNodeBorderColor(
	mem: GraphApiMemory,
	colors: GraphThemeColors,
	clusterColor?: string,
): string {
	const semanticColor = getMemoryBorderColor(mem, colors)
	return semanticColor === colors.memStrokeDefault && clusterColor
		? clusterColor
		: semanticColor
}

function ensureAdjacency(map: Map<string, Set<string>>, id: string) {
	if (!map.has(id)) map.set(id, new Set())
}

function connect(map: Map<string, Set<string>>, a: string, b: string) {
	ensureAdjacency(map, a)
	ensureAdjacency(map, b)
	map.get(a)?.add(b)
	map.get(b)?.add(a)
}

function hashString(value: string): number {
	let hash = 0
	for (let i = 0; i < value.length; i++) {
		hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
	}
	return hash >>> 0
}

/**
 * Simple deterministic hash of a string to a number in [0, 1).
 * Used for initial node placement so the force simulation has a
 * deterministic starting layout.
 */
function hashToUnit(str: string): number {
	let h = 0
	for (let i = 0; i < str.length; i++) {
		h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
	}
	return ((h >>> 0) % 10000) / 10000
}

export function getNodeBounds(nodes: GraphNode[]) {
	if (nodes.length === 0) return null

	let minX = Number.POSITIVE_INFINITY
	let minY = Number.POSITIVE_INFINITY
	let maxX = Number.NEGATIVE_INFINITY
	let maxY = Number.NEGATIVE_INFINITY

	for (const node of nodes) {
		const radius = node.size / 2
		minX = Math.min(minX, node.x - radius)
		minY = Math.min(minY, node.y - radius)
		maxX = Math.max(maxX, node.x + radius)
		maxY = Math.max(maxY, node.y + radius)
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
	}
}

export function getAppendPosition(
	existingNodes: GraphNode[],
	appendIndex: number,
	canvasWidth: number,
	canvasHeight: number,
) {
	const bounds = getNodeBounds(existingNodes)
	if (!bounds) {
		return { x: canvasWidth / 2, y: canvasHeight / 2 }
	}

	const boundsWidth = bounds.maxX - bounds.minX
	const boundsHeight = bounds.maxY - bounds.minY
	const baseRadiusX = boundsWidth / 2 + APPEND_CLUSTER_RADIUS + APPEND_AREA_GAP
	const baseRadiusY = boundsHeight / 2 + APPEND_CLUSTER_RADIUS + APPEND_AREA_GAP
	const ringStep = APPEND_CLUSTER_RADIUS + APPEND_AREA_GAP
	const seed = existingNodes.length + appendIndex

	for (let ring = 0; ring < APPEND_MAX_RINGS; ring++) {
		const radiusX = baseRadiusX + ring * ringStep
		const radiusY = baseRadiusY + ring * ringStep

		for (let attempt = 0; attempt < APPEND_CANDIDATES_PER_RING; attempt++) {
			const angle =
				(seed + attempt + ring * APPEND_CANDIDATES_PER_RING) * GOLDEN_ANGLE
			const candidate = {
				x: bounds.centerX + Math.cos(angle) * radiusX,
				y: bounds.centerY + Math.sin(angle) * radiusY,
			}

			if (isAppendCandidateOpen(candidate, existingNodes)) {
				return candidate
			}
		}
	}

	const fallbackAngle = seed * GOLDEN_ANGLE
	const fallbackRadiusX = baseRadiusX + APPEND_MAX_RINGS * ringStep
	const fallbackRadiusY = baseRadiusY + APPEND_MAX_RINGS * ringStep
	return {
		x: bounds.centerX + Math.cos(fallbackAngle) * fallbackRadiusX,
		y: bounds.centerY + Math.sin(fallbackAngle) * fallbackRadiusY,
	}
}

function isAppendCandidateOpen(
	candidate: { x: number; y: number },
	existingNodes: GraphNode[],
) {
	for (const node of existingNodes) {
		const minDistance = APPEND_CLUSTER_RADIUS + node.size / 2 + APPEND_AREA_GAP
		const dx = candidate.x - node.x
		if (Math.abs(dx) > minDistance) continue
		const dy = candidate.y - node.y
		if (Math.abs(dy) > minDistance) continue
		if (dx * dx + dy * dy < minDistance * minDistance) return false
	}

	return true
}

/**
 * Pure function that computes graph edges from documents.
 * Extracted from the hook for testability.
 */
export function computeEdges(documents: GraphApiDocument[]): GraphEdge[] {
	if (!documents || documents.length === 0) return []

	const result: GraphEdge[] = []
	const allNodeIds = new Set<string>()
	for (const doc of documents) {
		allNodeIds.add(doc.id)
		for (const mem of doc.memories) allNodeIds.add(mem.id)
	}

	// 1. Derives edges: document -> memory (structural)
	for (const doc of documents) {
		for (const mem of doc.memories) {
			result.push({
				id: `dm-${doc.id}-${mem.id}`,
				source: doc.id,
				target: mem.id,
				visualProps: getEdgeVisualProps("derives"),
				edgeType: "derives",
			})
		}
	}

	// 2. Memory-to-memory relation edges from backend data.
	//    Uses memoryRelations (Record<targetId, relationType>) as primary source,
	//    falls back to parentMemoryId for legacy data.
	for (const doc of documents) {
		for (const mem of doc.memories) {
			const relations = getMemoryRelationTargets(mem)

			for (const [targetId, relationType] of Object.entries(relations)) {
				if (!allNodeIds.has(targetId)) continue
				const edgeType =
					relationType === "updates" ||
					relationType === "extends" ||
					relationType === "derives"
						? relationType
						: "updates"
				result.push({
					id: `rel-${targetId}-${mem.id}`,
					source: targetId,
					target: mem.id,
					visualProps: getEdgeVisualProps(edgeType),
					edgeType,
				})
			}
		}
	}

	return result
}

export function useGraphData(
	documents: GraphApiDocument[],
	draggingNodeId: string | null,
	canvasWidth: number,
	canvasHeight: number,
	colors: GraphThemeColors,
) {
	const nodeCache = useRef<Map<string, GraphNode>>(new Map())

	const nodes = useMemo(() => {
		if (!documents || documents.length === 0) {
			nodeCache.current.clear()
			return []
		}

		const currentIds = new Set<string>()
		for (const doc of documents) {
			currentIds.add(doc.id)
			for (const mem of doc.memories) currentIds.add(mem.id)
		}

		for (const [id] of nodeCache.current.entries()) {
			if (!currentIds.has(id)) nodeCache.current.delete(id)
		}

		const appendPlacementNodes = Array.from(nodeCache.current.values())
		let appendIndex = 0
		const clusterAssignments = computeClusterAssignments(documents)

		const result: GraphNode[] = []
		// Spiral layout: documents form a compact spiral core, memories orbit
		// around their parent documents. The force simulation then gently
		// pushes memories outward to create the constellation/starburst effect.
		const cx = canvasWidth / 2
		const cy = canvasHeight / 2
		const docCount = documents.length
		// Wide spiral so documents start well-separated. The simulation
		// refines positions but the initial spread prevents clustering.
		const spiralScale = Math.sqrt(docCount) * 60
		// Golden angle (~137.5 deg) produces optimal packing in a spiral
		const goldenAngle = Math.PI * (3 - Math.sqrt(5))

		for (let docIdx = 0; docIdx < docCount; docIdx++) {
			const doc = documents[docIdx]
			const docCluster = getDocumentClusterAssignment(doc, clusterAssignments)
			const angle = docIdx * goldenAngle
			const radius = spiralScale * Math.sqrt((docIdx + 1) / docCount)
			const initialX = cx + Math.cos(angle) * radius
			const initialY = cy + Math.sin(angle) * radius

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
				docNode.borderColor = docCluster.color
				docNode.clusterKey = docCluster.key
				docNode.clusterColor = docCluster.color
				docNode.isDragging = draggingNodeId === doc.id
			} else {
				const appendPosition =
					appendPlacementNodes.length > 0
						? getAppendPosition(
								appendPlacementNodes,
								appendIndex++,
								canvasWidth,
								canvasHeight,
							)
						: null

				docNode = {
					id: doc.id,
					type: "document",
					x: appendPosition?.x ?? initialX,
					y: appendPosition?.y ?? initialY,
					data: docData,
					size: 50,
					borderColor: docCluster.color,
					clusterKey: docCluster.key,
					clusterColor: docCluster.color,
					isHovered: false,
					isDragging: false,
				}
				nodeCache.current.set(doc.id, docNode)
				appendPlacementNodes.push(docNode)
			}
			result.push(docNode)

			const memCount = doc.memories.length
			for (let i = 0; i < memCount; i++) {
				const mem = doc.memories[i]
				if (!mem) continue
				let memNode = nodeCache.current.get(mem.id)
				const memData: MemoryNodeData = {
					...mem,
					documentId: doc.id,
					content: mem.memory,
				}

				if (memNode) {
					memNode.data = memData
					const cluster = clusterAssignments.get(mem.id)
					memNode.borderColor = getMemoryNodeBorderColor(
						mem,
						colors,
						cluster?.color,
					)
					memNode.clusterKey = cluster?.key ?? null
					memNode.clusterColor = cluster?.color ?? null
					memNode.isDragging = draggingNodeId === mem.id
				} else {
					const memOffset = getMemoryOrbitOffset(i, memCount, mem.id)
					const cluster = clusterAssignments.get(mem.id)
					memNode = {
						id: mem.id,
						type: "memory",
						x: docNode.x + memOffset.x,
						y: docNode.y + memOffset.y,
						data: memData,
						size: 36,
						borderColor: getMemoryNodeBorderColor(mem, colors, cluster?.color),
						clusterKey: cluster?.key ?? null,
						clusterColor: cluster?.color ?? null,
						isHovered: false,
						isDragging: false,
					}
					nodeCache.current.set(mem.id, memNode)
					appendPlacementNodes.push(memNode)
				}
				result.push(memNode)
			}
		}

		return result
	}, [documents, canvasWidth, canvasHeight, draggingNodeId, colors])

	const edges = useMemo(() => computeEdges(documents), [documents])

	return { nodes, edges }
}
