"use client"

import { memo, useMemo } from "react"
import type { GraphNode } from "./types"

export interface NodeHoverPopoverProps {
	node: GraphNode
	screenX: number
	screenY: number
	nodeRadius: number
	containerBounds?: DOMRect
}

// Small hexagon icon for the "Latest" badge
function HexagonIcon({ className }: { className?: string }) {
	return (
		<svg
			width="8"
			height="9"
			viewBox="0 0 8 9"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M4 0.5L7.4641 2.5V6.5L4 8.5L0.535898 6.5V2.5L4 0.5Z"
				fill="#05A376"
			/>
		</svg>
	)
}

// Globe icon for document type
function GlobeIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#3B73B8"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20" />
			<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	)
}

// Keyboard shortcut badge
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

export const NodeHoverPopover = memo<NodeHoverPopoverProps>(
	function NodeHoverPopover({
		node,
		screenX,
		screenY,
		nodeRadius,
		containerBounds,
	}) {
		// Calculate position - place popover to the right of the node with connector
		const { popoverX, popoverY, iconX, iconY, connectorPath } = useMemo(() => {
			const gap = 20 // Gap between node and icon
			const iconSize = 40
			const popoverWidth = 320 // Approximate total width
			const popoverHeight = 135 // Approximate total height

			// Default position: to the right of the node
			let pX = screenX + nodeRadius + gap + iconSize + 12
			let pY = screenY - popoverHeight / 2

			// Icon position
			let iX = screenX + nodeRadius + gap
			let iY = screenY - iconSize / 2

			// Adjust if too close to edges
			if (containerBounds) {
				const rightEdge = containerBounds.width - 20
				const bottomEdge = containerBounds.height - 20

				// If popover goes off right edge, flip to left side
				if (pX + popoverWidth - iconSize - 12 > rightEdge) {
					pX = screenX - nodeRadius - gap - popoverWidth
					iX = screenX - nodeRadius - gap - iconSize
				}

				// Keep within vertical bounds
				if (pY < 20) pY = 20
				if (pY + popoverHeight > bottomEdge) pY = bottomEdge - popoverHeight

				// Keep icon within vertical bounds
				if (iY < 20) iY = 20
				if (iY + iconSize > bottomEdge) iY = bottomEdge - iconSize
			}

			// Connector SVG path from node edge to icon center
			const nodeEdgeX = screenX + nodeRadius
			const iconCenterX = iX + iconSize / 2
			const iconCenterY = iY + iconSize / 2

			const path = `M ${nodeEdgeX} ${screenY} L ${iconCenterX} ${iconCenterY}`

			return {
				popoverX: pX,
				popoverY: pY,
				iconX: iX,
				iconY: iY,
				connectorPath: path,
			}
		}, [screenX, screenY, nodeRadius, containerBounds])

		const content = useMemo(() => {
			if (node.type === "memory") {
				return (node.data as any).memory || (node.data as any).content || ""
			}
			return (node.data as any).summary || (node.data as any).title || ""
		}, [node])

		const truncatedContent = useMemo(() => {
			if (!content) return "No content"
			if (content.length > 120) {
				return `${content.substring(0, 120)}...`
			}
			return content
		}, [content])

		return (
			<div className="pointer-events-none absolute inset-0 z-[100]">
				{/* Connector line from node to icon */}
				<svg
					className="absolute inset-0 w-full h-full overflow-visible"
					style={{ pointerEvents: "none" }}
					aria-hidden="true"
				>
					<path
						d={connectorPath}
						stroke="#3B73B8"
						strokeWidth="1.5"
						fill="none"
						strokeDasharray="4 2"
					/>
				</svg>

				{/* Document type icon */}
				<div
					className="absolute flex items-center justify-center rounded-lg"
					style={{
						left: iconX,
						top: iconY,
						width: 40,
						height: 40,
						backgroundColor: "#1B1F24",
					}}
				>
					<div
						className="flex items-center justify-center rounded-md"
						style={{
							width: 36,
							height: 36,
							backgroundColor: "#13161A",
						}}
					>
						<GlobeIcon />
					</div>
				</div>

				{/* Main popover card */}
				<div
					className="absolute flex gap-3"
					style={{
						left: popoverX,
						top: popoverY,
					}}
				>
					{/* Memory card */}
					<div
						className="flex flex-col rounded-xl overflow-hidden"
						style={{
							width: 240,
							height: 115,
							backgroundColor: "#0C1829",
						}}
					>
						{/* Content area */}
						<div
							className="flex-1 p-3 overflow-hidden"
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
								{truncatedContent}
							</p>
						</div>

						{/* Bottom bar */}
						<div
							className="flex items-center justify-between px-3 py-2"
							style={{ backgroundColor: "#0C1829" }}
						>
							{/* Version with gradient text */}
							<span
								className="text-xs font-medium"
								style={{
									background:
										"linear-gradient(90deg, #369BFD 0%, #36FDFD 50%, #36FDB5 100%)",
									WebkitBackgroundClip: "text",
									WebkitTextFillColor: "transparent",
									backgroundClip: "text",
								}}
							>
								v1
							</span>

							{/* Latest badge */}
							<div className="flex items-center gap-1">
								<HexagonIcon />
								<span
									className="text-xs font-medium"
									style={{ color: "#05A376" }}
								>
									Latest
								</span>
							</div>
						</div>
					</div>

					{/* Keyboard shortcuts panel */}
					<div
						className="flex flex-col justify-center gap-2 px-3 py-2 rounded-lg"
						style={{ backgroundColor: "#0C1829" }}
					>
						<div className="flex items-center gap-2">
							<KeyBadge>↑</KeyBadge>
							<span className="text-[11px]" style={{ color: "#525D6E" }}>
								Go to document
							</span>
						</div>
						<div className="flex items-center gap-2">
							<KeyBadge>→</KeyBadge>
							<span className="text-[11px]" style={{ color: "#525D6E" }}>
								Next memory
							</span>
						</div>
						<div className="flex items-center gap-2">
							<KeyBadge>←</KeyBadge>
							<span className="text-[11px]" style={{ color: "#525D6E" }}>
								Previous memory
							</span>
						</div>
					</div>
				</div>
			</div>
		)
	},
)
