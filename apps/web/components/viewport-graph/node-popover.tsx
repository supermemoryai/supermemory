"use client"

import { memo, useEffect } from "react"
import type { ViewportGraphNode, ViewportDocument, ViewportMemoryEntry } from "@/lib/viewport-graph-types"
import { FileText, Calendar, Hash, ExternalLink, X, Brain } from "lucide-react"

export interface NodePopoverProps {
	node: ViewportGraphNode
	x: number
	y: number
	onClose: () => void
	containerBounds?: DOMRect
}

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

	const isMemory = node.type === "memory"
	const doc = isMemory ? null : (node.data as ViewportDocument)
	const memory = isMemory ? (node.data as ViewportMemoryEntry) : null

	const getDocumentUrl = () => {
		if (!doc) return undefined
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
	}

	const documentUrl = getDocumentUrl()
	const title = doc?.title ?? memory?.title ?? "Untitled"
	const summary = doc?.summary ?? memory?.summary ?? memory?.content
	const type = doc?.type ?? memory?.type ?? "Memory"
	const createdAt = doc?.createdAt ?? memory?.createdAt
	const url = doc?.url ?? memory?.url

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={onClose}
				className={`fixed z-[999] ${containerBounds ? "" : "inset-0"}`}
				style={backdropStyle}
			/>

			{/* Popover */}
			<div
				onClick={(e) => e.stopPropagation()}
				className="fixed z-[1000] bg-white/5 backdrop-blur-xl border border-white/25 rounded-xl p-4 w-80 shadow-2xl"
				style={{
					left: `${x}px`,
					top: `${y}px`,
				}}
			>
				<div className="flex flex-col gap-3">
					{/* Header */}
					<div className="flex items-center justify-between mb-1">
						<div className="flex items-center gap-2">
							{isMemory ? (
								<Brain className="w-5 h-5 text-purple-400" />
							) : (
								<FileText className="w-5 h-5 text-slate-400" />
							)}
							<h3 className="text-base font-bold text-white">
								{isMemory ? "Memory" : "Document"}
							</h3>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-1 bg-transparent text-slate-400 hover:text-white transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Content */}
					<div className="flex flex-col gap-3">
						{/* Title */}
						<div>
							<div className="text-[11px] text-slate-400/80 uppercase tracking-wide mb-1">
								Title
							</div>
							<p className="text-sm text-slate-300 leading-relaxed">
								{title || "Untitled"}
							</p>
						</div>

						{/* Summary/Content */}
						{summary && (
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wide mb-1">
									{isMemory ? "Content" : "Summary"}
								</div>
								<p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
									{summary}
								</p>
							</div>
						)}

						{/* Type */}
						<div>
							<div className="text-[11px] text-slate-400/80 uppercase tracking-wide mb-1">
								Type
							</div>
							<p className="text-sm text-slate-300">{type}</p>
						</div>

						{/* Memory Count - only for documents */}
						{doc && (
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wide mb-1">
									Memory Count
								</div>
								<p className="text-sm text-slate-300">
									{doc.memoryEntries?.length || 0} memories
								</p>
							</div>
						)}

						{/* URL */}
						{(documentUrl || url) && (
							<div>
								<div className="text-[11px] text-slate-400/80 uppercase tracking-wide mb-1">
									URL
								</div>
								<a
									href={documentUrl || url || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
								>
									<ExternalLink className="w-3 h-3" />
									{isMemory ? "View Source" : "View Document"}
								</a>
							</div>
						)}

						{/* Footer */}
						<div className="pt-3 border-t border-slate-600/50 flex items-center gap-4 text-xs text-slate-400">
							{createdAt && (
								<div className="flex items-center gap-1">
									<Calendar className="w-3 h-3" />
									<span>{new Date(createdAt).toLocaleDateString()}</span>
								</div>
							)}
							<div className="flex items-center gap-1 overflow-hidden flex-1">
								<Hash className="w-3 h-3 flex-shrink-0" />
								<span className="truncate">{node.id}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
})
