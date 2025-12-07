"use client";

import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import { colors } from "./constants";
import type {
	DocumentWithMemories,
	GraphCanvasProps,
	GraphNode,
	MemoryEntry,
} from "./types";

export const GraphCanvas = memo<GraphCanvasProps>(
	({
		nodes,
		edges,
		panX,
		panY,
		zoom,
		width,
		height,
		onNodeHover,
		onNodeClick,
		onNodeDragStart,
		onNodeDragMove,
		onNodeDragEnd,
		onPanStart,
		onPanMove,
		onPanEnd,
		onWheel,
		onDoubleClick,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		draggingNodeId,
		highlightDocumentIds,
	}) => {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const animationRef = useRef<number>(0);
		const startTimeRef = useRef<number>(Date.now());
		const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
		const currentHoveredNode = useRef<string | null>(null);

		// Initialize start time once
		useEffect(() => {
			startTimeRef.current = Date.now();
		}, []);

		// Efficient hit detection
		const getNodeAtPosition = useCallback(
			(x: number, y: number): string | null => {
				// Check from top-most to bottom-most: memory nodes are drawn after documents
				for (let i = nodes.length - 1; i >= 0; i--) {
					const node = nodes[i]!;
					const screenX = node.x * zoom + panX;
					const screenY = node.y * zoom + panY;
					const nodeSize = node.size * zoom;

					const dx = x - screenX;
					const dy = y - screenY;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance <= nodeSize / 2) {
						return node.id;
					}
				}
				return null;
			},
			[nodes, panX, panY, zoom],
		);

		// Handle mouse events
		const handleMouseMove = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current;
				if (!canvas) return;

				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				mousePos.current = { x, y };

				const nodeId = getNodeAtPosition(x, y);
				if (nodeId !== currentHoveredNode.current) {
					currentHoveredNode.current = nodeId;
					onNodeHover(nodeId);
				}

				// Handle node dragging
				if (draggingNodeId) {
					onNodeDragMove(e);
				}
			},
			[getNodeAtPosition, onNodeHover, draggingNodeId, onNodeDragMove],
		);

		const handleMouseDown = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current;
				if (!canvas) return;

				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				const nodeId = getNodeAtPosition(x, y);
				if (nodeId) {
					// When starting a node drag, prevent initiating pan
					e.stopPropagation();
					onNodeDragStart(nodeId, e);
					return;
				}
				onPanStart(e);
			},
			[getNodeAtPosition, onNodeDragStart, onPanStart],
		);

		const handleClick = useCallback(
			(e: React.MouseEvent) => {
				const canvas = canvasRef.current;
				if (!canvas) return;

				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				const nodeId = getNodeAtPosition(x, y);
				if (nodeId) {
					onNodeClick(nodeId);
				}
			},
			[getNodeAtPosition, onNodeClick],
		);

		// Professional rendering function with LOD
		const render = useCallback(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const currentTime = Date.now();
			const _elapsed = currentTime - startTimeRef.current;

			// Level-of-detail optimization based on zoom
			const useSimplifiedRendering = zoom < 0.3;

			// Clear canvas
			ctx.clearRect(0, 0, width, height);

			// Set high quality rendering
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";

			// Draw minimal background grid
			ctx.strokeStyle = "rgba(148, 163, 184, 0.03)"; // Very subtle grid
			ctx.lineWidth = 1;
			const gridSpacing = 100 * zoom;
			const offsetX = panX % gridSpacing;
			const offsetY = panY % gridSpacing;

			// Simple, clean grid lines
			for (let x = offsetX; x < width; x += gridSpacing) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = offsetY; y < height; y += gridSpacing) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}

			// Create node lookup map
			const nodeMap = new Map(nodes.map((node) => [node.id, node]));

			// Draw enhanced edges with sophisticated styling
			ctx.lineCap = "round";
			edges.forEach((edge) => {
				const sourceNode = nodeMap.get(edge.source);
				const targetNode = nodeMap.get(edge.target);

				if (sourceNode && targetNode) {
					const sourceX = sourceNode.x * zoom + panX;
					const sourceY = sourceNode.y * zoom + panY;
					const targetX = targetNode.x * zoom + panX;
					const targetY = targetNode.y * zoom + panY;

					// Enhanced viewport culling with edge type considerations
					if (
						sourceX < -100 ||
						sourceX > width + 100 ||
						targetX < -100 ||
						targetX > width + 100
					) {
						return;
					}

					// Skip very weak connections when zoomed out for performance
					if (useSimplifiedRendering) {
						if (
							edge.edgeType === "doc-memory" &&
							edge.visualProps.opacity < 0.3
						) {
							return; // Skip very weak doc-memory edges when zoomed out
						}
					}

					// Enhanced connection styling based on edge type
					let connectionColor = colors.connection.weak;
					let dashPattern: number[] = [];
					let opacity = edge.visualProps.opacity;
					let lineWidth = Math.max(1, edge.visualProps.thickness * zoom);

					if (edge.edgeType === "doc-memory") {
						// Doc-memory: Solid thin lines, subtle
						dashPattern = [];
						connectionColor = colors.connection.memory;
						opacity = 0.9;
						lineWidth = 1;
					} else if (edge.edgeType === "doc-doc") {
						// Doc-doc: Thick dashed lines with strong similarity emphasis
						dashPattern = useSimplifiedRendering ? [] : [10, 5]; // Solid lines when zoomed out
						opacity = Math.max(0, edge.similarity * 0.5);
						lineWidth = Math.max(1, edge.similarity * 2); // Thicker for stronger similarity

						if (edge.similarity > 0.85)
							connectionColor = colors.connection.strong;
						else if (edge.similarity > 0.725)
							connectionColor = colors.connection.medium;
					} else if (edge.edgeType === "version") {
						// Version chains: Double line effect with relation-specific colors
						dashPattern = [];
						connectionColor = edge.color || colors.relations.updates;
						opacity = 0.8;
						lineWidth = 2;
					}

					ctx.strokeStyle = connectionColor;
					ctx.lineWidth = lineWidth;
					ctx.globalAlpha = opacity;
					ctx.setLineDash(dashPattern);

					if (edge.edgeType === "version") {
						// Special double-line rendering for version chains
						// First line (outer)
						ctx.lineWidth = 3;
						ctx.globalAlpha = opacity * 0.3;
						ctx.beginPath();
						ctx.moveTo(sourceX, sourceY);
						ctx.lineTo(targetX, targetY);
						ctx.stroke();

						// Second line (inner)
						ctx.lineWidth = 1;
						ctx.globalAlpha = opacity;
						ctx.beginPath();
						ctx.moveTo(sourceX, sourceY);
						ctx.lineTo(targetX, targetY);
						ctx.stroke();
					} else {
						// Simplified lines when zoomed out, curved when zoomed in
						if (useSimplifiedRendering) {
							// Straight lines for performance
							ctx.beginPath();
							ctx.moveTo(sourceX, sourceY);
							ctx.lineTo(targetX, targetY);
							ctx.stroke();
						} else {
							// Regular curved line for doc-memory and doc-doc
							const midX = (sourceX + targetX) / 2;
							const midY = (sourceY + targetY) / 2;
							const dx = targetX - sourceX;
							const dy = targetY - sourceY;
							const distance = Math.sqrt(dx * dx + dy * dy);
							const controlOffset =
								edge.edgeType === "doc-memory"
									? 15
									: Math.min(30, distance * 0.2);

							ctx.beginPath();
							ctx.moveTo(sourceX, sourceY);
							ctx.quadraticCurveTo(
								midX + controlOffset * (dy / distance),
								midY - controlOffset * (dx / distance),
								targetX,
								targetY,
							);
							ctx.stroke();
						}
					}

					// Subtle arrow head for version edges
					if (edge.edgeType === "version") {
						const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
						const arrowLength = Math.max(6, 8 * zoom); // Shorter, more subtle
						const arrowWidth = Math.max(8, 12 * zoom);

						// Calculate arrow position offset from node edge
						const nodeRadius = (targetNode.size * zoom) / 2;
						const offsetDistance = nodeRadius + 2;
						const arrowX = targetX - Math.cos(angle) * offsetDistance;
						const arrowY = targetY - Math.sin(angle) * offsetDistance;

						ctx.save();
						ctx.translate(arrowX, arrowY);
						ctx.rotate(angle);
						ctx.setLineDash([]);

						// Simple outlined arrow (not filled)
						ctx.strokeStyle = connectionColor;
						ctx.lineWidth = Math.max(1, 1.5 * zoom);
						ctx.globalAlpha = opacity;

						ctx.beginPath();
						ctx.moveTo(0, 0);
						ctx.lineTo(-arrowLength, arrowWidth / 2);
						ctx.moveTo(0, 0);
						ctx.lineTo(-arrowLength, -arrowWidth / 2);
						ctx.stroke();

						ctx.restore();
					}
				}
			});

			ctx.globalAlpha = 1;
			ctx.setLineDash([]);

			// Prepare highlight set from provided document IDs (customId or internal)
			const highlightSet = new Set<string>(highlightDocumentIds ?? []);

			// Draw nodes with enhanced styling and LOD optimization
			nodes.forEach((node) => {
				const screenX = node.x * zoom + panX;
				const screenY = node.y * zoom + panY;
				const nodeSize = node.size * zoom;

				// Enhanced viewport culling
				const margin = nodeSize + 50;
				if (
					screenX < -margin ||
					screenX > width + margin ||
					screenY < -margin ||
					screenY > height + margin
				) {
					return;
				}

				const isHovered = currentHoveredNode.current === node.id;
				const isDragging = node.isDragging;
				const isHighlightedDocument = (() => {
					if (node.type !== "document" || highlightSet.size === 0) return false;
					const doc = node.data as DocumentWithMemories;
					if (doc.customId && highlightSet.has(doc.customId)) return true;
					return highlightSet.has(doc.id);
				})();

				if (node.type === "document") {
					// Enhanced glassmorphism document styling
					const docWidth = nodeSize * 1.4;
					const docHeight = nodeSize * 0.9;

					// Multi-layer glass effect
					ctx.fillStyle = isDragging
						? colors.document.accent
						: isHovered
							? colors.document.secondary
							: colors.document.primary;
					ctx.globalAlpha = 1;

					// Enhanced border with subtle glow
					ctx.strokeStyle = isDragging
						? colors.document.glow
						: isHovered
							? colors.document.accent
							: colors.document.border;
					ctx.lineWidth = isDragging ? 3 : isHovered ? 2 : 1;

					// Rounded rectangle with enhanced styling
					const radius = useSimplifiedRendering ? 6 : 12;
					ctx.beginPath();
					ctx.roundRect(
						screenX - docWidth / 2,
						screenY - docHeight / 2,
						docWidth,
						docHeight,
						radius,
					);
					ctx.fill();
					ctx.stroke();

					// Subtle inner highlight for glass effect (skip when zoomed out)
					if (!useSimplifiedRendering && (isHovered || isDragging)) {
						ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.roundRect(
							screenX - docWidth / 2 + 1,
							screenY - docHeight / 2 + 1,
							docWidth - 2,
							docHeight - 2,
							radius - 1,
						);
						ctx.stroke();
					}

					// Highlight ring for search hits
					if (isHighlightedDocument) {
						ctx.save();
						ctx.globalAlpha = 0.9;
						ctx.strokeStyle = colors.accent.primary;
						ctx.lineWidth = 3;
						ctx.setLineDash([6, 4]);
						const ringPadding = 10;
						ctx.beginPath();
						ctx.roundRect(
							screenX - docWidth / 2 - ringPadding,
							screenY - docHeight / 2 - ringPadding,
							docWidth + ringPadding * 2,
							docHeight + ringPadding * 2,
							radius + 6,
						);
						ctx.stroke();
						ctx.setLineDash([]);
						ctx.restore();
					}
				} else {
					// Enhanced memory styling with status indicators
					const mem = node.data as MemoryEntry;
					const isForgotten =
						mem.isForgotten ||
						(mem.forgetAfter &&
							new Date(mem.forgetAfter).getTime() < Date.now());
					const isLatest = mem.isLatest;

					// Check if memory is expiring soon (within 7 days)
					const expiringSoon =
						mem.forgetAfter &&
						!isForgotten &&
						new Date(mem.forgetAfter).getTime() - Date.now() <
							1000 * 60 * 60 * 24 * 7;

					// Check if memory is new (created within last 24 hours)
					const isNew =
						!isForgotten &&
						new Date(mem.createdAt).getTime() >
							Date.now() - 1000 * 60 * 60 * 24;

					// Determine colors based on status
					let fillColor = colors.memory.primary;
					let borderColor = colors.memory.border;
					let glowColor = colors.memory.glow;

					if (isForgotten) {
						fillColor = colors.status.forgotten;
						borderColor = "rgba(220,38,38,0.3)";
						glowColor = "rgba(220,38,38,0.2)";
					} else if (expiringSoon) {
						borderColor = colors.status.expiring;
						glowColor = colors.accent.amber;
					} else if (isNew) {
						borderColor = colors.status.new;
						glowColor = colors.accent.emerald;
					}

					if (isDragging) {
						fillColor = colors.memory.accent;
						borderColor = glowColor;
					} else if (isHovered) {
						fillColor = colors.memory.secondary;
					}

					const radius = nodeSize / 2;

					ctx.fillStyle = fillColor;
					ctx.globalAlpha = isLatest ? 1 : 0.4;
					ctx.strokeStyle = borderColor;
					ctx.lineWidth = isDragging ? 3 : isHovered ? 2 : 1.5;

					if (useSimplifiedRendering) {
						// Simple circles when zoomed out for performance
						ctx.beginPath();
						ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
						ctx.fill();
						ctx.stroke();
					} else {
						// HEXAGONAL memory nodes when zoomed in
						const sides = 6;
						ctx.beginPath();
						for (let i = 0; i < sides; i++) {
							const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
							const x = screenX + radius * Math.cos(angle);
							const y = screenY + radius * Math.sin(angle);
							if (i === 0) {
								ctx.moveTo(x, y);
							} else {
								ctx.lineTo(x, y);
							}
						}
						ctx.closePath();
						ctx.fill();
						ctx.stroke();

						// Inner highlight for glass effect
						if (isHovered || isDragging) {
							ctx.strokeStyle = "rgba(147, 197, 253, 0.3)";
							ctx.lineWidth = 1;
							const innerRadius = radius - 2;
							ctx.beginPath();
							for (let i = 0; i < sides; i++) {
								const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
								const x = screenX + innerRadius * Math.cos(angle);
								const y = screenY + innerRadius * Math.sin(angle);
								if (i === 0) {
									ctx.moveTo(x, y);
								} else {
									ctx.lineTo(x, y);
								}
							}
							ctx.closePath();
							ctx.stroke();
						}
					}

					// Status indicators overlay (always preserve these as required)
					if (isForgotten) {
						// Cross for forgotten memories
						ctx.strokeStyle = "rgba(220,38,38,0.4)";
						ctx.lineWidth = 2;
						const r = nodeSize * 0.25;
						ctx.beginPath();
						ctx.moveTo(screenX - r, screenY - r);
						ctx.lineTo(screenX + r, screenY + r);
						ctx.moveTo(screenX + r, screenY - r);
						ctx.lineTo(screenX - r, screenY + r);
						ctx.stroke();
					} else if (isNew) {
						// Small dot for new memories
						ctx.fillStyle = colors.status.new;
						ctx.beginPath();
						ctx.arc(
							screenX + nodeSize * 0.25,
							screenY - nodeSize * 0.25,
							Math.max(2, nodeSize * 0.15), // Scale with node size, minimum 2px
							0,
							2 * Math.PI,
						);
						ctx.fill();
					}
				}

				// Enhanced hover glow effect (skip when zoomed out for performance)
				if (!useSimplifiedRendering && (isHovered || isDragging)) {
					const glowColor =
						node.type === "document"
							? colors.document.glow
							: colors.memory.glow;

					ctx.strokeStyle = glowColor;
					ctx.lineWidth = 1;
					ctx.setLineDash([3, 3]);
					ctx.globalAlpha = 0.6;

					ctx.beginPath();
					const glowSize = nodeSize * 0.7;
					if (node.type === "document") {
						ctx.roundRect(
							screenX - glowSize,
							screenY - glowSize / 1.4,
							glowSize * 2,
							glowSize * 1.4,
							15,
						);
					} else {
						// Hexagonal glow for memory nodes
						const glowRadius = glowSize;
						const sides = 6;
						for (let i = 0; i < sides; i++) {
							const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
							const x = screenX + glowRadius * Math.cos(angle);
							const y = screenY + glowRadius * Math.sin(angle);
							if (i === 0) {
								ctx.moveTo(x, y);
							} else {
								ctx.lineTo(x, y);
							}
						}
						ctx.closePath();
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}
			});

			ctx.globalAlpha = 1;
		}, [nodes, edges, panX, panY, zoom, width, height, highlightDocumentIds]);

		// Change-based rendering instead of continuous animation
		const lastRenderParams = useRef<string>("");

		// Create a render key that changes when visual state changes
		const renderKey = useMemo(() => {
			const nodePositions = nodes
				.map(
					(n) =>
						`${n.id}:${n.x}:${n.y}:${n.isDragging ? "1" : "0"}:${currentHoveredNode.current === n.id ? "1" : "0"}`,
				)
				.join("|");
			const highlightKey = (highlightDocumentIds ?? []).join("|");
			return `${nodePositions}-${edges.length}-${panX}-${panY}-${zoom}-${width}-${height}-${highlightKey}`;
		}, [
			nodes,
			edges.length,
			panX,
			panY,
			zoom,
			width,
			height,
			highlightDocumentIds,
		]);

		// Only render when something actually changed
		useEffect(() => {
			if (renderKey !== lastRenderParams.current) {
				lastRenderParams.current = renderKey;
				render();
			}
		}, [renderKey, render]);

		// Cleanup any existing animation frames
		useEffect(() => {
			return () => {
				if (animationRef.current) {
					cancelAnimationFrame(animationRef.current);
				}
			};
		}, []);

		// Add native wheel event listener to prevent browser zoom
		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const handleNativeWheel = (e: WheelEvent) => {
				e.preventDefault();
				e.stopPropagation();

				// Call the onWheel handler with a synthetic-like event
				onWheel({
					deltaY: e.deltaY,
					deltaX: e.deltaX,
					clientX: e.clientX,
					clientY: e.clientY,
					currentTarget: canvas,
					nativeEvent: e,
					preventDefault: () => {},
					stopPropagation: () => {},
				} as React.WheelEvent);
			};

			// Add listener with passive: false to ensure preventDefault works
			canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

			// Also prevent gesture events for touch devices
			const handleGesture = (e: Event) => {
				e.preventDefault();
			};

			canvas.addEventListener("gesturestart", handleGesture, {
				passive: false,
			});
			canvas.addEventListener("gesturechange", handleGesture, {
				passive: false,
			});
			canvas.addEventListener("gestureend", handleGesture, { passive: false });

			return () => {
				canvas.removeEventListener("wheel", handleNativeWheel);
				canvas.removeEventListener("gesturestart", handleGesture);
				canvas.removeEventListener("gesturechange", handleGesture);
				canvas.removeEventListener("gestureend", handleGesture);
			};
		}, [onWheel]);

		//  High-DPI handling  --------------------------------------------------
		const dpr =
			typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

		useLayoutEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			// upscale backing store
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			canvas.width = width * dpr;
			canvas.height = height * dpr;

			const ctx = canvas.getContext("2d");
			ctx?.scale(dpr, dpr);
		}, [width, height, dpr]);
		// -----------------------------------------------------------------------

		return (
			<canvas
				className="absolute inset-0"
				height={height}
				onClick={handleClick}
				onDoubleClick={onDoubleClick}
				onMouseDown={handleMouseDown}
				onMouseLeave={() => {
					if (draggingNodeId) {
						onNodeDragEnd();
					} else {
						onPanEnd();
					}
				}}
				onMouseMove={(e) => {
					handleMouseMove(e);
					if (!draggingNodeId) {
						onPanMove(e);
					}
				}}
				onMouseUp={() => {
					if (draggingNodeId) {
						onNodeDragEnd();
					} else {
						onPanEnd();
					}
				}}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
				ref={canvasRef}
				style={{
					cursor: draggingNodeId
						? "grabbing"
						: currentHoveredNode.current
							? "grab"
							: "move",
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
				width={width}
			/>
		);
	},
);

GraphCanvas.displayName = "GraphCanvas";
