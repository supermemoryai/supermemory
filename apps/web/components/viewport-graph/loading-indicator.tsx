"use client"

import { memo } from "react"
import { Loader2 } from "lucide-react"

interface LoadingIndicatorProps {
	isLoading: boolean
	totalLoaded: number
}

export const LoadingIndicator = memo<LoadingIndicatorProps>(
	({ isLoading, totalLoaded }) => {
		if (!isLoading && totalLoaded === 0) {
			return null
		}

		return (
			<div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-xs text-white/80">
				{isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
				<span>
					{totalLoaded} document{totalLoaded !== 1 ? "s" : ""}
				</span>
			</div>
		)
	},
)

LoadingIndicator.displayName = "LoadingIndicator"
