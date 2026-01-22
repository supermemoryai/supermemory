"use client"

import { ChevronUp, ChevronDown, Settings } from "lucide-react"
import { memo, useEffect, useState } from "react"
import type { LegendProps } from "./types"

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

// Toggle switch component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
	return (
		<button
			type="button"
			onClick={() => onChange(!enabled)}
			className={`relative w-11 h-6 rounded-full transition-colors ${
				enabled ? "bg-blue-600" : "bg-[#1E3A5F]"
			}`}
		>
			<span
				className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
					enabled ? "left-6" : "left-1"
				}`}
			/>
		</button>
	)
}

export const Legend = memo(function Legend({
	id,
	nodes = [],
	edges = [],
	isLoading = false,
}: LegendProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)
	const [connectionsExpanded, setConnectionsExpanded] = useState(true)

	// Toggle states for filtering
	const [showDocMemory, setShowDocMemory] = useState(true)
	const [showDocSimilarity, setShowDocSimilarity] = useState(true)
	const [showUpdates, setShowUpdates] = useState(false)
	const [showExtends, setShowExtends] = useState(true)
	const [showInferences, setShowInferences] = useState(false)
	const [showStrong, setShowStrong] = useState(true)
	const [showWeak, setShowWeak] = useState(true)

	useEffect(() => {
		if (!isInitialized) {
			const savedState = getCookie("legendCollapsed")
			if (savedState === "false") {
				setIsExpanded(true)
			} else {
				setIsExpanded(false)
			}
			setIsInitialized(true)
		}
	}, [isInitialized])

	const handleToggleExpanded = () => {
		const newExpanded = !isExpanded
		setIsExpanded(newExpanded)
		setCookie("legendCollapsed", newExpanded ? "false" : "true")
	}

	const memoryCount = nodes.filter((n) => n.type === "memory").length
	const documentCount = nodes.filter((n) => n.type === "document").length
	const connectionCount = edges.length

	return (
		<>
			{/* Settings button - Bottom right */}
			<button
				type="button"
				className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-10 h-10 text-white/70 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg hover:bg-[#0A1628] hover:text-white transition-colors"
				title="Settings"
			>
				<Settings className="w-5 h-5" />
			</button>

			{/* Legend - Positioned at bottom left */}
			<div
				id={id}
				className="absolute bottom-4 left-4 z-10"
			>
				{/* Legend expanded content - appears above the button */}
				{isExpanded && (
					<div className="mb-2 bg-[#0A1628]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-xl overflow-hidden min-w-[280px]">
						{/* Header */}
						<button
							type="button"
							onClick={handleToggleExpanded}
							className="w-full flex items-center gap-2 px-4 py-3 text-white font-medium hover:bg-white/5 transition-colors"
						>
							<ChevronUp className="w-4 h-4" />
							<span>Legend</span>
						</button>

						<div className="px-4 pb-4">
							{/* STATISTICS */}
							<div className="mb-4">
								<div className="text-xs text-[#525D6E] uppercase tracking-wider mb-3">
									Statistics
								</div>
								<div className="space-y-2">
									{/* Memories */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div
												className="w-4 h-4"
												style={{
													clipPath:
														"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
													backgroundColor: "rgba(0, 180, 216, 0.4)",
													border: "1px solid rgba(0, 180, 216, 0.6)",
												}}
											/>
											<span className="text-white/90">Memories</span>
											<ChevronDown className="w-3 h-3 text-white/50" />
										</div>
										<span className="text-white/60">{memoryCount}</span>
									</div>

									{/* Documents */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-4 h-4 rounded-sm bg-[#1E3A5F] border border-[#2E4A6F]" />
											<span className="text-white/90">Documents</span>
											<ChevronDown className="w-3 h-3 text-white/50" />
										</div>
										<span className="text-white/60">{documentCount}</span>
									</div>

									{/* Connections */}
									<div>
										<button
											type="button"
											onClick={() => setConnectionsExpanded(!connectionsExpanded)}
											className="w-full flex items-center justify-between"
										>
											<div className="flex items-center gap-3">
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													className="text-white/70"
												>
													<circle cx="18" cy="5" r="3" />
													<circle cx="6" cy="12" r="3" />
													<circle cx="18" cy="19" r="3" />
													<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
													<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
												</svg>
												<span className="text-white/90">Connections</span>
												{connectionsExpanded ? (
													<ChevronUp className="w-3 h-3 text-white/50" />
												) : (
													<ChevronDown className="w-3 h-3 text-white/50" />
												)}
											</div>
											<span className="text-white/60">{connectionCount}</span>
										</button>

										{/* Expanded connections */}
										{connectionsExpanded && (
											<div className="ml-7 mt-2 space-y-2">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div className="w-4 h-0.5 bg-cyan-500/60" />
														<span className="text-white/70 text-sm">Doc &gt; Memory</span>
													</div>
												</div>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div
															className="w-4 h-0.5"
															style={{
																background:
																	"repeating-linear-gradient(90deg, rgba(0, 180, 216, 0.6) 0px, rgba(0, 180, 216, 0.6) 2px, transparent 2px, transparent 4px)",
															}}
														/>
														<span className="text-white/70 text-sm">Doc similarity</span>
													</div>
													<Toggle enabled={showDocSimilarity} onChange={setShowDocSimilarity} />
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* RELATIONS */}
							<div className="mb-4">
								<div className="text-xs text-[#525D6E] uppercase tracking-wider mb-3">
									Relations
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-4 h-0.5 bg-pink-500" />
											<span className="text-white/90">Updates</span>
										</div>
										<Toggle enabled={showUpdates} onChange={setShowUpdates} />
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-4 h-0.5 bg-emerald-500" />
											<span className="text-white/90">Extends</span>
										</div>
										<Toggle enabled={showExtends} onChange={setShowExtends} />
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-4 h-0.5 bg-cyan-500" />
											<span className="text-white/90">Inferences</span>
										</div>
										<Toggle enabled={showInferences} onChange={setShowInferences} />
									</div>
								</div>
							</div>

							{/* SIMILARITY */}
							<div>
								<div className="text-xs text-[#525D6E] uppercase tracking-wider mb-3">
									Similarity
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-3 h-3 rounded-full bg-[#1E3A5F] border border-[#3E5A7F]" />
											<span className="text-white/90">Strong</span>
										</div>
										<Toggle enabled={showStrong} onChange={setShowStrong} />
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-3 h-3 rounded-full bg-[#1E3A5F] border border-[#3E5A7F]" />
											<span className="text-white/90">Weak</span>
										</div>
										<Toggle enabled={showWeak} onChange={setShowWeak} />
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Legend toggle button (collapsed state) */}
				{!isExpanded && (
					<button
						type="button"
						onClick={handleToggleExpanded}
						className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 bg-[#0A1628]/80 backdrop-blur-xl border border-[#1E3A5F] rounded-lg hover:bg-[#0A1628] hover:text-white transition-colors"
					>
						<ChevronDown className="w-4 h-4" />
						<span>Legend</span>
					</button>
				)}
			</div>
		</>
	)
})

Legend.displayName = "Legend"
