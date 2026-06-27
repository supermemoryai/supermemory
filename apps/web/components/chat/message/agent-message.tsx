"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import type { UIMessage } from "@ai-sdk/react"
import { useQuery } from "@tanstack/react-query"
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
import {
	buildCitationIndex,
	fetchDocumentsByIds,
	getDocumentSourceUrl,
	mapDocumentsByKnownIds,
	type CitationTarget,
	type DocumentWithMemories,
	extractMemoryToolOutputs,
} from "@/lib/chat-memory-tools"
import {
	parseSourceAnnotatedMarkdown,
	stripSourceMarkup,
} from "@/lib/source-annotations"
import { modelNames, type ModelId } from "@/lib/models"
import { RelatedMemories } from "./related-memories"
import { MessageActions } from "./message-actions"

const TOOL_META: Record<string, { label: string; icon: typeof SearchIcon }> = {
	bash: { label: "Memory", icon: TerminalIcon },
	recallContext: { label: "Recall Memories", icon: BookOpenIcon },
	discoverSpaces: { label: "Discover Spaces", icon: SearchIcon },
	web_search: { label: "Web search", icon: GlobeIcon },
	google_search: { label: "Google search", icon: GlobeIcon },
	// legacy tool names kept for existing persisted messages
	searchMemories: { label: "Search Memories", icon: SearchIcon },
	addMemory: { label: "Add Memory", icon: PlusIcon },
	fetchMemory: { label: "Fetch Memory", icon: BookOpenIcon },
	forgetMemory: { label: "Forget Memory", icon: XCircleIcon },
	updateMemory: { label: "Update Memory", icon: BookOpenIcon },
	forgetDocument: { label: "Forget Document", icon: XCircleIcon },
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

function sourceHost(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "")
	} catch {
		return url
	}
}

function faviconUrl(host: string): string {
	return `https://www.google.com/s2/favicons?sz=64&domain=${host}`
}

function safeExternalUrl(url: string | null | undefined): string | null {
	if (!url) return null
	if (url.startsWith("/") && !url.startsWith("//")) return url
	if (url.startsWith("#") && !url.startsWith("#sm-source:")) return url
	try {
		const parsed = new URL(url)
		return parsed.protocol === "http:" || parsed.protocol === "https:"
			? url
			: null
	} catch {
		return null
	}
}

function isWebSearchPart(part: { type: string; toolName?: string }): boolean {
	if (part.type === "dynamic-tool") {
		return isWebSearchToolName(part.toolName ?? "")
	}
	if (part.type.startsWith("tool-")) {
		return isWebSearchToolName(part.type.slice("tool-".length))
	}
	return false
}

function isMemoryRetrievalToolName(toolName: string): boolean {
	return (
		toolName === "searchMemories" ||
		toolName === "recallContext" ||
		toolName === "discoverSpaces"
	)
}

export function isChatToolDisplayPartType(type: string): boolean {
	return (
		type === "tool-searchMemories" ||
		type === "tool-recallContext" ||
		type === "tool-discoverSpaces" ||
		type === "tool-forgetMemory" ||
		type === "tool-updateMemory" ||
		type === "tool-forgetDocument"
	)
}

function CitationLink({
	href,
	label,
	source,
}: {
	href: string
	label: string
	source?: SourceUrlPart
}) {
	const url = safeExternalUrl(source?.url ?? href) ?? ""
	if (!url) return <>{label}</>
	const host = sourceHost(url)
	const rawTitle = source?.title?.trim()
	const hasTitle =
		!!rawTitle && rawTitle !== host && !/^https?:\/\//i.test(rawTitle)
	let path = ""
	try {
		path = new URL(url).pathname.replace(/\/$/, "")
	} catch {}
	return (
		<span className="group/cite relative inline">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-400 no-underline hover:text-blue-300"
			>
				{label}
			</a>
			<span className="pointer-events-none absolute bottom-full left-1/2 z-[1000] hidden -translate-x-1/2 pb-1.5 group-hover/cite:block">
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="pointer-events-auto block w-64 overflow-hidden rounded-lg border border-white/10 bg-[#0B0F16]/95 p-2.5 no-underline shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
				>
					<span className="flex items-center gap-2">
						<img
							src={faviconUrl(host)}
							alt=""
							className="size-4 shrink-0 rounded bg-white/10"
							loading="lazy"
							referrerPolicy="no-referrer"
						/>
						<span className="truncate text-xs font-medium text-white/85">
							{host}
						</span>
					</span>
					{hasTitle ? (
						<span className="mt-1.5 block line-clamp-2 text-xs leading-snug text-white/60">
							{rawTitle}
						</span>
					) : path ? (
						<span className="mt-1 block truncate text-[11px] text-white/35">
							{path}
						</span>
					) : null}
				</a>
			</span>
		</span>
	)
}

function sourceTitle(
	target: CitationTarget,
	document?: DocumentWithMemories,
): string {
	return (
		document?.title?.trim() ||
		target.title?.trim() ||
		document?.customId ||
		target.customId ||
		target.documentId ||
		target.sourceId
	)
}

function sourceSummary(
	target: CitationTarget,
	document?: DocumentWithMemories,
): string | null {
	const summary =
		document?.summary ||
		target.summary ||
		(document as { content?: string } | undefined)?.content ||
		null
	return summary ? summary.trim() : null
}

function sourceKind(
	target: CitationTarget,
	document?: DocumentWithMemories,
): string {
	return (document?.type || target.type || "memory").replaceAll("_", " ")
}

function SourceCitationLink({
	sourceId,
	children,
	citationIndex,
	documentByKnownId,
}: {
	sourceId: string
	children: ReactNode
	citationIndex: Map<string, CitationTarget>
	documentByKnownId: Map<string, DocumentWithMemories>
}) {
	const target = citationIndex.get(sourceId)
	if (!target) return <>{children}</>

	const document =
		(target.documentId
			? documentByKnownId.get(target.documentId)
			: undefined) ??
		(target.customId ? documentByKnownId.get(target.customId) : undefined)
	const url = safeExternalUrl(
		document ? getDocumentSourceUrl(document) : target.url,
	)
	const title = sourceTitle(target, document)
	const summary = sourceSummary(target, document)

	return (
		<span className="group/source relative inline rounded-[3px] border-b border-dotted border-white/20 bg-white/[0.025] px-px text-white/90 transition-colors hover:border-white/35 hover:bg-white/[0.045] focus-within:border-white/35 focus-within:bg-white/[0.045]">
			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-inherit no-underline outline-none focus-visible:ring-1 focus-visible:ring-white/25"
				>
					{children}
				</a>
			) : (
				<button
					type="button"
					className="cursor-help border-0 bg-transparent p-0 text-inherit"
				>
					{children}
				</button>
			)}
			<span className="ml-1 inline-flex h-3.5 min-w-3.5 translate-y-[-1px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-1 text-[9px] font-medium leading-none text-white/45 transition-colors group-hover/source:text-white/65 group-focus-within/source:text-white/65">
				{sourceId}
			</span>
			<span className="pointer-events-none absolute bottom-full left-1/2 z-[1000] hidden w-72 -translate-x-1/2 pb-2 group-hover/source:block group-focus-within/source:block">
				<span className="pointer-events-auto block rounded-xl border border-white/10 bg-[#0B0F16]/95 p-3 text-left shadow-[0_16px_44px_rgba(0,0,0,0.48)] backdrop-blur-xl">
					<span className="mb-1 flex items-center justify-between gap-2">
						<span className="truncate text-xs font-medium text-white/85">
							{title}
						</span>
						<span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] capitalize text-white/40">
							{sourceKind(target, document)}
						</span>
					</span>
					{summary ? (
						<span className="line-clamp-3 text-xs leading-snug text-white/55">
							{summary}
						</span>
					) : null}
					{url ? (
						<span className="mt-2 block text-xs font-medium text-blue-300">
							Open source
						</span>
					) : null}
				</span>
			</span>
		</span>
	)
}

function makeMarkdownComponents(
	sources: SourceUrlPart[],
	citationIndex: Map<string, CitationTarget>,
	documentByKnownId: Map<string, DocumentWithMemories>,
) {
	return {
		a: ({ href, children }: { href?: string; children?: ReactNode }) => {
			if (href?.startsWith("#sm-source:")) {
				const sourceId = (() => {
					try {
						return decodeURIComponent(href.slice("#sm-source:".length))
					} catch {
						return null
					}
				})()
				if (!sourceId) return <>{children}</>
				return (
					<SourceCitationLink
						sourceId={sourceId}
						citationIndex={citationIndex}
						documentByKnownId={documentByKnownId}
					>
						{children}
					</SourceCitationLink>
				)
			}
			const label =
				typeof children === "string"
					? children
					: Array.isArray(children)
						? children.join("")
						: ""
			const match = label.match(/^\[?(\d+)\]?$/)
			const safeHref = safeExternalUrl(href)
			if (match && safeHref) {
				const n = Number(match[1])
				const source = sources.find((s) => s.url === safeHref) ?? sources[n - 1]
				return <CitationLink href={safeHref} label={label} source={source} />
			}
			if (!safeHref) return <>{children}</>
			return (
				<a
					href={safeHref}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-400 hover:underline"
				>
					{children}
				</a>
			)
		},
	}
}

function WebSourcesPill({ sources }: { sources: SourceUrlPart[] }) {
	const [expanded, setExpanded] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!expanded) return
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setExpanded(false)
			}
		}
		document.addEventListener("mousedown", onDown)
		return () => document.removeEventListener("mousedown", onDown)
	}, [expanded])

	if (sources.length === 0) return null

	const faviconHosts: string[] = []
	for (const s of sources) {
		const host = sourceHost(s.url)
		if (!faviconHosts.includes(host)) faviconHosts.push(host)
		if (faviconHosts.length >= 3) break
	}
	const count = sources.length

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-2.5 pl-1.5 text-xs text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white/80"
				aria-expanded={expanded}
				aria-label={`${count} web ${count === 1 ? "source" : "sources"}`}
			>
				<span className="flex -space-x-1.5">
					{faviconHosts.length > 0 ? (
						faviconHosts.map((host) => (
							<img
								key={host}
								src={faviconUrl(host)}
								alt=""
								className="size-4 rounded-full border border-[#0B0F16] bg-white/10 object-cover"
								loading="lazy"
								referrerPolicy="no-referrer"
							/>
						))
					) : (
						<GlobeIcon className="size-3.5 text-emerald-400" />
					)}
				</span>
				<span>{count === 1 ? "1 source" : `${count} sources`}</span>
			</button>
			{expanded && (
				<div className="absolute bottom-full left-0 z-[1000] mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0B0F16]/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
					<ul className="max-h-72 list-none space-y-0.5 overflow-y-auto">
						{sources.map((s) => {
							const host = sourceHost(s.url)
							return (
								<li key={s.sourceId}>
									<a
										href={s.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
									>
										<img
											src={faviconUrl(host)}
											alt=""
											className="mt-0.5 size-4 shrink-0 rounded-full bg-white/10"
											loading="lazy"
											referrerPolicy="no-referrer"
										/>
										<span className="min-w-0">
											<span className="block truncate text-white/80">
												{s.title?.trim() || host}
											</span>
											<span className="block truncate text-[11px] text-white/40">
												{host}
											</span>
										</span>
									</a>
								</li>
							)
						})}
					</ul>
				</div>
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
					{cmd ?? "…"}
				</span>
				{isLoading && <span className="text-white/30 shrink-0">running…</span>}
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
	if (isWebSearchToolName(toolName)) {
		if (part.state === "output-available") return null
		if (part.state === "error" || part.state === "output-error") {
			return (
				<div className="my-1 flex items-center gap-2 text-xs text-red-400/80">
					<GlobeIcon className="size-3.5 shrink-0" />
					<span>Web search failed</span>
				</div>
			)
		}
		return (
			<div className="my-1 flex items-center gap-2 text-xs text-white/50">
				<Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-400/80" />
				<span>Searching the web…</span>
			</div>
		)
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
	if (isMemoryRetrievalToolName(toolName) && isDone) return null

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
				{isLoading && <span className="text-white/40 ml-auto">running…</span>}
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
	responseModel: ModelId | null
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
	responseModel,
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
	const copyText = stripSourceMarkup(messageText)
	const memoryOutputs = useMemo(
		() => extractMemoryToolOutputs(message),
		[message],
	)
	const citationIndex = useMemo(
		() => buildCitationIndex(memoryOutputs),
		[memoryOutputs],
	)
	const allowedSourceIds = useMemo(
		() => new Set(citationIndex.keys()),
		[citationIndex],
	)
	const sourceDocumentIds = useMemo(() => {
		const ids = new Set<string>()
		for (const target of citationIndex.values()) {
			if (target.documentId) ids.add(target.documentId)
			if (target.customId) ids.add(target.customId)
		}
		return [...ids].sort()
	}, [citationIndex])
	const { data: sourceDocuments = [] } = useQuery({
		queryKey: ["chat-source-documents", sourceDocumentIds],
		queryFn: () => fetchDocumentsByIds(sourceDocumentIds),
		enabled: sourceDocumentIds.length > 0,
		staleTime: 5 * 60 * 1000,
	})
	const documentByKnownId = useMemo(
		() => mapDocumentsByKnownIds(sourceDocuments),
		[sourceDocuments],
	)
	const webSources = useMemo(() => {
		const seen = new Set<string>()
		const out: SourceUrlPart[] = []
		for (const part of message.parts) {
			if (part.type !== "source-url") continue
			const source = part as SourceUrlPart
			if (seen.has(source.url)) continue
			seen.add(source.url)
			out.push(source)
		}
		return out
	}, [message.parts])
	const hasAssistantText = message.parts.some(
		(p) => p.type === "text" && (p as { text?: string }).text?.trim(),
	)
	const markdownComponents = useMemo(
		() => makeMarkdownComponents(webSources, citationIndex, documentByKnownId),
		[webSources, citationIndex, documentByKnownId],
	)
	const responseModelLabel = responseModel
		? `${modelNames[responseModel].name} ${modelNames[responseModel].version}`
		: null

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
							return null
						}
						if (isWebSearchPart(part)) {
							return null
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
							// Skip fragments mid-run — source-url citations split one answer into
							// many text parts; rendering each separately tears markdown (lists etc.).
							let prev = partIndex - 1
							while (prev >= 0 && message.parts[prev]?.type === "source-url") {
								prev--
							}
							if (prev >= 0 && message.parts[prev]?.type === "text") {
								return null
							}
							let runText = ""
							for (let j = partIndex; j < message.parts.length; j++) {
								const p = message.parts[j]
								if (p?.type === "text") runText += p.text
								else if (p?.type === "source-url") continue
								else break
							}
							return (
								<div
									key={`${message.id}-${partIndex}`}
									className="text-sm text-white/90 chat-markdown-content"
								>
									<Streamdown components={markdownComponents}>
										{
											parseSourceAnnotatedMarkdown(runText, allowedSourceIds)
												.markdown
										}
									</Streamdown>
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
			{hasAssistantText && (
				<div className="flex min-h-7 items-center gap-2">
					<MessageActions
						messageId={message.id}
						messageText={copyText}
						isLastMessage={isLastAgentMessage}
						isHovered={isHovered}
						copiedMessageId={copiedMessageId}
						messageFeedback={messageFeedback}
						onCopy={onCopy}
						onLike={onLike}
						onDislike={onDislike}
					/>
					{webSources.length > 0 && (
						<div
							className={cn(
								"transition-opacity duration-200",
								isHovered || isLastAgentMessage ? "opacity-100" : "opacity-0",
							)}
						>
							<WebSourcesPill sources={webSources} />
						</div>
					)}
					{responseModelLabel && (
						<span
							className={cn(
								"text-[10px] leading-none text-white/25 transition-opacity duration-200",
								isHovered ? "opacity-100" : "opacity-0",
							)}
						>
							{responseModelLabel}
						</span>
					)}
				</div>
			)}
		</div>
	)
}
