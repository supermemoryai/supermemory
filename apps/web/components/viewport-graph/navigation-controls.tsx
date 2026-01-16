"use client"

import { memo } from "react"
import type { ViewportGraphNode } from "@/lib/viewport-graph-types"
import { Plus, Minus, Maximize2, Target } from "lucide-react"

interface NavigationControlsProps {
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	onAutoFit: () => void
	nodes: ViewportGraphNode[]
	className?: string
}

export const NavigationControls = memo<NavigationControlsProps>(
	({ onCenter, onZoomIn, onZoomOut, onAutoFit, nodes, className = "" }) => {
		if (nodes.length === 0) {
			return null
		}

		return (
			<div
				className={`absolute bottom-4 right-4 flex items-center gap-2 ${className}`}
			>
				<button
					type="button"
					onClick={onAutoFit}
					className="px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-colors"
					title="Auto-fit graph to viewport"
				>
					<Maximize2 className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onCenter}
					className="px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-colors"
					title="Center view on graph"
				>
					<Target className="w-4 h-4" />
				</button>
				<div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden">
					<button
						type="button"
						onClick={onZoomIn}
						className="px-2.5 py-1.5 text-white/80 hover:bg-white/10 transition-colors border-r border-white/20"
						title="Zoom in"
					>
						<Plus className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={onZoomOut}
						className="px-2.5 py-1.5 text-white/80 hover:bg-white/10 transition-colors"
						title="Zoom out"
					>
						<Minus className="w-4 h-4" />
					</button>
				</div>
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
