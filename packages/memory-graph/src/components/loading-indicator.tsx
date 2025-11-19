"use client";

import { GlassMenuEffect } from "@/ui/glass-effect";
import { Sparkles } from "lucide-react";
import { memo } from "react";
import type { LoadingIndicatorProps } from "@/types";
import {
	loadingContainer,
	loadingContent,
	loadingFlex,
	loadingIcon,
	loadingText,
} from "./loading-indicator.css";

export const LoadingIndicator = memo<LoadingIndicatorProps>(
	({ isLoading, isLoadingMore, totalLoaded, variant = "console" }) => {
		if (!isLoading && !isLoadingMore) return null;

		return (
			<div className={loadingContainer}>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="xl" />

				<div className={loadingContent}>
					<div className={loadingFlex}>
						{/*@ts-ignore */}
						<Sparkles className={loadingIcon} />
						<span className={loadingText}>
							{isLoading
								? "Loading memory graph..."
								: `Loading more documents... (${totalLoaded})`}
						</span>
					</div>
				</div>
			</div>
		);
	},
);

LoadingIndicator.displayName = "LoadingIndicator";
