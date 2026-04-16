"use client"

import { ChevronUpIcon } from "lucide-react"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { type ReactNode, useRef, useState } from "react"
import { motion } from "motion/react"
import { SendButton, StopButton } from "./actions"

interface ChatInputProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onSend: () => void
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
}

export default function ChatInput({
	value,
	onChange,
	onSend,
	onStop,
	onKeyDown,
	isResponding = false,
	activeStatus,
	chainOfThoughtComponent,
	onExpandedChange,
	stackedToolbar,
	showStatusStrip = true,
}: ChatInputProps) {
	const [isMultiline, setIsMultiline] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

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
								? "max-h-[60vh] opacity-100 overflow-y-auto pt-1.5 pb-2 rounded-t-xl px-4"
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
				<div className="flex flex-col gap-2 rounded-xl border border-[#52596633] bg-[#070E1B] p-2 transition-all duration-200 focus-within:outline-1 focus-within:outline-[#525D6EB2]">
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={onKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 transition-all duration-200 placeholder:text-[#525D6E] focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
						disabled={isResponding}
					/>
					<div className="flex items-center gap-2">
						<div className="flex min-w-0 flex-1 items-center gap-2">
							{stackedToolbar}
						</div>
						<div className="shrink-0">
							{isResponding ? (
								<StopButton onClick={onStop} />
							) : (
								<SendButton onClick={onSend} disabled={!value.trim()} />
							)}
						</div>
					</div>
				</div>
			) : (
				<div
					className={cn(
						"flex items-end gap-2 rounded-xl border border-[#52596633] bg-[#070E1B] p-2 transition-all duration-200 focus-within:outline-1 focus-within:outline-[#525D6EB2]",
						isMultiline && "flex-col",
					)}
				>
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={onKeyDown}
						placeholder="Ask your supermemory..."
						className="w-full resize-none overflow-y-auto bg-transparent p-2 transition-all duration-200 placeholder:text-[#525D6E] focus:outline-none"
						style={{ minHeight: "36px" }}
						rows={1}
						disabled={isResponding}
					/>
					<div className="transition-all duration-200">
						{isResponding ? (
							<StopButton onClick={onStop} />
						) : (
							<SendButton onClick={onSend} disabled={!value.trim()} />
						)}
					</div>
				</div>
			)}
		</motion.div>
	)
}
