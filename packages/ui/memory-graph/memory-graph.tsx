"use client";

import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colors } from "./constants";
import { GraphWebGLCanvas as GraphCanvas } from "./graph-webgl-canvas";
import { useGraphData } from "./hooks/use-graph-data";
import { useGraphInteractions } from "./hooks/use-graph-interactions";
import { Legend } from "./legend";
import { LoadingIndicator } from "./loading-indicator";
import { NodeDetailPanel } from "./node-detail-panel";
import { SpacesDropdown } from "./spaces-dropdown";

import type { MemoryGraphProps } from "./types";

export const MemoryGraph = ({
	children,
	documents,
	isLoading,
	isLoadingMore,
	error,
	totalLoaded,
	hasMore,
	loadMoreDocuments,
	showSpacesSelector = true,
	variant = "console",
	legendId,
	highlightDocumentIds = [],
	highlightsVisible = true,
	occludedRightPx = 0,
	autoLoadOnViewport = true,
	isExperimental = false,
}: MemoryGraphProps) => {
	const [selectedSpace, setSelectedSpace] = useState<string>("all");
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
	const containerRef = useRef<HTMLDivElement>(null);

	// Create data object with dummy pagination to satisfy type requirements
	const data = useMemo(() => {
		return documents && documents.length > 0
			? {
					documents,
					pagination: {
						currentPage: 1,
						limit: documents.length,
						totalItems: documents.length,
						totalPages: 1,
					},
				}
			: null;
	}, [documents]);

	// Graph interactions with variant-specific settings
	const {
		panX,
		panY,
		zoom,
		/** hoveredNode currently unused within this component */
		hoveredNode: _hoveredNode,
		selectedNode,
		draggingNodeId,
		nodePositions,
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
		setSelectedNode,
		autoFitToViewport,
	} = useGraphInteractions(variant);

	// Graph data
	const { nodes, edges } = useGraphData(
		data,
		selectedSpace,
		nodePositions,
		draggingNodeId,
	);

	// Auto-fit once per unique highlight set to show the full graph for context
	const lastFittedHighlightKeyRef = useRef<string>("");
	useEffect(() => {
		const highlightKey = highlightsVisible
			? highlightDocumentIds.join("|")
			: "";
		if (
			highlightKey &&
			highlightKey !== lastFittedHighlightKeyRef.current &&
			containerSize.width > 0 &&
			containerSize.height > 0 &&
			nodes.length > 0
		) {
			autoFitToViewport(nodes, containerSize.width, containerSize.height, {
				occludedRightPx,
				animate: true,
			});
			lastFittedHighlightKeyRef.current = highlightKey;
		}
	}, [
		highlightsVisible,
		highlightDocumentIds,
		containerSize.width,
		containerSize.height,
		nodes.length,
		occludedRightPx,
		autoFitToViewport,
	]);

	// Auto-fit graph when component mounts or nodes change significantly
	const hasAutoFittedRef = useRef(false);
	useEffect(() => {
		// Only auto-fit once when we have nodes and container size
		if (
			!hasAutoFittedRef.current &&
			nodes.length > 0 &&
			containerSize.width > 0 &&
			containerSize.height > 0
		) {
			// For consumer variant, auto-fit to show all content
			if (variant === "consumer") {
				autoFitToViewport(nodes, containerSize.width, containerSize.height);
				hasAutoFittedRef.current = true;
			}
		}
	}, [
		nodes,
		containerSize.width,
		containerSize.height,
		variant,
		autoFitToViewport,
	]);

	// Reset auto-fit flag when nodes array becomes empty (switching views)
	useEffect(() => {
		if (nodes.length === 0) {
			hasAutoFittedRef.current = false;
		}
	}, [nodes.length]);

	// Extract unique spaces from memories and calculate counts
	const { availableSpaces, spaceMemoryCounts } = useMemo(() => {
		if (!data?.documents) return { availableSpaces: [], spaceMemoryCounts: {} };

		const spaceSet = new Set<string>();
		const counts: Record<string, number> = {};

		data.documents.forEach((doc) => {
			doc.memoryEntries.forEach((memory) => {
				const spaceId = memory.spaceContainerTag || memory.spaceId || "default";
				spaceSet.add(spaceId);
				counts[spaceId] = (counts[spaceId] || 0) + 1;
			});
		});

		return {
			availableSpaces: Array.from(spaceSet).sort(),
			spaceMemoryCounts: counts,
		};
	}, [data]);

	// Handle container resize
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				setContainerSize({
					width: containerRef.current.clientWidth,
					height: containerRef.current.clientHeight,
				});
			}
		};

		updateSize();
		window.addEventListener("resize", updateSize);
		return () => window.removeEventListener("resize", updateSize);
	}, []);

	// Enhanced node drag start that includes nodes data
	const handleNodeDragStartWithNodes = useCallback(
		(nodeId: string, e: React.MouseEvent) => {
			handleNodeDragStart(nodeId, e, nodes);
		},
		[handleNodeDragStart, nodes],
	);

	// Get selected node data
	const selectedNodeData = useMemo(() => {
		if (!selectedNode) return null;
		return nodes.find((n) => n.id === selectedNode) || null;
	}, [selectedNode, nodes]);

	// Viewport-based loading: load more when most documents are visible (optional)
	const checkAndLoadMore = useCallback(() => {
		if (
			isLoadingMore ||
			!hasMore ||
			!data?.documents ||
			data.documents.length === 0
		)
			return;

		// Calculate viewport bounds
		const viewportBounds = {
			left: -panX / zoom - 200,
			right: (-panX + containerSize.width) / zoom + 200,
			top: -panY / zoom - 200,
			bottom: (-panY + containerSize.height) / zoom + 200,
		};

		// Count visible documents
		const visibleDocuments = data.documents.filter((doc) => {
			const docNodes = nodes.filter(
				(node) => node.type === "document" && node.data.id === doc.id,
			);
			return docNodes.some(
				(node) =>
					node.x >= viewportBounds.left &&
					node.x <= viewportBounds.right &&
					node.y >= viewportBounds.top &&
					node.y <= viewportBounds.bottom,
			);
		});

		// If 80% or more of documents are visible, load more
		const visibilityRatio = visibleDocuments.length / data.documents.length;
		if (visibilityRatio >= 0.8) {
			loadMoreDocuments();
		}
	}, [
		isLoadingMore,
		hasMore,
		data,
		panX,
		panY,
		zoom,
		containerSize.width,
		containerSize.height,
		nodes,
		loadMoreDocuments,
	]);

	// Throttled version to avoid excessive checks
	const lastLoadCheckRef = useRef(0);
	const throttledCheckAndLoadMore = useCallback(() => {
		const now = Date.now();
		if (now - lastLoadCheckRef.current > 1000) {
			// Check at most once per second
			lastLoadCheckRef.current = now;
			checkAndLoadMore();
		}
	}, [checkAndLoadMore]);

	// Monitor viewport changes to trigger loading
	useEffect(() => {
		if (!autoLoadOnViewport) return;
		throttledCheckAndLoadMore();
	}, [throttledCheckAndLoadMore, autoLoadOnViewport]);

	// Initial load trigger when graph is first rendered
	useEffect(() => {
		if (!autoLoadOnViewport) return;
		if (data?.documents && data.documents.length > 0 && hasMore) {
			// Start loading more documents after initial render
			setTimeout(() => {
				throttledCheckAndLoadMore();
			}, 500); // Small delay to allow initial layout
		}
	}, [data, hasMore, throttledCheckAndLoadMore, autoLoadOnViewport]);

	if (error) {
		return (
			<div
				className="h-full flex items-center justify-center"
				style={{ backgroundColor: colors.background.primary }}
			>
				<div className="rounded-xl overflow-hidden">
					{/* Glass effect background */}
					<GlassMenuEffect rounded="rounded-xl" />

					<div className="relative z-10 text-slate-200 px-6 py-4">
						Error loading documents: {error.message}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="h-full rounded-xl overflow-hidden"
			style={{ backgroundColor: colors.background.primary }}
		>
			{/* Spaces selector - only shown for console */}
			{showSpacesSelector && availableSpaces.length > 0 && (
				<div className="absolute top-4 left-4 z-10">
					<SpacesDropdown
						availableSpaces={availableSpaces}
						onSpaceChange={setSelectedSpace}
						selectedSpace={selectedSpace}
						spaceMemoryCounts={spaceMemoryCounts}
					/>
				</div>
			)}

			{/* Loading indicator */}
			<LoadingIndicator
				isLoading={isLoading}
				isLoadingMore={isLoadingMore}
				totalLoaded={totalLoaded}
				variant={variant}
			/>

			{/* Legend */}
			<Legend
				edges={edges}
				id={legendId}
				isLoading={isLoading}
				nodes={nodes}
				variant={variant}
				isExperimental={isExperimental}
			/>

			{/* Node detail panel */}
			<AnimatePresence>
				{selectedNodeData && (
					<NodeDetailPanel
						node={selectedNodeData}
						onClose={() => setSelectedNode(null)}
						variant={variant}
					/>
				)}
			</AnimatePresence>

			{/* Show welcome screen when no memories exist */}
			{!isLoading &&
				(!data || nodes.filter((n) => n.type === "document").length === 0) && (
					<>{children}</>
				)}

			{/* Graph container */}
			<div
				className="w-full h-full relative overflow-hidden"
				ref={containerRef}
				style={{
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
			>
				{containerSize.width > 0 && (
					<GraphCanvas
						draggingNodeId={draggingNodeId}
						edges={edges}
						height={containerSize.height}
						nodes={nodes}
						highlightDocumentIds={highlightsVisible ? highlightDocumentIds : []}
						onDoubleClick={handleDoubleClick}
						onNodeClick={handleNodeClick}
						onNodeDragEnd={handleNodeDragEnd}
						onNodeDragMove={handleNodeDragMove}
						onNodeDragStart={handleNodeDragStartWithNodes}
						onNodeHover={handleNodeHover}
						onPanEnd={handlePanEnd}
						onPanMove={handlePanMove}
						onPanStart={handlePanStart}
						onWheel={handleWheel}
						panX={panX}
						panY={panY}
						width={containerSize.width}
						zoom={zoom}
					/>
				)}
			</div>
		</div>
	);
};
