"use client"

import { memo } from "react"
import { Play, Minus, Plus } from "lucide-react"
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
		zoom = 1,
	}) => {
		const zoomPercent = Math.round(zoom * 100)

		return (
			<div
				className={`absolute bottom-[60px] left-4 z-10 flex flex-col gap-1.5 ${className}`}
			>
				{/* Timeline controls */}
				{onTimeline && (
					<div className="flex items-center gap-2 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg p-2">
						<button
							type="button"
							onClick={onTimeline}
							disabled={isTimelineActive}
							className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
								isTimelineActive
									? "bg-cyan-500/20 text-cyan-400"
									: "text-white/70 hover:bg-white/10 hover:text-white"
							}`}
							title="Play timeline (⌘P)"
						>
							{isTimelineActive ? (
								<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
							) : (
								<Play className="w-4 h-4" />
							)}
						</button>
						<span className="text-[10px] text-[#525D6E] bg-[#161F2C] px-1.5 py-0.5 rounded">
							⌘ P
						</span>
						{isTimelineActive && timelineProgress && (
							<span className="text-xs text-cyan-400 ml-1">
								{timelineProgress.streamed}
							</span>
						)}
						<span className="text-xs text-white/70 ml-1">Today</span>
					</div>
				)}

				{/* Navigation controls */}
				{nodes.length > 0 && (
					<>
						{/* Fit button */}
						<button
							type="button"
							onClick={onAutoFit}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg hover:bg-[#0A1628] hover:text-white transition-colors"
							title="Auto-fit graph to viewport (Z)"
						>
							<span>Fit</span>
							<span className="text-[10px] text-[#525D6E] bg-[#161F2C] px-1.5 py-0.5 rounded">
								Z
							</span>
						</button>

						{/* Center button */}
						<button
							type="button"
							onClick={onCenter}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg hover:bg-[#0A1628] hover:text-white transition-colors"
							title="Center view on graph (C)"
						>
							<span>Center</span>
							<span className="text-[10px] text-[#525D6E] bg-[#161F2C] px-1.5 py-0.5 rounded">
								C
							</span>
						</button>

						{/* Zoom controls */}
						<div className="flex items-center gap-1 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg p-1">
							<span className="text-sm font-medium text-white/70 px-2 min-w-[50px]">
								{zoomPercent}%
							</span>
							<button
								type="button"
								onClick={onZoomOut}
								className="flex items-center justify-center w-7 h-7 text-white/70 hover:bg-white/10 hover:text-white transition-colors rounded"
								title="Zoom out"
							>
								<Minus className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={onZoomIn}
								className="flex items-center justify-center w-7 h-7 text-white/70 hover:bg-white/10 hover:text-white transition-colors rounded"
								title="Zoom in"
							>
								<Plus className="w-3.5 h-3.5" />
							</button>
						</div>
					</>
				)}
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
