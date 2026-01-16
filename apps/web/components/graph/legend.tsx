"use client"

import { Brain, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { colors } from "./constants"
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

export const Legend = memo(function Legend({
	id,
	nodes = [],
	edges = [],
	isLoading = false,
}: LegendProps) {
	const [isExpanded, setIsExpanded] = useState(true)
	const [isInitialized, setIsInitialized] = useState(false)

	useEffect(() => {
		if (!isInitialized) {
			const savedState = getCookie("legendCollapsed")
			if (savedState === "true") {
				setIsExpanded(false)
			} else if (savedState === "false") {
				setIsExpanded(true)
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

	return (
		<div
			id={id}
			className="absolute bottom-4 right-4 z-10 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden"
		>
			<div className="p-3">
				{!isExpanded && (
					<button
						type="button"
						onClick={handleToggleExpanded}
						className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
					>
						<span className="text-sm font-medium">?</span>
						<ChevronUp className="w-4 h-4" />
					</button>
				)}

				{isExpanded && (
					<>
						<div className="flex items-center justify-between mb-3">
							<span className="text-sm font-medium text-white">Legend</span>
							<button
								type="button"
								onClick={handleToggleExpanded}
								className="text-white/60 hover:text-white transition-colors"
							>
								<ChevronDown className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-4">
							{!isLoading && (
								<div>
									<div className="text-xs text-white/50 mb-2">Statistics</div>
									<div className="space-y-1.5">
										<div className="flex items-center gap-2">
											<Brain className="w-3.5 h-3.5 text-blue-400" />
											<span className="text-xs text-white/70">
												{memoryCount} memories
											</span>
										</div>
										<div className="flex items-center gap-2">
											<FileText className="w-3.5 h-3.5 text-slate-300" />
											<span className="text-xs text-white/70">
												{documentCount} documents
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
											<span className="text-xs text-white/70">
												{edges.length} connections
											</span>
										</div>
									</div>
								</div>
							)}

							<div>
								<div className="text-xs text-white/50 mb-2">Nodes</div>
								<div className="space-y-1.5">
									<div className="flex items-center gap-2">
										<div className="w-4 h-3 rounded bg-white/20 border border-white/40" />
										<span className="text-xs text-white/70">Document</span>
									</div>
									<div className="flex items-center gap-2">
										<div
											className="w-3.5 h-3.5"
											style={{
												clipPath:
													"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
												backgroundColor: "rgba(147, 196, 253, 0.4)",
												border: "1px solid rgba(147, 196, 253, 0.6)",
											}}
										/>
										<span className="text-xs text-white/70">Memory</span>
									</div>
								</div>
							</div>

							<div>
								<div className="text-xs text-white/50 mb-2">Connections</div>
								<div className="space-y-1.5">
									<div className="flex items-center gap-2">
										<div className="w-4 h-0.5 bg-slate-400/40" />
										<span className="text-xs text-white/70">Doc → Memory</span>
									</div>
									<div className="flex items-center gap-2">
										<div
											className="w-4 h-0.5"
											style={{
												background:
													"repeating-linear-gradient(90deg, rgba(35, 189, 255, 0.6) 0px, rgba(35, 189, 255, 0.6) 3px, transparent 3px, transparent 6px)",
											}}
										/>
										<span className="text-xs text-white/70">Doc similarity</span>
									</div>
								</div>
							</div>

							<div>
								<div className="text-xs text-white/50 mb-2">Similarity</div>
								<div className="space-y-1.5">
									<div className="flex items-center gap-2">
										<div className="w-4 h-0.5 bg-cyan-500/30" />
										<span className="text-xs text-white/70">Weak</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-4 h-1 bg-cyan-400/90" />
										<span className="text-xs text-white/70">Strong</span>
									</div>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	)
})

Legend.displayName = "Legend"
