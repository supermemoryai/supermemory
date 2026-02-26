"use client"

import { useState } from "react"
import type { UIMessage } from "@ai-sdk/react"
import { Streamdown } from "streamdown"
import {
	ChevronDownIcon,
	ChevronRightIcon,
	Loader2,
	SearchIcon,
	PlusIcon,
	BookOpenIcon,
	ClockIcon,
	ListIcon,
	XCircleIcon,
	WrenchIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { RelatedMemories } from "./related-memories"
import { MessageActions } from "./message-actions"
import { FollowUpQuestions } from "./follow-up-questions"

const TOOL_META: Record<string, { label: string; icon: typeof SearchIcon }> = {
	searchMemories: { label: "Search Memories", icon: SearchIcon },
	addMemory: { label: "Add Memory", icon: PlusIcon },
	fetchMemory: { label: "Fetch Memory", icon: BookOpenIcon },
	scheduleTask: { label: "Schedule Task", icon: ClockIcon },
	listSchedules: { label: "List Schedules", icon: ListIcon },
	cancelSchedule: { label: "Cancel Schedule", icon: XCircleIcon },
}

function ToolCallDisplay({
	part,
}: {
	part: {
		type: string
		state: string
		input?: unknown
		output?: unknown
		toolCallId?: string
	}
}) {
	const [expanded, setExpanded] = useState(false)
	const toolName = part.type.replace("tool-", "")
	const meta = TOOL_META[toolName]
	const Icon = meta?.icon ?? WrenchIcon
	const label = meta?.label ?? toolName

	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isDone = part.state === "output-available"
	const isError = part.state === "error"

	return (
		<div className="rounded-lg border border-[#1E2128] bg-[#0D121A] text-xs my-1 overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn(
					"flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:bg-[#141922] transition-colors",
					expanded && "border-b border-[#1E2128]",
				)}
			>
				{isLoading ? (
					<Loader2 className="size-3 animate-spin text-blue-400 shrink-0" />
				) : (
					<Icon
						className={cn(
							"size-3 shrink-0",
							isDone
								? "text-emerald-400"
								: isError
									? "text-red-400"
									: "text-white/50",
						)}
					/>
				)}
				<span
					className={cn(
						"font-medium",
						isDone
							? "text-emerald-400"
							: isError
								? "text-red-400"
								: "text-blue-400",
					)}
				>
					{label}
				</span>
				{isLoading && <span className="text-white/40 ml-auto">running...</span>}
				{isDone && <span className="text-white/40 ml-auto">done</span>}
				{isError && <span className="text-red-400/60 ml-auto">error</span>}
				{expanded ? (
					<ChevronDownIcon className="size-3 text-white/30 shrink-0" />
				) : (
					<ChevronRightIcon className="size-3 text-white/30 shrink-0" />
				)}
			</button>

			{expanded && (
				<div className="px-3 py-2 space-y-2">
					{part.input !== undefined && (
						<div>
							<div className="text-white/40 mb-1">Input</div>
							<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
								{typeof part.input === "string"
									? part.input
									: JSON.stringify(part.input, null, 2)}
							</pre>
						</div>
					)}
					{isDone && part.output !== undefined && (
						<div>
							<div className="text-white/40 mb-1">Output</div>
							<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
								{typeof part.output === "string"
									? part.output
									: JSON.stringify(part.output, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

interface AgentMessageProps {
	message: UIMessage
	index: number
	messagesLength: number
	hoveredMessageId: string | null
	copiedMessageId: string | null
	messageFeedback: Record<string, "like" | "dislike" | null>
	expandedMemories: string | null
	followUpQuestions?: string[]
	isLoadingFollowUps?: boolean
	onCopy: (messageId: string, text: string) => void
	onLike: (messageId: string) => void
	onDislike: (messageId: string) => void
	onToggleMemories: (messageId: string) => void
	onQuestionClick?: (question: string) => void
}

export function AgentMessage({
	message,
	index,
	messagesLength,
	hoveredMessageId,
	copiedMessageId,
	messageFeedback,
	expandedMemories,
	followUpQuestions = [],
	isLoadingFollowUps = false,
	onCopy,
	onLike,
	onDislike,
	onToggleMemories,
	onQuestionClick,
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
									className="text-sm text-white/90 chat-markdown-content"
								>
									<Streamdown>{part.text}</Streamdown>
								</div>
							)
						}
						if (part.type.startsWith("tool-")) {
							return (
								<ToolCallDisplay
									key={`${message.id}-${partIndex}`}
									part={part as any}
								/>
							)
						}
						return null
					})}
					<FollowUpQuestions
						questions={followUpQuestions}
						isLoading={isLoadingFollowUps}
						onQuestionClick={onQuestionClick || (() => {})}
					/>
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
