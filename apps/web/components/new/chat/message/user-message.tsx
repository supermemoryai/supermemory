"use client"

import { Copy, Check } from "lucide-react"
import type { AgentMessage } from "@/lib/agent/types"

interface UserMessageProps {
	message: AgentMessage
	copiedMessageId: string | null
	onCopy: (messageId: string, text: string) => void
}

export function UserMessage({
	message,
	copiedMessageId,
	onCopy,
}: UserMessageProps) {
	const text = message.parts
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join(" ")

	return (
		<div className="flex flex-col items-end w-full">
			<div className="bg-[#1B1F24] rounded-[12px] p-3 px-[14px] max-w-[80%]">
				<p className="text-sm text-white">{text}</p>
			</div>
			<button
				type="button"
				onClick={() => onCopy(message.id, text)}
				className="p-1.5 hover:bg-[#293952]/40 rounded transition-colors mt-1"
				title="Copy message"
			>
				{copiedMessageId === message.id ? (
					<Check className="size-3.5 text-green-400" />
				) : (
					<Copy className="size-3.5 text-white/50" />
				)}
			</button>
		</div>
	)
}
