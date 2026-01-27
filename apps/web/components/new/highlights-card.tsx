"use client"

import { useState, useCallback } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import {
	ChevronLeft,
	ChevronRight,
	Info,
	Loader2,
	MessageSquare,
	Link2,
} from "lucide-react"
import { Logo } from "@ui/assets/Logo"
import { analytics } from "@/lib/analytics"

export type HighlightFormat = "paragraph" | "bullets" | "quote" | "one_liner"

export interface HighlightItem {
	id: string
	title: string
	content: string
	format: HighlightFormat
	query: string
	sourceDocumentIds: string[]
}

interface HighlightsCardProps {
	items: HighlightItem[]
	onChat: (seed: string) => void
	onShowRelated: (query: string) => void
	isLoading?: boolean
	width?: number
}

function renderContent(content: string, format: HighlightFormat) {
	switch (format) {
		case "bullets": {
			const lines = content
				.split("\n")
				.map((line) => line.replace(/^[-•*]\s*/, "").trim())
				.filter(Boolean)
			return (
				<ul className="list-disc pl-[18px] space-y-0">
					{lines.map((line, idx) => (
						<li key={idx} className="text-[12px] leading-normal">
							{line}
						</li>
					))}
				</ul>
			)
		}
		case "quote":
			return (
				<p className="text-[12px] leading-normal italic border-l-2 border-[#4BA0FA] pl-2">
					"{content}"
				</p>
			)
		case "one_liner":
			return <p className="text-[12px] leading-normal font-medium">{content}</p>
		default:
			return <p className="text-[12px] leading-normal">{content}</p>
	}
}

export function HighlightsCard({
	items,
	onChat,
	onShowRelated,
	isLoading = false,
	width = 216,
}: HighlightsCardProps) {
	const [activeIndex, setActiveIndex] = useState(0)

	const currentItem = items[activeIndex]

	const handlePrev = useCallback(() => {
		setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
	}, [items.length])

	const handleNext = useCallback(() => {
		setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
	}, [items.length])

	const handleChat = useCallback(() => {
		if (!currentItem) return
		analytics.highlightClicked({
			highlight_id: currentItem.id,
			action: "chat",
		})
		const seed = `Tell me more about "${currentItem.title}"`
		onChat(seed)
	}, [currentItem, onChat])

	const handleShowRelated = useCallback(() => {
		if (!currentItem) return
		analytics.highlightClicked({
			highlight_id: currentItem.id,
			action: "related",
		})
		onShowRelated(currentItem.query || currentItem.title)
	}, [currentItem, onShowRelated])

	if (isLoading) {
		return (
			<div
				className={cn(
					"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col gap-3 min-h-[180px] items-center justify-center",
					dmSansClassName(),
				)}
				style={{ width }}
			>
				<Loader2 className="size-5 animate-spin text-[#4BA0FA]" />
				<span className="text-[10px] text-[#737373]">
					Loading highlights...
				</span>
			</div>
		)
	}

	if (!currentItem || items.length === 0) {
		return (
			<div
				className={cn(
					"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col gap-3 min-h-[180px]",
					dmSansClassName(),
				)}
				style={{ width }}
			>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-1">
						<Logo className="size-[14px]" />
						<div className="flex items-center gap-0.5">
							<span className="text-[10px] text-[#4BA0FA] tracking-[-0.3px]">
								powered by
							</span>
							<span className="text-[10px] text-[#4BA0FA] font-medium tracking-[-0.3px]">
								supermemory
							</span>
						</div>
					</div>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p className="text-[11px] text-[#737373] text-center">
						Add some documents to see highlights here
					</p>
				</div>
			</div>
		)
	}

	return (
		<div
			className={cn(
				"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col gap-3",
				dmSansClassName(),
			)}
			style={{ width }}
		>
			<div id="highlights-header" className="flex items-start justify-between">
				<div className="flex items-center gap-1">
					<Logo className="size-[14px]" />
					<div className="flex items-center gap-0.5">
						<span className="text-[10px] text-[#4BA0FA] tracking-[-0.3px]">
							powered by
						</span>
						<span className="text-[10px] text-[#4BA0FA] font-medium tracking-[-0.3px]">
							supermemory
						</span>
					</div>
				</div>
				<Info className="size-[14px] text-[#737373]" />
			</div>

			<div id="highlights-body" className="flex flex-col gap-1.5">
				<p className="text-[12px] font-semibold text-[#FAFAFA] leading-tight truncate">
					{currentItem.title}
				</p>
				<div className="text-[12px] text-[#FAFAFA] leading-normal line-clamp-5">
					{renderContent(currentItem.content, currentItem.format)}
				</div>
			</div>

			<div className="flex items-center justify-between w-full gap-2">
				<div id="highlights-actions" className="flex gap-2 items-center">
					<button
						type="button"
						onClick={handleChat}
						className="bg-[#1B1F24] rounded-[8px] px-2 py-1.5 flex items-center gap-1.5 cursor-pointer relative"
						style={{
							boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.25)",
						}}
						aria-label="Chat with Nova"
					>
						<MessageSquare className="size-3.5 text-[#FAFAFA]" />
						<span className="text-[11px] text-[#FAFAFA]">Chat</span>
						<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.1)]" />
					</button>
					<button
						type="button"
						onClick={handleShowRelated}
						className="bg-[#1B1F24] rounded-[8px] px-2 py-1.5 flex items-center gap-1.5 cursor-pointer relative"
						style={{
							boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.25)",
						}}
						aria-label="Show related"
					>
						<Link2 className="size-3.5 text-[#FAFAFA]" />
						<span className="text-[11px] text-[#FAFAFA]">Related</span>
						<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.1)]" />
					</button>
				</div>

				{items.length > 1 && (
					<div id="highlights-pagination" className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrev}
							className="text-[#737373] hover:text-white transition-colors cursor-pointer"
							aria-label="Previous item"
						>
							<ChevronLeft className="size-4" />
						</button>
						<div className="flex items-center gap-1">
							{items.map((_, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => setActiveIndex(idx)}
									className={cn(
										"rounded-full transition-all cursor-pointer",
										idx === activeIndex
											? "w-4 h-1.5 bg-[#4BA0FA]"
											: "size-1.5 bg-[#737373] hover:bg-[#999999]",
									)}
									aria-label={`Go to item ${idx + 1}`}
								/>
							))}
						</div>
						<button
							type="button"
							onClick={handleNext}
							className="text-[#737373] hover:text-white transition-colors cursor-pointer"
							aria-label="Next item"
						>
							<ChevronRight className="size-4" />
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
