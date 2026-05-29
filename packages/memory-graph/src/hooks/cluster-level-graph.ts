import type {
	ClusterNodeData,
	GraphEdge,
	GraphNode,
	MemoryNodeData,
} from "../types"

const CLUSTER_TARGET_RAW_NODES = 150
const CLUSTER_MIN_SIZE = 68
const CLUSTER_MAX_SIZE = 142
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface ClusterLevelGraph {
	nodes: GraphNode[]
	edges: GraphEdge[]
	isClustered: boolean
	clusterCount: number
	rawNodeToClusterId: Map<string, string>
}

interface ClusterGroup {
	id: string
	key: string
	color: string
	rawNodes: GraphNode[]
	documentCount: number
	memoryCount: number
	sampleDocumentIds: string[]
	sampleMemoryIds: string[]
}

export function buildClusterLevelGraph({
	nodes,
	edges,
	enabled,
	expandedClusterId,
	revealRawGraph,
	canvasWidth,
	canvasHeight,
}: {
	nodes: GraphNode[]
	edges: GraphEdge[]
	enabled: boolean
	expandedClusterId: string | null
	revealRawGraph: boolean
	canvasWidth: number
	canvasHeight: number
}): ClusterLevelGraph {
	if (!enabled || revealRawGraph || nodes.length === 0) {
		return {
			nodes,
			edges,
			isClustered: false,
			clusterCount: 0,
			rawNodeToClusterId: new Map(),
		}
	}

	const groups = buildClusterGroups(nodes)
	if (groups.length === 0) {
		return {
			nodes,
			edges,
			isClustered: false,
			clusterCount: 0,
			rawNodeToClusterId: new Map(),
		}
	}

	const rawNodeToClusterId = new Map<string, string>()
	for (const group of groups) {
		for (const node of group.rawNodes) {
			rawNodeToClusterId.set(node.id, group.id)
		}
	}

	const visibleNodes: GraphNode[] = []
	const visibleIds = new Set<string>()
	const clusterNodeById = new Map<string, GraphNode>()

	for (let index = 0; index < groups.length; index++) {
		const group = groups[index]
		if (!group) continue

		const clusterNode = createClusterNode(
			group,
			index,
			groups.length,
			canvasWidth,
			canvasHeight,
		)

		if (expandedClusterId === group.id) {
			for (const rawNode of cloneExpandedNodes(group.rawNodes, clusterNode)) {
				visibleNodes.push(rawNode)
				visibleIds.add(rawNode.id)
			}
			continue
		}

		clusterNodeById.set(group.id, clusterNode)
		visibleNodes.push(clusterNode)
		visibleIds.add(clusterNode.id)
	}

	const visibleEdges = buildVisibleEdges(
		edges,
		visibleIds,
		rawNodeToClusterId,
		clusterNodeById,
	)

	return {
		nodes: visibleNodes,
		edges: visibleEdges,
		isClustered: true,
		clusterCount: groups.length,
		rawNodeToClusterId,
	}
}

function cloneExpandedNodes(
	nodes: GraphNode[],
	clusterNode: GraphNode,
): GraphNode[] {
	if (nodes.length === 0) return []

	let centerX = 0
	let centerY = 0
	for (const node of nodes) {
		centerX += node.x
		centerY += node.y
	}
	centerX /= nodes.length
	centerY /= nodes.length

	let maxDistance = 1
	for (const node of nodes) {
		const dx = node.x - centerX
		const dy = node.y - centerY
		maxDistance = Math.max(maxDistance, Math.sqrt(dx * dx + dy * dy))
	}

	const scale = Math.min(0.72, 620 / maxDistance)

	return nodes.map((node) => ({
		...node,
		x: clusterNode.x + (node.x - centerX) * scale,
		y: clusterNode.y + (node.y - centerY) * scale,
	}))
}

function buildClusterGroups(nodes: GraphNode[]): ClusterGroup[] {
	const memoriesByDocumentId = new Map<string, GraphNode[]>()
	const documentNodes: GraphNode[] = []
	const looseNodes: GraphNode[] = []

	for (const node of nodes) {
		if (node.type === "document") {
			documentNodes.push(node)
			continue
		}

		if (node.type === "memory") {
			const documentId = (node.data as MemoryNodeData).documentId
			const bucket = memoriesByDocumentId.get(documentId)
			if (bucket) {
				bucket.push(node)
			} else {
				memoriesByDocumentId.set(documentId, [node])
			}
			continue
		}

		looseNodes.push(node)
	}

	if (documentNodes.length === 0) return chunkLooseNodes(looseNodes)

	const groups: ClusterGroup[] = []
	let current: GraphNode[] = []
	let currentDocuments = 0
	let currentMemories = 0

	const flush = () => {
		if (current.length === 0) return
		groups.push(
			createGroup(groups.length, current, currentDocuments, currentMemories),
		)
		current = []
		currentDocuments = 0
		currentMemories = 0
	}

	for (const doc of documentNodes) {
		const memories = memoriesByDocumentId.get(doc.id) ?? []
		const docGroupSize = 1 + memories.length
		if (
			current.length > 0 &&
			current.length + docGroupSize > CLUSTER_TARGET_RAW_NODES
		) {
			flush()
		}

		current.push(doc, ...memories)
		currentDocuments++
		currentMemories += memories.length

		if (current.length >= CLUSTER_TARGET_RAW_NODES) flush()
	}
	flush()

	if (looseNodes.length > 0) {
		for (const looseGroup of chunkLooseNodes(looseNodes, groups.length)) {
			groups.push(looseGroup)
		}
	}

	return groups
}

function chunkLooseNodes(nodes: GraphNode[], offset = 0): ClusterGroup[] {
	const groups: ClusterGroup[] = []
	for (let i = 0; i < nodes.length; i += CLUSTER_TARGET_RAW_NODES) {
		const chunk = nodes.slice(i, i + CLUSTER_TARGET_RAW_NODES)
		groups.push(
			createGroup(
				offset + groups.length,
				chunk,
				chunk.filter((node) => node.type === "document").length,
				chunk.filter((node) => node.type === "memory").length,
			),
		)
	}
	return groups
}

function createGroup(
	index: number,
	rawNodes: GraphNode[],
	documentCount: number,
	memoryCount: number,
): ClusterGroup {
	const firstNode = rawNodes[0]
	const key = `supercluster:${index}:${firstNode?.clusterKey ?? firstNode?.id ?? "empty"}`
	const sampleDocumentIds = rawNodes
		.filter((node) => node.type === "document")
		.slice(0, 5)
		.map((node) => node.id)
	const sampleMemoryIds = rawNodes
		.filter((node) => node.type === "memory")
		.slice(0, 5)
		.map((node) => node.id)
	const color =
		firstNode?.clusterColor ?? firstNode?.borderColor ?? "rgba(88, 199, 232, 1)"

	return {
		id: `cluster:${index}`,
		key,
		color,
		rawNodes,
		documentCount,
		memoryCount,
		sampleDocumentIds,
		sampleMemoryIds,
	}
}

function createClusterNode(
	group: ClusterGroup,
	index: number,
	total: number,
	canvasWidth: number,
	canvasHeight: number,
): GraphNode {
	const centerX = canvasWidth / 2
	const centerY = canvasHeight / 2
	const spread = Math.max(420, Math.sqrt(total) * 210)
	const angle = index * GOLDEN_ANGLE
	const radius = spread * Math.sqrt((index + 1) / Math.max(1, total))
	const nodeCount = group.rawNodes.length
	const size = clamp(
		CLUSTER_MIN_SIZE + Math.sqrt(nodeCount) * 3.8,
		CLUSTER_MIN_SIZE,
		CLUSTER_MAX_SIZE,
	)
	const data: ClusterNodeData = {
		id: group.id,
		title: `${group.documentCount} documents`,
		summary: `${group.memoryCount} memories grouped for fast graph browsing`,
		clusterKey: group.key,
		documentCount: group.documentCount,
		memoryCount: group.memoryCount,
		nodeCount,
		sampleDocumentIds: group.sampleDocumentIds,
		sampleMemoryIds: group.sampleMemoryIds,
	}

	return {
		id: group.id,
		type: "cluster",
		x: centerX + Math.cos(angle) * radius,
		y: centerY + Math.sin(angle) * radius,
		data,
		size,
		borderColor: group.color,
		clusterKey: group.key,
		clusterColor: group.color,
		isHovered: false,
		isDragging: false,
	}
}

function buildVisibleEdges(
	edges: GraphEdge[],
	visibleIds: Set<string>,
	rawNodeToClusterId: Map<string, string>,
	clusterNodeById: Map<string, GraphNode>,
): GraphEdge[] {
	const result = new Map<
		string,
		{ edge: GraphEdge; count: number; opacity: number; thickness: number }
	>()

	for (const edge of edges) {
		const sourceId = getEndpointId(edge.source)
		const targetId = getEndpointId(edge.target)
		const visibleSource = visibleIds.has(sourceId)
		const visibleTarget = visibleIds.has(targetId)
		const sourceClusterId = rawNodeToClusterId.get(sourceId)
		const targetClusterId = rawNodeToClusterId.get(targetId)
		const displaySource = visibleSource ? sourceId : sourceClusterId
		const displayTarget = visibleTarget ? targetId : targetClusterId

		if (!displaySource || !displayTarget || displaySource === displayTarget)
			continue

		const source = clusterNodeById.get(displaySource) ?? displaySource
		const target = clusterNodeById.get(displayTarget) ?? displayTarget
		const key = `${displaySource}->${displayTarget}:${edge.edgeType}`
		const existing = result.get(key)

		if (existing) {
			existing.count++
			existing.opacity = Math.max(existing.opacity, edge.visualProps.opacity)
			existing.thickness = Math.max(
				existing.thickness,
				edge.visualProps.thickness,
			)
			continue
		}

		result.set(key, {
			count: 1,
			opacity: edge.visualProps.opacity,
			thickness: edge.visualProps.thickness,
			edge: {
				id: `cluster-edge:${key}`,
				source,
				target,
				edgeType: edge.edgeType,
				visualProps: { ...edge.visualProps },
			},
		})
	}

	return [...result.values()].map(({ edge, count, opacity, thickness }) => ({
		...edge,
		visualProps: {
			opacity: clamp(opacity + Math.log2(count) * 0.025, 0.12, 0.62),
			thickness: clamp(thickness + Math.log2(count) * 0.2, 0.8, 4),
		},
	}))
}

function getEndpointId(endpoint: string | GraphNode): string {
	return typeof endpoint === "string" ? endpoint : endpoint.id
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}
