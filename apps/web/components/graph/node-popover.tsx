"use client"

import { memo, useEffect } from "react"
import type { NodePopoverProps } from "./types"
import type { ViewportDocument, ViewportMemoryEntry } from "@/lib/viewport-graph-types"

export const NodePopover = memo<NodePopoverProps>(function NodePopover({
	node,
	x,
	y,
	onClose,
	containerBounds,
}) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [onClose])

	const backdropStyle = containerBounds
		? {
				left: `${containerBounds.left}px`,
				top: `${containerBounds.top}px`,
				width: `${containerBounds.width}px`,
				height: `${containerBounds.height}px`,
			}
		: undefined

	return (
		<>
			<div
				onClick={onClose}
				className={`fixed z-20 ${containerBounds ? "" : "inset-0"}`}
				style={backdropStyle}
			/>

			<div
				onClick={(e) => e.stopPropagation()}
				className="fixed z-30 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
				style={{
					left: `${x}px`,
					top: `${y}px`,
				}}
			>
				{node.type === "document" ? (
					<div className="p-4">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-slate-400"
								>
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" y1="13" x2="8" y2="13" />
									<line x1="16" y1="17" x2="8" y2="17" />
									<polyline points="10 9 9 9 8 9" />
								</svg>
								<h3 className="text-sm font-medium text-white">Document</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="text-white/40 hover:text-white transition-colors text-xl leading-none"
							>
								×
							</button>
						</div>

						<div className="space-y-3">
							<div>
								<div className="text-xs text-white/50 mb-1">Title</div>
								<p className="text-sm text-white/90">
									{(node.data as ViewportDocument).title || "Untitled Document"}
								</p>
							</div>

							{(node.data as ViewportDocument).summary && (
								<div>
									<div className="text-xs text-white/50 mb-1">Summary</div>
									<p className="text-sm text-white/70 line-clamp-2">
										{(node.data as ViewportDocument).summary}
									</p>
								</div>
							)}

							<div>
								<div className="text-xs text-white/50 mb-1">Type</div>
								<p className="text-sm text-white/70">
									{(node.data as ViewportDocument).type || "Document"}
								</p>
							</div>

							<div>
								<div className="text-xs text-white/50 mb-1">Memory Count</div>
								<p className="text-sm text-white/70">
									{(node.data as ViewportDocument).memoryEntries?.length || 0}{" "}
									memories
								</p>
							</div>

							{(node.data as ViewportDocument).url && (
								<div>
									<div className="text-xs text-white/50 mb-1">URL</div>
									<a
										href={(node.data as ViewportDocument).url || undefined}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
									>
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
										View Document
									</a>
								</div>
							)}

							<div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-white/40">
								<div className="flex items-center gap-1">
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
										<line x1="16" y1="2" x2="16" y2="6" />
										<line x1="8" y1="2" x2="8" y2="6" />
										<line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									<span>
										{new Date(
											(node.data as ViewportDocument).createdAt,
										).toLocaleDateString()}
									</span>
								</div>
								<span className="font-mono text-[10px] truncate max-w-[100px]">
									{node.id}
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className="p-4">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-blue-400"
								>
									<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
									<path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
								</svg>
								<h3 className="text-sm font-medium text-white">Memory</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="text-white/40 hover:text-white transition-colors text-xl leading-none"
							>
								×
							</button>
						</div>

						<div className="space-y-3">
							<div>
								<div className="text-xs text-white/50 mb-1">Memory</div>
								<p className="text-sm text-white/90">
									{(node.data as ViewportMemoryEntry).content || "No content"}
								</p>
							</div>

							<div>
								<div className="text-xs text-white/50 mb-1">Space</div>
								<p className="text-sm text-white/70">
									{(node.data as ViewportMemoryEntry).spaceId || "Default"}
								</p>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-white/40">
								<div className="flex items-center gap-1">
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
										<line x1="16" y1="2" x2="16" y2="6" />
										<line x1="8" y1="2" x2="8" y2="6" />
										<line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									<span>
										{new Date(
											(node.data as ViewportMemoryEntry).createdAt,
										).toLocaleDateString()}
									</span>
								</div>
								<span className="font-mono text-[10px] truncate max-w-[100px]">
									{node.id}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
})
