import { memo, useState } from "react"
import type { GraphEdge, GraphNode, GraphThemeColors } from "../types"

interface LegendProps {
	nodes?: GraphNode[]
	edges?: GraphEdge[]
	isLoading?: boolean
	colors: GraphThemeColors
	compact?: boolean
	maxHeight?: number
}

function HexagonIcon({
	fill,
	stroke,
	size = 12,
}: {
	fill: string
	stroke: string
	size?: number
}) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 12 12"
			width={size}
			style={{ flexShrink: 0 }}
		>
			<polygon
				fill={fill}
				points="6,1.5 10.4,3.75 10.4,8.25 6,10.5 1.6,8.25 1.6,3.75"
				stroke={stroke}
				strokeWidth="0.6"
			/>
		</svg>
	)
}

function LineIcon({
	color,
	dashed = false,
}: {
	color: string
	dashed?: boolean
}) {
	return (
		<div
			style={{
				width: 12,
				height: 12,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}
		>
			<div
				style={{
					width: 12,
					height: 0,
					borderTop: `2.5px ${dashed ? "dashed" : "solid"} ${color}`,
				}}
			/>
		</div>
	)
}

function ChevronDownIcon({ color }: { color: string }) {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flexShrink: 0 }}
			aria-hidden="true"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	)
}

function ChevronRightIcon({ color }: { color: string }) {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flexShrink: 0 }}
			aria-hidden="true"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	)
}

function StatRow({
	icon,
	label,
	count,
	expandable = false,
	expanded = false,
	onToggle,
	children,
	colors,
}: {
	icon: React.ReactNode
	label: string
	count: number
	expandable?: boolean
	expanded?: boolean
	onToggle?: () => void
	children?: React.ReactNode
	colors: GraphThemeColors
}) {
	const buttonStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		padding: 0,
		outline: "none",
		background: "none",
		border: "none",
		cursor: expandable ? "pointer" : "default",
	}

	const leftStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	}

	const labelStyle: React.CSSProperties = {
		fontSize: 12,
		color: colors.textPrimary,
		fontWeight: 400,
	}

	const countStyle: React.CSSProperties = {
		fontSize: 12,
		color: colors.textMuted,
	}

	const childrenContainerStyle: React.CSSProperties = {
		paddingLeft: 10,
		paddingTop: 6,
		display: "flex",
		flexDirection: "column",
		gap: 6,
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<button
				onClick={expandable ? onToggle : undefined}
				style={buttonStyle}
				type="button"
			>
				<div style={leftStyle}>
					{icon}
					<span style={labelStyle}>{label}</span>
					{expandable &&
						(expanded ? (
							<ChevronDownIcon color={colors.textMuted} />
						) : (
							<ChevronRightIcon color={colors.textMuted} />
						))}
				</div>
				<span style={countStyle}>{count}</span>
			</button>
			{expandable && expanded && children && (
				<div style={childrenContainerStyle}>{children}</div>
			)}
		</div>
	)
}

export const Legend = memo(function Legend({
	nodes = [],
	edges = [],
	isLoading: _isLoading = false,
	colors,
	compact = false,
	maxHeight,
}: LegendProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [connectionsExpanded, setConnectionsExpanded] = useState(true)

	const memoryCount = nodes.filter((n) => n.type === "memory").length
	const documentCount = nodes.filter((n) => n.type === "document").length
	const connectionCount = edges.length

	const outerStyle: React.CSSProperties = {
		overflow: "hidden",
		width: compact ? "min(214px, calc(100vw - 32px))" : 214,
		maxWidth: "100%",
	}

	const cardStyle: React.CSSProperties = {
		borderRadius: 12,
		backgroundColor: colors.controlBg,
		border: `1px solid ${colors.controlBorder}`,
		boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
		maxHeight,
	}

	const headerBtnStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		width: "100%",
		justifyContent: "flex-start",
		cursor: "pointer",
		outline: "none",
		background: "none",
		border: "none",
		padding: 0,
	}

	const headerTextStyle: React.CSSProperties = {
		fontSize: 14,
		color: colors.textPrimary,
		fontWeight: 400,
	}

	const sectionLabelStyle: React.CSSProperties = {
		fontSize: 12,
		color: colors.textMuted,
		fontWeight: 400,
		textTransform: "uppercase",
		letterSpacing: "0.05em",
	}

	const rowStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	}

	const rowLeftStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 8,
	}

	const edgeLabelStyle: React.CSSProperties = {
		fontSize: 12,
		color: colors.textPrimary,
	}

	const statusRowStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	}

	const expandedContentStyle: React.CSSProperties = {
		marginTop: 16,
		display: "flex",
		flexDirection: "column",
		gap: 16,
		...(compact
			? {
					maxHeight: maxHeight ? Math.max(maxHeight - 56, 112) : 220,
					overflowY: "auto",
					overscrollBehavior: "contain",
					paddingRight: 2,
				}
			: {}),
	}

	return (
		<div style={outerStyle}>
			<div style={cardStyle}>
				<div style={{ padding: 12 }}>
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						style={headerBtnStyle}
						type="button"
					>
						{isExpanded ? (
							<ChevronDownIcon color={colors.textPrimary} />
						) : (
							<ChevronRightIcon color={colors.textPrimary} />
						)}
						<span style={headerTextStyle}>Legend</span>
					</button>

					{isExpanded && (
						<div style={expandedContentStyle}>
							{/* Statistics section */}
							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								<span style={sectionLabelStyle}>Statistics</span>
								<div
									style={{ display: "flex", flexDirection: "column", gap: 6 }}
								>
									<StatRow
										count={memoryCount}
										icon={
											<HexagonIcon
												fill={colors.memFill}
												stroke={colors.memStrokeDefault}
											/>
										}
										label="Memories"
										colors={colors}
									/>
									<StatRow
										count={documentCount}
										icon={
											<div
												style={{
													width: 12,
													height: 12,
													flexShrink: 0,
													borderRadius: 2,
													backgroundColor: colors.controlBg,
													border: `1px solid ${colors.controlBorder}`,
												}}
											/>
										}
										label="Documents"
										colors={colors}
									/>
									<StatRow
										count={connectionCount}
										expandable
										expanded={connectionsExpanded}
										icon={
											<svg
												aria-hidden="true"
												height="12"
												viewBox="0 0 12 12"
												width="12"
												style={{ flexShrink: 0 }}
											>
												<circle cx="3" cy="3" fill={colors.textMuted} r="1.5" />
												<circle cx="9" cy="3" fill={colors.textMuted} r="1.5" />
												<circle cx="6" cy="9" fill={colors.textMuted} r="1.5" />
												<line
													stroke={colors.textMuted}
													strokeWidth="0.8"
													x1="3"
													x2="9"
													y1="3"
													y2="3"
												/>
												<line
													stroke={colors.textMuted}
													strokeWidth="0.8"
													x1="3"
													x2="6"
													y1="3"
													y2="9"
												/>
												<line
													stroke={colors.textMuted}
													strokeWidth="0.8"
													x1="9"
													x2="6"
													y1="3"
													y2="9"
												/>
											</svg>
										}
										label="Connections"
										onToggle={() =>
											setConnectionsExpanded(!connectionsExpanded)
										}
										colors={colors}
									>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 6,
											}}
										>
											<div style={rowStyle}>
												<div style={rowLeftStyle}>
													<LineIcon color={colors.edgeDerives} />
													<span style={edgeLabelStyle}>Derives</span>
												</div>
											</div>
											<div style={rowStyle}>
												<div style={rowLeftStyle}>
													<LineIcon color={colors.edgeUpdates} />
													<span style={edgeLabelStyle}>Updates</span>
												</div>
											</div>
											<div style={rowStyle}>
												<div style={rowLeftStyle}>
													<LineIcon color={colors.edgeExtends} dashed />
													<span style={edgeLabelStyle}>Extends</span>
												</div>
											</div>
										</div>
									</StatRow>
								</div>
							</div>

							{/* Memory Status section */}
							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								<span style={sectionLabelStyle}>Memory Status</span>
								<div
									style={{ display: "flex", flexDirection: "column", gap: 6 }}
								>
									<div style={statusRowStyle}>
										<HexagonIcon
											fill={colors.memFill}
											stroke={colors.memBorderRecent}
										/>
										<span style={edgeLabelStyle}>Recent (&lt; 24h)</span>
									</div>
									<div style={statusRowStyle}>
										<HexagonIcon
											fill={colors.memFill}
											stroke={colors.memBorderExpiring}
										/>
										<span style={edgeLabelStyle}>Expiring soon</span>
									</div>
									<div style={statusRowStyle}>
										<HexagonIcon
											fill={colors.memFill}
											stroke={colors.memBorderForgotten}
										/>
										<span style={edgeLabelStyle}>Forgotten</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
})

Legend.displayName = "Legend"
