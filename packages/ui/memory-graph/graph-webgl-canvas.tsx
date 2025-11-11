"use client";

import { Application, extend } from "@pixi/react";
import { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { colors } from "./constants";
import type { GraphCanvasProps, MemoryEntry } from "./types";

// Register Pixi Graphics and Container so they can be used as JSX elements
extend({ Graphics: PixiGraphics, Container: PixiContainer });

export const GraphWebGLCanvas = memo<GraphCanvasProps>(
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
	}) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const isPanningRef = useRef(false);
		const currentHoveredRef = useRef<string | null>(null);
		const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
		const pointerMovedRef = useRef(false);
		// World container that is transformed instead of redrawing every pan/zoom
		const worldContainerRef = useRef<PixiContainer | null>(null);

		// Throttled wheel handling -------------------------------------------
		const pendingWheelDeltaRef = useRef<{ dx: number; dy: number }>({
			dx: 0,
			dy: 0,
		});
		const wheelRafRef = useRef<number | null>(null);
		// Removed bitmap caching due to black-screen issues – throttle already boosts zoom performance

		// Persistent graphics refs
		const gridG = useRef<PixiGraphics | null>(null);
		const edgesG = useRef<PixiGraphics | null>(null);
		const docsG = useRef<PixiGraphics | null>(null);
		const memsG = useRef<PixiGraphics | null>(null);

		// ---------- Zoom bucket (reduces redraw frequency) ----------
		const zoomBucket = useMemo(() => Math.round(zoom * 4) / 4, [zoom]);

		// Redraw layers only when their data changes ----------------------
		useEffect(() => {
			if (gridG.current) drawGrid(gridG.current);
		}, [panX, panY, zoom, width, height]);

		useEffect(() => {
			if (edgesG.current) drawEdges(edgesG.current);
		}, [edgesG.current, edges, nodes, zoomBucket]);

		useEffect(() => {
			if (docsG.current) drawDocuments(docsG.current);
		}, [docsG.current, nodes, zoomBucket]);

		useEffect(() => {
			if (memsG.current) drawMemories(memsG.current);
		}, [memsG.current, nodes, zoomBucket]);

		// Apply pan & zoom via world transform instead of geometry rebuilds
		useEffect(() => {
			if (worldContainerRef.current) {
				worldContainerRef.current.position.set(panX, panY);
				worldContainerRef.current.scale.set(zoom);
			}
		}, [panX, panY, zoom]);

		// No bitmap caching – nothing to clean up

		/* ---------- Helpers ---------- */
		const getNodeAtPosition = useCallback(
			(clientX: number, clientY: number): string | null => {
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return null;

				const localX = clientX - rect.left;
				const localY = clientY - rect.top;

				const worldX = (localX - panX) / zoom;
				const worldY = (localY - panY) / zoom;

				for (const node of nodes) {
					if (node.type === "document") {
						const halfW = (node.size * 1.4) / 2;
						const halfH = (node.size * 0.9) / 2;
						if (
							worldX >= node.x - halfW &&
							worldX <= node.x + halfW &&
							worldY >= node.y - halfH &&
							worldY <= node.y + halfH
						) {
							return node.id;
						}
					} else if (node.type === "memory") {
						const r = node.size / 2;
						const dx = worldX - node.x;
						const dy = worldY - node.y;
						if (dx * dx + dy * dy <= r * r) {
							return node.id;
						}
					}
				}
				return null;
			},
			[nodes, panX, panY, zoom],
		);

		/* ---------- Grid drawing ---------- */
		const drawGrid = useCallback(
			(g: PixiGraphics) => {
				g.clear();

				const gridColor = 0x94a3b8; // rgb(148,163,184)
				const gridAlpha = 0.03;
				const gridSpacing = 100 * zoom;

				// panning offsets
				const offsetX = panX % gridSpacing;
				const offsetY = panY % gridSpacing;

				g.lineStyle(1, gridColor, gridAlpha);

				// vertical lines
				for (let x = offsetX; x < width; x += gridSpacing) {
					g.moveTo(x, 0);
					g.lineTo(x, height);
				}

				// horizontal lines
				for (let y = offsetY; y < height; y += gridSpacing) {
					g.moveTo(0, y);
					g.lineTo(width, y);
				}

				// Stroke to render grid lines
				g.stroke();
			},
			[panX, panY, zoom, width, height],
		);

		/* ---------- Color parsing ---------- */
		const toHexAlpha = (input: string): { hex: number; alpha: number } => {
			if (!input) return { hex: 0xffffff, alpha: 1 };
			const str = input.trim().toLowerCase();
			// rgba() or rgb()
			const rgbaMatch = str
				.replace(/\s+/g, "")
				.match(/rgba?\((\d+),(\d+),(\d+)(?:,(\d*\.?\d+))?\)/i);
			if (rgbaMatch) {
				const r = Number.parseInt(rgbaMatch[1] || "0");
				const g = Number.parseInt(rgbaMatch[2] || "0");
				const b = Number.parseInt(rgbaMatch[3] || "0");
				const a =
					rgbaMatch[4] !== undefined ? Number.parseFloat(rgbaMatch[4]) : 1;
				return { hex: (r << 16) + (g << 8) + b, alpha: a };
			}
			// #rrggbb or #rrggbbaa
			if (str.startsWith("#")) {
				const hexBody = str.slice(1);
				if (hexBody.length === 6) {
					return { hex: Number.parseInt(hexBody, 16), alpha: 1 };
				}
				if (hexBody.length === 8) {
					const rgb = Number.parseInt(hexBody.slice(0, 6), 16);
					const aByte = Number.parseInt(hexBody.slice(6, 8), 16);
					return { hex: rgb, alpha: aByte / 255 };
				}
			}
			// 0xRRGGBB
			if (str.startsWith("0x")) {
				return { hex: Number.parseInt(str, 16), alpha: 1 };
			}
			return { hex: 0xffffff, alpha: 1 };
		};

		const drawDocuments = useCallback(
			(g: PixiGraphics) => {
				g.clear();

				nodes.forEach((node) => {
					if (node.type !== "document") return;

					// World-space coordinates – container transform handles pan/zoom
					const screenX = node.x;
					const screenY = node.y;
					const nodeSize = node.size;

					const docWidth = nodeSize * 1.4;
					const docHeight = nodeSize * 0.9;

					// Choose colors similar to canvas version
					const fill = node.isDragging
						? colors.document.accent
						: node.isHovered
							? colors.document.secondary
							: colors.document.primary;

					const strokeCol = node.isDragging
						? colors.document.glow
						: node.isHovered
							? colors.document.accent
							: colors.document.border;

					const { hex: fillHex, alpha: fillAlpha } = toHexAlpha(fill);
					const { hex: strokeHex, alpha: strokeAlpha } = toHexAlpha(strokeCol);

					// Stroke first then fill for proper shape borders
					const docStrokeWidth =
						(node.isDragging ? 3 : node.isHovered ? 2 : 1) / zoom;
					g.lineStyle(docStrokeWidth, strokeHex, strokeAlpha);
					g.beginFill(fillHex, fillAlpha);

					const radius = zoom < 0.3 ? 6 : 12;
					g.drawRoundedRect(
						screenX - docWidth / 2,
						screenY - docHeight / 2,
						docWidth,
						docHeight,
						radius,
					);
					g.endFill();

					// Inner highlight for glass effect (match GraphCanvas)
					if (zoom >= 0.3 && (node.isHovered || node.isDragging)) {
						const { hex: hlHex } = toHexAlpha("#ffffff");
						// Inner highlight stroke width constant
						const innerStroke = 1 / zoom;
						g.lineStyle(innerStroke, hlHex, 0.1);
						g.drawRoundedRect(
							screenX - docWidth / 2 + 1,
							screenY - docHeight / 2 + 1,
							docWidth - 2,
							docHeight - 2,
							radius - 1,
						);
						g.stroke();
					}
				});
			},
			[nodes, zoom],
		);

		/* ---------- Memories layer ---------- */
		const drawMemories = useCallback(
			(g: PixiGraphics) => {
				g.clear();

				nodes.forEach((node) => {
					if (node.type !== "memory") return;

					const mem = node.data as MemoryEntry;
					const screenX = node.x;
					const screenY = node.y;
					const nodeSize = node.size;

					const radius = nodeSize / 2;

					// status checks
					const isForgotten =
						mem?.isForgotten ||
						(mem?.forgetAfter &&
							new Date(mem.forgetAfter).getTime() < Date.now());
					const isLatest = mem?.isLatest;
					const expiringSoon =
						mem?.forgetAfter &&
						!isForgotten &&
						new Date(mem.forgetAfter).getTime() - Date.now() <
							1000 * 60 * 60 * 24 * 7;
					const isNew =
						!isForgotten &&
						new Date(mem?.createdAt).getTime() >
							Date.now() - 1000 * 60 * 60 * 24;

					// colours
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

					if (node.isDragging) {
						fillColor = colors.memory.accent;
						borderColor = glowColor;
					} else if (node.isHovered) {
						fillColor = colors.memory.secondary;
					}

					const { hex: fillHex, alpha: fillAlpha } = toHexAlpha(fillColor);
					const { hex: borderHex, alpha: borderAlpha } =
						toHexAlpha(borderColor);

					// Match canvas behavior: multiply by isLatest global alpha
					const globalAlpha = isLatest ? 1 : 0.4;
					const finalFillAlpha = globalAlpha * fillAlpha;
					const finalStrokeAlpha = globalAlpha * borderAlpha;
					// Stroke first then fill for visible border
					const memStrokeW =
						(node.isDragging ? 3 : node.isHovered ? 2 : 1.5) / zoom;
					g.lineStyle(memStrokeW, borderHex, finalStrokeAlpha);
					g.beginFill(fillHex, finalFillAlpha);

					if (zoom < 0.3) {
						// simplified circle when zoomed out
						g.drawCircle(screenX, screenY, radius);
					} else {
						// hexagon
						const sides = 6;
						const points: number[] = [];
						for (let i = 0; i < sides; i++) {
							const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
							points.push(screenX + radius * Math.cos(angle));
							points.push(screenY + radius * Math.sin(angle));
						}
						g.drawPolygon(points);
					}

					g.endFill();

					// Status overlays (forgotten / new) – match GraphCanvas visuals
					if (isForgotten) {
						const { hex: crossHex, alpha: crossAlpha } = toHexAlpha(
							"rgba(220,38,38,0.4)",
						);
						// Cross/ dot overlay stroke widths constant
						const overlayStroke = 2 / zoom;
						g.lineStyle(overlayStroke, crossHex, globalAlpha * crossAlpha);
						const rCross = nodeSize * 0.25;
						g.moveTo(screenX - rCross, screenY - rCross);
						g.lineTo(screenX + rCross, screenY + rCross);
						g.moveTo(screenX + rCross, screenY - rCross);
						g.lineTo(screenX - rCross, screenY + rCross);
						g.stroke();
					} else if (isNew) {
						const { hex: dotHex, alpha: dotAlpha } = toHexAlpha(
							colors.status.new,
						);
						// Dot scales with node (GraphCanvas behaviour)
						const dotRadius = Math.max(2, nodeSize * 0.15);
						g.beginFill(dotHex, globalAlpha * dotAlpha);
						g.drawCircle(
							screenX + nodeSize * 0.25,
							screenY - nodeSize * 0.25,
							dotRadius,
						);
						g.endFill();
					}
				});
			},
			[nodes, zoom],
		);

		/* ---------- Edges layer ---------- */
		// Helper: draw dashed quadratic curve to approximate canvas setLineDash
		const drawDashedQuadratic = useCallback(
			(
				g: PixiGraphics,
				sx: number,
				sy: number,
				cx: number,
				cy: number,
				tx: number,
				ty: number,
				dash = 10,
				gap = 5,
			) => {
				// Sample the curve and accumulate lines per dash to avoid overdraw
				const curveLength = Math.sqrt((sx - tx) ** 2 + (sy - ty) ** 2);
				const totalSamples = Math.max(
					20,
					Math.min(120, Math.floor(curveLength / 10)),
				);
				let prevX = sx;
				let prevY = sy;
				let distanceSinceToggle = 0;
				let drawSegment = true;
				let hasActiveDash = false;
				let dashStartX = sx;
				let dashStartY = sy;

				for (let i = 1; i <= totalSamples; i++) {
					const t = i / totalSamples;
					const mt = 1 - t;
					const x = mt * mt * sx + 2 * mt * t * cx + t * t * tx;
					const y = mt * mt * sy + 2 * mt * t * cy + t * t * ty;

					const dx = x - prevX;
					const dy = y - prevY;
					const segLen = Math.sqrt(dx * dx + dy * dy);
					distanceSinceToggle += segLen;

					if (drawSegment) {
						if (!hasActiveDash) {
							dashStartX = prevX;
							dashStartY = prevY;
							hasActiveDash = true;
						}
					}

					const threshold = drawSegment ? dash : gap;
					if (distanceSinceToggle >= threshold) {
						// end of current phase
						if (drawSegment && hasActiveDash) {
							g.moveTo(dashStartX, dashStartY);
							g.lineTo(prevX, prevY);
							g.stroke();
							hasActiveDash = false;
						}
						distanceSinceToggle = 0;
						drawSegment = !drawSegment;
						// If we transition into draw mode, start a new dash at current segment start
						if (drawSegment) {
							dashStartX = prevX;
							dashStartY = prevY;
							hasActiveDash = true;
						}
					}

					prevX = x;
					prevY = y;
				}

				// Flush any active dash at the end
				if (drawSegment && hasActiveDash) {
					g.moveTo(dashStartX, dashStartY);
					g.lineTo(prevX, prevY);
					g.stroke();
				}
			},
			[],
		);
		const drawEdges = useCallback(
			(g: PixiGraphics) => {
				g.clear();

				// Match GraphCanvas LOD behaviour
				const useSimplified = zoom < 0.3;

				// quick node lookup
				const nodeMap = new Map(nodes.map((n) => [n.id, n]));

				edges.forEach((edge) => {
					// Skip very weak doc-memory edges when zoomed out – behaviour copied from GraphCanvas
					if (
						useSimplified &&
						edge.edgeType === "doc-memory" &&
						(edge.visualProps?.opacity ?? 1) < 0.3
					) {
						return;
					}
					const source = nodeMap.get(edge.source);
					const target = nodeMap.get(edge.target);
					if (!source || !target) return;

					const sx = source.x;
					const sy = source.y;
					const tx = target.x;
					const ty = target.y;

					// No viewport culling here because container transform handles visibility

					let lineWidth = Math.max(1, edge.visualProps?.thickness ?? 1);
					// Use opacity exactly as provided to match GraphCanvas behaviour
					let opacity = edge.visualProps.opacity;
					let col = edge.color || colors.connection.weak;

					if (edge.edgeType === "doc-memory") {
						lineWidth = 1;
						opacity = 0.9;
						col = colors.connection.memory;

						if (useSimplified && opacity < 0.3) return;
					} else if (edge.edgeType === "doc-doc") {
						opacity = Math.max(0, edge.similarity * 0.5);
						lineWidth = Math.max(1, edge.similarity * 2);
						col = colors.connection.medium;
						if (edge.similarity > 0.85) col = colors.connection.strong;
					} else if (edge.edgeType === "version") {
						col = edge.color || colors.relations.updates;
						opacity = 0.8;
						lineWidth = 2;
					}

					const { hex: strokeHex, alpha: colorAlpha } = toHexAlpha(col);
					const finalEdgeAlpha = Math.max(0, Math.min(1, opacity * colorAlpha));

					// Always use round line caps (same as Canvas 2D)
					const screenLineWidth = lineWidth / zoom;
					g.lineStyle(screenLineWidth, strokeHex, finalEdgeAlpha);

					if (edge.edgeType === "version") {
						// double line effect to match canvas (outer thicker, faint + inner thin)
						g.lineStyle(3 / zoom, strokeHex, finalEdgeAlpha * 0.3);
						g.moveTo(sx, sy);
						g.lineTo(tx, ty);
						g.stroke();

						g.lineStyle(1 / zoom, strokeHex, finalEdgeAlpha);
						g.moveTo(sx, sy);
						g.lineTo(tx, ty);
						g.stroke();

						// arrow head
						const angle = Math.atan2(ty - sy, tx - sx);
						const arrowLen = Math.max(6 / zoom, 8);
						const nodeRadius = target.size / 2;
						const ax = tx - Math.cos(angle) * (nodeRadius + 2);
						const ay = ty - Math.sin(angle) * (nodeRadius + 2);

						g.moveTo(ax, ay);
						g.lineTo(
							ax - arrowLen * Math.cos(angle - Math.PI / 6),
							ay - arrowLen * Math.sin(angle - Math.PI / 6),
						);
						g.moveTo(ax, ay);
						g.lineTo(
							ax - arrowLen * Math.cos(angle + Math.PI / 6),
							ay - arrowLen * Math.sin(angle + Math.PI / 6),
						);
						g.stroke();
					} else {
						// straight line when zoomed out; dashed curved when zoomed in for doc-doc
						if (useSimplified) {
							g.moveTo(sx, sy);
							g.lineTo(tx, ty);
							g.stroke();
						} else {
							const midX = (sx + tx) / 2;
							const midY = (sy + ty) / 2;
							const dx = tx - sx;
							const dy = ty - sy;
							const dist = Math.sqrt(dx * dx + dy * dy);
							const ctrlOffset =
								edge.edgeType === "doc-memory" ? 15 : Math.min(30, dist * 0.2);

							const cx = midX + ctrlOffset * (dy / dist);
							const cy = midY - ctrlOffset * (dx / dist);

							if (edge.edgeType === "doc-doc") {
								if (useSimplified) {
									// Straight line when zoomed out (no dash)
									g.moveTo(sx, sy);
									g.quadraticCurveTo(cx, cy, tx, ty);
									g.stroke();
								} else {
									// Dash lengths scale with zoom to keep screen size constant
									const dash = 10 / zoom;
									const gap = 5 / zoom;
									drawDashedQuadratic(g, sx, sy, cx, cy, tx, ty, dash, gap);
								}
							} else {
								g.moveTo(sx, sy);
								g.quadraticCurveTo(cx, cy, tx, ty);
								g.stroke();
							}
						}
					}
				});
			},
			[edges, nodes, zoom, width, drawDashedQuadratic],
		);

		/* ---------- pointer handlers (unchanged) ---------- */
		// Pointer move (pan or drag)
		const handlePointerMove = useCallback(
			(e: React.PointerEvent<HTMLDivElement>) => {
				const mouseEvent = {
					clientX: e.clientX,
					clientY: e.clientY,
					preventDefault: () => {},
					stopPropagation: () => {},
				} as React.MouseEvent;

				if (draggingNodeId) {
					// Node dragging handled elsewhere (future steps)
					onNodeDragMove(mouseEvent);
				} else if (isPanningRef.current) {
					onPanMove(mouseEvent);
				}

				// Track movement for distinguishing click vs drag/pan
				if (pointerDownPosRef.current) {
					const dx = e.clientX - pointerDownPosRef.current.x;
					const dy = e.clientY - pointerDownPosRef.current.y;
					if (Math.sqrt(dx * dx + dy * dy) > 3) pointerMovedRef.current = true;
				}

				// Hover detection
				const nodeId = getNodeAtPosition(e.clientX, e.clientY);
				if (nodeId !== currentHoveredRef.current) {
					currentHoveredRef.current = nodeId;
					onNodeHover(nodeId);
				}
			},
			[
				draggingNodeId,
				onNodeDragMove,
				onPanMove,
				onNodeHover,
				getNodeAtPosition,
			],
		);

		const handlePointerDown = useCallback(
			(e: React.PointerEvent<HTMLDivElement>) => {
				const mouseEvent = {
					clientX: e.clientX,
					clientY: e.clientY,
					preventDefault: () => {},
					stopPropagation: () => {},
				} as React.MouseEvent;

				const nodeId = getNodeAtPosition(e.clientX, e.clientY);
				if (nodeId) {
					onNodeDragStart(nodeId, mouseEvent);
					// drag handled externally
				} else {
					onPanStart(mouseEvent);
					isPanningRef.current = true;
				}
				pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
				pointerMovedRef.current = false;
			},
			[onPanStart, onNodeDragStart, getNodeAtPosition],
		);

		const handlePointerUp = useCallback(
			(e: React.PointerEvent<HTMLDivElement>) => {
				const wasPanning = isPanningRef.current;
				if (draggingNodeId) onNodeDragEnd();
				else if (wasPanning) onPanEnd();

				// Consider it a click if not panning and movement was minimal
				if (!wasPanning && !pointerMovedRef.current) {
					const nodeId = getNodeAtPosition(e.clientX, e.clientY);
					if (nodeId) onNodeClick(nodeId);
				}

				isPanningRef.current = false;
				pointerDownPosRef.current = null;
				pointerMovedRef.current = false;
			},
			[draggingNodeId, onNodeDragEnd, onPanEnd, getNodeAtPosition, onNodeClick],
		);

		// Click handler – opens detail panel
		const handleClick = useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (isPanningRef.current) return;
				const nodeId = getNodeAtPosition(e.clientX, e.clientY);
				if (nodeId) onNodeClick(nodeId);
			},
			[getNodeAtPosition, onNodeClick],
		);

		// Click handled in pointer up to avoid duplicate events

		const handleWheel = useCallback(
			(e: React.WheelEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();

				// Accumulate deltas
				pendingWheelDeltaRef.current.dx += e.deltaX;
				pendingWheelDeltaRef.current.dy += e.deltaY;

				// Schedule a single update per frame
				if (wheelRafRef.current === null) {
					wheelRafRef.current = requestAnimationFrame(() => {
						const { dx, dy } = pendingWheelDeltaRef.current;
						pendingWheelDeltaRef.current = { dx: 0, dy: 0 };

						// @ts-expect-error
						onWheel({
							deltaY: dy,
							deltaX: dx,
							clientX: e.clientX,
							clientY: e.clientY,
							currentTarget: containerRef.current,
							nativeEvent: e.nativeEvent,
							preventDefault: () => {},
							stopPropagation: () => {},
						} as React.WheelEvent);

						wheelRafRef.current = null;

						// nothing else – caching removed
					});
				}
			},
			[onWheel],
		);

		// Cleanup any pending RAF on unmount
		useEffect(() => {
			return () => {
				if (wheelRafRef.current !== null) {
					cancelAnimationFrame(wheelRafRef.current);
				}
			};
		}, []);

		return (
			<div
				className="absolute inset-0"
				onDoubleClick={(ev) =>
					onDoubleClick?.(ev as unknown as React.MouseEvent)
				}
				onKeyDown={(ev) => {
					if (ev.key === "Enter")
						handleClick(ev as unknown as React.MouseEvent<HTMLDivElement>);
				}}
				onPointerDown={handlePointerDown}
				onPointerLeave={() => {
					if (draggingNodeId) onNodeDragEnd();
					if (isPanningRef.current) onPanEnd();
					isPanningRef.current = false;
					pointerDownPosRef.current = null;
					pointerMovedRef.current = false;
				}}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
				onWheel={handleWheel}
				ref={containerRef}
				role="application"
				style={{
					cursor: draggingNodeId ? "grabbing" : "move",
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
			>
				<Application
					preference="webgl"
					antialias
					autoDensity
					backgroundColor={0x0f1419}
					height={height}
					resolution={
						typeof window !== "undefined" ? window.devicePixelRatio : 1
					}
					width={width}
				>
					{/* Grid background (not affected by world transform) */}
					<pixiGraphics ref={gridG} draw={() => {}} />

					{/* World container that pans/zooms as a single transform */}
					<pixiContainer ref={worldContainerRef}>
						{/* Edges */}
						<pixiGraphics ref={edgesG} draw={() => {}} />

						{/* Documents */}
						<pixiGraphics ref={docsG} draw={() => {}} />

						{/* Memories */}
						<pixiGraphics ref={memsG} draw={() => {}} />
					</pixiContainer>
				</Application>
			</div>
		);
	},
);

GraphWebGLCanvas.displayName = "GraphWebGLCanvas";
