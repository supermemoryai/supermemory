"use client"

import { memo } from "react"
import type { GraphNode } from "./types"
import { cn } from "@lib/utils"
import { Settings } from "lucide-react"

interface NavigationControlsProps {
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	onAutoFit: () => void
	nodes: GraphNode[]
	className?: string
	zoomLevel: number
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

// Navigation buttons component
const NavigationButtons = memo(function NavigationButtons({
	onAutoFit,
	onCenter,
	onZoomIn,
	onZoomOut,
	zoomLevel,
}: {
	onAutoFit: () => void
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	zoomLevel: number
}) {
	return (
		<div className="flex flex-col gap-1">
			{/* Fit button */}
			<button
				type="button"
				className="flex w-fit gap-3 items-center justify-between px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
				onClick={onAutoFit}
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white font-medium">Fit</span>
				<KeyboardShortcut keys="Z" />
			</button>

			{/* Center button */}
			<button
				type="button"
				className="flex w-fit gap-3 items-center justify-between px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
				onClick={onCenter}
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white font-medium">Center</span>
				<KeyboardShortcut keys="C" />
			</button>

			{/* Zoom controls */}
			<div
				className="flex w-fit gap-3 items-center justify-between px-3 py-2 rounded-full"
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					border: "1px solid rgba(23, 24, 26, 0.7)",
					boxShadow: "1.5px 1.5px 20px rgba(0, 0, 0, 0.65)",
				}}
			>
				<span className="text-xs text-white font-medium">{zoomLevel}%</span>
				<div className="flex flex-row items-center gap-0.5">
					<button
						type="button"
						onClick={onZoomOut}
						className="w-5 h-5 flex items-center justify-center rounded bg-black/20 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
					>
						<span className="text-xs">−</span>
					</button>
					<button
						type="button"
						onClick={onZoomIn}
						className="w-5 h-5 flex items-center justify-center rounded bg-black/20 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
					>
						<span className="text-xs">+</span>
					</button>
				</div>
			</div>
		</div>
	)
})

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
		zoomLevel,
	}) => {
		if (nodes.length === 0) {
			return null
		}

		return (
			<div className={cn("flex flex-col gap-2", className)}>
				<div className="flex flex-row items-end gap-2">
					<NavigationButtons
						onAutoFit={onAutoFit}
						onCenter={onCenter}
						onZoomIn={onZoomIn}
						onZoomOut={onZoomOut}
						zoomLevel={zoomLevel}
					/>
					{/* Commented out for now as we are not using this */}
					{/*<SettingsButton />*/}
				</div>
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
