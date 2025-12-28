"use client"

import { useEffect, useRef, useCallback } from "react"
import * as d3 from "d3-force"
import { FORCE_CONFIG } from "@/constants"
import type { GraphNode, GraphEdge } from "@/types"

export interface ForceSimulationControls {
	/** The d3 simulation instance */
	simulation: d3.Simulation<GraphNode, GraphEdge> | null
	/** Reheat the simulation (call on drag start) */
	reheat: () => void
	/** Cool down the simulation (call on drag end) */
	coolDown: () => void
	/** Check if simulation is currently active */
	isActive: () => boolean
	/** Stop the simulation completely */
	stop: () => void
	/** Get current alpha value */
	getAlpha: () => number
}

/**
 * Custom hook to manage d3-force simulation lifecycle
 * Simulation only runs during interactions (drag) for performance
 */
export function useForceSimulation(
	nodes: GraphNode[],
	edges: GraphEdge[],
	onTick: () => void,
	enabled = true,
): ForceSimulationControls {
	const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

	// Initialize simulation ONCE
	useEffect(() => {
		if (!enabled || nodes.length === 0) {
			return
		}

		// Only create simulation once
		if (!simulationRef.current) {
			const simulation = d3
				.forceSimulation<GraphNode>(nodes)
				.alphaDecay(FORCE_CONFIG.alphaDecay)
				.alphaMin(FORCE_CONFIG.alphaMin)
				.velocityDecay(FORCE_CONFIG.velocityDecay)
				.on("tick", () => {
					// Trigger re-render by calling onTick
					// D3 has already mutated node.x and node.y
					onTick()
				})

			// Configure forces
			// 1. Link force - spring connections between nodes
			simulation.force(
				"link",
				d3
					.forceLink<GraphNode, GraphEdge>(edges)
					.id((d) => d.id)
					.distance(FORCE_CONFIG.linkDistance)
					.strength((link) => {
						// Different strength based on edge type
						if (link.edgeType === "doc-memory") {
							return FORCE_CONFIG.linkStrength.docMemory
						}
						if (link.edgeType === "version") {
							return FORCE_CONFIG.linkStrength.version
						}
						// doc-doc: variable strength based on similarity
						return link.similarity * FORCE_CONFIG.linkStrength.docDocBase
					}),
			)

			// 2. Charge force - repulsion between nodes
			simulation.force(
				"charge",
				d3.forceManyBody<GraphNode>().strength(FORCE_CONFIG.chargeStrength),
			)

			// 3. Collision force - prevent node overlap
			simulation.force(
				"collide",
				d3
					.forceCollide<GraphNode>()
					.radius((d) =>
						d.type === "document"
							? FORCE_CONFIG.collisionRadius.document
							: FORCE_CONFIG.collisionRadius.memory,
					)
					.strength(0.7),
			)

			// 4. forceX and forceY - weak centering forces (like reference code)
			simulation.force("x", d3.forceX().strength(0.05))
			simulation.force("y", d3.forceY().strength(0.05))

			// Store reference
			simulationRef.current = simulation

			// Quick pre-settle to avoid initial chaos, then animate the rest
			// This gives best of both worlds: fast initial render + smooth settling
			simulation.alpha(1)
			for (let i = 0; i < 50; ++i) simulation.tick() // Just 50 ticks = ~5-10ms
			simulation.alphaTarget(0).restart() // Continue animating to full stability
		}

		// Cleanup on unmount
		return () => {
			if (simulationRef.current) {
				simulationRef.current.stop()
				simulationRef.current = null
			}
		}
		// Only run on mount/unmount, not when nodes/edges/onTick change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled])

	// Update simulation nodes and edges together to prevent race conditions
	useEffect(() => {
		if (!simulationRef.current) return

		// Update nodes
		if (nodes.length > 0) {
			simulationRef.current.nodes(nodes)
		}

		// Update edges
		if (edges.length > 0) {
			const linkForce = simulationRef.current.force<
				d3.ForceLink<GraphNode, GraphEdge>
			>("link")
			if (linkForce) {
				linkForce.links(edges)
			}
		}
	}, [nodes, edges])

	// Reheat simulation (called on drag start)
	const reheat = useCallback(() => {
		if (simulationRef.current) {
			simulationRef.current.alphaTarget(FORCE_CONFIG.alphaTarget).restart()
		}
	}, [])

	// Cool down simulation (called on drag end)
	const coolDown = useCallback(() => {
		if (simulationRef.current) {
			simulationRef.current.alphaTarget(0)
		}
	}, [])

	// Check if simulation is active
	const isActive = useCallback(() => {
		if (!simulationRef.current) return false
		return simulationRef.current.alpha() > FORCE_CONFIG.alphaMin
	}, [])

	// Stop simulation completely
	const stop = useCallback(() => {
		if (simulationRef.current) {
			simulationRef.current.stop()
		}
	}, [])

	// Get current alpha
	const getAlpha = useCallback(() => {
		if (!simulationRef.current) return 0
		return simulationRef.current.alpha()
	}, [])

	return {
		simulation: simulationRef.current,
		reheat,
		coolDown,
		isActive,
		stop,
		getAlpha,
	}
}
