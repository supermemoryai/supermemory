"use client";

import {
	calculateSemanticSimilarity,
	getConnectionVisualProps,
	getMagicalConnectionColor,
} from "@/lib/similarity";
import { useMemo } from "react";
import { colors, LAYOUT_CONSTANTS } from "@/constants";
import type {
	DocumentsResponse,
	DocumentWithMemories,
	GraphEdge,
	GraphNode,
	MemoryEntry,
	MemoryRelation,
} from "@/types";

export function useGraphData(
	data: DocumentsResponse | null,
	selectedSpace: string,
	nodePositions: Map<string, { x: number; y: number }>,
	draggingNodeId: string | null,
) {
	return useMemo(() => {
		if (!data?.documents) return { nodes: [], edges: [] };

		const allNodes: GraphNode[] = [];
		const allEdges: GraphEdge[] = [];

		// Filter documents that have memories in selected space
		const filteredDocuments = data.documents
			.map((doc) => ({
				...doc,
				memoryEntries:
					selectedSpace === "all"
						? doc.memoryEntries
						: doc.memoryEntries.filter(
								(memory) =>
									(memory.spaceContainerTag ?? memory.spaceId ?? "default") ===
									selectedSpace,
							),
			}))
			.filter((doc) => doc.memoryEntries.length > 0);

		// Group documents by space for better clustering
		const documentsBySpace = new Map<string, typeof filteredDocuments>();
		filteredDocuments.forEach((doc) => {
			const docSpace =
				doc.memoryEntries[0]?.spaceContainerTag ??
				doc.memoryEntries[0]?.spaceId ??
				"default";
			if (!documentsBySpace.has(docSpace)) {
				documentsBySpace.set(docSpace, []);
			}
			const spaceDocsArr = documentsBySpace.get(docSpace);
			if (spaceDocsArr) {
				spaceDocsArr.push(doc);
			}
		});

		// Enhanced Layout with Space Separation
		const { centerX, centerY, clusterRadius, spaceSpacing, documentSpacing } =
			LAYOUT_CONSTANTS;

		/* 1. Build DOCUMENT nodes with space-aware clustering */
		const documentNodes: GraphNode[] = [];
		let spaceIndex = 0;

		documentsBySpace.forEach((spaceDocs) => {
			const spaceAngle = (spaceIndex / documentsBySpace.size) * Math.PI * 2;
			const spaceOffsetX = Math.cos(spaceAngle) * spaceSpacing;
			const spaceOffsetY = Math.sin(spaceAngle) * spaceSpacing;
			const spaceCenterX = centerX + spaceOffsetX;
			const spaceCenterY = centerY + spaceOffsetY;

			spaceDocs.forEach((doc, docIndex) => {
				// Create proper circular layout with concentric rings
				const docsPerRing = 6; // Start with 6 docs in inner ring
				let currentRing = 0;
				let docsInCurrentRing = docsPerRing;
				let totalDocsInPreviousRings = 0;

				// Find which ring this document belongs to
				while (totalDocsInPreviousRings + docsInCurrentRing <= docIndex) {
					totalDocsInPreviousRings += docsInCurrentRing;
					currentRing++;
					docsInCurrentRing = docsPerRing + currentRing * 4; // Each ring has more docs
				}

				// Position within the ring
				const positionInRing = docIndex - totalDocsInPreviousRings;
				const angleInRing = (positionInRing / docsInCurrentRing) * Math.PI * 2;

				// Radius increases significantly with each ring
				const baseRadius = documentSpacing * 0.8;
				const radius =
					currentRing === 0
						? baseRadius
						: baseRadius + currentRing * documentSpacing * 1.2;

				const defaultX = spaceCenterX + Math.cos(angleInRing) * radius;
				const defaultY = spaceCenterY + Math.sin(angleInRing) * radius;

				const customPos = nodePositions.get(doc.id);

				documentNodes.push({
					id: doc.id,
					type: "document",
					x: customPos?.x ?? defaultX,
					y: customPos?.y ?? defaultY,
					data: doc,
					size: 58,
					color: colors.document.primary,
					isHovered: false,
					isDragging: draggingNodeId === doc.id,
				} satisfies GraphNode);
			});

			spaceIndex++;
		});

		/* 2. Gentle document collision avoidance with dampening */
		const minDocDist = LAYOUT_CONSTANTS.minDocDist;

		// Reduced iterations and gentler repulsion for smoother movement
		for (let iter = 0; iter < 2; iter++) {
			documentNodes.forEach((nodeA) => {
				documentNodes.forEach((nodeB) => {
					if (nodeA.id >= nodeB.id) return;

					// Only repel documents in the same space
					const spaceA =
						(nodeA.data as DocumentWithMemories).memoryEntries[0]
							?.spaceContainerTag ??
						(nodeA.data as DocumentWithMemories).memoryEntries[0]?.spaceId ??
						"default";
					const spaceB =
						(nodeB.data as DocumentWithMemories).memoryEntries[0]
							?.spaceContainerTag ??
						(nodeB.data as DocumentWithMemories).memoryEntries[0]?.spaceId ??
						"default";

					if (spaceA !== spaceB) return;

					const dx = nodeB.x - nodeA.x;
					const dy = nodeB.y - nodeA.y;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;

					if (dist < minDocDist) {
						// Much gentler push with dampening
						const push = (minDocDist - dist) / 8;
						const dampening = Math.max(0.1, Math.min(1, dist / minDocDist));
						const smoothPush = push * dampening * 0.5;

						const nx = dx / dist;
						const ny = dy / dist;
						nodeA.x -= nx * smoothPush;
						nodeA.y -= ny * smoothPush;
						nodeB.x += nx * smoothPush;
						nodeB.y += ny * smoothPush;
					}
				});
			});
		}

		allNodes.push(...documentNodes);

		/* 3. Add memories around documents WITH doc-memory connections */
		documentNodes.forEach((docNode) => {
			const memoryNodeMap = new Map<string, GraphNode>();
			const doc = docNode.data as DocumentWithMemories;

			doc.memoryEntries.forEach((memory, memIndex) => {
				const memoryId = `${memory.id}`;
				const customMemPos = nodePositions.get(memoryId);

				const clusterAngle =
					(memIndex / doc.memoryEntries.length) * Math.PI * 2;
				const variation = Math.sin(memIndex * 2.5) * 0.3 + 0.7;
				const distance = clusterRadius * variation;

				const seed =
					memIndex * 12345 + Number.parseInt(docNode.id.slice(0, 6), 36);
				const offsetX = Math.sin(seed) * 0.5 * 40;
				const offsetY = Math.cos(seed) * 0.5 * 40;

				const defaultMemX =
					docNode.x + Math.cos(clusterAngle) * distance + offsetX;
				const defaultMemY =
					docNode.y + Math.sin(clusterAngle) * distance + offsetY;

				if (!memoryNodeMap.has(memoryId)) {
					const memoryNode: GraphNode = {
						id: memoryId,
						type: "memory",
						x: customMemPos?.x ?? defaultMemX,
						y: customMemPos?.y ?? defaultMemY,
						data: memory,
						size: Math.max(
							32,
							Math.min(48, (memory.memory?.length || 50) * 0.5),
						),
						color: colors.memory.primary,
						isHovered: false,
						isDragging: draggingNodeId === memoryId,
					};
					memoryNodeMap.set(memoryId, memoryNode);
					allNodes.push(memoryNode);
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
				});
			});
		});

		// Build mapping of memoryId -> nodeId for version chains
		const memNodeIdMap = new Map<string, string>();
		allNodes.forEach((n) => {
			if (n.type === "memory") {
				memNodeIdMap.set((n.data as MemoryEntry).id, n.id);
			}
		});

		// Add version-chain edges (old -> new)
		data.documents.forEach((doc) => {
			doc.memoryEntries.forEach((mem: MemoryEntry) => {
				// Support both new object structure and legacy array/single parent fields
				let parentRelations: Record<string, MemoryRelation> = {};

				if (
					mem.memoryRelations &&
					Array.isArray(mem.memoryRelations) &&
					mem.memoryRelations.length > 0
				) {
					// Convert array to Record
					parentRelations = mem.memoryRelations.reduce((acc, rel) => {
						acc[rel.targetMemoryId] = rel.relationType;
						return acc;
					}, {} as Record<string, MemoryRelation>);
				} else if (mem.parentMemoryId) {
					parentRelations = {
						[mem.parentMemoryId]: "updates" as MemoryRelation,
					};
				}
				Object.entries(parentRelations).forEach(([pid, relationType]) => {
					const fromId = memNodeIdMap.get(pid);
					const toId = memNodeIdMap.get(mem.id);
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
						});
					}
				});
			});
		});

		// Document-to-document similarity edges
		for (let i = 0; i < filteredDocuments.length; i++) {
			const docI = filteredDocuments[i];
			if (!docI) continue;

			for (let j = i + 1; j < filteredDocuments.length; j++) {
				const docJ = filteredDocuments[j];
				if (!docJ) continue;

				const sim = calculateSemanticSimilarity(
					docI.summaryEmbedding ? Array.from(docI.summaryEmbedding) : null,
					docJ.summaryEmbedding ? Array.from(docJ.summaryEmbedding) : null,
				);
				if (sim > 0.725) {
					allEdges.push({
						id: `doc-doc-${docI.id}-${docJ.id}`,
						source: docI.id,
						target: docJ.id,
						similarity: sim,
						visualProps: getConnectionVisualProps(sim),
						color: getMagicalConnectionColor(sim, 200),
						edgeType: "doc-doc",
					});
				}
			}
		}

		return { nodes: allNodes, edges: allEdges };
	}, [data, selectedSpace, nodePositions, draggingNodeId]);
}
