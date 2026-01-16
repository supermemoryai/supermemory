"use client"

import { useMemo } from "react"
import type { ViewportGraphNode, ViewportGraphEdge } from "@/lib/viewport-graph-types"
import type { GraphNode, GraphEdge } from "./types"
import { NODE_SIZES } from "./constants"

export function useGraphData(
	nodes: ViewportGraphNode[],
	edges: ViewportGraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
	const graphNodes = useMemo((): GraphNode[] => {
		return nodes.map((node) => ({
			id: node.id,
			type: node.type,
			x: node.x,
			y: node.y,
			data: node.data,
			size: node.type === "document" ? NODE_SIZES.document : NODE_SIZES.memory,
			color: node.color,
			isHovered: node.isHovered,
			parentDocumentId: node.parentDocumentId,
		}))
	}, [nodes])

	const graphEdges = useMemo((): GraphEdge[] => {
		return edges.map((edge) => ({
			id: edge.id,
			source: typeof edge.source === "string" ? edge.source : edge.source.id,
			target: typeof edge.target === "string" ? edge.target : edge.target.id,
			similarity: edge.similarity,
			color: edge.color,
			opacity: edge.opacity,
			thickness: edge.thickness,
			edgeType: edge.edgeType,
		}))
	}, [edges])

	return { nodes: graphNodes, edges: graphEdges }
}
