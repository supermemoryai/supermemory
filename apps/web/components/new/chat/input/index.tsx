"use client"

import { ChevronUpIcon } from "lucide-react"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import { useRef, useState } from "react"
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
				padding: isExpanded ? "16px" : "0",
				margin: isExpanded ? "0" : "16px",
				borderRadius: isExpanded ? "0 0 12px 12px" : "12px",
				backgroundColor: isExpanded ? "#000B1B" : "#01173C",
			}}
			transition={{
				duration: 0.3,
				ease: "easeOut",
			}}
		>
			<div
				className={cn(
					"absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-300 ease-out bg-[#000B1B]",
					isExpanded
						? "max-h-[80vh] opacity-100 overflow-y-auto pt-1.5 pb-2 rounded-t-xl px-4"
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
			<div
				className={cn(
					"flex items-end gap-2 bg-[#070E1B] rounded-xl p-2 border-[#52596633] border focus-within:outline-[#525D6EB2] focus-within:outline-1 transition-all duration-200",
					isMultiline && "flex-col",
				)}
			>
				<textarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={onKeyDown}
					placeholder="Ask your supermemory..."
					className="bg-transparent w-full p-2 placeholder:text-[#525D6E] focus:outline-none resize-none overflow-y-auto transition-all duration-200"
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
		</motion.div>
	)
}
