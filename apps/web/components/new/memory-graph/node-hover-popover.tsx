"use client"

import { memo, useMemo, useCallback, useState } from "react"
import type { GraphNode, DocumentNodeData, MemoryNodeData } from "./types"
import type { ChainEntry } from "./canvas/version-chain"

export interface NodeHoverPopoverProps {
	node: GraphNode
	screenX: number
	screenY: number
	nodeRadius: number
	containerBounds?: DOMRect
	versionChain?: ChainEntry[] | null
	onNavigateNext?: () => void
	onNavigatePrev?: () => void
	onNavigateUp?: () => void
	onNavigateDown?: () => void
	onSelectNode?: (nodeId: string) => void
}

function KeyBadge({ children }: { children: React.ReactNode }) {
	return (
		<span
			className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-medium"
			style={{
				backgroundColor: "#181A1E",
				border: "1px solid #2A2C2F",
				color: "#737373",
			}}
		>
			{children}
		</span>
	)
}

function NavButton({
	icon,
	label,
	onClick,
}: {
	icon: string
	label: string
	onClick?: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
			style={{ background: "none", border: "none", padding: "2px 0" }}
		>
			<KeyBadge>{icon}</KeyBadge>
			<span
				className="text-[11px] whitespace-nowrap"
				style={{ color: "#525D6E" }}
			>
				{label}
			</span>
		</button>
	)
}

function CopyableId({ label, value }: { label: string; value: string }) {
	const [copied, setCopied] = useState(false)
	const copy = useCallback(() => {
		navigator.clipboard.writeText(value)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [value])

	const short =
		value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value

	return (
		<button
			type="button"
			onClick={copy}
			className="flex items-center gap-1.5 group cursor-pointer"
			style={{ background: "none", border: "none", padding: 0 }}
		>
			<span className="text-[10px]" style={{ color: "#525D6E" }}>
				{label}
			</span>
			<span
				className="text-[10px] font-mono group-hover:text-white transition-colors"
				style={{ color: "#737373" }}
			>
				{copied ? "Copied!" : short}
			</span>
			{!copied && (
				<svg
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#525D6E"
					strokeWidth="2"
					className="opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" />
					<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
				</svg>
			)}
		</button>
	)
}

type Quadrant = "right" | "left" | "above" | "below"

function pickBestQuadrant(
	screenX: number,
	screenY: number,
	nodeRadius: number,
	containerWidth: number,
	containerHeight: number,
	popoverWidth: number,
	popoverHeight: number,
): Quadrant {
	const gap = 24
	const spaceRight = containerWidth - (screenX + nodeRadius + gap)
	const spaceLeft = screenX - nodeRadius - gap
	const spaceAbove = screenY - nodeRadius - gap
	const spaceBelow = containerHeight - (screenY + nodeRadius + gap)

	const fits: [Quadrant, number][] = [
		["right", spaceRight >= popoverWidth ? spaceRight : -1],
		["left", spaceLeft >= popoverWidth ? spaceLeft : -1],
		["above", spaceAbove >= popoverHeight ? spaceAbove : -1],
		["below", spaceBelow >= popoverHeight ? spaceBelow : -1],
	]

	const preferred: Quadrant[] = ["right", "left", "below", "above"]
	for (const q of preferred) {
		const entry = fits.find(([dir]) => dir === q)
		if (entry && entry[1] > 0) return q
	}

	return fits.sort((a, b) => b[1] - a[1])[0]![0]
}

function truncate(s: string, max: number) {
	return s.length > max ? `${s.substring(0, max)}...` : s
}

function VersionTimeline({
	chain,
	currentId,
	onSelect,
}: {
	chain: ChainEntry[]
	currentId: string
	onSelect?: (id: string) => void
}) {
	return (
		<div className="flex flex-col gap-0 max-h-[120px] overflow-y-auto">
			{chain.map((entry) => {
				const isCurrent = entry.id === currentId
				return (
					<button
						key={entry.id}
						type="button"
						onClick={() => onSelect?.(entry.id)}
						className="flex items-start gap-2 px-3 py-1.5 text-left cursor-pointer transition-colors"
						style={{
							background: isCurrent ? "#0A1825" : "transparent",
							border: "none",
							borderLeft: isCurrent ? "2px solid #36FDFD" : "2px solid #1A2333",
						}}
					>
						<span
							className="text-[10px] font-semibold shrink-0 mt-px"
							style={{
								color: entry.isForgotten
									? "#DC2626"
									: isCurrent
										? "#36FDFD"
										: "#525D6E",
							}}
						>
							v{entry.version}
						</span>
						<span
							className="text-[11px] leading-tight"
							style={{
								color: isCurrent ? "#9CA3AF" : "#4A5568",
							}}
						>
							{truncate(entry.memory, 60)}
						</span>
					</button>
				)
			})}
		</div>
	)
}

export const NodeHoverPopover = memo<NodeHoverPopoverProps>(
	function NodeHoverPopover({
		node,
		screenX,
		screenY,
		nodeRadius,
		containerBounds,
		versionChain,
		onNavigateNext,
		onNavigatePrev,
		onNavigateUp,
		onNavigateDown,
		onSelectNode,
	}) {
		const CARD_W = 280
		const SHORTCUTS_W = 100
		const GAP = 24
		const TOTAL_W = CARD_W + 12 + SHORTCUTS_W

		const isMemory = node.type === "memory"
		const data = node.data

		const memoryMeta = useMemo(() => {
			if (!isMemory) return null
			const md = data as MemoryNodeData
			return {
				version: md.version ?? 1,
				isLatest: md.isLatest ?? false,
				isForgotten: md.isForgotten ?? false,
				forgetReason: md.forgetReason ?? null,
				forgetAfter: md.forgetAfter ?? null,
			}
		}, [isMemory, data])

		const hasChain = versionChain && versionChain.length > 1
		const hasForgetInfo =
			memoryMeta && (memoryMeta.isForgotten || memoryMeta.forgetAfter)

		const CARD_H = hasChain ? 200 : hasForgetInfo ? 165 : 135
		const TOTAL_H = CARD_H

		const { popoverX, popoverY, connectorPath } = useMemo(() => {
			const cw = containerBounds?.width ?? 800
			const ch = containerBounds?.height ?? 600

			const quadrant = pickBestQuadrant(
				screenX,
				screenY,
				nodeRadius,
				cw,
				ch,
				TOTAL_W + GAP,
				TOTAL_H,
			)

			let px: number
			let py: number
			let connStart: { x: number; y: number }

			switch (quadrant) {
				case "right":
					px = screenX + nodeRadius + GAP
					py = screenY - TOTAL_H / 2
					connStart = { x: screenX + nodeRadius, y: screenY }
					break
				case "left":
					px = screenX - nodeRadius - GAP - TOTAL_W
					py = screenY - TOTAL_H / 2
					connStart = { x: screenX - nodeRadius, y: screenY }
					break
				case "below":
					px = screenX - TOTAL_W / 2
					py = screenY + nodeRadius + GAP
					connStart = { x: screenX, y: screenY + nodeRadius }
					break
				case "above":
					px = screenX - TOTAL_W / 2
					py = screenY - nodeRadius - GAP - TOTAL_H
					connStart = { x: screenX, y: screenY - nodeRadius }
					break
			}

			px = Math.max(8, Math.min(cw - TOTAL_W - 8, px))
			py = Math.max(8, Math.min(ch - TOTAL_H - 8, py))

			const cardCenterX = px + CARD_W / 2
			const cardCenterY = py + TOTAL_H / 2
			const path = `M ${connStart.x} ${connStart.y} L ${cardCenterX} ${cardCenterY}`

			return { popoverX: px, popoverY: py, connectorPath: path }
		}, [screenX, screenY, nodeRadius, containerBounds, TOTAL_W, TOTAL_H])

		const content = useMemo(() => {
			if (isMemory) {
				const md = data as MemoryNodeData
				return md.memory || md.content || ""
			}
			const dd = data as DocumentNodeData
			return dd.summary || dd.title || ""
		}, [isMemory, data])

		const docData = !isMemory ? (data as DocumentNodeData) : null

		return (
			<div className="pointer-events-none absolute inset-0 z-[100]">
				<svg
					className="absolute inset-0 w-full h-full overflow-visible"
					style={{ pointerEvents: "none" }}
				>
					<path
						d={connectorPath}
						stroke="#3B73B8"
						strokeWidth="1.5"
						fill="none"
						strokeDasharray="4 2"
					/>
				</svg>

				<div
					className="absolute flex gap-3 pointer-events-auto"
					style={{ left: popoverX, top: popoverY }}
				>
					{/* Card */}
					<div
						className="flex flex-col rounded-xl overflow-hidden"
						style={{ width: CARD_W, backgroundColor: "#0C1829" }}
					>
						{/* Content — show timeline if chain exists, otherwise plain text */}
						{hasChain ? (
							<VersionTimeline
								chain={versionChain}
								currentId={node.id}
								onSelect={onSelectNode}
							/>
						) : (
							<div
								className="p-3 overflow-hidden"
								style={{ backgroundColor: "#060D17" }}
							>
								<p
									className="m-0 leading-[135%]"
									style={{
										fontFamily: "'DM Sans', sans-serif",
										fontSize: 12,
										color: "#525D6E",
									}}
								>
									{truncate(content, 100) || "No content"}
								</p>
							</div>
						)}

						{/* Forget info (memory-only) */}
						{memoryMeta && hasForgetInfo && (
							<div
								className="px-3 py-1.5 flex flex-col gap-0.5"
								style={{
									backgroundColor: "#0A1320",
									borderTop: "1px solid #1A2333",
								}}
							>
								{memoryMeta.forgetAfter && (
									<span className="text-[10px]" style={{ color: "#F59E0B" }}>
										Expires:{" "}
										{new Date(memoryMeta.forgetAfter).toLocaleDateString()}
									</span>
								)}
								{memoryMeta.forgetReason && (
									<span className="text-[10px]" style={{ color: "#8B8B8B" }}>
										Reason: {memoryMeta.forgetReason}
									</span>
								)}
								{memoryMeta.isForgotten && !memoryMeta.forgetReason && (
									<span className="text-[10px]" style={{ color: "#EF4444" }}>
										Forgotten
									</span>
								)}
							</div>
						)}

						{/* Bottom bar */}
						<div
							className="flex items-center justify-between px-3 py-2"
							style={{
								backgroundColor: "#0C1829",
								borderTop: "1px solid #1A2333",
							}}
						>
							{memoryMeta ? (
								<>
									<span
										className="text-xs font-medium"
										style={{
											color: memoryMeta.isForgotten
												? "#DC2626"
												: memoryMeta.isLatest
													? "#05A376"
													: "#525D6E",
										}}
									>
										v{memoryMeta.version}{" "}
										{memoryMeta.isForgotten
											? "Forgotten"
											: memoryMeta.isLatest
												? "Latest"
												: "Superseded"}
									</span>
								</>
							) : (
								<>
									<span className="text-xs" style={{ color: "#525D6E" }}>
										{docData?.type || "document"}
									</span>
									<span className="text-xs" style={{ color: "#525D6E" }}>
										{docData?.memories?.length ?? 0} memories
									</span>
								</>
							)}
						</div>

						{/* ID row */}
						<div
							className="px-3 py-1.5 flex items-center"
							style={{
								backgroundColor: "#080E18",
								borderTop: "1px solid #1A2333",
							}}
						>
							{isMemory ? (
								<CopyableId label="Memory" value={node.id} />
							) : (
								<CopyableId label="Document" value={node.id} />
							)}
						</div>
					</div>

					{/* Navigation */}
					<div
						className="flex flex-col justify-center gap-1.5 px-3 py-2 rounded-lg"
						style={{ backgroundColor: "#0C1829" }}
					>
						{isMemory && (
							<NavButton
								icon="↑"
								label={hasChain ? "Older version" : "Go to document"}
								onClick={onNavigateUp}
							/>
						)}
						{(isMemory ? hasChain : true) && (
							<NavButton
								icon="↓"
								label={isMemory ? "Newer version" : "Go to memory"}
								onClick={onNavigateDown}
							/>
						)}
						<NavButton
							icon="→"
							label={isMemory ? "Next memory" : "Next document"}
							onClick={onNavigateNext}
						/>
						<NavButton
							icon="←"
							label={isMemory ? "Prev memory" : "Prev document"}
							onClick={onNavigatePrev}
						/>
					</div>
				</div>
			</div>
		)
	},
)
