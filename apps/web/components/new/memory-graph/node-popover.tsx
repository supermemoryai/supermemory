"use client"

import { memo, useEffect } from "react"
import type { GraphNode } from "./types"
import { cn } from "@lib/utils"

export interface NodePopoverProps {
	node: GraphNode
	x: number // Screen X position
	y: number // Screen Y position
	onClose: () => void
	containerBounds?: DOMRect // Optional container bounds to limit backdrop
	onBackdropClick?: () => void // Optional callback when backdrop is clicked
}

export const NodePopover = memo<NodePopoverProps>(function NodePopover({
	node,
	x,
	y,
	onClose,
	containerBounds,
	onBackdropClick,
}) {
	// Handle Escape key to close popover
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [onClose])

	// Calculate backdrop bounds - use container bounds if provided, otherwise full viewport
	const backdropStyle = containerBounds
		? {
				left: `${containerBounds.left}px`,
				top: `${containerBounds.top}px`,
				width: `${containerBounds.width}px`,
				height: `${containerBounds.height}px`,
			}
		: undefined

	const handleBackdropClick = () => {
		onBackdropClick?.()
		onClose()
	}

	return (
		<>
			{/* Invisible backdrop to catch clicks outside */}
			<div
				onClick={handleBackdropClick}
				className={cn(
					"fixed z-[999] pointer-events-auto bg-transparent",
					!containerBounds && "inset-0",
				)}
				style={backdropStyle}
			/>

			{/* Popover content */}
			<div
				onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
				className="fixed backdrop-blur-[12px] bg-white/5 border border-white/25 rounded-xl p-4 w-80 z-[1000] pointer-events-auto shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3),0_8px_10px_-6px_rgb(0_0_0/0.3)]"
				style={{
					left: `${x}px`,
					top: `${y}px`,
				}}
			>
				{node.type === "document" ? (
					// Document popover
					<div className="flex flex-col gap-3">
						{/* Header */}
						<div className="flex items-center justify-between mb-1">
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
								<h3 className="text-base font-bold text-white m-0">Document</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="p-1 bg-transparent border-none text-slate-400 cursor-pointer text-base leading-none transition-colors hover:text-white"
							>
								×
							</button>
						</div>

						{/* Sections */}
						<div className="flex flex-col gap-3">
							{/* Title */}
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
									Title
								</div>
								<p className="text-sm text-slate-300 m-0 leading-relaxed">
									{(node.data as any).title || "Untitled Document"}
								</p>
							</div>

							{/* Summary - truncated to 2 lines */}
							{(node.data as any).summary && (
								<div>
									<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
										Summary
									</div>
									<p className="text-sm text-slate-300 m-0 leading-relaxed line-clamp-2">
										{(node.data as any).summary}
									</p>
								</div>
							)}

							{/* Type */}
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
									Type
								</div>
								<p className="text-sm text-slate-300 m-0 leading-relaxed">
									{(node.data as any).type || "Document"}
								</p>
							</div>

							{/* Memory Count */}
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
									Memory Count
								</div>
								<p className="text-sm text-slate-300 m-0 leading-relaxed">
									{(node.data as any).memoryEntries?.length || 0} memories
								</p>
							</div>

							{/* URL */}
							{((node.data as any).url || (node.data as any).customId) && (
								<div>
									<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
										URL
									</div>
									<a
										href={(() => {
											const doc = node.data as any
											if (doc.type === "google_doc" && doc.customId) {
												return `https://docs.google.com/document/d/${doc.customId}`
											}
											if (doc.type === "google_sheet" && doc.customId) {
												return `https://docs.google.com/spreadsheets/d/${doc.customId}`
											}
											if (doc.type === "google_slide" && doc.customId) {
												return `https://docs.google.com/presentation/d/${doc.customId}`
											}
											return doc.url ?? undefined
										})()}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-indigo-400 no-underline flex items-center gap-1 transition-colors hover:text-indigo-300"
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

							{/* Footer with metadata */}
							<div className="pt-3 border-t border-slate-600/50 flex items-center gap-4 text-xs text-slate-400">
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
											(node.data as any).createdAt,
										).toLocaleDateString()}
									</span>
								</div>
								<div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap flex-1">
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
										<line x1="4" y1="9" x2="20" y2="9" />
										<line x1="4" y1="15" x2="20" y2="15" />
										<line x1="10" y1="3" x2="8" y2="21" />
										<line x1="16" y1="3" x2="14" y2="21" />
									</svg>
									<span className="overflow-hidden text-ellipsis">
										{node.id}
									</span>
								</div>
							</div>
						</div>
					</div>
				) : (
					// Memory popover
					<div className="flex flex-col gap-3">
						{/* Header */}
						<div className="flex items-center justify-between mb-1">
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
								<h3 className="text-base font-bold text-white m-0">Memory</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="p-1 bg-transparent border-none text-slate-400 cursor-pointer text-base leading-none transition-colors hover:text-white"
							>
								×
							</button>
						</div>

						{/* Sections */}
						<div className="flex flex-col gap-3">
							{/* Memory content */}
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
									Memory
								</div>
								<p className="text-sm text-slate-300 m-0 leading-relaxed">
									{(node.data as any).memory ||
										(node.data as any).content ||
										"No content"}
								</p>
								{(node.data as any).isForgotten && (
									<div className="mt-2 px-2 py-1 bg-red-600/15 rounded text-xs text-red-400 inline-block">
										Forgotten
									</div>
								)}
								{/* Expires (inline with memory if exists) */}
								{(node.data as any).forgetAfter && (
									<p className="text-xs text-slate-400 mt-2 leading-relaxed">
										Expires:{" "}
										{new Date(
											(node.data as any).forgetAfter,
										).toLocaleDateString()}
										{(node.data as any).forgetReason &&
											` - ${(node.data as any).forgetReason}`}
									</p>
								)}
							</div>

							{/* Space */}
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wider mb-1">
									Space
								</div>
								<p className="text-sm text-slate-300 m-0 leading-relaxed">
									{(node.data as any).spaceId || "Default"}
								</p>
							</div>

							{/* Footer with metadata */}
							<div className="pt-3 border-t border-slate-600/50 flex items-center gap-4 text-xs text-slate-400">
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
											(node.data as any).createdAt,
										).toLocaleDateString()}
									</span>
								</div>
								<div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap flex-1">
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
										<line x1="4" y1="9" x2="20" y2="9" />
										<line x1="4" y1="15" x2="20" y2="15" />
										<line x1="10" y1="3" x2="8" y2="21" />
										<line x1="16" y1="3" x2="14" y2="21" />
									</svg>
									<span className="overflow-hidden text-ellipsis">
										{node.id}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
})
