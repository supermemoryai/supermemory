"use client"

import { BrainIcon, ChevronUpIcon, ZapIcon } from "lucide-react"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { SendButton, StopButton } from "./actions"
import {
	type ModelId,
	modelNames,
	type ReasoningEffort,
} from "@/lib/models"

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
	/** Nova status row + chain-of-thought toggle (off for e.g. home composer) */
	showStatusStrip?: boolean
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
	showStatusStrip = true,
}: ChatInputProps) {
	const [isMultiline, setIsMultiline] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const isSendDisabled = !value.trim() || sendDisabled
	const hasQueuedPreview = queuedMessages.length > 0
	const resolvedSendDisabledTooltip =
		sendDisabled && value.trim()
			? sendDisabledTooltip
			: "Type a message to send"

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
					{hasQueuedPreview && (
						<div className="flex flex-col gap-1 px-3 pr-4 pb-3">
							<AnimatePresence initial={false}>
								{queuedMessages.map((queued) => {
									const model = modelNames[queued.model]
									const ReasoningIcon =
										queued.reasoningEffort === "thinking"
											? BrainIcon
											: ZapIcon
									const reasoningLabel =
										queued.reasoningEffort === "thinking"
											? "Thinking"
											: "Instant"
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
													<span className="truncate">{reasoningLabel}</span>
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
				<div className="relative z-30 flex flex-col gap-2 rounded-xl bg-surface-card/60 backdrop-blur-md p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] transition-all duration-200 focus-within:ring-1 focus-within:ring-fg-primary/10">
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
						<div className="flex min-w-0 flex-1 items-center gap-2">
							{stackedToolbar}
						</div>
						<div className="flex shrink-0 items-center gap-1.5">
							{isResponding && <StopButton onClick={onStop} />}
							{(!isResponding || value.trim()) && (
								<SendButton
									onClick={onSend}
									disabled={isSendDisabled}
									disabledTooltip={resolvedSendDisabledTooltip}
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
					<div className="flex items-center gap-1.5 transition-all duration-200">
						{isResponding && <StopButton onClick={onStop} />}
						{(!isResponding || value.trim()) && (
							<SendButton
								onClick={onSend}
								disabled={isSendDisabled}
								disabledTooltip={resolvedSendDisabledTooltip}
							/>
						)}
					</div>
				</div>
			)}
		</motion.div>
	)
}
