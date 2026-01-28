"use client"

import { GlassMenuEffect } from "@repo/ui/other/glass-effect"
import { Sparkles } from "lucide-react"
import { memo } from "react"
import type { LoadingIndicatorProps } from "./types"

export const LoadingIndicator = memo<LoadingIndicatorProps>(
	({ isLoading, isLoadingMore, totalLoaded, variant = "console" }) => {
		if (!isLoading && !isLoadingMore) return null

		return (
			<div className="absolute z-30 rounded-xl overflow-hidden top-[5.5rem] left-4">
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-xl" />

				<div className="relative z-10 text-slate-300 px-4 py-3">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 animate-spin text-blue-300" />
						<span className="text-sm">
							{isLoading
								? "Loading memory graph..."
								: `Loading more documents... (${totalLoaded})`}
						</span>
					</div>
				</div>
			</div>
		)
	},
)

LoadingIndicator.displayName = "LoadingIndicator"
