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

	// Get content based on node type
	const getContent = () => {
		if (node.type === "document") {
			const doc = node.data as ViewportDocument
			return doc.summary || doc.title || "No content available"
		}
		const mem = node.data as ViewportMemoryEntry
		return mem.content || mem.summary || "No content available"
	}

	// Check if this is the latest/new item
	const isLatest = () => {
		if (node.type === "memory") {
			const mem = node.data as ViewportMemoryEntry
			return new Date(mem.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24
		}
		return false
	}

	// Get version info
	const getVersion = () => {
		return "v1"
	}

	return (
		<>
			<div
				onClick={onClose}
				className={`fixed z-20 ${containerBounds ? "" : "inset-0"}`}
				style={backdropStyle}
			/>

			<div
				onClick={(e) => e.stopPropagation()}
				className="fixed z-30 w-[400px] bg-[#0A1628]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl shadow-2xl overflow-hidden"
				style={{
					left: `${x}px`,
					top: `${y}px`,
				}}
			>
				{/* Main content */}
				<div className="p-6">
					<p className="text-xl text-white/90 leading-relaxed">
						{getContent()}
					</p>
				</div>

				{/* Bottom bar with version and latest badge */}
				<div className="px-6 pb-5 flex items-center justify-between">
					<span className="text-cyan-400 font-medium text-lg">
						{getVersion()}
					</span>

					{isLatest() && (
						<div className="flex items-center gap-2 text-emerald-400">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
								<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
								<line x1="12" y1="22.08" x2="12" y2="12" />
							</svg>
							<span className="font-medium text-lg">Latest</span>
						</div>
					)}
				</div>
			</div>
		</>
	)
})
