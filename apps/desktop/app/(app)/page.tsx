"use client"

import { useQuery } from "@tanstack/react-query"
import {
	ArrowRight,
	Bot,
	CheckCircle2,
	Clock,
	Code2,
	FileText,
	Link2,
	Lightbulb,
	Loader2,
	Plus,
	RefreshCcw,
	Search,
	SendHorizontal,
	Sparkles,
	Terminal,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { listDocuments, type DocumentWithMemories } from "@/lib/api"
import type { SearchResult } from "@/lib/search"
import { OPEN_MEMORY_EVENT, type SpotlightMemory } from "@/lib/spotlight"
import {
	connectDesktopTool,
	detectDesktopTools,
	type DesktopToolId,
	type DesktopToolPreview,
	type DesktopToolStatus,
	previewConnectDesktopTool,
} from "@/lib/tools"
import { SearchCommand, useCommandK } from "@/components/search-command"

type MemoryPreview = {
	id: string
	title: string | null
	summary?: string | null
	content?: string | null
	raw?: string | null
	url?: string | null
	type?: string | null
	createdAt: string | Date
}

export default function DashboardPage() {
	const { open, setOpen } = useCommandK()
	const [selectedMemory, setSelectedMemory] = useState<MemoryPreview | null>(
		null,
	)
	const documentsQuery = useQuery({
		queryKey: ["desktop-documents"],
		queryFn: listDocuments,
		staleTime: 60 * 1000,
	})
	const documents = documentsQuery.data?.documents ?? []
	const activeMemory =
		selectedMemory ?? toMemoryPreview(documents.at(0) ?? null)
	const totalCount = documentsQuery.data?.pagination.totalItems
	const subtitle = useMemo(() => {
		if (documentsQuery.isPending) return "Loading your recent memories."
		if (typeof totalCount === "number") return `${totalCount} memories indexed.`
		return "Your memory is ready."
	}, [documentsQuery.isPending, totalCount])
	const visibleDocuments = documents.slice(0, 5)

	useEffect(() => {
		let unlisten: (() => void) | undefined

		import("@tauri-apps/api/event")
			.then(({ listen }) =>
				listen<SpotlightMemory>(OPEN_MEMORY_EVENT, (event) => {
					setSelectedMemory(spotlightMemoryToPreview(event.payload))
				}),
			)
			.then((handler) => {
				unlisten = handler
			})
			.catch(() => {
				unlisten = undefined
			})

		return () => {
			unlisten?.()
		}
	}, [])

	return (
		<div className="flex min-h-full flex-col px-4 pb-10 md:px-6">
			<div className="mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-5xl flex-col justify-center py-8">
				<section className="mx-auto w-full max-w-3xl space-y-8">
					<div className="space-y-3 text-center">
						<p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#2261CA33] bg-[#00173C]/80 px-3 py-1 font-medium text-[#8BC6FF] text-[11px] shadow-[0_10px_40px_rgba(0,23,60,0.28)]">
							<Sparkles className="size-3" />
							Nova memory
						</p>
						<h1 className="font-medium text-3xl text-white leading-tight tracking-tight md:text-4xl">
							What should we remember?
						</h1>
						<p className="text-fg-subtle text-sm">{subtitle}</p>
					</div>

					<div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0B1018]/88 shadow-[0_30px_120px_rgba(0,0,0,0.38),inset_1px_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl">
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="flex min-h-[118px] w-full items-start px-5 pt-5 text-left text-[#7D8794] text-base transition-colors hover:text-[#AAB3BF]"
						>
							Search, ask, or save a memory...
						</button>
						<div className="flex flex-col gap-3 border-white/[0.06] border-t bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex min-w-0 flex-wrap items-center gap-2">
								<ComposerAction icon={Plus} label="Save link" />
								<ComposerAction icon={FileText} label="Write note" />
								<ComposerAction
									icon={Search}
									label="Search memory"
									onClick={() => setOpen(true)}
								/>
							</div>
							<div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
								<span className="hidden items-center gap-1.5 text-[12px] text-fg-subtle sm:flex">
									<Lightbulb className="size-3.5 text-[#3374FF]" />
									Semantic search
								</span>
								<button
									type="button"
									onClick={() => setOpen(true)}
									className="flex size-10 items-center justify-center rounded-full bg-white text-[#0B1018] shadow-[0_10px_30px_rgba(255,255,255,0.16)] transition-transform hover:scale-[1.03]"
									aria-label="Open memory search"
								>
									<SendHorizontal className="size-4" />
								</button>
							</div>
						</div>
						<div className="flex items-center justify-between border-white/[0.04] border-t bg-black/10 px-5 py-3 text-[12px] text-fg-subtle">
							<button
								type="button"
								onClick={() => setSelectedMemory(activeMemory)}
								className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-fg-primary"
							>
								<Link2 className="size-4 shrink-0" />
								<span className="truncate">
									{activeMemory?.title ?? "Work from your saved context"}
								</span>
							</button>
							<button
								type="button"
								onClick={() => documentsQuery.refetch()}
								disabled={documentsQuery.isFetching}
								className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-fg-primary disabled:opacity-60"
							>
								<RefreshCcw
									className={[
										"size-3.5",
										documentsQuery.isFetching ? "animate-spin" : "",
									].join(" ")}
								/>
								Refresh
							</button>
						</div>
					</div>

					<ToolOnboardingPanel />

					<section className="mx-auto w-full max-w-2xl space-y-2">
						<div className="flex items-center justify-between px-1">
							<p className="font-medium text-[10px] text-fg-faint uppercase tracking-[0.12em]">
								Recents
							</p>
							<button
								type="button"
								onClick={() => setOpen(true)}
								className="text-[11px] text-fg-subtle transition-colors hover:text-fg-primary"
							>
								Open search
							</button>
						</div>
						<div className="rounded-2xl border border-white/[0.06] bg-[#0B1018]/42 p-1 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl">
							{documentsQuery.isPending ? (
								<div className="flex items-center gap-2 px-3 py-2.5 text-fg-subtle text-sm">
									<Loader2 className="size-4 animate-spin" />
									Loading memories...
								</div>
							) : null}
							{documentsQuery.isError ? (
								<div className="px-3 py-2.5 text-destructive text-sm">
									{documentsQuery.error.message}
								</div>
							) : null}
							{!documentsQuery.isPending && documents.length === 0 ? (
								<div className="px-3 py-2.5 text-fg-subtle text-sm">
									No memories found.
								</div>
							) : null}
							<ul className="space-y-0.5">
								{visibleDocuments.map((document) => (
									<RecentMemoryRow
										key={document.id}
										document={document}
										active={activeMemory?.id === document.id}
										onSelect={() =>
											setSelectedMemory(toMemoryPreview(document))
										}
									/>
								))}
							</ul>
						</div>
					</section>
				</section>
			</div>

			<SearchCommand
				open={open}
				onOpenChange={setOpen}
				onOpenResult={(result) =>
					setSelectedMemory(searchResultToPreview(result))
				}
			/>
		</div>
	)
}

function ToolOnboardingPanel() {
	const [tools, setTools] = useState<DesktopToolStatus[]>([])
	const [toolsError, setToolsError] = useState<string | null>(null)
	const [toolsBusy, setToolsBusy] = useState<string | null>(null)
	const [toolPreview, setToolPreview] = useState<DesktopToolPreview | null>(
		null,
	)
	const [loading, setLoading] = useState(true)

	const connectedCount = tools.filter((tool) => tool.connected).length
	const detectedCount = tools.filter((tool) => tool.detected).length

	const refreshTools = useCallback(async () => {
		setToolsError(null)
		setLoading(true)
		try {
			setTools(await detectDesktopTools())
		} catch (err) {
			setToolsError(formatUnknownError(err, "Could not detect local tools"))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		refreshTools()
	}, [refreshTools])

	async function previewConnect(toolId: DesktopToolId) {
		setToolsError(null)
		setToolsBusy(toolId)
		try {
			setToolPreview(await previewConnectDesktopTool(toolId))
		} catch (err) {
			setToolsError(formatUnknownError(err, "Could not prepare setup"))
		} finally {
			setToolsBusy(null)
		}
	}

	async function applyPreview() {
		if (!toolPreview) return

		setToolsError(null)
		setToolsBusy(toolPreview.tool.id)
		try {
			await connectDesktopTool(toolPreview.tool.id)
			setToolPreview(null)
			await refreshTools()
		} catch (err) {
			setToolsError(formatUnknownError(err, "Could not connect tool"))
		} finally {
			setToolsBusy(null)
		}
	}

	return (
		<section className="mx-auto w-full max-w-3xl rounded-2xl border border-white/[0.06] bg-[#0B1018]/56 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<p className="flex items-center gap-2 font-medium text-sm text-white">
						<Bot className="size-4 text-[#8BC6FF]" />
						Connect AI tools
					</p>
					<p className="text-fg-subtle text-xs">
						Detected {detectedCount} local tools. {connectedCount} connected.
					</p>
				</div>
				<button
					type="button"
					onClick={refreshTools}
					disabled={loading || toolsBusy !== null}
					className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] px-3 text-[12px] text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
				>
					{loading ? "Scanning..." : "Rescan"}
				</button>
			</div>

			<div className="mt-4 grid gap-2 md:grid-cols-3">
				{tools.map((tool) => {
					const Icon = toolIcon(tool.id)
					return (
						<div
							key={tool.id}
							className="flex min-h-36 flex-col justify-between rounded-xl border border-white/[0.06] bg-black/15 p-3"
						>
							<div className="space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div className="flex min-w-0 items-center gap-2">
										<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#00173C] text-[#8BC6FF] ring-1 ring-[#2261CA33]">
											<Icon className="size-4" />
										</span>
										<div className="min-w-0">
											<p className="truncate font-medium text-sm text-white">
												{tool.name}
											</p>
											<p className="text-[11px] text-fg-faint">
												{toolStatusLabel(tool)}
											</p>
										</div>
									</div>
									{tool.connected ? (
										<CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
									) : null}
								</div>
								<p className="line-clamp-2 text-[11px] text-fg-subtle">
									{tool.detail}
								</p>
							</div>
							<button
								type="button"
								onClick={() => previewConnect(tool.id)}
								disabled={toolsBusy !== null || tool.connected}
								className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 font-medium text-[#0B1018] text-[12px] transition-transform hover:scale-[1.02] disabled:cursor-default disabled:bg-white/[0.08] disabled:text-fg-faint disabled:hover:scale-100"
							>
								{tool.connected
									? "Connected"
									: toolsBusy === tool.id
										? "Preparing..."
										: tool.detected
											? "Connect"
											: "Set up"}
							</button>
						</div>
					)
				})}
			</div>

			{toolsError ? (
				<p className="mt-3 text-destructive text-xs">{toolsError}</p>
			) : null}

			{toolPreview ? (
				<div className="mt-4 rounded-xl border border-[#2261CA33] bg-[#00173C]/42 p-3">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="font-medium text-sm text-white">
								Connect {toolPreview.tool.name}
							</p>
							<p
								className="truncate font-mono text-[11px] text-fg-subtle"
								title={toolPreview.configPath}
							>
								{toolPreview.configPath}
							</p>
						</div>
						<div className="flex shrink-0 gap-2">
							<button
								type="button"
								onClick={() => setToolPreview(null)}
								disabled={toolsBusy !== null}
								className="h-8 rounded-lg border border-white/[0.08] px-3 text-[12px] text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={applyPreview}
								disabled={toolsBusy !== null}
								className="h-8 rounded-lg bg-white px-3 font-medium text-[#0B1018] text-[12px] disabled:opacity-60"
							>
								{toolsBusy ? "Applying..." : "Apply"}
							</button>
						</div>
					</div>
					<pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/[0.06] bg-black/25 p-3 whitespace-pre-wrap text-[11px] text-fg-muted">
						{toolPreview.diff}
					</pre>
				</div>
			) : null}
		</section>
	)
}

function ComposerAction({
	icon: Icon,
	label,
	onClick,
}: {
	icon: typeof Link2
	label: string
	onClick?: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-fg-subtle leading-none transition-colors hover:bg-white/[0.05] hover:text-white"
		>
			<Icon className="size-3.5 shrink-0" />
			<span className="min-w-0 truncate whitespace-nowrap">{label}</span>
		</button>
	)
}

function toolIcon(toolId: DesktopToolId) {
	switch (toolId) {
		case "claude-code":
			return Bot
		case "codex":
			return Terminal
		case "cursor":
			return Code2
	}
}

function toolStatusLabel(tool: DesktopToolStatus) {
	if (tool.connected) return "Connected"
	if (tool.detected) return "Detected"
	return "Not detected"
}

function formatUnknownError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}

function RecentMemoryRow({
	document,
	active,
	onSelect,
}: {
	document: DocumentWithMemories
	active: boolean
	onSelect: () => void
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onSelect}
				className={[
					"group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
					active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
				].join(" ")}
			>
				<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-card ring-1 ring-surface-border transition-colors group-hover:bg-[#182333]">
					<FileText className="size-3.5 text-fg-subtle" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-fg-muted text-sm transition-colors group-hover:text-white">
						{document.title?.trim() || document.url || "Untitled memory"}
					</span>
					<span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-fg-faint">
						<Clock className="size-3" />
						{formatDate(document.createdAt)}
					</span>
				</span>
				<ArrowRight className="size-3.5 shrink-0 text-fg-faint transition-colors group-hover:text-fg-muted" />
			</button>
		</li>
	)
}

function toMemoryPreview(
	document: DocumentWithMemories | null,
): MemoryPreview | null {
	if (!document) return null
	return {
		id: document.id,
		title: document.title ?? null,
		summary: document.summary ?? null,
		content: document.content ?? null,
		raw: document.raw ?? null,
		url: document.url ?? null,
		type: document.type ?? null,
		createdAt: document.createdAt,
	}
}

function searchResultToPreview(result: SearchResult): MemoryPreview {
	return {
		id: result.documentId,
		title: result.title,
		summary: result.summary,
		content:
			result.content ??
			result.chunks.find((chunk) => chunk.isRelevant)?.content ??
			null,
		type: result.type,
		createdAt: result.createdAt,
	}
}

function spotlightMemoryToPreview(memory: SpotlightMemory): MemoryPreview {
	return {
		id: memory.id,
		title: memory.title,
		summary: memory.summary,
		content: memory.content,
		raw: memory.raw,
		url: memory.url,
		type: memory.type,
		createdAt: memory.createdAt,
	}
}

function formatDate(value: string | Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}
