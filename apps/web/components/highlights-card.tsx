"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import {
	ChevronLeft,
	ChevronRight,
	Info,
	MessageSquare,
	Link2,
	ArrowUp,
	X,
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
	onChat: (highlightContent: string, userReply: string) => void
	onShowRelated: (query: string) => void
	isLoading?: boolean
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
				<p className="text-[12px] leading-normal italic border-l-2 border-brand-accent pl-2">
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
}: HighlightsCardProps) {
	const [activeIndex, setActiveIndex] = useState(0)
	const [isReplyOpen, setIsReplyOpen] = useState(false)
	const [replyText, setReplyText] = useState("")
	const replyInputRef = useRef<HTMLInputElement>(null)

	const currentItem = items[activeIndex]

	useEffect(() => {
		if (isReplyOpen) replyInputRef.current?.focus()
	}, [isReplyOpen])

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when items changes
	useEffect(() => {
		setIsReplyOpen(false)
		setReplyText("")
	}, [items])

	const handlePrev = useCallback(() => {
		setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
		setIsReplyOpen(false)
		setReplyText("")
	}, [items.length])

	const handleNext = useCallback(() => {
		setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
		setIsReplyOpen(false)
		setReplyText("")
	}, [items.length])

	const handleChatClick = useCallback(() => {
		if (!currentItem) return
		analytics.highlightClicked({
			highlight_id: currentItem.id,
			action: "chat",
		})
		setIsReplyOpen(true)
	}, [currentItem])

	const handleReplySubmit = useCallback(() => {
		if (!currentItem || !replyText.trim()) return
		const highlightContent = `${currentItem.title}\n\n${currentItem.content}`
		onChat(highlightContent, replyText.trim())
		setIsReplyOpen(false)
		setReplyText("")
	}, [currentItem, replyText, onChat])

	const handleReplyKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				handleReplySubmit()
			}
			if (e.key === "Escape") {
				setIsReplyOpen(false)
				setReplyText("")
			}
		},
		[handleReplySubmit],
	)

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
					"bg-surface-card/60 backdrop-blur-md rounded-[18px] p-3 flex flex-col gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
					dmSansClassName(),
				)}
			>
				<div className="flex items-center gap-1">
					<div className="size-[14px] rounded-full bg-surface-skeleton animate-pulse" />
					<div className="h-2 w-20 rounded bg-surface-skeleton animate-pulse" />
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="h-2.5 w-2/5 rounded bg-surface-skeleton animate-pulse" />
					<div className="h-2 w-full rounded bg-surface-skeleton animate-pulse" />
					<div className="h-2 w-[85%] rounded bg-surface-skeleton animate-pulse" />
					<div className="h-2 w-[65%] rounded bg-surface-skeleton animate-pulse" />
				</div>
				<div className="flex items-center gap-2">
					<div className="h-[26px] w-14 rounded-lg bg-surface-skeleton animate-pulse" />
					<div className="h-[26px] w-16 rounded-lg bg-surface-skeleton animate-pulse" />
				</div>
			</div>
		)
	}

	if (!currentItem || items.length === 0) {
		return (
			<div
				className={cn(
					"bg-surface-card/60 backdrop-blur-md rounded-[18px] p-3 flex flex-col gap-3 min-h-[180px] shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
					dmSansClassName(),
				)}
			>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-1">
						<Logo className="size-[14px]" />
						<div className="flex items-center gap-0.5">
							<span className="text-[10px] text-brand-accent tracking-[-0.3px]">
								powered by
							</span>
							<span className="text-[10px] text-brand-accent font-medium tracking-[-0.3px]">
								supermemory
							</span>
						</div>
					</div>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p className="text-[11px] text-fg-muted text-center">
						Add some documents to see highlights here
					</p>
				</div>
			</div>
		)
	}

	return (
		<div
			className={cn(
				"bg-surface-card/60 backdrop-blur-md rounded-[18px] p-3 flex flex-col gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			<div id="highlights-header" className="flex items-start justify-between">
				<div className="flex items-center gap-1">
					<Logo className="size-[14px]" />
					<div className="flex items-center gap-0.5">
						<span className="text-[10px] text-brand-accent tracking-[-0.3px]">
							powered by
						</span>
						<span className="text-[10px] text-brand-accent font-medium tracking-[-0.3px]">
							supermemory
						</span>
					</div>
				</div>
				<Info className="size-[14px] text-fg-subtle" />
			</div>

			<div id="highlights-body" className="flex flex-col gap-1.5">
				<p className="text-[12px] font-semibold text-fg-primary leading-tight truncate">
					{currentItem.title}
				</p>
				<div className="text-[12px] text-fg-primary leading-normal line-clamp-5">
					{renderContent(currentItem.content, currentItem.format)}
				</div>
			</div>

			{isReplyOpen && (
				<div className="flex items-center gap-1.5">
					<div className="flex-1 flex items-center bg-pill-bg border border-pill-border rounded-full px-3 py-1 gap-1.5 focus-within:border-pill-border-active transition-colors">
						<input
							ref={replyInputRef}
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							onKeyDown={handleReplyKeyDown}
							placeholder={`Ask Nova about "${currentItem.title.length > 36 ? `${currentItem.title.slice(0, 36)}…` : currentItem.title}"`}
							className="flex-1 bg-transparent text-[11px] text-fg-primary placeholder:text-fg-subtle outline-none min-w-0"
						/>
						<button
							type="button"
							onClick={handleReplySubmit}
							disabled={!replyText.trim()}
							className="shrink-0 flex items-center justify-center text-fg-subtle hover:text-fg-primary disabled:opacity-30 disabled:hover:text-fg-subtle cursor-pointer disabled:cursor-default transition-colors"
							aria-label="Send reply"
						>
							<ArrowUp className="size-3.5" />
						</button>
					</div>
					<button
						type="button"
						onClick={() => {
							setIsReplyOpen(false)
							setReplyText("")
						}}
						className="shrink-0 text-fg-subtle hover:text-fg-primary transition-colors cursor-pointer"
						aria-label="Cancel reply"
					>
						<X className="size-3.5" />
					</button>
				</div>
			)}

			<div className="flex items-center justify-between w-full gap-2">
				<div id="highlights-actions" className="flex gap-2 items-center">
					<button
						type="button"
						onClick={handleChatClick}
						className="rounded-full border border-pill-border bg-pill-bg px-2.5 py-1 text-[11px] text-fg-secondary hover:bg-pill-bg-active hover:border-pill-border-active hover:text-fg-primary transition-colors flex items-center gap-1.5 cursor-pointer"
						aria-label="Chat with Nova"
					>
						<MessageSquare className="size-3.5" />
						Chat
					</button>
					<button
						type="button"
						onClick={handleShowRelated}
						className="rounded-full border border-pill-border bg-pill-bg px-2.5 py-1 text-[11px] text-fg-secondary hover:bg-pill-bg-active hover:border-pill-border-active hover:text-fg-primary transition-colors flex items-center gap-1.5 cursor-pointer"
						aria-label="Show related"
					>
						<Link2 className="size-3.5" />
						Related
					</button>
				</div>

				{items.length > 1 && (
					<div id="highlights-pagination" className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrev}
							className="text-fg-subtle hover:text-fg-primary transition-colors cursor-pointer"
							aria-label="Previous item"
						>
							<ChevronLeft className="size-4" />
						</button>
						<div className="flex items-center gap-1">
							{items.map((_, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => {
										setActiveIndex(idx)
										setIsReplyOpen(false)
										setReplyText("")
									}}
									className={cn(
										"rounded-full transition-all cursor-pointer",
										idx === activeIndex
											? "w-4 h-1.5 bg-brand-accent"
											: "size-1.5 bg-fg-subtle hover:bg-fg-secondary",
									)}
									aria-label={`Go to item ${idx + 1}`}
								/>
							))}
						</div>
						<button
							type="button"
							onClick={handleNext}
							className="text-fg-subtle hover:text-fg-primary transition-colors cursor-pointer"
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
