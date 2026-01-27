"use client"

import { memo, useState } from "react"
import type { GraphNode } from "./types"
import { cn } from "@lib/utils"
import { Play, Settings } from "lucide-react"

interface NavigationControlsProps {
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	onAutoFit: () => void
	nodes: GraphNode[]
	className?: string
	onPlaySlideshow?: () => void
}

// Keyboard shortcut badge component
const KeyboardShortcut = memo(function KeyboardShortcut({
	keys,
}: {
	keys: string
}) {
	return (
		<div
			className="flex flex-row items-center gap-1 px-1.5 py-0.5 rounded"
			style={{
				background: "rgba(33, 33, 33, 0.5)",
				border: "1px solid rgba(115, 115, 115, 0.2)",
			}}
		>
			<span className="text-[10px] text-[#737373] font-medium leading-none">
				{keys}
			</span>
		</div>
	)
})

// Timeline bar component
const TimelineBar = memo(function TimelineBar({
	width,
	opacity = 1,
}: {
	width: number
	opacity?: number
}) {
	return (
		<div
			className="h-0.5 rounded-full"
			style={{
				width: `${width}px`,
				opacity,
				background:
					"linear-gradient(90deg, rgba(0, 61, 136, 0) 0%, #005FD4 100%)",
			}}
		/>
	)
})

// Visualizer component (left side)
const Visualizer = memo(function Visualizer({
	onPlaySlideshow,
}: {
	onPlaySlideshow?: () => void
}) {
	return (
		<div
			className="flex flex-col items-center p-3 gap-3 rounded-[10px]"
			style={{
				background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
				border: "1px solid rgba(23, 24, 26, 0.7)",
				boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
			}}
		>
			{/* Play button row */}
			<div className="flex flex-row justify-center items-center gap-2">
				<button
					type="button"
					onClick={onPlaySlideshow}
					className="w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity"
				>
					<Play className="w-[7.8px] h-[10px] text-[#FAFAFA]" fill="#FAFAFA" />
				</button>
			</div>

			{/* Keyboard shortcut */}
			<div className="flex flex-row items-center gap-1">
				<KeyboardShortcut keys="⌘P" />
			</div>

			{/* Timeline section */}
			<div className="flex flex-col items-start gap-0.5">
				{/* Today row */}
				<div className="flex flex-row items-center gap-2">
					<TimelineBar width={22} />
					<span className="text-xs text-[#FAFAFA]">Today</span>
				</div>

				{/* Timeline bars */}
				<div className="flex flex-col items-start gap-2 pl-0">
					{Array.from({ length: 10 }).map((_, i) => (
						<TimelineBar key={i} width={14} opacity={0.5} />
					))}
				</div>
			</div>
		</div>
	)
})

// Navigation buttons component
const NavigationButtons = memo(function NavigationButtons({
	onAutoFit,
	onCenter,
	onZoomIn,
	onZoomOut,
}: {
	onAutoFit: () => void
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
}) {
	const [zoomLevel, setZoomLevel] = useState(100)

	const handleZoomIn = () => {
		setZoomLevel((prev) => Math.min(prev + 25, 200))
		onZoomIn()
	}

	const handleZoomOut = () => {
		setZoomLevel((prev) => Math.max(prev - 25, 25))
		onZoomOut()
	}

	return (
		<div className="flex flex-col gap-1">
			{/* Fit button */}
			<button
				type="button"
				className="flex flex-row items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
				onClick={onAutoFit}
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white/70 font-medium">Fit</span>
				<KeyboardShortcut keys="Z" />
			</button>

			{/* Center button */}
			<button
				type="button"
				className="flex flex-row items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
				onClick={onCenter}
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white/70 font-medium">Center</span>
				<KeyboardShortcut keys="C" />
			</button>

			{/* Zoom controls */}
			<div
				className="flex flex-row items-center justify-between px-3 py-2 rounded-lg"
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white/70 font-medium">{zoomLevel}%</span>
				<div className="flex flex-row items-center gap-0.5">
					<button
						type="button"
						onClick={handleZoomOut}
						className="w-5 h-5 flex items-center justify-center rounded bg-black/20 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
					>
						<span className="text-xs">−</span>
					</button>
					<button
						type="button"
						onClick={handleZoomIn}
						className="w-5 h-5 flex items-center justify-center rounded bg-black/20 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
					>
						<span className="text-xs">+</span>
					</button>
				</div>
			</div>
		</div>
	)
})

// Settings button
const SettingsButton = memo(function SettingsButton() {
	return (
		<button
			type="button"
			className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
			style={{
				background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
				border: "1px solid rgba(23, 24, 26, 0.7)",
				boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
			}}
		>
			<Settings className="w-5 h-5 text-[#737373]" />
		</button>
	)
})

export const NavigationControls = memo<NavigationControlsProps>(
	({
		onCenter,
		onZoomIn,
		onZoomOut,
		onAutoFit,
		nodes,
		className = "",
		onPlaySlideshow,
	}) => {
		if (nodes.length === 0) {
			return null
		}

		return (
			<div className={cn("flex flex-col gap-2", className)}>
				{/* Top row: Visualizer */}
				<Visualizer onPlaySlideshow={onPlaySlideshow} />

				{/* Bottom row: Navigation + Settings */}
				<div className="flex flex-row items-end gap-2">
					<NavigationButtons
						onAutoFit={onAutoFit}
						onCenter={onCenter}
						onZoomIn={onZoomIn}
						onZoomOut={onZoomOut}
					/>
					<SettingsButton />
				</div>
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
