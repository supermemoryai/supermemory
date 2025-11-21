"use client"

import { ArrowUpIcon, ChevronUpIcon, SquareIcon } from "lucide-react"
import NovaOrb from "../nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import { useRef, useState } from "react"

interface ChatInputProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onSend: () => void
	onStop: () => void
	onKeyDown?: (e: React.KeyboardEvent) => void
	isResponding?: boolean
}

export default function ChatInput({
	value,
	onChange,
	onSend,
	onStop,
	onKeyDown,
	isResponding = false,
}: ChatInputProps) {
	const [isMultiline, setIsMultiline] = useState(false)
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
		<div className="bg-[#01173C] rounded-xl">
			<div className=" p-3 pr-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<NovaOrb size={24} className="!blur-none z-10" />
					<p className={cn("text-[#525D6E]", dmSansClassName())}>
						Waiting for input...
					</p>
				</div>
				<ChevronUpIcon className="size-4 text-[#525D6E]" />
			</div>
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
		</div>
	)
}

function SendButton({
	onClick,
	disabled,
}: {
	onClick: () => void
	disabled: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"bg-[#000000] border-[#161F2C] border p-2 rounded-lg flex-shrink-0 transition-opacity",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "cursor-pointer hover:bg-[#161F2C]",
			)}
		>
			<ArrowUpIcon className="size-5 text-white" />
		</button>
	)
}

function StopButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="bg-[#000000] border-[#161F2C] border p-2 rounded-lg flex-shrink-0 cursor-pointer hover:bg-[#161F2C] transition-opacity"
		>
			<SquareIcon className="size-4 text-white fill-white" />
		</button>
	)
}
