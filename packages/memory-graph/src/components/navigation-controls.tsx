"use client";

import { memo } from "react";
import type { GraphNode } from "@/types";
import {
	navContainer,
	navButton,
	zoomContainer,
	zoomInButton,
	zoomOutButton,
} from "./navigation-controls.css";

interface NavigationControlsProps {
	onCenter: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onAutoFit: () => void;
	nodes: GraphNode[];
	className?: string;
}

export const NavigationControls = memo<NavigationControlsProps>(
	({ onCenter, onZoomIn, onZoomOut, onAutoFit, nodes, className = "" }) => {
		if (nodes.length === 0) {
			return null;
		}

		const containerClassName = className
			? `${navContainer} ${className}`
			: navContainer;

		return (
			<div className={containerClassName}>
				<button
					type="button"
					onClick={onAutoFit}
					className={navButton}
					title="Auto-fit graph to viewport"
				>
					Fit
				</button>
				<button
					type="button"
					onClick={onCenter}
					className={navButton}
					title="Center view on graph"
				>
					Center
				</button>
				<div className={zoomContainer}>
					<button
						type="button"
						onClick={onZoomIn}
						className={zoomInButton}
						title="Zoom in"
					>
						+
					</button>
					<button
						type="button"
						onClick={onZoomOut}
						className={zoomOutButton}
						title="Zoom out"
					>
						−
					</button>
				</div>
			</div>
		);
	},
);

NavigationControls.displayName = "NavigationControls";
