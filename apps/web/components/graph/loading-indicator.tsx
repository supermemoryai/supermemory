"use client"

import { Sparkles } from "lucide-react"
import { memo } from "react"
import type { LoadingIndicatorProps } from "./types"

export const LoadingIndicator = memo<LoadingIndicatorProps>(
	({ isLoading, isLoadingMore, totalLoaded }) => {
		if (!isLoading && !isLoadingMore) return null

		return (
			<div className="absolute top-20 right-4 z-10 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden">
				<div className="p-3">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
						<span className="text-sm text-white/70">
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
