import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@lib/utils"

interface MessageActionsProps {
	messageId: string
	messageText: string
	isLastMessage: boolean
	isHovered: boolean
	copiedMessageId: string | null
	messageFeedback: Record<string, "like" | "dislike" | null>
	onCopy: (messageId: string, text: string) => void
	onLike: (messageId: string) => void
	onDislike: (messageId: string) => void
}

export function MessageActions({
	messageId,
	messageText,
	isLastMessage,
	isHovered,
	copiedMessageId,
	messageFeedback,
	onCopy,
	onLike,
	onDislike,
}: MessageActionsProps) {
	const shouldShowActions = isHovered || isLastMessage

	return (
		<div
			className={cn(
				"flex items-center gap-1 transition-opacity duration-200",
				shouldShowActions ? "opacity-100" : "opacity-0",
			)}
		>
			<button
				type="button"
				onClick={() => onCopy(messageId, messageText)}
				className="p-1.5 hover:bg-white/10 rounded transition-colors"
				title="Copy message"
			>
				{copiedMessageId === messageId ? (
					<Check className="size-3.5 text-green-400" />
				) : (
					<Copy className="size-3.5 text-white/50 hover:text-white/80" />
				)}
			</button>
			<button
				type="button"
				onClick={() => onLike(messageId)}
				className="p-1.5 hover:bg-white/10 rounded transition-colors"
				title="Like message"
			>
				<ThumbsUp
					className={cn(
						"size-3.5 transition-colors",
						messageFeedback[messageId] === "like"
							? "text-green-400 fill-green-400"
							: "text-white/50 hover:text-white/80",
					)}
				/>
			</button>
			<button
				type="button"
				onClick={() => onDislike(messageId)}
				className="p-1.5 hover:bg-white/10 rounded transition-colors"
				title="Dislike message"
			>
				<ThumbsDown
					className={cn(
						"size-3.5 transition-colors",
						messageFeedback[messageId] === "dislike"
							? "text-red-400 fill-red-400"
							: "text-white/50 hover:text-white/80",
					)}
				/>
			</button>
		</div>
	)
}
