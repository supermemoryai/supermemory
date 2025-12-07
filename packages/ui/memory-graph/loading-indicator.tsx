"use client";

import { cn } from "@repo/lib/utils";
import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { Sparkles } from "lucide-react";
import { memo } from "react";
import type { LoadingIndicatorProps } from "./types";

export const LoadingIndicator = memo<LoadingIndicatorProps>(
	({ isLoading, isLoadingMore, totalLoaded, variant = "console" }) => {
		// Use explicit classes that Tailwind can detect
		const getPositioningClasses = () => {
			// Both variants use the same positioning for loadingIndicator
			return "top-20 left-4";
		};

		if (!isLoading && !isLoadingMore) return null;

		return (
			<div
				className={cn(
					"absolute z-10 rounded-xl overflow-hidden",
					getPositioningClasses(),
				)}
			>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-xl" />

				<div className="relative z-10 text-slate-200 px-4 py-3">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
						<span className="text-sm">
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
