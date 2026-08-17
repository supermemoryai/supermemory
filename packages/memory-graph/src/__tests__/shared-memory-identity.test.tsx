import { cleanup, render, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryGraph } from "../components/memory-graph"
import { DEFAULT_COLORS } from "../constants"
import { computeEdges, useGraphData } from "../hooks/use-graph-data"
import type {
	GraphApiDocument,
	GraphApiMemory,
	DocumentNodeData,
	GraphEdge,
	GraphNode,
	MemoryNodeData,
} from "../types"

const graphCanvasCapture = vi.hoisted(() => ({
	nodes: [] as GraphNode[],
	edges: [] as GraphEdge[],
}))

vi.mock("../components/graph-canvas", () => ({
	GraphCanvas: ({
		nodes,
		edges,
	}: {
		nodes: GraphNode[]
		edges: GraphEdge[]
	}) => {
		graphCanvasCapture.nodes = nodes
		graphCanvasCapture.edges = edges
		return null
	},
}))

afterEach(() => {
	cleanup()
	graphCanvasCapture.nodes = []
	graphCanvasCapture.edges = []
	vi.restoreAllMocks()
})

function makeMemory(overrides: Partial<GraphApiMemory> = {}): GraphApiMemory {
	return {
		id: "memory",
		memory: "A remembered fact",
		isStatic: false,
		spaceId: "space",
		isLatest: true,
		isForgotten: false,
		forgetAfter: null,
		forgetReason: null,
		version: 1,
		parentMemoryId: null,
		rootMemoryId: null,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		memoryRelations: null,
		...overrides,
	}
}

function makeDocument(
	id: string,
	memories: GraphApiMemory[],
): GraphApiDocument {
	return {
		id,
		title: id,
		summary: null,
		documentType: "text",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		memories,
	}
}

function getMemoryNode(
	nodes: GraphNode[],
	id: string,
): GraphNode & { data: MemoryNodeData } {
	const node = nodes.find((candidate) => candidate.id === id)
	expect(node?.type).toBe("memory")
	if (!node || !("documentId" in node.data)) {
		throw new Error(`Missing memory ${id}`)
	}
	return node as GraphNode & { data: MemoryNodeData }
}

function getDocumentNode(
	nodes: GraphNode[],
	id: string,
): GraphNode & { data: DocumentNodeData } {
	const node = nodes.find((candidate) => candidate.id === id)
	expect(node?.type).toBe("document")
	if (!node || !("memories" in node.data)) {
		throw new Error(`Missing document ${id}`)
	}
	return node as GraphNode & { data: DocumentNodeData }
}

describe("shared memory identity", () => {
	it("materializes the first source occurrence once while retaining every document edge", () => {
		const documents = [
			makeDocument("doc-a", [
				makeMemory({ id: "shared-memory", memory: "first source content" }),
			]),
			makeDocument("doc-b", [
				makeMemory({ id: "shared-memory", memory: "later source content" }),
			]),
		]
		const { result, unmount } = renderHook(() =>
			useGraphData(documents, null, 800, 600, DEFAULT_COLORS),
		)

		const nodeIds = result.current.nodes.map((node) => node.id)
		const sharedNode = getMemoryNode(result.current.nodes, "shared-memory")
		const derivesEdges = result.current.edges.filter(
			(edge) => edge.edgeType === "derives",
		)

		expect(nodeIds).toHaveLength(3)
		expect(new Set(nodeIds).size).toBe(nodeIds.length)
		expect(sharedNode.data.content).toBe("first source content")
		expect(sharedNode.data.documentId).toBe("doc-a")
		expect(derivesEdges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "dm-5:doc-a|13:shared-memory",
					source: "doc-a",
					target: "shared-memory",
				}),
				expect.objectContaining({
					id: "dm-5:doc-b|13:shared-memory",
					source: "doc-b",
					target: "shared-memory",
				}),
			]),
		)
		expect(derivesEdges).toHaveLength(2)

		unmount()
	})

	it("preserves cached position when another source occurrence is appended", () => {
		const firstDocuments = [
			makeDocument("doc-a", [makeMemory({ id: "shared-memory" })]),
		]
		const { result, rerender, unmount } = renderHook(
			({ documents }: { documents: GraphApiDocument[] }) =>
				useGraphData(documents, null, 800, 600, DEFAULT_COLORS),
			{ initialProps: { documents: firstDocuments } },
		)
		const firstNode = getMemoryNode(result.current.nodes, "shared-memory")

		rerender({
			documents: [
				...firstDocuments,
				makeDocument("doc-b", [makeMemory({ id: "shared-memory" })]),
			],
		})

		const rerenderedNode = getMemoryNode(result.current.nodes, "shared-memory")
		expect({ x: rerenderedNode.x, y: rerenderedNode.y }).toEqual({
			x: firstNode.x,
			y: firstNode.y,
		})
		expect(rerenderedNode.data.documentId).toBe("doc-a")

		unmount()
	})

	it("unions relation pairs but keeps direction, type, and first occurrence", () => {
		const documents = [
			makeDocument("doc-a", [
				makeMemory({
					id: "shared-memory",
					memoryRelations: { "target-a": "updates" },
				}),
				makeMemory({ id: "target-a" }),
			]),
			makeDocument("doc-b", [
				makeMemory({
					id: "shared-memory",
					memoryRelations: {
						"target-a": "extends",
						"target-b": "extends",
					},
				}),
				makeMemory({ id: "target-b" }),
			]),
		]

		const relationEdges = computeEdges(documents).filter((edge) =>
			edge.id.startsWith("rel-"),
		)

		expect(relationEdges).toHaveLength(2)
		expect(relationEdges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "rel-8:target-a|13:shared-memory",
					source: "target-a",
					target: "shared-memory",
					edgeType: "updates",
				}),
				expect.objectContaining({
					id: "rel-8:target-b|13:shared-memory",
					source: "target-b",
					target: "shared-memory",
					edgeType: "extends",
				}),
			]),
		)
	})

	it("does not collide for ambiguous relation or derives tuples", () => {
		const relationDocuments = [
			makeDocument("relations", [
				makeMemory({ id: "a-b" }),
				makeMemory({ id: "c", memoryRelations: { "a-b": "updates" } }),
				makeMemory({ id: "a" }),
				makeMemory({ id: "b-c", memoryRelations: { a: "extends" } }),
			]),
		]
		const relationEdges = computeEdges(relationDocuments).filter((edge) =>
			edge.id.startsWith("rel-"),
		)

		expect(relationEdges.map((edge) => edge.id).sort()).toEqual([
			"rel-1:a|3:b-c",
			"rel-3:a-b|1:c",
		])
		expect(new Set(relationEdges.map((edge) => edge.id)).size).toBe(2)

		const derivesEdges = computeEdges([
			makeDocument("a-b", [makeMemory({ id: "c" })]),
			makeDocument("a", [makeMemory({ id: "b-c" })]),
		]).filter((edge) => edge.edgeType === "derives")

		expect(derivesEdges.map((edge) => edge.id).sort()).toEqual([
			"dm-1:a|3:b-c",
			"dm-3:a-b|1:c",
		])
		expect(new Set(derivesEdges.map((edge) => edge.id)).size).toBe(2)
	})
})

describe("MemoryGraph maxNodes", () => {
	it("counts unique memories and retains a later duplicate after saturation", async () => {
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
			bottom: 600,
			height: 600,
			left: 0,
			right: 800,
			top: 0,
			width: 800,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		})
		const documents = [
			makeDocument("doc-a", [
				makeMemory({ id: "shared-memory" }),
				makeMemory({ id: "unique-a" }),
			]),
			makeDocument("doc-b", [
				makeMemory({ id: "over-budget" }),
				makeMemory({ id: "shared-memory" }),
			]),
		]

		render(<MemoryGraph documents={documents} maxNodes={4} />)

		await waitFor(() => {
			expect(graphCanvasCapture.nodes).toHaveLength(4)
		})
		expect(graphCanvasCapture.nodes.map((node) => node.id).sort()).toEqual([
			"doc-a",
			"doc-b",
			"shared-memory",
			"unique-a",
		])
		const docB = getDocumentNode(graphCanvasCapture.nodes, "doc-b")
		expect(docB.data.memories.map((memory) => memory.id)).toEqual([
			"shared-memory",
		])
	})
})
