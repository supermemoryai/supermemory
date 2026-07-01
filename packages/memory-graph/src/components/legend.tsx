import { memo, useState } from "react"
import type { GraphEdge, GraphNode, GraphThemeColors } from "../types"

interface LegendProps {
	nodes?: GraphNode[]
	edges?: GraphEdge[]
	isLoading?: boolean
	colors: GraphThemeColors
	hoveredNode?: string | null
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
	arrow = false,
}: {
	color: string
	dashed?: boolean
	arrow?: boolean
}) {
	return (
		<svg
			aria-hidden="true"
			height="12"
			viewBox="0 0 16 12"
			width="16"
			style={{
				flexShrink: 0,
			}}
		>
			<line
				stroke={color}
				strokeDasharray={dashed ? "3 2" : undefined}
				strokeLinecap="round"
				strokeWidth="2"
				x1="1.5"
				x2={arrow ? "12" : "14.5"}
				y1="6"
				y2="6"
			/>
			{arrow && (
				<path
					d="M10 3l4 3-4 3"
					fill="none"
					stroke={color}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
			)}
		</svg>
	)
}

function ClusterSwatches({ colors }: { colors: GraphThemeColors }) {
	const swatches =
		colors.clusterColors.length > 0
			? colors.clusterColors.slice(0, 5)
			: [colors.memStrokeDefault]
	return (
		<div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
			{swatches.map((color, index) => (
				<span
					key={`${color}-${index}`}
					style={{
						width: 7,
						height: 12,
						borderRadius: 999,
						backgroundColor: color,
					}}
				/>
			))}
		</div>
	)
}

function UpdateMarkerIcon({ colors }: { colors: GraphThemeColors }) {
	return (
		<svg
			aria-hidden="true"
			height="14"
			viewBox="0 0 14 14"
			width="14"
			style={{ flexShrink: 0 }}
		>
			<polygon
				fill={colors.memFill}
				points="7,1.5 12,4.25 12,9.75 7,12.5 2,9.75 2,4.25"
				stroke={colors.memStrokeDefault}
				strokeWidth="0.7"
			/>
			<circle
				cx="10.2"
				cy="3.8"
				fill={colors.popoverBg}
				r="2.4"
				stroke={colors.edgeUpdates}
				strokeWidth="1"
			/>
			<path
				d="M9.1 3.8h1.7l-.5-.5m.5.5-.5.5"
				fill="none"
				stroke={colors.edgeUpdates}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="0.8"
			/>
		</svg>
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

function countEdgesByType(edges: GraphEdge[], edgeType: GraphEdge["edgeType"]) {
	return edges.filter((edge) => edge.edgeType === edgeType).length
}

function getActiveUpdateCount(
	edges: GraphEdge[],
	hoveredNode: string | null | undefined,
) {
	if (!hoveredNode) return 0
	return edges.filter((edge) => {
		if (edge.edgeType !== "updates") return false
		const sourceId =
			typeof edge.source === "string" ? edge.source : edge.source.id
		const targetId =
			typeof edge.target === "string" ? edge.target : edge.target.id
		return sourceId === hoveredNode || targetId === hoveredNode
	}).length
}

function isUpdateMemoryNode(node: GraphNode) {
	if (node.type !== "memory") return false
	const data = node.data
	if (!("isLatest" in data)) return false
	if (data.isLatest === false || data.parentMemoryId) return true
	return Object.values(data.memoryRelations ?? {}).some(
		(relation) => relation === "updates",
	)
}

export const Legend = memo(function Legend({
	nodes = [],
	edges = [],
	isLoading: _isLoading = false,
	colors,
	hoveredNode,
	compact = false,
	maxHeight,
}: LegendProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [connectionsExpanded, setConnectionsExpanded] = useState(true)

	const memoryCount = nodes.filter((n) => n.type === "memory").length
	const documentCount = nodes.filter((n) => n.type === "document").length
	const connectionCount = edges.length
	const derivesCount = countEdgesByType(edges, "derives")
	const updatesCount = countEdgesByType(edges, "updates")
	const extendsCount = countEdgesByType(edges, "extends")
	const activeUpdateCount = getActiveUpdateCount(edges, hoveredNode)
	const clusterCount = new Set(
		nodes
			.filter((node) => node.type === "memory")
			.map((node) => node.clusterKey)
			.filter(Boolean),
	).size
	const updateNodeCount = nodes.filter(isUpdateMemoryNode).length

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

	const countStyle: React.CSSProperties = {
		fontSize: 12,
		color: colors.textMuted,
	}

	const detailTextStyle: React.CSSProperties = {
		fontSize: 11,
		lineHeight: 1.35,
		color: colors.textMuted,
	}

	const statusRowStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	}

	const edgeDescriptionStyle: React.CSSProperties = {
		...detailTextStyle,
		marginLeft: 24,
		marginTop: 2,
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
												gap: 8,
											}}
										>
											<div>
												<div style={rowStyle}>
													<div style={rowLeftStyle}>
														<LineIcon color={colors.edgeDerives} />
														<span style={edgeLabelStyle}>Document source</span>
													</div>
													<span style={countStyle}>{derivesCount}</span>
												</div>
												<div style={edgeDescriptionStyle}>
													Document to memory
												</div>
											</div>
											<div>
												<div style={rowStyle}>
													<div style={rowLeftStyle}>
														<LineIcon color={colors.edgeUpdates} arrow />
														<span style={edgeLabelStyle}>Updates</span>
													</div>
													<span style={countStyle}>{updatesCount}</span>
												</div>
												<div style={edgeDescriptionStyle}>
													Older memory to newer memory
												</div>
											</div>
											<div>
												<div style={rowStyle}>
													<div style={rowLeftStyle}>
														<LineIcon color={colors.edgeExtends} />
														<span style={edgeLabelStyle}>Related</span>
													</div>
													<span style={countStyle}>{extendsCount}</span>
												</div>
												<div style={edgeDescriptionStyle}>
													Supporting or extended memory
												</div>
											</div>
										</div>
									</StatRow>
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								<span style={sectionLabelStyle}>Color</span>
								<div style={statusRowStyle}>
									<ClusterSwatches colors={colors} />
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 2,
										}}
									>
										<span style={edgeLabelStyle}>Cluster</span>
										<span style={detailTextStyle}>
											Same document or connected memory group
										</span>
									</div>
								</div>
								<div style={rowStyle}>
									<span style={detailTextStyle}>Visible clusters</span>
									<span style={countStyle}>{clusterCount}</span>
								</div>
								{activeUpdateCount > 0 && (
									<div
										style={{
											borderRadius: 8,
											border: `1px solid ${colors.edgeUpdates}`,
											backgroundColor: `${colors.edgeUpdates}22`,
											padding: 8,
											color: colors.textPrimary,
											fontSize: 12,
											lineHeight: 1.35,
										}}
									>
										{activeUpdateCount} update link
										{activeUpdateCount === 1 ? "" : "s"} connected to hover
									</div>
								)}
							</div>

							{/* Memory Status section */}
							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								<span style={sectionLabelStyle}>Memory Status</span>
								<div
									style={{ display: "flex", flexDirection: "column", gap: 6 }}
								>
									<div style={statusRowStyle}>
										<UpdateMarkerIcon colors={colors} />
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 2,
											}}
										>
											<span style={edgeLabelStyle}>Update chain</span>
											<span style={detailTextStyle}>
												{updateNodeCount} memories have versions
											</span>
										</div>
									</div>
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
