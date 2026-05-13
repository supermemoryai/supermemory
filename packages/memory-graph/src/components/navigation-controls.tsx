import { memo } from "react"
import type { GraphNode, GraphThemeColors } from "../types"

interface NavigationControlsProps {
	onCenter: () => void
	onZoomIn: () => void
	onZoomOut: () => void
	onAutoFit: () => void
	nodes: GraphNode[]
	className?: string
	compact?: boolean
	zoomLevel: number
	colors: GraphThemeColors
}

function KeyBadge({
	keys,
	colors,
}: {
	keys: string
	colors: GraphThemeColors
}) {
	const style: React.CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		padding: "2px 6px",
		borderRadius: 4,
		fontSize: 10,
		fontWeight: 500,
		color: colors.textMuted,
		backgroundColor: colors.controlBg,
		border: `1px solid ${colors.controlBorder}`,
		lineHeight: 1,
	}

	return <span style={style}>{keys}</span>
}

function NavBtn({
	onClick,
	children,
	colors,
}: {
	onClick: () => void
	children: React.ReactNode
	colors: GraphThemeColors
}) {
	const style: React.CSSProperties = {
		display: "flex",
		width: "fit-content",
		gap: 12,
		alignItems: "center",
		justifyContent: "space-between",
		paddingLeft: 12,
		paddingRight: 12,
		paddingTop: 8,
		paddingBottom: 8,
		borderRadius: 9999,
		cursor: "pointer",
		backgroundColor: colors.controlBg,
		border: `1px solid ${colors.controlBorder}`,
		boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
		transition: "background-color 0.15s",
	}

	return (
		<button
			onClick={onClick}
			style={style}
			type="button"
			onMouseEnter={(e) => {
				e.currentTarget.style.opacity = "0.85"
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.opacity = "1"
			}}
		>
			{children}
		</button>
	)
}

export const NavigationControls = memo<NavigationControlsProps>(
	({
		onCenter,
		onZoomIn,
		onZoomOut,
		onAutoFit,
		nodes,
		className = "",
		compact = false,
		zoomLevel,
		colors,
	}) => {
		if (nodes.length === 0) return null

		const containerStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: compact ? "row" : "column",
			alignItems: compact ? "center" : "stretch",
			gap: compact ? 6 : 4,
			maxWidth: compact ? "calc(100vw - 32px)" : undefined,
			overflowX: compact ? "auto" : undefined,
			overflowY: "hidden",
		}

		const labelStyle: React.CSSProperties = {
			fontSize: 12,
			fontWeight: 500,
			color: colors.textPrimary,
		}

		const zoomRowStyle: React.CSSProperties = {
			display: "flex",
			width: "fit-content",
			gap: 12,
			alignItems: "center",
			justifyContent: "space-between",
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 8,
			paddingBottom: 8,
			borderRadius: 9999,
			backgroundColor: colors.controlBg,
			border: `1px solid ${colors.controlBorder}`,
			boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
		}

		const zoomBtnGroupStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			gap: 2,
		}

		const zoomBtnStyle: React.CSSProperties = {
			width: 20,
			height: 20,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 4,
			backgroundColor: colors.controlBg,
			border: `1px solid ${colors.controlBorder}`,
			color: colors.textSecondary,
			cursor: "pointer",
			fontSize: 12,
			padding: 0,
			transition: "background-color 0.15s, color 0.15s",
		}

		return (
			<div className={className} style={containerStyle}>
				<NavBtn onClick={onAutoFit} colors={colors}>
					<span style={labelStyle}>Fit</span>
					{!compact && <KeyBadge keys="Z" colors={colors} />}
				</NavBtn>

				<NavBtn onClick={onCenter} colors={colors}>
					<span style={labelStyle}>Center</span>
					{!compact && <KeyBadge keys="C" colors={colors} />}
				</NavBtn>

				<div style={zoomRowStyle}>
					<span style={labelStyle}>{zoomLevel}%</span>
					<div style={zoomBtnGroupStyle}>
						<button
							onClick={onZoomOut}
							style={zoomBtnStyle}
							type="button"
							onMouseEnter={(e) => {
								e.currentTarget.style.opacity = "0.8"
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.opacity = "1"
							}}
						>
							<span style={{ fontSize: 12 }}>−</span>
						</button>
						<button
							onClick={onZoomIn}
							style={zoomBtnStyle}
							type="button"
							onMouseEnter={(e) => {
								e.currentTarget.style.opacity = "0.8"
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.opacity = "1"
							}}
						>
							<span style={{ fontSize: 12 }}>+</span>
						</button>
					</div>
				</div>
			</div>
		)
	},
)

NavigationControls.displayName = "NavigationControls"
