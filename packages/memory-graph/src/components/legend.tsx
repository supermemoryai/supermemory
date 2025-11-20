"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/ui/collapsible";
import { GlassMenuEffect } from "@/ui/glass-effect";
import { Brain, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { colors } from "@/constants";
import type { GraphEdge, GraphNode, LegendProps } from "@/types";
import * as styles from "./legend.css";

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

	// Get container class based on variant and mobile state
	const getContainerClass = () => {
		if (variant === "console") {
			return isMobile ? styles.legendContainer.consoleMobile : styles.legendContainer.consoleDesktop;
		}
		return isMobile ? styles.legendContainer.consumerMobile : styles.legendContainer.consumerDesktop;
	};

	// Calculate stats
	const memoryCount = nodes.filter((n) => n.type === "memory").length;
	const documentCount = nodes.filter((n) => n.type === "document").length;

	const containerClass = isMobile && !isExpanded
		? `${getContainerClass()} ${styles.mobileSize.collapsed}`
		: isMobile
			? `${getContainerClass()} ${styles.mobileSize.expanded}`
			: getContainerClass();

	return (
		<div
			className={containerClass}
			id={id}
		>
			<Collapsible onOpenChange={handleToggleExpanded} open={isExpanded}>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="xl" />

				<div className={styles.legendContent}>
					{/* Mobile and Desktop collapsed state */}
					{!isExpanded && (
						<CollapsibleTrigger className={styles.collapsedTrigger}>
							<div className={styles.collapsedContent}>
								<div className={styles.collapsedText}>?</div>
								<ChevronUp className={styles.collapsedIcon} />
							</div>
						</CollapsibleTrigger>
					)}

					{/* Expanded state */}
					{isExpanded && (
						<>
							{/* Header with toggle */}
							<div className={styles.legendHeader}>
								<div className={styles.legendTitle}>Legend</div>
								<CollapsibleTrigger className={styles.headerTrigger}>
									<ChevronDown className={styles.headerIcon} />
								</CollapsibleTrigger>
							</div>

							<CollapsibleContent>
								<div className={styles.sectionsContainer}>
									{/* Stats Section */}
									{!isLoading && (
										<div className={styles.sectionWrapper}>
											<div className={styles.sectionTitle}>
												Statistics
											</div>
											<div className={styles.itemsList}>
												<div className={styles.legendItem}>
													<Brain className={styles.legendIcon} style={{ color: "rgb(96, 165, 250)" }} />
													<span className={styles.legendText}>
														{memoryCount} memories
													</span>
												</div>
												<div className={styles.legendItem}>
													<FileText className={styles.legendIcon} style={{ color: "rgb(203, 213, 225)" }} />
													<span className={styles.legendText}>
														{documentCount} documents
													</span>
												</div>
												<div className={styles.legendItem}>
													<div className={styles.gradientCircle} />
													<span className={styles.legendText}>
														{edges.length} connections
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Node Types */}
									<div className={styles.sectionWrapper}>
										<div className={styles.sectionTitle}>
											Nodes
										</div>
										<div className={styles.itemsList}>
											<div className={styles.legendItem}>
												<div className={styles.documentNode} />
												<span className={styles.legendText}>Document</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.memoryNode} />
												<span className={styles.legendText}>Memory (latest)</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.memoryNodeOlder} />
												<span className={styles.legendText}>Memory (older)</span>
											</div>
										</div>
									</div>

									{/* Status Indicators */}
									<div className={styles.sectionWrapper}>
										<div className={styles.sectionTitle}>
											Status
										</div>
										<div className={styles.itemsList}>
											<div className={styles.legendItem}>
												<div className={styles.forgottenNode}>
													<div className={styles.forgottenIcon}>
														✕
													</div>
												</div>
												<span className={styles.legendText}>Forgotten</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.expiringNode} />
												<span className={styles.legendText}>Expiring soon</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.newNode}>
													<div className={styles.newBadge} />
												</div>
												<span className={styles.legendText}>New memory</span>
											</div>
										</div>
									</div>

									{/* Connection Types */}
									<div className={styles.sectionWrapper}>
										<div className={styles.sectionTitle}>
											Connections
										</div>
										<div className={styles.itemsList}>
											<div className={styles.legendItem}>
												<div className={styles.connectionLine} />
												<span className={styles.legendText}>Doc → Memory</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.similarityLine} />
												<span className={styles.legendText}>Doc similarity</span>
											</div>
										</div>
									</div>

									{/* Relation Types */}
									<div className={styles.sectionWrapper}>
										<div className={styles.sectionTitle}>
											Relations
										</div>
										<div className={styles.itemsList}>
											{[
												["updates", colors.relations.updates],
												["extends", colors.relations.extends],
												["derives", colors.relations.derives],
											].map(([label, color]) => (
												<div className={styles.legendItem} key={label}>
													<div
														className={styles.relationLine}
														style={{ borderColor: color }}
													/>
													<span
														className={styles.legendText}
														style={{ color: color, textTransform: "capitalize" }}
													>
														{label}
													</span>
												</div>
											))}
										</div>
									</div>

									{/* Similarity Strength */}
									<div className={styles.sectionWrapper}>
										<div className={styles.sectionTitle}>
											Similarity
										</div>
										<div className={styles.itemsList}>
											<div className={styles.legendItem}>
												<div className={styles.weakSimilarity} />
												<span className={styles.legendText}>Weak</span>
											</div>
											<div className={styles.legendItem}>
												<div className={styles.strongSimilarity} />
												<span className={styles.legendText}>Strong</span>
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
