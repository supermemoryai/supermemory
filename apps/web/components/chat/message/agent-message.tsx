"use client"

import { useState } from "react"
import type { UIMessage } from "@ai-sdk/react"
import { Streamdown } from "streamdown"
import {
	BookOpenIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ClockIcon,
	GlobeIcon,
	ListIcon,
	Loader2,
	PlusIcon,
	SearchIcon,
	TerminalIcon,
	WrenchIcon,
	XCircleIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { isWebSearchToolName } from "@/lib/chat-web-search-tools"
import { RelatedMemories } from "./related-memories"
import { MessageActions } from "./message-actions"

const TOOL_META: Record<string, { label: string; icon: typeof SearchIcon }> = {
	bash: { label: "Memory", icon: TerminalIcon },
	web_search: { label: "Web search", icon: GlobeIcon },
	google_search: { label: "Google search", icon: GlobeIcon },
	// legacy tool names kept for existing persisted messages
	searchMemories: { label: "Search Memories", icon: SearchIcon },
	addMemory: { label: "Add Memory", icon: PlusIcon },
	fetchMemory: { label: "Fetch Memory", icon: BookOpenIcon },
	scheduleTask: { label: "Schedule Task", icon: ClockIcon },
	listSchedules: { label: "List Schedules", icon: ListIcon },
	cancelSchedule: { label: "Cancel Schedule", icon: XCircleIcon },
}

type ToolCallDisplayPart = {
	type: string
	state: string
	input?: unknown
	output?: unknown
	toolCallId?: string
	errorText?: string
}

type SourceUrlPart = {
	type: "source-url"
	sourceId: string
	url: string
	title?: string
}

function WebSourcesGroup({ sources }: { sources: SourceUrlPart[] }) {
	const [expanded, setExpanded] = useState(false)
	if (sources.length === 0) return null

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
				<GlobeIcon className="size-3 shrink-0 text-emerald-400" />
				<span className="font-medium text-emerald-400">
					Web sources
					<span className="text-white/40 font-normal ml-1">
						({sources.length})
					</span>
				</span>
				{expanded ? (
					<ChevronDownIcon className="size-3 text-white/30 shrink-0 ml-auto" />
				) : (
					<ChevronRightIcon className="size-3 text-white/30 shrink-0 ml-auto" />
				)}
			</button>
			{expanded && (
				<ul className="px-3 py-2 space-y-1.5 list-none">
					{sources.map((s) => (
						<li key={s.sourceId}>
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-400 hover:underline break-all"
							>
								{s.title?.trim() || s.url}
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

function BashToolDisplay({ part }: { part: ToolCallDisplayPart }) {
	const [expanded, setExpanded] = useState(false)
	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isDone = part.state === "output-available"
	const isError = part.state === "error" || part.state === "output-error"

	const cmd =
		part.input && typeof part.input === "object" && "cmd" in part.input
			? String((part.input as { cmd: string }).cmd)
			: undefined

	const output =
		isDone && part.output && typeof part.output === "object"
			? (part.output as { stdout?: string; stderr?: string; exitCode?: number })
			: undefined

	const hasOutput =
		output &&
		((output.stdout && output.stdout.length > 0) ||
			(output.stderr && output.stderr.length > 0))
	const errorText = part.errorText
	const hasExpandable = hasOutput || (isError && errorText)

	return (
		<div className="rounded-lg border border-[#1E2128] bg-[#0D121A] text-xs my-1 overflow-hidden font-mono">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn(
					"flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:bg-[#141922] transition-colors",
					expanded && hasExpandable && "border-b border-[#1E2128]",
				)}
			>
				{isLoading ? (
					<Loader2 className="size-3 animate-spin text-blue-400 shrink-0" />
				) : (
					<TerminalIcon
						className={cn(
							"size-3 shrink-0",
							isDone
								? output?.exitCode === 0
									? "text-emerald-400"
									: "text-amber-400"
								: isError
									? "text-red-400"
									: "text-white/50",
						)}
					/>
				)}
				<span className={cn("text-white/50", isLoading && "text-blue-400/60")}>
					$
				</span>
				<span
					className={cn(
						"flex-1 text-left truncate",
						isDone
							? output?.exitCode === 0
								? "text-emerald-300"
								: "text-amber-300"
							: isLoading
								? "text-blue-300"
								: isError
									? "text-red-300"
									: "text-white/70",
					)}
				>
					{cmd ?? "..."}
				</span>
				{isLoading && (
					<span className="text-white/30 shrink-0">running...</span>
				)}
				{isDone && !hasOutput && (
					<span className="text-white/30 shrink-0">done</span>
				)}
				{isError && <span className="text-red-400/60 shrink-0">error</span>}
				{hasExpandable &&
					(expanded ? (
						<ChevronDownIcon className="size-3 text-white/30 shrink-0" />
					) : (
						<ChevronRightIcon className="size-3 text-white/30 shrink-0" />
					))}
			</button>

			{expanded && (hasOutput || (isError && errorText)) && (
				<div className="px-3 py-2 space-y-1">
					{output?.stdout && output.stdout.length > 0 && (
						<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{output.stdout}
						</pre>
					)}
					{output?.stderr && output.stderr.length > 0 && (
						<pre className="text-amber-300/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{output.stderr}
						</pre>
					)}
					{isError && errorText && (
						<pre className="text-red-300/90 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{errorText}
						</pre>
					)}
				</div>
			)}
		</div>
	)
}

function ToolCallDisplay({ part }: { part: ToolCallDisplayPart }) {
	const [expanded, setExpanded] = useState(false)
	const toolName = part.type.replace("tool-", "")
	if (toolName === "bash") {
		return <BashToolDisplay part={part} />
	}
	const meta =
		TOOL_META[toolName] ??
		(isWebSearchToolName(toolName)
			? { label: "Web search", icon: GlobeIcon }
			: undefined)
	const Icon = meta?.icon ?? WrenchIcon
	const label = meta?.label ?? toolName

	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isDone = part.state === "output-available"
	const isError = part.state === "error" || part.state === "output-error"
	const errorText = part.errorText

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
					{isError && errorText && (
						<div>
							<div className="text-red-400/80 mb-1">Error</div>
							<pre className="text-red-300/90 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap break-all text-xs">
								{errorText}
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
						if (part.type === "source-url") {
							if (
								partIndex > 0 &&
								message.parts[partIndex - 1]?.type === "source-url"
							) {
								return null
							}
							const sources: SourceUrlPart[] = []
							for (let j = partIndex; j < message.parts.length; j++) {
								const p = message.parts[j]
								if (!p || p.type !== "source-url") break
								sources.push(p as SourceUrlPart)
							}
							return (
								<WebSourcesGroup
									key={`${message.id}-web-sources-${partIndex}`}
									sources={sources}
								/>
							)
						}
						if (part.type === "source-document") {
							const doc = part as {
								type: "source-document"
								sourceId: string
								title: string
								filename?: string
							}
							return (
								<div
									key={`${message.id}-doc-${doc.sourceId}-${partIndex}`}
									className="rounded-lg border border-[#1E2128] bg-[#0D121A] px-3 py-2 text-xs my-1"
								>
									<div className="text-white/40 mb-0.5">Document</div>
									<div className="text-white/80">{doc.title}</div>
									{doc.filename && (
										<div className="text-white/50 text-[11px] mt-0.5">
											{doc.filename}
										</div>
									)}
								</div>
							)
						}
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
						if (part.type === "dynamic-tool") {
							const dt = part as {
								type: "dynamic-tool"
								toolName: string
								toolCallId: string
								state: string
								input?: unknown
								output?: unknown
								errorText?: string
							}
							const displayState =
								dt.state === "output-error" ? "error" : dt.state
							return (
								<ToolCallDisplay
									key={`${message.id}-${dt.toolCallId}-${partIndex}`}
									part={{
										type: `tool-${dt.toolName}`,
										state: displayState,
										input: dt.input,
										output:
											dt.state === "output-available" ? dt.output : undefined,
										toolCallId: dt.toolCallId,
										errorText: dt.errorText,
									}}
								/>
							)
						}
						if (part.type.startsWith("tool-")) {
							return (
								<ToolCallDisplay
									key={`${message.id}-${partIndex}`}
									part={part as ToolCallDisplayPart}
								/>
							)
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
