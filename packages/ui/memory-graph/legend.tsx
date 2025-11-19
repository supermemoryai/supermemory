"use client";

import { useIsMobile } from "@hooks/use-mobile";
import { cn } from "@repo/lib/utils";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { Brain, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { colors } from "./constants";
import type { GraphEdge, GraphNode, LegendProps } from "./types";

// Cookie utility functions for legend state
const setCookie = (name: string, value: string, days = 365) => {
	if (typeof document === "undefined") return;
	const expires = new Date();
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
	if (typeof document === "undefined") return null;
	const nameEQ = `${name}=`;
	const ca = document.cookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		if (!c) continue;
		while (c.charAt(0) === " ") c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
};

interface ExtendedLegendProps extends LegendProps {
	id?: string;
	nodes?: GraphNode[];
	edges?: GraphEdge[];
	isLoading?: boolean;
}

export const Legend = memo(function Legend({
	variant = "console",
	id,
	nodes = [],
	edges = [],
	isLoading = false,
}: ExtendedLegendProps) {
	const isMobile = useIsMobile();
	const [isExpanded, setIsExpanded] = useState(true);
	const [isInitialized, setIsInitialized] = useState(false);

	// Load saved preference on client side
	useEffect(() => {
		if (!isInitialized) {
			const savedState = getCookie("legendCollapsed");
			if (savedState === "true") {
				setIsExpanded(false);
			} else if (savedState === "false") {
				setIsExpanded(true);
			} else {
				// Default: collapsed on mobile, expanded on desktop
				setIsExpanded(!isMobile);
			}
			setIsInitialized(true);
		}
	}, [isInitialized, isMobile]);

	// Save to cookie when state changes
	const handleToggleExpanded = (expanded: boolean) => {
		setIsExpanded(expanded);
		setCookie("legendCollapsed", expanded ? "false" : "true");
	};

	// Use explicit classes that Tailwind can detect
	const getPositioningClasses = () => {
		if (variant === "console") {
			// Both desktop and mobile use same positioning for console
			return "bottom-4 right-4";
		}
		if (variant === "consumer") {
			return isMobile ? "bottom-48 left-4" : "top-18 right-4";
		}
		return "";
	};

	const getMobileSize = () => {
		if (!isMobile) return "";
		return isExpanded ? "max-w-xs" : "w-16 h-12";
	};

	const hexagonClipPath =
		"polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

	// Calculate stats
	const memoryCount = nodes.filter((n) => n.type === "memory").length;
	const documentCount = nodes.filter((n) => n.type === "document").length;

	return (
		<div
			className={cn(
				"absolute z-10 rounded-xl overflow-hidden w-fit h-fit",
				getPositioningClasses(),
				getMobileSize(),
				isMobile && "hidden md:block",
			)}
			id={id}
		>
			<Collapsible onOpenChange={handleToggleExpanded} open={isExpanded}>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-xl" />

				<div className="relative z-10">
					{/* Mobile and Desktop collapsed state */}
					{!isExpanded && (
						<CollapsibleTrigger className="w-full h-full p-2 flex items-center justify-center hover:bg-white/5 transition-colors">
							<div className="flex flex-col items-center gap-1">
								<div className="text-xs text-slate-300 font-medium">?</div>
								<ChevronUp className="w-3 h-3 text-slate-400" />
							</div>
						</CollapsibleTrigger>
					)}

					{/* Expanded state */}
					{isExpanded && (
						<>
							{/* Header with toggle */}
							<div className="flex items-center justify-between px-4 py-3 border-b border-slate-600/50">
								<div className="text-sm font-medium text-slate-100">Legend</div>
								<CollapsibleTrigger className="p-1 hover:bg-white/10 rounded">
									<ChevronDown className="w-4 h-4 text-slate-400" />
								</CollapsibleTrigger>
							</div>

							<CollapsibleContent>
								<div className="text-xs text-slate-200 px-4 py-3 space-y-3">
									{/* Stats Section */}
									{!isLoading && (
										<div className="space-y-2">
											<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
												Statistics
											</div>
											<div className="space-y-1.5">
												<div className="flex items-center gap-2">
													<Brain className="w-3 h-3 text-blue-400" />
													<span className="text-xs">
														{memoryCount} memories
													</span>
												</div>
												<div className="flex items-center gap-2">
													<FileText className="w-3 h-3 text-slate-300" />
													<span className="text-xs">
														{documentCount} documents
													</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="w-3 h-3 bg-gradient-to-r from-slate-400 to-blue-400 rounded-full" />
													<span className="text-xs">
														{edges.length} connections
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Node Types */}
									<div className="space-y-2">
										<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
											Nodes
										</div>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2">
												<div className="w-4 h-3 bg-white/8 border border-white/25 rounded-sm flex-shrink-0" />
												<span className="text-xs">Document</span>
											</div>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 bg-blue-400/10 border border-blue-400/35 flex-shrink-0"
													style={{
														clipPath: hexagonClipPath,
													}}
												/>
												<span className="text-xs">Memory (latest)</span>
											</div>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 bg-blue-400/10 border border-blue-400/35 opacity-40 flex-shrink-0"
													style={{
														clipPath: hexagonClipPath,
													}}
												/>
												<span className="text-xs">Memory (older)</span>
											</div>
										</div>
									</div>

									{/* Status Indicators */}
									<div className="space-y-2">
										<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
											Status
										</div>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 bg-red-500/30 border border-red-500/80 relative flex-shrink-0"
													style={{
														clipPath: hexagonClipPath,
													}}
												>
													<div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs leading-none">
														✕
													</div>
												</div>
												<span className="text-xs">Forgotten</span>
											</div>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 bg-blue-400/10 border-2 border-amber-500 flex-shrink-0"
													style={{
														clipPath: hexagonClipPath,
													}}
												/>
												<span className="text-xs">Expiring soon</span>
											</div>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 bg-blue-400/10 border-2 border-emerald-500 relative flex-shrink-0"
													style={{
														clipPath: hexagonClipPath,
													}}
												>
													<div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
												</div>
												<span className="text-xs">New memory</span>
											</div>
										</div>
									</div>

									{/* Connection Types */}
									<div className="space-y-2">
										<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
											Connections
										</div>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2">
												<div className="w-4 h-0 border-t border-slate-400 flex-shrink-0" />
												<span className="text-xs">Doc → Memory</span>
											</div>
											<div className="flex items-center gap-2">
												<div className="w-4 h-0 border-t-2 border-dashed border-slate-400 flex-shrink-0" />
												<span className="text-xs">Doc similarity</span>
											</div>
										</div>
									</div>

									{/* Relation Types */}
									<div className="space-y-2">
										<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
											Relations
										</div>
										<div className="space-y-1.5">
											{[
												["updates", colors.relations.updates],
												["extends", colors.relations.extends],
												["derives", colors.relations.derives],
											].map(([label, color]) => (
												<div className="flex items-center gap-2" key={label}>
													<div
														className="w-4 h-0 border-t-2 flex-shrink-0"
														style={{ borderColor: color }}
													/>
													<span
														className="text-xs capitalize"
														style={{ color: color }}
													>
														{label}
													</span>
												</div>
											))}
										</div>
									</div>

									{/* Similarity Strength */}
									<div className="space-y-2">
										<div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
											Similarity
										</div>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full bg-slate-400/20 flex-shrink-0" />
												<span className="text-xs">Weak</span>
											</div>
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full bg-slate-400/60 flex-shrink-0" />
												<span className="text-xs">Strong</span>
											</div>
										</div>
									</div>
								</div>
							</CollapsibleContent>
						</>
					)}
				</div>
			</Collapsible>
		</div>
	);
});

Legend.displayName = "Legend";
