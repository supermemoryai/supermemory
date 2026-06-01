"use client"

import { ChevronUpIcon, Paperclip, X, FileText } from "lucide-react"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import type { FileUIPart } from "ai"
import { SendButton, StopButton } from "./actions"

const ACCEPTED_FILE_TYPES =
	"image/jpeg,image/png,image/gif,image/webp,application/pdf"
const MAX_FILE_SIZE_MB = 10
const MAX_TOTAL_SIZE_MB = 20
const MAX_FILE_COUNT = 5

interface ChatInputProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onSend: (attachments?: FileUIPart[]) => void
	onStop: () => void
	onKeyDown?: (e: React.KeyboardEvent) => void
	isResponding?: boolean
	activeStatus?: string
	chainOfThoughtComponent?: React.ReactNode
	onExpandedChange?: (expanded: boolean) => void
	/** Model + space controls on one row with send; textarea full-width above */
	stackedToolbar?: ReactNode
	/** Nova status row + chain-of-thought toggle (off for e.g. home composer) */
	showStatusStrip?: boolean
	/** Hide attachment button (for consumers that don't support file upload) */
	disableAttachments?: boolean
}

export default function ChatInput({
	value,
	onChange,
	onSend,
	onStop,
	onKeyDown: externalOnKeyDown,
	isResponding = false,
	activeStatus,
	chainOfThoughtComponent,
	onExpandedChange,
	stackedToolbar,
	showStatusStrip = true,
	disableAttachments = false,
}: ChatInputProps) {
	const [isMultiline, setIsMultiline] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)
	const [attachments, setAttachments] = useState<FileUIPart[]>([])
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const attachmentsRef = useRef(attachments)
	attachmentsRef.current = attachments

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const incoming = Array.from(e.target.files ?? [])
			e.target.value = ""
			const current = attachmentsRef.current
			const slots = MAX_FILE_COUNT - current.length
			if (slots <= 0) return
			const candidates = incoming
				.slice(0, slots)
				.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024)
			// Enforce total budget (rough estimate; data URL is ~1.37x raw size)
			const budgetBytes = MAX_TOTAL_SIZE_MB * 1024 * 1024
			let consumed = current.reduce((sum, att) => {
				// Estimate original size from data URL length
				return sum + Math.round(att.url.length * 0.75)
			}, 0)
			const accepted: File[] = []
			for (const f of candidates) {
				if (consumed + f.size <= budgetBytes) {
					accepted.push(f)
					consumed += f.size
				}
			}
			if (accepted.length === 0) return
			const parts = await Promise.all(
				accepted.map(
					(file) =>
						new Promise<FileUIPart>((resolve) => {
							const reader = new FileReader()
							reader.onload = () =>
								resolve({
									type: "file",
									mediaType: file.type,
									filename: file.name,
									url: reader.result as string,
								})
							reader.readAsDataURL(file)
						}),
				),
			)
			setAttachments((prev) => [...prev, ...parts])
		},
		[],
	)

	const removeAttachment = useCallback(
		(i: number) => setAttachments((prev) => prev.filter((_, idx) => idx !== i)),
		[],
	)

	const handleSend = useCallback(() => {
		onSend(attachments.length > 0 ? attachments : undefined)
		setAttachments([])
	}, [onSend, attachments])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				if (!isResponding && (value.trim() || attachments.length > 0)) {
					handleSend()
				}
				return
			}
			externalOnKeyDown?.(e)
		},
		[externalOnKeyDown, handleSend, isResponding, value, attachments.length],
	)

	useEffect(() => {
		if (!showStatusStrip && isExpanded) {
			setIsExpanded(false)
			onExpandedChange?.(false)
		}
	}, [isExpanded, onExpandedChange, showStatusStrip])

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e)

		const textarea = e.target
		textarea.style.height = "auto"

		// Set height based on scrollHeight, with a max of ~96px (4-5 lines)
		const newHeight = Math.min(textarea.scrollHeight, 96)
		textarea.style.height = `${newHeight}px`

		setIsMultiline(textarea.scrollHeight > 52)
	}

	const attachmentChips = attachments.length > 0 && (
		<div className="flex flex-wrap gap-1.5 px-1 pt-1">
			{attachments.map((att, i) => (
				<AttachmentChip
					key={i}
					attachment={att}
					onRemove={() => removeAttachment(i)}
				/>
			))}
		</div>
	)

	const paperclipButton = !disableAttachments && (
		<button
			type="button"
			aria-label="Attach file"
			onClick={() => fileInputRef.current?.click()}
			disabled={isResponding}
			className="shrink-0 rounded-lg p-1.5 text-fg-faint hover:text-fg-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
		>
			<Paperclip className="size-4" />
		</button>
	)

	return (
		<motion.div
			className={cn("relative z-20!")}
			animate={{
				padding: showStatusStrip ? (isExpanded ? "16px" : "0") : "0",
				margin: showStatusStrip ? (isExpanded ? "0" : "16px") : "0",
				borderRadius: showStatusStrip
					? isExpanded
						? "0 0 12px 12px"
						: "12px"
					: "0",
				backgroundColor: showStatusStrip
					? isExpanded
						? "#000B1B"
						: "#01173C"
					: "transparent",
			}}
			transition={{
				duration: 0.3,
				ease: "easeOut",
			}}
		>
			<input
				accept={ACCEPTED_FILE_TYPES}
				className="hidden"
				multiple
				onChange={handleFileChange}
				ref={fileInputRef}
				type="file"
			/>
			{showStatusStrip ? (
				<>
					<div
						className={cn(
							"absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-300 ease-out bg-[#000B1B]",
							isExpanded
								? "max-h-[min(60dvh,420px)] opacity-100 overflow-y-auto pt-1.5 pb-2 rounded-t-xl px-4"
								: "max-h-0 opacity-0",
						)}
						style={{
							zIndex: isExpanded ? 50 : 0,
						}}
					>
						{chainOfThoughtComponent}
					</div>
					<button
						type="button"
						className={cn(
							"w-full p-3 pr-4 flex items-center justify-between cursor-pointer bg-transparent border-0 text-left",
							!chainOfThoughtComponent && "disabled:cursor-not-allowed",
						)}
						onClick={() => {
							const newExpanded = !isExpanded
							setIsExpanded(newExpanded)
							onExpandedChange?.(newExpanded)
						}}
						disabled={!chainOfThoughtComponent}
					>
						<div className="flex items-center gap-3">
							<NovaOrb size={24} className="blur-[1px]! z-10" />
							<p className={cn("text-[#525D6E]", dmSansClassName())}>
								{activeStatus || "Waiting for input..."}
							</p>
						</div>
						{chainOfThoughtComponent && (
							<ChevronUpIcon
								className={cn(
									"size-4 text-[#525D6E] transition-transform duration-300",
									isExpanded && "rotate-180",
								)}
							/>
						)}
					</button>
				</>
			) : null}
			{stackedToolbar ? (
				<div className="flex flex-col gap-2 rounded-xl bg-surface-card/60 backdrop-blur-md p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] transition-all duration-200 focus-within:ring-1 focus-within:ring-fg-primary/10">
					{attachmentChips}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 text-fg-primary transition-all duration-200 placeholder:text-fg-faint focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
						disabled={isResponding}
					/>
					<div className="flex items-center gap-2">
						<div className="flex min-w-0 flex-1 items-center gap-2">
							{stackedToolbar}
						</div>
						{paperclipButton}
						<div className="shrink-0">
							{isResponding ? (
								<StopButton onClick={onStop} />
							) : (
								<SendButton
									onClick={handleSend}
									disabled={!value.trim() && attachments.length === 0}
								/>
							)}
						</div>
					</div>
				</div>
			) : (
				<div
					className={cn(
						"flex items-end gap-2 rounded-xl bg-surface-card/60 backdrop-blur-md p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] transition-all duration-200 focus-within:ring-1 focus-within:ring-fg-primary/10",
						isMultiline && "flex-col",
					)}
				>
					{attachmentChips}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 text-fg-primary transition-all duration-200 placeholder:text-fg-faint focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
						disabled={isResponding}
					/>
					<div
						className={cn(
							"flex items-center gap-1 transition-all duration-200",
							isMultiline && "w-full justify-end",
						)}
					>
						{paperclipButton}
						{isResponding ? (
							<StopButton onClick={onStop} />
						) : (
							<SendButton
								onClick={handleSend}
								disabled={!value.trim() && attachments.length === 0}
							/>
						)}
					</div>
				</div>
			)}
		</motion.div>
	)
}

function AttachmentChip({
	attachment,
	onRemove,
}: {
	attachment: FileUIPart
	onRemove: () => void
}) {
	const isImage = attachment.mediaType.startsWith("image/")
	return (
		<div
			className={cn(
				"relative group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 overflow-hidden",
				isImage ? "size-12" : "px-2 py-1 max-w-[140px]",
			)}
		>
			{isImage ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={attachment.url}
					alt={attachment.filename ?? "attachment"}
					className="size-full object-cover"
				/>
			) : (
				<>
					<FileText className="size-3 shrink-0 text-fg-faint" />
					<span className="text-xs text-fg-secondary truncate">
						{attachment.filename ?? "file"}
					</span>
				</>
			)}
			<button
				type="button"
				aria-label="Remove attachment"
				onClick={onRemove}
				className={cn(
					"absolute top-0.5 right-0.5 size-4 flex items-center justify-center",
					"rounded-full bg-black/60 text-white/60",
					"opacity-0 group-hover:opacity-100 transition-opacity",
					"hover:text-white cursor-pointer",
				)}
			>
				<X className="size-2.5" />
			</button>
		</div>
	)
}
