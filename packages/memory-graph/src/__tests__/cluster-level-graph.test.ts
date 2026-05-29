import { describe, expect, it } from "vitest"
import { buildClusterLevelGraph } from "../hooks/cluster-level-graph"
import type { GraphEdge, GraphNode, MemoryNodeData } from "../types"

function makeDocumentNode(index: number): GraphNode {
	const id = `doc-${index}`
	return {
		id,
		type: "document",
		x: index * 120,
		y: 0,
		data: {
			id,
			title: id,
			summary: null,
			type: "text",
			createdAt: "2024-01-01",
			updatedAt: "2024-01-01",
			memories: [],
		},
		size: 50,
		borderColor: "#58C7E8",
		clusterColor: "#58C7E8",
		isHovered: false,
		isDragging: false,
	}
}

function makeMemoryNode(documentId: string, index: number): GraphNode {
	const id = `${documentId}-mem-${index}`
	const data: MemoryNodeData = {
		id,
		memory: id,
		content: id,
		documentId,
		isStatic: false,
		isLatest: true,
		isForgotten: false,
		forgetAfter: null,
		forgetReason: null,
		version: 1,
		parentMemoryId: null,
		spaceId: "space",
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
	}

	return {
		id,
		type: "memory",
		x: index * 80,
		y: 120,
		data,
		size: 36,
		borderColor: "#58C7E8",
		clusterColor: "#58C7E8",
		isHovered: false,
		isDragging: false,
	}
}

function makeGraph(documentCount: number, memoriesPerDocument: number) {
	const nodes: GraphNode[] = []
	const edges: GraphEdge[] = []

	for (let docIndex = 0; docIndex < documentCount; docIndex++) {
		const doc = makeDocumentNode(docIndex)
		nodes.push(doc)

		for (let memIndex = 0; memIndex < memoriesPerDocument; memIndex++) {
			const memory = makeMemoryNode(doc.id, memIndex)
			nodes.push(memory)
			edges.push({
				id: `dm-${doc.id}-${memory.id}`,
				source: doc.id,
				target: memory.id,
				edgeType: "derives",
				visualProps: { opacity: 0.4, thickness: 1.2 },
			})
		}
	}

	return { nodes, edges }
}

describe("buildClusterLevelGraph", () => {
	it("collapses dense raw graphs into aggregate cluster nodes", () => {
		const graph = makeGraph(500, 2)
		const clustered = buildClusterLevelGraph({
			...graph,
			enabled: true,
			expandedClusterId: null,
			revealRawGraph: false,
			canvasWidth: 1200,
			canvasHeight: 800,
		})

		expect(clustered.isClustered).toBe(true)
		expect(clustered.nodes.length).toBeLessThan(graph.nodes.length)
		expect(clustered.nodes.every((node) => node.type === "cluster")).toBe(true)
		expect(clustered.nodes[0]?.data).toMatchObject({
			documentCount: 50,
			memoryCount: 100,
			nodeCount: 150,
		})
	})

	it("expands a selected cluster while keeping other groups collapsed", () => {
		const graph = makeGraph(120, 2)
		const collapsed = buildClusterLevelGraph({
			...graph,
			enabled: true,
			expandedClusterId: null,
			revealRawGraph: false,
			canvasWidth: 1200,
			canvasHeight: 800,
		})
		const clusterId = collapsed.nodes[0]?.id ?? null

		const expanded = buildClusterLevelGraph({
			...graph,
			enabled: true,
			expandedClusterId: clusterId,
			revealRawGraph: false,
			canvasWidth: 1200,
			canvasHeight: 800,
		})

		expect(expanded.nodes.some((node) => node.type === "document")).toBe(true)
		expect(expanded.nodes.some((node) => node.type === "memory")).toBe(true)
		expect(expanded.nodes.some((node) => node.type === "cluster")).toBe(true)
	})
})
