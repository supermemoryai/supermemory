"use client"

import { memo } from "react"
import type { NavigationControlsProps } from "./types"

export const NavigationControls = memo<NavigationControlsProps>(
	({
		onCenter,
		onZoomIn,
		onZoomOut,
		onAutoFit,
		onTimeline,
		isTimelineActive,
		timelineProgress,
		nodes,
		className = "",
	}) => {
		return (
			<div
				className={`absolute bottom-4 left-4 z-10 flex items-center gap-2 ${className}`}
			>
				{onTimeline && (
					<button
						type="button"
						onClick={onTimeline}
						disabled={isTimelineActive}
						className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
							isTimelineActive
								? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
								: "text-white/80 bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 hover:text-white"
						}`}
						title="Play timeline animation"
					>
						{isTimelineActive ? (
							<>
								<span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
								{timelineProgress?.streamed ?? 0}
							</>
						) : (
							"Timeline"
						)}
					</button>
				)}
				{nodes.length > 0 && (
					<>
						<button
							type="button"
							onClick={onAutoFit}
							className="px-3 py-1.5 text-sm font-medium text-white/80 bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
							title="Auto-fit graph to viewport"
						>
							Fit
						</button>
						<button
							type="button"
							onClick={onCenter}
							className="px-3 py-1.5 text-sm font-medium text-white/80 bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
							title="Center view on graph"
						>
							Center
						</button>
						<div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden">
							<button
								type="button"
								onClick={onZoomIn}
								className="px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors border-r border-white/20"
								title="Zoom in"
							>
								+
							</button>
							<button
								type="button"
								onClick={onZoomOut}
								className="px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
								title="Zoom out"
							>
								−
							</button>
						</div>
					</>
				)}
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
