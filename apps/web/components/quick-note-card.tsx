"use client"

import { useRef, useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Maximize2, Plus, Loader2, X } from "lucide-react"
import { useProject } from "@/stores"
import { useQuickNoteDraft } from "@/stores/quick-note-draft"
import { TextEditor } from "./text-editor"

interface QuickNoteCardProps {
	onSave: (content: string) => void
	onMaximize: (content: string) => void
	isSaving?: boolean
}

type NoteRect = {
	left: number
	top: number
	width: number
	height: number
}

function getExpandedRect(source: NoteRect): NoteRect {
	const viewportWidth = window.innerWidth
	const viewportHeight = window.innerHeight
	const margin = viewportWidth < 768 ? 16 : 32
	const availableWidth = viewportWidth - source.left - margin
	const availableHeight = viewportHeight - source.top - margin
	const width = Math.min(1008, Math.max(source.width, availableWidth))
	const height = Math.min(720, Math.max(source.height, availableHeight))

	return {
		left: source.left,
		top: source.top,
		width,
		height,
	}
}

export function QuickNoteCard({
	onSave,
	onMaximize,
	isSaving = false,
}: QuickNoteCardProps) {
	const cardRef = useRef<HTMLDivElement>(null)
	const wasSavingRef = useRef(isSaving)
	const { selectedProject } = useProject()
	const { draft, setDraft } = useQuickNoteDraft(selectedProject)
	const [isExpanded, setIsExpanded] = useState(false)
	const [sourceRect, setSourceRect] = useState<NoteRect | null>(null)
	const [targetRect, setTargetRect] = useState<NoteRect | null>(null)
	const [expandedInitialContent, setExpandedInitialContent] = useState<
		string | undefined
	>(undefined)
	const [isMounted, setIsMounted] = useState(false)

	const handleChange = useCallback(
		(content: string) => {
			setDraft(content)
		},
		[setDraft],
	)

	const handleExpand = useCallback(() => {
		const rect = cardRef.current?.getBoundingClientRect()
		if (!rect) return

		const nextSourceRect = {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		}

		setSourceRect(nextSourceRect)
		setTargetRect(getExpandedRect(nextSourceRect))
		setExpandedInitialContent(draft || undefined)
		setIsExpanded(true)
	}, [draft])

	const handleClose = useCallback(() => {
		setIsExpanded(false)
	}, [])

	const handleSaveClick = useCallback(() => {
		if (draft.trim() && !isSaving) {
			onSave(draft)
		}
	}, [draft, isSaving, onSave])

	const handleMaximizeClick = useCallback(() => {
		setIsExpanded(false)
		onMaximize(draft)
	}, [draft, onMaximize])

	const canSave = draft.trim().length > 0 && !isSaving
	const previewText = useMemo(() => {
		const trimmed = draft.trim()
		if (!trimmed) return null
		return trimmed.replace(/\s+/g, " ")
	}, [draft])

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		if (!isExpanded || !sourceRect) return

		const handleResize = () => setTargetRect(getExpandedRect(sourceRect))
		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [isExpanded, sourceRect])

	useEffect(() => {
		if (!isExpanded) return

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"

		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault()
				handleClose()
			}
		}

		document.addEventListener("keydown", handleGlobalKeyDown)

		return () => {
			document.body.style.overflow = previousOverflow
			document.removeEventListener("keydown", handleGlobalKeyDown)
		}
	}, [isExpanded, handleClose])

	useEffect(() => {
		if (wasSavingRef.current && !isSaving && draft.trim().length === 0) {
			setIsExpanded(false)
		}
		wasSavingRef.current = isSaving
	}, [draft, isSaving])

	return (
		<>
			<div
				ref={cardRef}
				className="bg-[#1B1F24] rounded-[22px] p-1"
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
			>
				<div
					id="quick-note-inner"
					className="bg-[#0B1017] rounded-[18px] p-3 relative"
					style={{
						boxShadow: "inset 1.421px 1.421px 4.263px 0 rgba(11, 15, 21, 0.4)",
					}}
				>
					<button
						type="button"
						onClick={handleMaximizeClick}
						className="absolute top-3 right-3 text-[#737373] hover:text-white transition-colors cursor-pointer"
						aria-label="Open full screen note"
					>
						<Maximize2 className="size-[14px]" />
					</button>

					<button
						type="button"
						onClick={handleExpand}
						disabled={isSaving}
						className="w-full h-[120px] cursor-text text-left disabled:cursor-not-allowed disabled:opacity-50"
						aria-label="Expand quick note"
					>
						<span className="flex h-full flex-col pr-5">
							<span
								className={cn(
									dmSansClassName(),
									"line-clamp-4 text-[12px] leading-normal text-[#D7DEE8]",
									!previewText && "text-[#737373]",
								)}
							>
								{previewText ?? "Start writing..."}
							</span>
						</span>
					</button>

					<div
						id="quick-note-action-bar"
						className="bg-[#1B1F24] rounded-[8px] px-2 py-1.5 flex items-center justify-center gap-8 w-full"
						style={{
							boxShadow:
								"0 4px 20px 0 rgba(0, 0, 0, 0.25), inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1)",
						}}
					>
						<button
							type="button"
							onClick={handleSaveClick}
							disabled={!canSave}
							className={cn(
								"flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							<span className="flex items-center gap-1.5">
								{isSaving ? (
									<Loader2 className="size-2 animate-spin text-[#fafafa]" />
								) : (
									<Plus className="size-2 text-[#fafafa]" />
								)}
								<span
									className={cn(
										dmSansClassName(),
										"text-[10px] font-medium text-[#fafafa]",
									)}
								>
									{isSaving ? "Saving..." : "Save note"}
								</span>
							</span>

							<span
								className={cn(
									"bg-[rgba(33,33,33,0.5)] border border-[rgba(115,115,115,0.2)] rounded px-1 py-0.5 flex items-center gap-1 h-4",
								)}
							>
								<svg
									className="size-[10px]"
									viewBox="0 0 9 9"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Command Key</title>
									<path
										d="M6.67 0.42C6.34 0.42 6.02 0.55 5.78 0.78C5.55 1.02 5.42 1.34 5.42 1.67V6.67C5.42 7 5.55 7.32 5.78 7.55C6.02 7.78 6.34 7.92 6.67 7.92C7 7.92 7.32 7.78 7.55 7.55C7.78 7.32 7.92 7 7.92 6.67C7.92 6.34 7.78 6.02 7.55 5.78C7.32 5.55 7 5.42 6.67 5.42H1.67C1.34 5.42 1.02 5.55 0.78 5.78C0.55 6.02 0.42 6.34 0.42 6.67C0.42 7 0.55 7.32 0.78 7.55C1.02 7.78 1.34 7.92 1.67 7.92C2 7.92 2.32 7.78 2.55 7.55C2.78 7.32 2.92 7 2.92 6.67V1.67C2.92 1.34 2.78 1.02 2.55 0.78C2.32 0.55 2 0.42 1.67 0.42C1.34 0.42 1.02 0.55 0.78 0.78C0.55 1.02 0.42 1.34 0.42 1.67C0.42 2 0.55 2.32 0.78 2.55C1.02 2.78 1.34 2.92 1.67 2.92H6.67C7 2.92 7.32 2.78 7.55 2.55C7.78 2.32 7.92 2 7.92 1.67C7.92 1.34 7.78 1.02 7.55 0.78C7.32 0.55 7 0.42 6.67 0.42Z"
										stroke="#737373"
										strokeWidth="0.833333"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span
									className={cn(
										dmSansClassName(),
										"text-[10px] font-medium text-[#737373]",
									)}
								>
									Enter
								</span>
							</span>
						</button>
					</div>
				</div>
			</div>

			{isMounted &&
				createPortal(
					<AnimatePresence>
						{isExpanded && sourceRect && targetRect && (
							<div className="fixed inset-0 z-[100]">
								<motion.button
									type="button"
									aria-label="Close quick note"
									className="absolute inset-0 cursor-default bg-[#05080D]/60 backdrop-blur-md"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
									onClick={handleClose}
								/>

								<motion.div
									role="dialog"
									aria-modal="true"
									aria-label="New quick note"
									className="absolute overflow-hidden rounded-[22px] bg-[#1B1F24] p-1"
									initial={sourceRect}
									animate={targetRect}
									exit={sourceRect}
									transition={{
										type: "spring",
										stiffness: 420,
										damping: 42,
										mass: 0.9,
									}}
									style={{
										boxShadow:
											"0 28px 80px rgba(0, 0, 0, 0.55), 0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
									}}
								>
									<div
										className="flex size-full flex-col rounded-[18px] bg-[#0B1017]"
										style={{
											boxShadow:
												"inset 1.421px 1.421px 4.263px 0 rgba(11, 15, 21, 0.4)",
										}}
									>
										<header className="flex shrink-0 justify-end border-b border-[#202A36]/70 px-5 py-4 md:px-7">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={handleMaximizeClick}
													className="flex size-8 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
													aria-label="Open full screen note"
												>
													<Maximize2 className="size-4" />
												</button>
												<button
													type="button"
													onClick={handleClose}
													className="flex size-8 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
													aria-label="Close quick note"
												>
													<X className="size-4" />
												</button>
											</div>
										</header>

										<div className="min-h-0 flex-1 overflow-auto px-5 py-5 md:px-7 md:py-6">
											<TextEditor
												content={expandedInitialContent}
												onContentChange={handleChange}
												onSubmit={handleSaveClick}
												debounceMs={0}
												autoFocus
												placeholder="Start writing..."
											/>
										</div>

										<footer className="flex shrink-0 justify-center border-t border-[#202A36]/70 px-4 py-4">
											<button
												type="button"
												onClick={handleSaveClick}
												disabled={!canSave}
												className={cn(
													"bg-[#1B1F24] rounded-[8px] px-4 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
												)}
												style={{
													boxShadow:
														"0 4px 20px 0 rgba(0, 0, 0, 0.25), inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1)",
												}}
											>
												{isSaving ? (
													<Loader2 className="size-2 animate-spin text-[#fafafa]" />
												) : (
													<Plus className="size-2 text-[#fafafa]" />
												)}
												<span
													className={cn(
														dmSansClassName(),
														"text-[14px] font-medium text-[#fafafa]",
													)}
												>
													{isSaving ? "Saving..." : "Save note"}
												</span>
											</button>
										</footer>
									</div>
								</motion.div>
							</div>
						)}
					</AnimatePresence>,
					document.body,
				)}
		</>
	)
}
