"use client"

import { MessageCircleIcon, TelescopeIcon } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"

export type NovaChatMode = "chat" | "research"

export function ResearchModeSelector({
	value,
	onChange,
	disabled = false,
}: {
	value: NovaChatMode
	onChange: (value: NovaChatMode) => void
	disabled?: boolean
}) {
	const isResearch = value === "research"
	const Icon = isResearch ? TelescopeIcon : MessageCircleIcon
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => onChange(isResearch ? "chat" : "research")}
			className={cn(
				"group flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50",
				isResearch ? "text-[#8DBDFF]" : "text-white/80",
				dmSansClassName(),
			)}
			title={
				isResearch
					? "Research mode: durable multi-step investigation"
					: "Chat mode: quick conversational answer"
			}
			aria-label={`Mode: ${isResearch ? "Research" : "Chat"}. Click to switch.`}
		>
			<Icon
				className={cn(
					"size-3.5",
					isResearch
						? "text-[#8DBDFF]"
						: "text-white/45 group-hover:text-white/70",
				)}
			/>
			<span>{isResearch ? "Research" : "Chat"}</span>
		</button>
	)
}
