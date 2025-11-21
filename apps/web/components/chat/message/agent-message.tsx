"use client"

import type { UIMessage } from "@ai-sdk/react"
import { Streamdown } from "streamdown"
import { RelatedMemories } from "./related-memories"
import { MessageActions } from "./message-actions"

interface AgentMessageProps {
	message: UIMessage
	index: number
	messagesLength: number
	hoveredMessageId: string | null
	copiedMessageId: string | null
	messageFeedback: Record<string, "like" | "dislike" | null>
	expandedMemories: string | null
	onCopy: (messageId: string, text: string) => void
	onLike: (messageId: string) => void
	onDislike: (messageId: string) => void
	onToggleMemories: (messageId: string) => void
}

export function AgentMessage({
	message,
	index,
	messagesLength,
	hoveredMessageId,
	copiedMessageId,
	messageFeedback,
	expandedMemories,
	onCopy,
	onLike,
	onDislike,
	onToggleMemories,
}: AgentMessageProps) {
	const isLastAgentMessage =
		index === messagesLength - 1 && message.role === "assistant"
	const isHovered = hoveredMessageId === message.id
	const messageText = message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join(" ")

	return (
		<div className="flex flex-col gap-1 w-full">
			<div className="flex gap-2">
				<div className="flex flex-col gap-2 w-full">
					<RelatedMemories
						message={message}
						expandedMemories={expandedMemories}
						onToggle={onToggleMemories}
					/>

					{message.parts.map((part, partIndex) => {
						if (part.type === "text") {
							return (
								<div
									key={`${message.id}-${partIndex}`}
									className="text-sm text-white/90"
								>
									<Streamdown>{part.text}</Streamdown>
								</div>
							)
						}
						if (part.type === "tool-searchMemories") {
							if (
								part.state === "input-available" ||
								part.state === "input-streaming"
							) {
								return (
									<div
										key={`${message.id}-${partIndex}`}
										className="text-xs text-white/50 italic"
									>
										Searching memories...
									</div>
								)
							}
						}
						return null
					})}
				</div>
			</div>
			<MessageActions
				messageId={message.id}
				messageText={messageText}
				isLastMessage={isLastAgentMessage}
				isHovered={isHovered}
				copiedMessageId={copiedMessageId}
				messageFeedback={messageFeedback}
				onCopy={onCopy}
				onLike={onLike}
				onDislike={onDislike}
			/>
		</div>
	)
}
