"use client"

import { useQuery } from "@tanstack/react-query"
import {
	ArrowRight,
	Clock,
	FileText,
	Link2,
	Lightbulb,
	Loader2,
	Plus,
	RefreshCcw,
	Search,
	SendHorizontal,
	Sparkles,
} from "lucide-react"
import { useMemo, useState } from "react"
import { listDocuments, type DocumentWithMemories } from "@/lib/api"
import type { SearchResult } from "@/lib/search"
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

function formatDate(value: string | Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}
