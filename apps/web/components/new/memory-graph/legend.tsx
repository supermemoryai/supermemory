"use client"

import { useIsMobile } from "@hooks/use-mobile"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { memo, useEffect, useState } from "react"
import type { GraphEdge, GraphNode, LegendProps } from "./types"
import { cn } from "@lib/utils"

// Cookie utility functions for legend state
const setCookie = (name: string, value: string, days = 365) => {
	if (typeof document === "undefined") return
	const expires = new Date()
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
	if (typeof document === "undefined") return null
	const nameEQ = `${name}=`
	const ca = document.cookie.split(";")
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i]
		if (!c) continue
		while (c.charAt(0) === " ") c = c.substring(1, c.length)
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
	}
	return null
}

interface ExtendedLegendProps extends LegendProps {
	id?: string
	nodes?: GraphNode[]
	edges?: GraphEdge[]
	isLoading?: boolean
}

// Toggle switch component matching Figma design
const SmallToggle = memo(function SmallToggle({
	checked,
	onChange,
}: {
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className={cn(
				"box-border flex flex-row justify-center items-center",
				"w-6 h-3.5 rounded-full transition-all duration-200",
				"border border-white/5",
				"shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
			)}
			style={{
				background: "#0D121A",
			}}
		>
			<div
				className={cn(
					"w-2.5 h-2.5 rounded-full transition-all duration-200",
					checked ? "ml-auto mr-0.5" : "mr-auto ml-0.5",
				)}
				style={{
					background: checked ? "#162E57" : "rgba(115, 115, 115, 0.25)",
				}}
			/>
		</button>
	)
})

// Hexagon SVG for memory nodes
const HexagonIcon = memo(function HexagonIcon({
	fill = "#0D2034",
	stroke = "#3B73B8",
	opacity = 1,
	size = 12,
}: {
	fill?: string
	stroke?: string
	opacity?: number
	size?: number
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			style={{ opacity }}
			className="shrink-0"
			aria-hidden="true"
		>
			<polygon
				points="6,1.5 10.4,3.75 10.4,8.25 6,10.5 1.6,8.25 1.6,3.75"
				fill={fill}
				stroke={stroke}
				strokeWidth="0.6"
			/>
		</svg>
	)
})

// Document icon (rounded square)
const DocumentIcon = memo(function DocumentIcon() {
	return (
		<div
			className="w-3 h-3 shrink-0 rounded-[2.4px] flex items-center justify-center"
			style={{
				background: "#1B1F24",
				boxShadow:
					"0px 0.85px 4.26px rgba(0, 0, 0, 0.25), inset 0.21px 0.21px 0.21px rgba(255, 255, 255, 0.1)",
			}}
		>
			<div
				className="w-[10.8px] h-[10.8px] rounded-[1.8px]"
				style={{
					background: "#262C33",
					boxShadow: "inset 0.43px 0.43px 1.28px rgba(11, 15, 21, 0.4)",
				}}
			/>
		</div>
	)
})

// Connection icon (graph)
const ConnectionIcon = memo(function ConnectionIcon() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 12 12"
			className="shrink-0"
			aria-hidden="true"
		>
			<circle cx="3" cy="3" r="1.5" fill="#90A2B9" />
			<circle cx="9" cy="3" r="1.5" fill="#90A2B9" />
			<circle cx="6" cy="9" r="1.5" fill="#90A2B9" />
			<line x1="3" y1="3" x2="9" y2="3" stroke="#90A2B9" strokeWidth="0.8" />
			<line x1="3" y1="3" x2="6" y2="9" stroke="#90A2B9" strokeWidth="0.8" />
			<line x1="9" y1="3" x2="6" y2="9" stroke="#90A2B9" strokeWidth="0.8" />
		</svg>
	)
})

// Line icon for connections
const LineIcon = memo(function LineIcon({
	color,
	dashed = false,
}: {
	color: string
	dashed?: boolean
}) {
	return (
		<div className="w-3 h-3 flex items-center justify-center shrink-0">
			<div
				className="w-3 h-0"
				style={{
					borderTop: `1.6px ${dashed ? "dashed" : "solid"} ${color}`,
				}}
			/>
		</div>
	)
})

// Similarity circle icon
const SimilarityCircle = memo(function SimilarityCircle({
	variant,
}: {
	variant: "strong" | "weak"
}) {
	return (
		<div
			className="w-3 h-3 rounded-full shrink-0"
			style={{
				background: variant === "strong" ? "#616D7F" : "#313A44",
				border: "0.6px solid rgba(255, 255, 255, 0.2)",
			}}
		/>
	)
})

// Accordion row with count
const StatRow = memo(function StatRow({
	icon,
	label,
	count,
	expandable = false,
	expanded = false,
	onToggle,
	children,
}: {
	icon: React.ReactNode
	label: string
	count: number
	expandable?: boolean
	expanded?: boolean
	onToggle?: () => void
	children?: React.ReactNode
}) {
	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={expandable ? onToggle : undefined}
				className={cn(
					"flex flex-row justify-between items-center w-full py-0",
					expandable && "cursor-pointer",
				)}
			>
				<div className="flex flex-row items-center gap-2">
					{icon}
					<span className="text-xs text-[#FAFAFA] font-normal">{label}</span>
					{expandable && (
						<ChevronDown
							className={cn(
								"w-3 h-3 text-[#737373] transition-transform",
								expanded && "rotate-180",
							)}
						/>
					)}
				</div>
				<span className="text-xs text-[#737373]">{count}</span>
			</button>
			{expandable && expanded && children && (
				<div className="pl-2.5 pt-1.5 flex flex-col gap-1.5">{children}</div>
			)}
		</div>
	)
})

// Toggle row for relations/similarity
const ToggleRow = memo(function ToggleRow({
	icon,
	label,
	checked,
	onChange,
}: {
	icon: React.ReactNode
	label: string
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<div className="flex flex-row justify-between items-center w-full">
			<div className="flex flex-row items-center gap-2">
				{icon}
				<span className="text-xs text-[#FAFAFA] font-normal">{label}</span>
			</div>
			<SmallToggle checked={checked} onChange={onChange} />
		</div>
	)
})

export const Legend = memo(function Legend({
	variant: _variant = "console",
	id,
	nodes = [],
	edges = [],
	isLoading: _isLoading = false,
}: ExtendedLegendProps) {
	const isMobile = useIsMobile()
	const [isExpanded, setIsExpanded] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)

	// Toggle states for relations
	const [showUpdates, setShowUpdates] = useState(true)
	const [showExtends, setShowExtends] = useState(true)
	const [showInferences, setShowInferences] = useState(false)

	// Toggle states for similarity
	const [showStrong, setShowStrong] = useState(true)
	const [showWeak, setShowWeak] = useState(true)

	// Expanded accordion states
	const [memoriesExpanded, setMemoriesExpanded] = useState(false)
	const [documentsExpanded, setDocumentsExpanded] = useState(false)
	const [connectionsExpanded, setConnectionsExpanded] = useState(true)

	// Load saved preference on client side
	useEffect(() => {
		if (!isInitialized) {
			const savedState = getCookie("legendCollapsed")
			if (savedState === "true") {
				setIsExpanded(false)
			} else if (savedState === "false") {
				setIsExpanded(true)
			} else {
				// Default: collapsed on mobile, collapsed on desktop too (per Figma)
				setIsExpanded(false)
			}
			setIsInitialized(true)
		}
	}, [isInitialized])

	// Save to cookie when state changes
	const handleToggleExpanded = (expanded: boolean) => {
		setIsExpanded(expanded)
		setCookie("legendCollapsed", expanded ? "false" : "true")
	}

	// Calculate stats
	const memoryCount = nodes.filter((n) => n.type === "memory").length
	const documentCount = nodes.filter((n) => n.type === "document").length
	const connectionCount = edges.length

	// Hide on mobile
	if (isMobile) return null

	return (
		<div
			className={cn("absolute z-20 overflow-hidden", "bottom-4 left-4")}
			style={{
				width: "214px",
			}}
			id={id}
		>
			<Collapsible onOpenChange={handleToggleExpanded} open={isExpanded}>
				{/* Glass background */}
				<div
					className="absolute inset-0 rounded-[10px]"
					style={{
						background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						border: "1px solid rgba(23, 24, 26, 0.7)",
					}}
				/>

				<div className="relative z-10 p-3">
					{/* Header - always visible */}
					<CollapsibleTrigger className="flex flex-row items-center gap-1.5 w-full">
						{isExpanded ? (
							<ChevronDown className="w-4 h-4 text-[#FAFAFA]" />
						) : (
							<ChevronRight className="w-4 h-4 text-[#FAFAFA]" />
						)}
						<span
							className="text-sm text-white font-normal"
							style={{
								fontFamily: "DM Sans",
								letterSpacing: "-0.01em",
							}}
						>
							Legend
						</span>
					</CollapsibleTrigger>

					<CollapsibleContent>
						<div
							className="mt-4 flex flex-row gap-3 overflow-y-auto max-h-[312px]"
							style={{ scrollbarWidth: "thin" }}
						>
							{/* Main content column */}
							<div className="flex flex-col gap-4 flex-1">
								{/* STATISTICS Section */}
								<div className="flex flex-col gap-2">
									<span
										className="text-xs text-[#737373] font-normal"
										style={{ fontFamily: "Space Grotesk" }}
									>
										STATISTICS
									</span>
									<div className="flex flex-col gap-1.5">
										{/* Memories */}
										<StatRow
											icon={
												<HexagonIcon
													fill="#0D2034"
													stroke="#3B73B8"
													size={12}
												/>
											}
											label="Memories"
											count={memoryCount}
											expandable
											expanded={memoriesExpanded}
											onToggle={() => setMemoriesExpanded(!memoriesExpanded)}
										>
											<div className="flex flex-col gap-1.5 pl-0">
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<HexagonIcon
															fill="#0D2034"
															stroke="#3B73B8"
															size={12}
														/>
														<span className="text-xs text-[#FAFAFA]">
															Memory (latest)
														</span>
													</div>
													<span className="text-xs text-[#737373]">76</span>
												</div>
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<HexagonIcon
															fill="#0D2034"
															stroke="#5F7085"
															opacity={0.6}
															size={12}
														/>
														<span className="text-xs text-[#FAFAFA]">
															Memory (oldest)
														</span>
													</div>
													<span className="text-xs text-[#737373]">182</span>
												</div>
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<div className="w-3 h-3 flex items-center justify-center">
															<HexagonIcon
																fill="#0C1827"
																stroke="rgba(54, 155, 253, 0.2)"
																size={12}
															/>
														</div>
														<span className="text-xs text-[#FAFAFA]">
															Score
														</span>
													</div>
													<span className="text-xs text-[#737373]">23</span>
												</div>
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<svg
															width="12"
															height="12"
															viewBox="0 0 12 12"
															className="shrink-0"
															aria-hidden="true"
														>
															<polygon
																points="6,0 11.2,6 6,12 0.8,6"
																fill="#00FFA9"
																fillOpacity="0.6"
																stroke="#00FFA9"
																strokeWidth="0.6"
															/>
														</svg>
														<span className="text-xs text-[#FAFAFA]">
															New memory
														</span>
													</div>
													<span className="text-xs text-[#737373]">17</span>
												</div>
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<svg
															width="12"
															height="12"
															viewBox="0 0 12 12"
															className="shrink-0"
															aria-hidden="true"
														>
															<polygon
																points="6,0 11.2,6 6,12 0.8,6"
																fill="#4D2E00"
																fillOpacity="0.6"
																stroke="#FE9900"
																strokeWidth="0.6"
															/>
														</svg>
														<span className="text-xs text-[#FAFAFA]">
															Expiring soon
														</span>
													</div>
													<span className="text-xs text-[#737373]">11</span>
												</div>
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<div className="w-3 h-3 relative shrink-0">
															<HexagonIcon
																fill="#60272C"
																stroke="#FF6467"
																opacity={0.6}
																size={12}
															/>
														</div>
														<span className="text-xs text-[#FAFAFA]">
															Forgotten
														</span>
													</div>
													<span className="text-xs text-[#737373]">6</span>
												</div>
											</div>
										</StatRow>

										{/* Documents */}
										<StatRow
											icon={<DocumentIcon />}
											label="Documents"
											count={documentCount}
											expandable
											expanded={documentsExpanded}
											onToggle={() => setDocumentsExpanded(!documentsExpanded)}
										/>

										{/* Connections */}
										<StatRow
											icon={<ConnectionIcon />}
											label="Connections"
											count={connectionCount}
											expandable
											expanded={connectionsExpanded}
											onToggle={() =>
												setConnectionsExpanded(!connectionsExpanded)
											}
										>
											<div className="flex flex-col gap-1.5">
												<div className="flex flex-row justify-between items-center">
													<div className="flex items-center gap-2">
														<LineIcon color="#5070A1" />
														<span className="text-xs text-[#FAFAFA]">
															Doc &gt; Memory
														</span>
													</div>
												</div>
												<ToggleRow
													icon={<LineIcon color="#5070A1" dashed />}
													label="Doc similarity"
													checked={showStrong}
													onChange={setShowStrong}
												/>
											</div>
										</StatRow>
									</div>
								</div>

								{/* RELATIONS Section */}
								<div className="flex flex-col gap-2">
									<span
										className="text-xs text-[#737373] font-normal"
										style={{ fontFamily: "Space Grotesk" }}
									>
										RELATIONS
									</span>
									<div className="flex flex-col gap-1.5">
										<ToggleRow
											icon={<LineIcon color="#7800AB" />}
											label="Updates"
											checked={showUpdates}
											onChange={setShowUpdates}
										/>
										<ToggleRow
											icon={<LineIcon color="#00732E" />}
											label="Extends"
											checked={showExtends}
											onChange={setShowExtends}
										/>
										<ToggleRow
											icon={<LineIcon color="#0054D1" />}
											label="Inferences"
											checked={showInferences}
											onChange={setShowInferences}
										/>
									</div>
								</div>

								{/* SIMILARITY Section */}
								<div className="flex flex-col gap-2">
									<span
										className="text-xs text-[#737373] font-normal"
										style={{ fontFamily: "Space Grotesk" }}
									>
										SIMILARITY
									</span>
									<div className="flex flex-col gap-1.5">
										<ToggleRow
											icon={<SimilarityCircle variant="strong" />}
											label="Strong"
											checked={showStrong}
											onChange={setShowStrong}
										/>
										<ToggleRow
											icon={<SimilarityCircle variant="weak" />}
											label="Weak"
											checked={showWeak}
											onChange={setShowWeak}
										/>
									</div>
								</div>
							</div>

							{/* Scrollbar indicator */}
							<div
								className="w-0.5 h-12 rounded-sm self-start"
								style={{ background: "#737373" }}
							/>
						</div>
					</CollapsibleContent>
				</div>
			</Collapsible>
		</div>
	)
})

Legend.displayName = "Legend"
