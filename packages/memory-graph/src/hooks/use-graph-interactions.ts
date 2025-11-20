"use client";

import { useCallback, useRef, useState } from "react";
import { GRAPH_SETTINGS } from "@/constants";
import type { GraphNode } from "@/types";

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

	// Touch gesture state
	const [touchState, setTouchState] = useState<{
		touches: { id: number; x: number; y: number }[];
		lastDistance: number;
		lastCenter: { x: number; y: number };
		isGesturing: boolean;
	}>({
		touches: [],
		lastDistance: 0,
		lastCenter: { x: 0, y: 0 },
		isGesturing: false,
	});

	// Animation state for smooth transitions
	const animationRef = useRef<number | null>(null);
	const [isAnimating, setIsAnimating] = useState(false);

	// Smooth animation helper
	const animateToViewState = useCallback(
		(
			targetPanX: number,
			targetPanY: number,
			targetZoom: number,
			duration = 300,
		) => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}

			const startPanX = panX;
			const startPanY = panY;
			const startZoom = zoom;
			const startTime = Date.now();

			setIsAnimating(true);

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);

				// Ease out cubic function for smooth transitions
				const easeOut = 1 - (1 - progress) ** 3;

				const currentPanX = startPanX + (targetPanX - startPanX) * easeOut;
				const currentPanY = startPanY + (targetPanY - startPanY) * easeOut;
				const currentZoom = startZoom + (targetZoom - startZoom) * easeOut;

				setPanX(currentPanX);
				setPanY(currentPanY);
				setZoom(currentZoom);

				if (progress < 1) {
					animationRef.current = requestAnimationFrame(animate);
				} else {
					setIsAnimating(false);
					animationRef.current = null;
				}
			};

			animate();
		},
		[panX, panY, zoom],
	);

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
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			// Always prevent default to stop browser navigation
			e.preventDefault();
			e.stopPropagation();

			// Handle horizontal scrolling (trackpad swipe) by converting to pan
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				// Horizontal scroll - pan the graph instead of zooming
				const panDelta = e.deltaX * 0.5;
				setPanX((prev) => prev - panDelta);
				return;
			}

			// Vertical scroll - zoom behavior
			const delta = e.deltaY > 0 ? 0.97 : 1.03;
			const newZoom = Math.max(0.05, Math.min(3, zoom * delta));

			// Get mouse position relative to the viewport
			let mouseX = e.clientX;
			let mouseY = e.clientY;

			// Try to get the container bounds to make coordinates relative to the graph container
			const target = e.currentTarget;
			if (target && "getBoundingClientRect" in target) {
				const rect = target.getBoundingClientRect();
				mouseX = e.clientX - rect.left;
				mouseY = e.clientY - rect.top;
			}

			// Calculate the world position of the mouse cursor
			const worldX = (mouseX - panX) / zoom;
			const worldY = (mouseY - panY) / zoom;

			// Calculate new pan to keep the mouse position stationary
			const newPanX = mouseX - worldX * newZoom;
			const newPanY = mouseY - worldY * newZoom;

			setZoom(newZoom);
			setPanX(newPanX);
			setPanY(newPanY);
		},
		[zoom, panX, panY],
	);

	const zoomIn = useCallback(
		(centerX?: number, centerY?: number, animate = true) => {
			const zoomFactor = 1.2;
			const newZoom = Math.min(3, zoom * zoomFactor); // Increased max zoom to 3x

			if (centerX !== undefined && centerY !== undefined) {
				// Mouse-centered zoom for programmatic zoom in
				const worldX = (centerX - panX) / zoom;
				const worldY = (centerY - panY) / zoom;
				const newPanX = centerX - worldX * newZoom;
				const newPanY = centerY - worldY * newZoom;

				if (animate && !isAnimating) {
					animateToViewState(newPanX, newPanY, newZoom, 200);
				} else {
					setZoom(newZoom);
					setPanX(newPanX);
					setPanY(newPanY);
				}
			} else {
				if (animate && !isAnimating) {
					animateToViewState(panX, panY, newZoom, 200);
				} else {
					setZoom(newZoom);
				}
			}
		},
		[zoom, panX, panY, isAnimating, animateToViewState],
	);

	const zoomOut = useCallback(
		(centerX?: number, centerY?: number, animate = true) => {
			const zoomFactor = 0.8;
			const newZoom = Math.max(0.05, zoom * zoomFactor); // Decreased min zoom to 0.05x

			if (centerX !== undefined && centerY !== undefined) {
				// Mouse-centered zoom for programmatic zoom out
				const worldX = (centerX - panX) / zoom;
				const worldY = (centerY - panY) / zoom;
				const newPanX = centerX - worldX * newZoom;
				const newPanY = centerY - worldY * newZoom;

				if (animate && !isAnimating) {
					animateToViewState(newPanX, newPanY, newZoom, 200);
				} else {
					setZoom(newZoom);
					setPanX(newPanX);
					setPanY(newPanY);
				}
			} else {
				if (animate && !isAnimating) {
					animateToViewState(panX, panY, newZoom, 200);
				} else {
					setZoom(newZoom);
				}
			}
		},
		[zoom, panX, panY, isAnimating, animateToViewState],
	);

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
			let minX = Number.POSITIVE_INFINITY;
			let maxX = Number.NEGATIVE_INFINITY;
			let minY = Number.POSITIVE_INFINITY;
			let maxY = Number.NEGATIVE_INFINITY;

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
			const newZoom = Math.min(Math.max(0.05, Math.min(zoomX, zoomY)), 3);

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

	// Touch gesture handlers for mobile pinch-to-zoom
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		const touches = Array.from(e.touches).map((touch) => ({
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		}));

		if (touches.length >= 2) {
			// Start gesture with two or more fingers
			const touch1 = touches[0]!;
			const touch2 = touches[1]!;

			const distance = Math.sqrt(
				(touch2.x - touch1.x) ** 2 + (touch2.y - touch1.y) ** 2,
			);

			const center = {
				x: (touch1.x + touch2.x) / 2,
				y: (touch1.y + touch2.y) / 2,
			};

			setTouchState({
				touches,
				lastDistance: distance,
				lastCenter: center,
				isGesturing: true,
			});
		} else {
			setTouchState((prev) => ({ ...prev, touches, isGesturing: false }));
		}
	}, []);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault();

			const touches = Array.from(e.touches).map((touch) => ({
				id: touch.identifier,
				x: touch.clientX,
				y: touch.clientY,
			}));

			if (touches.length >= 2 && touchState.isGesturing) {
				const touch1 = touches[0]!;
				const touch2 = touches[1]!;

				const distance = Math.sqrt(
					(touch2.x - touch1.x) ** 2 + (touch2.y - touch1.y) ** 2,
				);

				const center = {
					x: (touch1.x + touch2.x) / 2,
					y: (touch1.y + touch2.y) / 2,
				};

				// Calculate zoom change based on pinch distance change
				const distanceChange = distance / touchState.lastDistance;
				const newZoom = Math.max(0.05, Math.min(3, zoom * distanceChange));

				// Get canvas bounds for center calculation
				const canvas = e.currentTarget as HTMLElement;
				const rect = canvas.getBoundingClientRect();
				const centerX = center.x - rect.left;
				const centerY = center.y - rect.top;

				// Calculate the world position of the pinch center
				const worldX = (centerX - panX) / zoom;
				const worldY = (centerY - panY) / zoom;

				// Calculate new pan to keep the pinch center stationary
				const newPanX = centerX - worldX * newZoom;
				const newPanY = centerY - worldY * newZoom;

				// Calculate pan change based on center movement
				const centerDx = center.x - touchState.lastCenter.x;
				const centerDy = center.y - touchState.lastCenter.y;

				setZoom(newZoom);
				setPanX(newPanX + centerDx);
				setPanY(newPanY + centerDy);

				setTouchState({
					touches,
					lastDistance: distance,
					lastCenter: center,
					isGesturing: true,
				});
			} else if (touches.length === 1 && !touchState.isGesturing && isPanning) {
				// Single finger pan (only if not in gesture mode)
				const touch = touches[0]!;
				const newPanX = touch.x - panStart.x;
				const newPanY = touch.y - panStart.y;
				setPanX(newPanX);
				setPanY(newPanY);
			}
		},
		[touchState, zoom, panX, panY, isPanning, panStart],
	);

	const handleTouchEnd = useCallback((e: React.TouchEvent) => {
		const touches = Array.from(e.touches).map((touch) => ({
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		}));

		if (touches.length < 2) {
			setTouchState((prev) => ({ ...prev, touches, isGesturing: false }));
		} else {
			setTouchState((prev) => ({ ...prev, touches }));
		}

		if (touches.length === 0) {
			setIsPanning(false);
		}
	}, []);

	// Center viewport on a specific world position (with animation)
	const centerViewportOn = useCallback(
		(
			worldX: number,
			worldY: number,
			viewportWidth: number,
			viewportHeight: number,
			animate = true,
		) => {
			const newPanX = viewportWidth / 2 - worldX * zoom;
			const newPanY = viewportHeight / 2 - worldY * zoom;

			if (animate && !isAnimating) {
				animateToViewState(newPanX, newPanY, zoom, 400);
			} else {
				setPanX(newPanX);
				setPanY(newPanY);
			}
		},
		[zoom, isAnimating, animateToViewState],
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
			// Calculate new zoom (zoom in by 1.5x)
			const zoomFactor = 1.5;
			const newZoom = Math.min(3, zoom * zoomFactor);

			// Get mouse position relative to the container
			let mouseX = e.clientX;
			let mouseY = e.clientY;

			// Try to get the container bounds to make coordinates relative to the graph container
			const target = e.currentTarget;
			if (target && "getBoundingClientRect" in target) {
				const rect = target.getBoundingClientRect();
				mouseX = e.clientX - rect.left;
				mouseY = e.clientY - rect.top;
			}

			// Calculate the world position of the clicked point
			const worldX = (mouseX - panX) / zoom;
			const worldY = (mouseY - panY) / zoom;

			// Calculate new pan to keep the clicked point in the same screen position
			const newPanX = mouseX - worldX * newZoom;
			const newPanY = mouseY - worldY * newZoom;

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
		// Touch handlers
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		// Controls
		zoomIn,
		zoomOut,
		resetView,
		autoFitToViewport,
		centerViewportOn,
		setSelectedNode,
	};
}
