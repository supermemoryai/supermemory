import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ChainEntry } from "../canvas/version-chain"
import type {
	DocumentNodeData,
	GraphNode,
	GraphThemeColors,
	MemoryNodeData,
} from "../types"

export interface NodeHoverPopoverProps {
	node: GraphNode
	screenX: number
	screenY: number
	nodeRadius: number
	containerBounds?: DOMRect
	versionChain?: ChainEntry[] | null
	colors: GraphThemeColors
	onNavigateNext?: () => void
	onNavigatePrev?: () => void
	onNavigateUp?: () => void
	onNavigateDown?: () => void
	onSelectNode?: (nodeId: string) => void
	onOpenDocument?: (documentId: string) => void
}

function useCopyToClipboard(timeout = 2000) {
	const [copied, setCopied] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [])

	const copy = useCallback(
		(value: string) => {
			navigator.clipboard.writeText(value).then(
				() => {
					setCopied(true)
					if (timeoutRef.current) clearTimeout(timeoutRef.current)
					timeoutRef.current = setTimeout(() => setCopied(false), timeout)
				},
				() => {},
			)
		},
		[timeout],
	)

	return { copied, copy }
}

function KeyBadge({
	children,
	colors,
}: {
	children: React.ReactNode
	colors: GraphThemeColors
}) {
	const style: React.CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: 16,
		height: 16,
		borderRadius: 4,
		fontSize: 10,
		fontWeight: 500,
		color: colors.popoverTextMuted,
		lineHeight: 1,
		backgroundColor: colors.controlBg,
		padding: 2,
		border: `1px solid ${colors.controlBorder}`,
		boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
	}

	return <span style={style}>{children}</span>
}

function EyeIcon({ color }: { color: string }) {
	return (
		<svg
			aria-hidden="true"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	)
}

function NavButton({
	icon,
	label,
	onClick,
	colors,
}: {
	icon: React.ReactNode
	label: string
	onClick?: () => void
	colors: GraphThemeColors
}) {
	const buttonStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 8,
		cursor: "pointer",
		background: "none",
		border: "none",
		padding: "2px 0",
		transition: "opacity 0.15s",
	}

	const labelStyle: React.CSSProperties = {
		fontSize: 11,
		whiteSpace: "nowrap",
		color: colors.popoverTextSecondary,
	}

	return (
		<button
			onClick={onClick}
			style={buttonStyle}
			type="button"
			onMouseEnter={(e) => {
				e.currentTarget.style.opacity = "0.8"
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.opacity = "1"
			}}
		>
			<KeyBadge colors={colors}>{icon}</KeyBadge>
			<span style={labelStyle}>{label}</span>
		</button>
	)
}

function CopyableId({
	label,
	value,
	colors,
}: {
	label: string
	value: string
	colors: GraphThemeColors
}) {
	const { copied, copy } = useCopyToClipboard()

	const short =
		value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value

	const buttonStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 6,
		cursor: "pointer",
		background: "none",
		border: "none",
		padding: 0,
	}

	const labelStyle: React.CSSProperties = {
		fontSize: 10,
		color: colors.popoverTextSecondary,
	}

	const valueStyle: React.CSSProperties = {
		fontSize: 10,
		fontFamily: "monospace",
		color: colors.popoverTextMuted,
		transition: "color 0.15s",
	}

	return (
		<button onClick={() => copy(value)} style={buttonStyle} type="button">
			<span style={labelStyle}>{label}</span>
			<span style={valueStyle}>{copied ? "Copied!" : short}</span>
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

	return fits.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "right"
}

function truncate(s: string, max: number) {
	return s.length > max ? `${s.substring(0, max)}...` : s
}

function VersionTimeline({
	chain,
	currentId,
	onSelect,
	colors,
}: {
	chain: ChainEntry[]
	currentId: string
	onSelect?: (id: string) => void
	colors: GraphThemeColors
}) {
	const containerStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "column",
		gap: 0,
		maxHeight: 160,
		overflowY: "auto",
	}

	return (
		<div style={containerStyle}>
			{chain.map((entry) => {
				const isCurrent = entry.id === currentId

				const entryStyle: React.CSSProperties = {
					display: "flex",
					alignItems: "flex-start",
					gap: 8,
					paddingLeft: 12,
					paddingRight: 12,
					paddingTop: 6,
					paddingBottom: 6,
					textAlign: "left",
					cursor: "pointer",
					transition: "background-color 0.15s",
					background: isCurrent ? `${colors.accent}15` : "transparent",
					border: "none",
					borderLeft: isCurrent
						? `2px solid ${colors.accent}`
						: `2px solid ${colors.popoverBorder}`,
				}

				const versionStyle: React.CSSProperties = {
					fontSize: 10,
					fontWeight: 600,
					flexShrink: 0,
					marginTop: 1,
					color: entry.isForgotten
						? colors.memBorderForgotten
						: isCurrent
							? colors.accent
							: colors.popoverTextSecondary,
				}

				const textStyle: React.CSSProperties = {
					fontSize: 11,
					lineHeight: 1.35,
					color: isCurrent
						? colors.popoverTextPrimary
						: colors.popoverTextMuted,
				}

				return (
					<button
						key={entry.id}
						onClick={() => onSelect?.(entry.id)}
						style={entryStyle}
						type="button"
					>
						<span style={versionStyle}>v{entry.version}</span>
						<span style={textStyle}>{truncate(entry.memory, 120)}</span>
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
		colors,
		onNavigateNext,
		onNavigatePrev,
		onNavigateUp,
		onNavigateDown,
		onSelectNode,
		onOpenDocument,
	}) {
		const CARD_W = 280
		const SHORTCUTS_W = 160
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

		const CARD_H = hasChain ? 230 : hasForgetInfo ? 190 : 170
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

		// For document nodes, node.id IS the document ID
		const documentId = isMemory ? (data as MemoryNodeData).documentId : node.id

		const overlayStyle: React.CSSProperties = {
			pointerEvents: "none",
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			zIndex: 100,
		}

		const svgStyle: React.CSSProperties = {
			position: "absolute",
			top: 0,
			left: 0,
			width: "100%",
			height: "100%",
			overflow: "visible",
			pointerEvents: "none",
		}

		const popoverContainerStyle: React.CSSProperties = {
			position: "absolute",
			display: "flex",
			gap: 12,
			pointerEvents: "auto",
			left: popoverX,
			top: popoverY,
		}

		const cardStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: "column",
			borderRadius: 12,
			overflow: "hidden",
			border: `1px solid ${colors.popoverBorder}`,
			boxShadow:
				"0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
			width: CARD_W,
			backgroundColor: colors.popoverBg,
		}

		const contentPadStyle: React.CSSProperties = {
			padding: 12,
			maxHeight: 100,
			overflowY: "auto",
			flex: "1 1 auto",
		}

		const contentTextStyle: React.CSSProperties = {
			margin: 0,
			lineHeight: "135%",
			fontSize: 12,
			color: colors.popoverTextSecondary,
		}

		const dividerStyle: React.CSSProperties = {
			borderTop: `1px solid ${colors.popoverBorder}`,
		}

		const footerStyle: React.CSSProperties = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 8,
			paddingBottom: 8,
			...dividerStyle,
		}

		const idRowStyle: React.CSSProperties = {
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 6,
			paddingBottom: 6,
			display: "flex",
			alignItems: "center",
			...dividerStyle,
		}

		const shortcutsPanelStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
			gap: 6,
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 8,
			paddingBottom: 8,
		}

		return (
			<div style={overlayStyle}>
				<svg aria-hidden="true" style={svgStyle}>
					<path
						d={connectorPath}
						fill="none"
						stroke={colors.accent}
						strokeDasharray="4 2"
						strokeWidth="1.5"
					/>
				</svg>

				<div style={popoverContainerStyle}>
					<div style={cardStyle}>
						{hasChain ? (
							<VersionTimeline
								chain={versionChain}
								colors={colors}
								currentId={node.id}
								onSelect={onSelectNode}
							/>
						) : (
							<div style={contentPadStyle}>
								<p style={contentTextStyle}>{content || "No content"}</p>
							</div>
						)}

						{memoryMeta && hasForgetInfo && (
							<div
								style={{
									paddingLeft: 12,
									paddingRight: 12,
									paddingTop: 6,
									paddingBottom: 6,
									display: "flex",
									flexDirection: "column",
									gap: 2,
									...dividerStyle,
								}}
							>
								{memoryMeta.forgetAfter && (
									<span
										style={{
											fontSize: 10,
											color: colors.memBorderExpiring,
										}}
									>
										Expires:{" "}
										{new Date(memoryMeta.forgetAfter).toLocaleDateString()}
									</span>
								)}
								{memoryMeta.forgetReason && (
									<span
										style={{
											fontSize: 10,
											color: colors.popoverTextMuted,
										}}
									>
										Reason: {memoryMeta.forgetReason}
									</span>
								)}
								{memoryMeta.isForgotten && !memoryMeta.forgetReason && (
									<span
										style={{
											fontSize: 10,
											color: colors.memBorderForgotten,
										}}
									>
										Forgotten
									</span>
								)}
							</div>
						)}

						<div style={footerStyle}>
							{memoryMeta ? (
								<span
									style={{
										fontSize: 12,
										fontWeight: 500,
										color: memoryMeta.isForgotten
											? colors.memBorderForgotten
											: memoryMeta.isLatest
												? colors.memBorderRecent
												: colors.popoverTextSecondary,
									}}
								>
									v{memoryMeta.version}{" "}
									{memoryMeta.isForgotten
										? "Forgotten"
										: memoryMeta.isLatest
											? "Latest"
											: "Superseded"}
								</span>
							) : (
								<>
									<span
										style={{
											fontSize: 12,
											color: colors.popoverTextSecondary,
										}}
									>
										{docData?.type || "document"}
									</span>
									<span
										style={{
											fontSize: 12,
											color: colors.popoverTextSecondary,
										}}
									>
										{docData?.memories?.length ?? 0} memories
									</span>
								</>
							)}
						</div>

						<div style={idRowStyle}>
							{isMemory ? (
								<CopyableId colors={colors} label="Memory" value={node.id} />
							) : (
								<CopyableId colors={colors} label="Document" value={node.id} />
							)}
						</div>
					</div>

					<div style={shortcutsPanelStyle}>
						{onOpenDocument && documentId && (
							<NavButton
								colors={colors}
								icon={<EyeIcon color={colors.popoverTextMuted} />}
								label="View document"
								onClick={() => onOpenDocument(documentId)}
							/>
						)}
						{isMemory && (
							<NavButton
								colors={colors}
								icon="↑"
								label={hasChain ? "Older version" : "Go to document"}
								onClick={onNavigateUp}
							/>
						)}
						{(isMemory ? hasChain : true) && (
							<NavButton
								colors={colors}
								icon="↓"
								label={isMemory ? "Newer version" : "Go to memory"}
								onClick={onNavigateDown}
							/>
						)}
						<NavButton
							colors={colors}
							icon="→"
							label={isMemory ? "Next memory" : "Next document"}
							onClick={onNavigateNext}
						/>
						<NavButton
							colors={colors}
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
