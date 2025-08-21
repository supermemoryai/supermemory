"use client";

import { useCallback, useState } from "react";
import { GRAPH_SETTINGS } from "../constants";
import type { GraphNode } from "../types";

export function useGraphInteractions(
	variant: "console" | "consumer" = "console",
) {
	const settings = GRAPH_SETTINGS[variant];

	const [panX, setPanX] = useState(settings.initialPanX);
	const [panY, setPanY] = useState(settings.initialPanY);
	const [zoom, setZoom] = useState(settings.initialZoom);
	const [isPanning, setIsPanning] = useState(false);
	const [panStart, setPanStart] = useState({ x: 0, y: 0 });
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
	const [dragStart, setDragStart] = useState({
		x: 0,
		y: 0,
		nodeX: 0,
		nodeY: 0,
	});
	const [nodePositions, setNodePositions] = useState<
		Map<string, { x: number; y: number }>
	>(new Map());

	// Node drag handlers
	const handleNodeDragStart = useCallback(
		(nodeId: string, e: React.MouseEvent, nodes?: GraphNode[]) => {
			const node = nodes?.find((n) => n.id === nodeId);
			if (!node) return;

			setDraggingNodeId(nodeId);
			setDragStart({
				x: e.clientX,
				y: e.clientY,
				nodeX: node.x,
				nodeY: node.y,
			});
		},
		[],
	);

	const handleNodeDragMove = useCallback(
		(e: React.MouseEvent) => {
			if (!draggingNodeId) return;

			const deltaX = (e.clientX - dragStart.x) / zoom;
			const deltaY = (e.clientY - dragStart.y) / zoom;

			const newX = dragStart.nodeX + deltaX;
			const newY = dragStart.nodeY + deltaY;

			setNodePositions((prev) =>
				new Map(prev).set(draggingNodeId, { x: newX, y: newY }),
			);
		},
		[draggingNodeId, dragStart, zoom],
	);

	const handleNodeDragEnd = useCallback(() => {
		setDraggingNodeId(null);
	}, []);

	// Pan handlers
	const handlePanStart = useCallback(
		(e: React.MouseEvent) => {
			setIsPanning(true);
			setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
		},
		[panX, panY],
	);

	const handlePanMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isPanning || draggingNodeId) return;

			const newPanX = e.clientX - panStart.x;
			const newPanY = e.clientY - panStart.y;
			setPanX(newPanX);
			setPanY(newPanY);
		},
		[isPanning, panStart, draggingNodeId],
	);

	const handlePanEnd = useCallback(() => {
		setIsPanning(false);
	}, []);

	// Zoom handlers
	const handleWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.97 : 1.03;
		setZoom((prev) => Math.max(0.1, Math.min(2, prev * delta)));
	}, []);

	const zoomIn = useCallback(() => {
		setZoom((prev) => Math.min(2, prev * 1.1));
	}, []);

	const zoomOut = useCallback(() => {
		setZoom((prev) => Math.max(0.1, prev / 1.1));
	}, []);

	const resetView = useCallback(() => {
		setPanX(settings.initialPanX);
		setPanY(settings.initialPanY);
		setZoom(settings.initialZoom);
		setNodePositions(new Map());
	}, [settings]);

	// Auto-fit graph to viewport
	const autoFitToViewport = useCallback(
		(
			nodes: GraphNode[],
			viewportWidth: number,
			viewportHeight: number,
			options?: { occludedRightPx?: number; animate?: boolean },
		) => {
			if (nodes.length === 0) return;

			// Find the bounds of all nodes
			let minX = Number.POSITIVE_INFINITY,
				maxX = Number.NEGATIVE_INFINITY;
			let minY = Number.POSITIVE_INFINITY,
				maxY = Number.NEGATIVE_INFINITY;

			nodes.forEach((node) => {
				minX = Math.min(minX, node.x - node.size / 2);
				maxX = Math.max(maxX, node.x + node.size / 2);
				minY = Math.min(minY, node.y - node.size / 2);
				maxY = Math.max(maxY, node.y + node.size / 2);
			});

			// Calculate the center of the content
			const contentCenterX = (minX + maxX) / 2;
			const contentCenterY = (minY + maxY) / 2;

			// Calculate the size of the content
			const contentWidth = maxX - minX;
			const contentHeight = maxY - minY;

			// Add padding (20% on each side)
			const paddingFactor = 1.4;
			const paddedWidth = contentWidth * paddingFactor;
			const paddedHeight = contentHeight * paddingFactor;

			// Account for occluded area on the right (e.g., chat panel)
			const occludedRightPx = Math.max(0, options?.occludedRightPx ?? 0);
			const availableWidth = Math.max(1, viewportWidth - occludedRightPx);

			// Calculate the zoom needed to fit the content within available width
			const zoomX = availableWidth / paddedWidth;
			const zoomY = viewportHeight / paddedHeight;
			const newZoom = Math.min(Math.max(0.1, Math.min(zoomX, zoomY)), 2);

			// Calculate pan to center the content within available area
			const availableCenterX = availableWidth / 2;
			const newPanX = availableCenterX - contentCenterX * newZoom;
			const newPanY = viewportHeight / 2 - contentCenterY * newZoom;

			// Apply the new view (optional animation)
			if (options?.animate) {
				const steps = 8;
				const durationMs = 160; // snappy
				const intervalMs = Math.max(1, Math.floor(durationMs / steps));
				const startZoom = zoom;
				const startPanX = panX;
				const startPanY = panY;
				let i = 0;
				const ease = (t: number) => 1 - (1 - t) ** 2; // ease-out quad
				const timer = setInterval(() => {
					i++;
					const t = ease(i / steps);
					setZoom(startZoom + (newZoom - startZoom) * t);
					setPanX(startPanX + (newPanX - startPanX) * t);
					setPanY(startPanY + (newPanY - startPanY) * t);
					if (i >= steps) clearInterval(timer);
				}, intervalMs);
			} else {
				setZoom(newZoom);
				setPanX(newPanX);
				setPanY(newPanY);
			}
		},
		[zoom, panX, panY],
	);

	// Node interaction handlers
	const handleNodeHover = useCallback((nodeId: string | null) => {
		setHoveredNode(nodeId);
	}, []);

	const handleNodeClick = useCallback(
		(nodeId: string) => {
			setSelectedNode(selectedNode === nodeId ? null : nodeId);
		},
		[selectedNode],
	);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			const canvas = e.currentTarget as HTMLCanvasElement;
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			// Calculate new zoom (zoom in by 1.5x)
			const zoomFactor = 1.5;
			const newZoom = Math.min(2, zoom * zoomFactor);

			// Calculate the world position of the clicked point
			const worldX = (x - panX) / zoom;
			const worldY = (y - panY) / zoom;

			// Calculate new pan to keep the clicked point in the same screen position
			const newPanX = x - worldX * newZoom;
			const newPanY = y - worldY * newZoom;

			setZoom(newZoom);
			setPanX(newPanX);
			setPanY(newPanY);
		},
		[zoom, panX, panY],
	);

	return {
		// State
		panX,
		panY,
		zoom,
		hoveredNode,
		selectedNode,
		draggingNodeId,
		nodePositions,
		// Handlers
		handlePanStart,
		handlePanMove,
		handlePanEnd,
		handleWheel,
		handleNodeHover,
		handleNodeClick,
		handleNodeDragStart,
		handleNodeDragMove,
		handleNodeDragEnd,
		handleDoubleClick,
		// Controls
		zoomIn,
		zoomOut,
		resetView,
		autoFitToViewport,
		setSelectedNode,
	};
}
