"use client"

import {
	BrainIcon,
	CheckIcon,
	ChevronUpIcon,
	Loader2Icon,
	PaperclipIcon,
	RotateCcwIcon,
	XIcon,
	ZapIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import NovaOrb from "@/components/nova/nova-orb"
import { SuperLoader } from "@/components/superloader"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { SendButton, StopButton } from "./actions"
import {
	CHAT_ATTACHMENT_ACCEPT,
	type ChatAttachmentDraft,
	formatAttachmentSize,
} from "../attachments"
import { type ModelId, modelNames, type ReasoningEffort } from "@/lib/models"

export interface QueuedChatMessagePreview {
	id: string
	text: string
	model: ModelId
	reasoningEffort: ReasoningEffort
}

interface ChatInputProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onSend: () => void
	onStop: () => void
	onKeyDown?: (e: React.KeyboardEvent) => void
	isResponding?: boolean
	sendDisabled?: boolean
	sendDisabledTooltip?: string
	activeStatus?: string
	queuedMessages?: QueuedChatMessagePreview[]
	chainOfThoughtComponent?: React.ReactNode
	onExpandedChange?: (expanded: boolean) => void
	/** Model + space controls on one row with send; textarea full-width above */
	stackedToolbar?: ReactNode
	/** Trailing controls rendered after the attach button (e.g. reasoning) */
	toolbarTrailing?: ReactNode
	/** Controls rendered just left of the send button (e.g. space selector) */
	toolbarEnd?: ReactNode
	/** Nova status row + chain-of-thought toggle (off for e.g. home composer) */
	showStatusStrip?: boolean
	attachments?: ChatAttachmentDraft[]
	onAddAttachmentFiles?: (files: FileList | File[]) => void
	onRemoveAttachment?: (id: string) => void
	onRetryAttachment?: (id: string) => void
	canSend?: boolean
	attachmentAccept?: string
}

export default function ChatInput({
	value,
	onChange,
	onSend,
	onStop,
	onKeyDown,
	isResponding = false,
	sendDisabled = false,
	sendDisabledTooltip,
	activeStatus,
	queuedMessages = [],
	chainOfThoughtComponent,
	onExpandedChange,
	stackedToolbar,
	toolbarTrailing,
	toolbarEnd,
	showStatusStrip = true,
	attachments = [],
	onAddAttachmentFiles,
	onRemoveAttachment,
	onRetryAttachment,
	canSend,
	attachmentAccept = CHAT_ATTACHMENT_ACCEPT,
}: ChatInputProps) {
	const [isMultiline, setIsMultiline] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)
	const [isDraggingFiles, setIsDraggingFiles] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const dragDepthRef = useRef(0)
	const canSubmit = canSend ?? value.trim().length > 0
	const isSendDisabled = !canSubmit || sendDisabled
	const hasQueuedPreview = queuedMessages.length > 0
	const resolvedSendDisabledTooltip =
		sendDisabled && canSubmit ? sendDisabledTooltip : "Type a message to send"

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

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files?.length) onAddAttachmentFiles?.(files)
		e.target.value = ""
	}

	const canAttachFiles = Boolean(onAddAttachmentFiles) && !isResponding
	const hasDraggedFiles = (e: React.DragEvent) =>
		Array.from(e.dataTransfer.types).includes("Files")

	const handleDragEnter = (e: React.DragEvent) => {
		if (!hasDraggedFiles(e)) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current += 1
		if (canAttachFiles) setIsDraggingFiles(true)
	}

	const handleDragOver = (e: React.DragEvent) => {
		if (!hasDraggedFiles(e)) return
		e.preventDefault()
		e.stopPropagation()
		e.dataTransfer.dropEffect = canAttachFiles ? "copy" : "none"
	}

	const handleDragLeave = (e: React.DragEvent) => {
		if (!hasDraggedFiles(e)) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
		if (dragDepthRef.current === 0) setIsDraggingFiles(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		if (!hasDraggedFiles(e)) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current = 0
		setIsDraggingFiles(false)
		const files = e.dataTransfer.files
		if (canAttachFiles && files.length) onAddAttachmentFiles?.(files)
	}

	const showAttachments = attachments.length > 0

	const attachmentTray = showAttachments ? (
		<div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto px-0 pb-1 sm:px-1">
			{attachments.map((attachment) => {
				return (
					<AttachmentPreviewChip
						key={attachment.id}
						attachment={attachment}
						onRemove={onRemoveAttachment}
						onRetry={onRetryAttachment}
					/>
				)
			})}
		</div>
	) : null

	const attachmentButton = onAddAttachmentFiles ? (
		<>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept={attachmentAccept}
				onChange={handleFileSelect}
				className="hidden"
			/>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				disabled={isResponding}
				className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label="Attach files"
				title="Attach files"
			>
				<PaperclipIcon className="size-4" />
			</button>
		</>
	) : null

	const dropOverlay = isDraggingFiles ? (
		<div className="pointer-events-none absolute inset-1 z-10 grid place-items-center rounded-lg border border-dashed border-[#4B5563] bg-black/70 text-sm font-medium text-fg-primary backdrop-blur-sm">
			Drop files to attach
		</div>
	) : null

	return (
		<motion.div
			className={cn("relative z-20!")}
			animate={{
				padding: showStatusStrip ? (isExpanded ? "16px" : "0") : "0",
				margin: "0",
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
							"w-full p-3 pr-4 flex items-center justify-between cursor-pointer bg-transparent border-0 text-left transition-[padding] duration-200",
							hasQueuedPreview && "pb-1.5",
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
							{isResponding ? (
								<SuperLoader label={activeStatus || "Thinking…"} />
							) : (
								<>
									<NovaOrb size={24} className="blur-[1px]! z-10" />
									<p className={cn("text-[#525D6E]", dmSansClassName())}>
										{activeStatus || "Waiting for input..."}
									</p>
								</>
							)}
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
					{hasQueuedPreview && (
						<div className="flex flex-col gap-1 px-3 pr-4 pb-3">
							<AnimatePresence initial={false}>
								{queuedMessages.map((queued) => {
									const model = modelNames[queued.model]
									const ReasoningIcon =
										queued.reasoningEffort === "thinking" ? BrainIcon : ZapIcon
									return (
										<motion.div
											key={queued.id}
											layout
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2, ease: "easeOut" }}
											className="overflow-hidden"
										>
											<div className="flex min-w-0 items-center gap-2 px-2.5 py-1">
												<span
													className={cn(
														"min-w-0 flex-1 truncate text-xs text-white/35",
														dmSansClassName(),
													)}
												>
													{queued.text}
												</span>
												<span
													className={cn(
														"flex shrink-0 items-center gap-1.5 text-[10px] text-white/28",
														dmSansClassName(),
													)}
												>
													<span className="truncate">
														{model.name} {model.version}
													</span>
													<span className="text-white/18">·</span>
													<ReasoningIcon className="size-3 shrink-0 text-white/30" />
												</span>
											</div>
										</motion.div>
									)
								})}
							</AnimatePresence>
						</div>
					)}
				</>
			) : null}
			{stackedToolbar ? (
				<fieldset
					aria-label="Chat input with file drop zone"
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className="relative z-30 m-0 flex min-w-0 flex-col gap-2 rounded-xl border-0 bg-surface-card/60 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] backdrop-blur-md transition-all duration-200 focus-within:ring-1 focus-within:ring-fg-primary/10"
				>
					{dropOverlay}
					{attachmentTray}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={onKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 text-fg-primary transition-all duration-200 placeholder:text-fg-faint focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
					/>
					<div className="flex items-center gap-2">
						<div className="flex min-w-0 flex-1 items-center gap-1.5">
							{stackedToolbar}
							{attachmentButton}
							{toolbarTrailing}
						</div>
						<div className="flex shrink-0 items-center gap-1.5">
							{toolbarEnd}
							{isResponding && <StopButton onClick={onStop} />}
							{(!isResponding || canSubmit) && (
								<SendButton
									onClick={onSend}
									disabled={isSendDisabled}
									disabledTooltip={resolvedSendDisabledTooltip}
								/>
							)}
						</div>
					</div>
				</fieldset>
			) : (
				<fieldset
					aria-label="Chat input with file drop zone"
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={cn(
						"relative m-0 flex min-w-0 flex-col gap-2 rounded-xl border-0 bg-surface-card/60 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] backdrop-blur-md transition-all duration-200 focus-within:ring-1 focus-within:ring-fg-primary/10",
						isMultiline && "flex-col",
					)}
				>
					{dropOverlay}
					{attachmentTray}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={onKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 text-fg-primary transition-all duration-200 placeholder:text-fg-faint focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
					/>
					<div className="flex w-full items-center justify-end gap-2 transition-all duration-200">
						{attachmentButton}
						{isResponding && <StopButton onClick={onStop} />}
						{(!isResponding || canSubmit) && (
							<SendButton
								onClick={onSend}
								disabled={isSendDisabled}
								disabledTooltip={resolvedSendDisabledTooltip}
							/>
						)}
					</div>
				</fieldset>
			)}
		</motion.div>
	)
}

function AttachmentPreviewChip({
	attachment,
	onRemove,
	onRetry,
}: {
	attachment: ChatAttachmentDraft
	onRemove?: (id: string) => void
	onRetry?: (id: string) => void
}) {
	const [objectUrl, setObjectUrl] = useState<string | null>(null)
	const [isPreviewOpen, setIsPreviewOpen] = useState(false)
	const isUploading = attachment.status === "uploading"
	const isUploaded = attachment.status === "uploaded"
	const isError = attachment.status === "error"
	const isImage = attachment.file.type.startsWith("image/")
	const extension = getAttachmentExtension(attachment.file)

	useEffect(() => {
		if (!isImage) {
			setObjectUrl(null)
			return
		}

		const url = URL.createObjectURL(attachment.file)
		setObjectUrl(url)
		return () => URL.revokeObjectURL(url)
	}, [attachment.file, isImage])

	const statusLabel = isError
		? attachment.errorMessage || "Upload failed"
		: isUploading
			? "Uploading..."
			: isUploaded
				? "Uploaded"
				: formatAttachmentSize(attachment.file.size)

	return (
		<>
			<div
				className={cn(
					"group relative flex h-11 w-[min(280px,calc(100vw-4.5rem))] shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-[#1A1D22] bg-[#050607] px-2 text-sm text-fg-primary shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition-colors hover:border-[#30343B] hover:bg-[#080A0D] focus-within:border-[#30343B] sm:w-auto sm:min-w-[220px] sm:max-w-[300px] sm:hover:border-[#2261CA66] sm:hover:bg-[#041127] sm:focus-within:border-[#2261CA66] sm:focus-within:bg-[#041127]",
					isImage && objectUrl && "cursor-pointer",
					isError && "border-red-400/40 bg-red-950/20 hover:border-red-400/50",
				)}
				title={statusLabel}
			>
				<button
					type="button"
					onClick={() => isImage && objectUrl && setIsPreviewOpen(true)}
					disabled={!isImage || !objectUrl}
					className={cn(
						"relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#242832] bg-black",
						isImage && objectUrl && "cursor-pointer hover:border-[#4B5563]",
						(!isImage || !objectUrl) && "cursor-default",
					)}
					aria-label={
						isImage ? `Preview ${attachment.file.name}` : attachment.file.name
					}
				>
					{isImage && objectUrl ? (
						<img
							src={objectUrl}
							alt=""
							className="size-full object-cover"
							draggable={false}
						/>
					) : (
						<DocumentFileGlyph label={extension} />
					)}
					{isUploading || isUploaded ? (
						<div className="absolute inset-0 flex items-center justify-center bg-black/60">
							{isUploading ? (
								<Loader2Icon className="size-3.5 animate-spin text-[#C8D1DC]" />
							) : (
								<CheckIcon className="size-3.5 text-emerald-400" />
							)}
						</div>
					) : null}
				</button>
				<div className="min-w-0 flex-1 pr-1">
					<div
						className="truncate font-medium leading-none text-fg-primary"
						title={attachment.file.name}
					>
						{attachment.file.name}
					</div>
					<div className="mt-1 truncate text-[11px] leading-none text-fg-faint">
						{statusLabel}
					</div>
				</div>
				<div className="hidden shrink-0 items-center gap-1 opacity-0 transition-opacity sm:flex sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
					{isError ? (
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation()
								onRetry?.(attachment.id)
							}}
							className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#242832] bg-black text-fg-faint transition-colors hover:border-[#3A4049] hover:bg-[#111418] hover:text-fg-primary"
							aria-label={`Retry ${attachment.file.name}`}
							title={statusLabel}
						>
							<RotateCcwIcon className="size-3.5" />
						</button>
					) : null}
				</div>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation()
						onRemove?.(attachment.id)
					}}
					disabled={isUploading}
					className="flex size-7 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-[#111418] hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-50"
					aria-label={`Remove ${attachment.file.name}`}
				>
					<XIcon className="size-4" />
				</button>
			</div>
			<Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
				<DialogContent
					showCloseButton={false}
					className="w-[calc(100vw-32px)] max-w-none gap-0 overflow-hidden rounded-xl border border-[#1D222A] bg-[#050607] p-0 text-fg-primary shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:w-[min(92vw,980px)] sm:max-w-[980px]"
				>
					<DialogTitle className="sr-only">
						Preview {attachment.file.name}
					</DialogTitle>
					<div className="flex min-h-0 flex-col">
						<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_32px] items-center gap-2 border-[#171B22] border-b px-3 py-2 sm:px-4 sm:py-3">
							<div className="min-w-0">
								<p className="truncate font-medium text-fg-primary text-sm">
									{attachment.file.name}
								</p>
								<p className="mt-0.5 text-[11px] text-fg-faint">
									{formatAttachmentSize(attachment.file.size)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsPreviewOpen(false)}
								className="flex size-8 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-[#111418] hover:text-fg-primary focus:outline-none focus:ring-2 focus:ring-[#3374FF]/40"
							>
								<XIcon className="size-4" />
								<span className="sr-only">Close preview</span>
							</button>
						</div>
						<div className="grid h-[min(58dvh,380px)] place-items-center bg-black px-4 py-5 sm:h-[min(76dvh,680px)] sm:px-6 sm:py-6">
							{objectUrl ? (
								<img
									src={objectUrl}
									alt={attachment.file.name}
									className="block max-h-full max-w-full rounded-lg object-contain"
									draggable={false}
								/>
							) : null}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}

function DocumentFileGlyph({ label }: { label: string }) {
	return (
		<div className="relative flex size-6 items-end justify-center rounded-[4px] border border-[#30343B] bg-[#07090C] pb-1">
			<div className="absolute right-0 top-0 size-2.5 border-[#30343B] border-b border-l bg-black" />
			<span className="max-w-[22px] truncate text-[8px] font-bold uppercase leading-none text-[#AAB2BD]">
				{label}
			</span>
		</div>
	)
}

function getAttachmentExtension(file: File): string {
	const name = file.name
	const dotIndex = name.lastIndexOf(".")
	if (dotIndex > -1 && dotIndex < name.length - 1) {
		const extension = name.slice(dotIndex + 1).toLowerCase()
		if (extension === "md" || extension === "markdown") return "MD"
		if (extension === "pdf") return "PDF"
		return extension.slice(0, 3)
	}
	if (file.type === "text/markdown") return "MD"
	if (file.type.includes("pdf")) return "PDF"
	if (file.type.startsWith("text/")) return "TXT"
	return "FILE"
}
