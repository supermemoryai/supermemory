"use client"

import { useQuery } from "@tanstack/react-query"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import {
	ArrowRight,
	Clock,
	FileText,
	Link2,
	Lightbulb,
	MessageCircle,
	RefreshCcw,
	Search,
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

	return (
		<div className="min-h-full px-4 pt-2 pb-16 md:px-6">
			<div className="mx-auto w-full max-w-4xl space-y-5">
				<header className="flex items-end justify-between gap-4 border-surface-border border-b pb-4">
					<div className="space-y-0.5">
						<p className="font-medium text-[10px] text-fg-faint uppercase tracking-[0.12em]">
							Home
						</p>
						<h1 className="max-w-2xl font-medium text-2xl text-white leading-tight tracking-tight">
							Welcome back, your saved context is ready.
						</h1>
						<p className="text-fg-subtle text-sm">{subtitle}</p>
					</div>
					<button
						type="button"
						onClick={() => documentsQuery.refetch()}
						disabled={documentsQuery.isFetching}
						className="group relative hidden h-14 w-36 shrink-0 overflow-hidden rounded-xl border border-surface-border bg-surface-card transition-all hover:scale-[1.02] hover:border-[#3A4A63] md:block"
						aria-label="Refresh memories"
					>
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_50%,rgba(75,160,250,0.35),transparent_22%),radial-gradient(circle_at_58%_42%,rgba(139,198,255,0.22),transparent_18%),radial-gradient(circle_at_78%_62%,rgba(15,240,210,0.16),transparent_16%)]" />
						<div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/45 to-transparent" />
						<RefreshCcw
							className={[
								"absolute right-3 bottom-3 size-4 text-[#8BC6FF]",
								documentsQuery.isFetching ? "animate-spin" : "",
							].join(" ")}
						/>
					</button>
				</header>

				<section className="space-y-2">
					<p className="font-medium text-[10px] text-fg-faint uppercase tracking-[0.12em]">
						Daily brief
					</p>
					<div className="grid gap-3 sm:grid-cols-[1fr_220px]">
						<div className="rounded-[18px] bg-surface-card/60 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md">
							<div className="flex min-h-[132px] flex-col justify-between gap-4">
								<div className="space-y-2">
									<p className="font-medium text-fg-primary text-sm">
										{activeMemory?.title ?? "No memory selected yet"}
									</p>
									<p className="line-clamp-3 text-[12px] text-fg-subtle leading-relaxed">
										{activeMemory?.summary ??
											activeMemory?.content ??
											"Save or search memories and Nova will surface the most useful context here."}
									</p>
								</div>
								<div className="flex items-center justify-between">
									<button
										type="button"
										onClick={() => setOpen(true)}
										className="text-[11px] text-fg-subtle transition-colors hover:text-fg-primary"
									>
										Ask or search related →
									</button>
									<MessageCircle className="size-4 text-[#4BA0FA]" />
								</div>
							</div>
						</div>
						<div className="hidden rounded-[18px] bg-surface-card/60 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md sm:flex sm:flex-col sm:justify-between">
							<span className="self-start rounded-full bg-[#4BA0FA]/16 px-2 py-0.5 font-semibold text-[#8BC6FF] text-[9px] uppercase tracking-[0.12em]">
								Desktop
							</span>
							<p className="text-[12px] text-fg-secondary leading-relaxed">
								Use Command-K to search your memory without leaving the native
								shell.
							</p>
							<span className="text-[10px] text-fg-faint">Nova-ready</span>
						</div>
					</div>
				</section>

				<section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="grid grid-cols-3 gap-1 sm:-mx-2.5 sm:flex sm:items-center sm:gap-0.5">
						<QuickAction icon={Link2} label="Save link" />
						<span className="hidden text-[#3A4455] sm:inline">·</span>
						<QuickAction icon={FileText} label="Write note" />
						<span className="hidden text-[#3A4455] sm:inline">·</span>
						<QuickAction
							icon={Search}
							label="Search"
							onClick={() => setOpen(true)}
						/>
					</div>
					<p className="hidden min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-fg-subtle sm:flex">
						<Lightbulb className="size-3 shrink-0 text-[#3374FF]" />
						<span className="truncate">
							Search by meaning, not just exact titles.
						</span>
					</p>
				</section>

				<section className="space-y-2">
					<div className="flex gap-4">
						<div className="min-w-0 flex-[4]">
							<p className="font-medium text-[10px] text-fg-faint uppercase tracking-[0.12em]">
								Recents
							</p>
						</div>
						<div className="hidden min-w-0 flex-[2] sm:block">
							<p className="font-medium text-[10px] text-fg-faint uppercase tracking-[0.12em]">
								Preview
							</p>
						</div>
					</div>

					<div className="flex items-start gap-4">
						<div className="min-w-0 flex-[4]">
							{documentsQuery.isPending ? (
								<div className="px-2.5 py-2 text-fg-subtle text-sm">
									Loading memories...
								</div>
							) : null}
							{documentsQuery.isError ? (
								<div className="px-2.5 py-2 text-destructive text-sm">
									{documentsQuery.error.message}
								</div>
							) : null}
							{!documentsQuery.isPending && documents.length === 0 ? (
								<div className="px-2.5 py-2 text-fg-subtle text-sm">
									No memories found.
								</div>
							) : null}
							<ul className="space-y-0.5">
								{documents.map((document) => (
									<li key={document.id}>
										<button
											type="button"
											onClick={() =>
												setSelectedMemory(toMemoryPreview(document))
											}
											className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
										>
											<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-card ring-1 ring-surface-border transition-colors group-hover:bg-[#182333]">
												<FileText className="size-3 text-fg-subtle" />
											</span>
											<span className="min-w-0 flex-1 truncate text-fg-muted text-sm transition-colors group-hover:text-white">
												{document.title?.trim() ||
													document.url ||
													"Untitled memory"}
											</span>
											<ArrowRight className="size-3.5 shrink-0 text-fg-faint transition-colors group-hover:text-fg-muted" />
										</button>
									</li>
								))}
							</ul>
						</div>

						<div className="hidden min-w-0 flex-[2] sm:block">
							<DocumentPreview memory={activeMemory} />
						</div>
					</div>
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

function QuickAction({
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
			className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] text-fg-subtle leading-none transition-colors hover:bg-surface-hover hover:text-white sm:gap-1.5 sm:px-2.5 sm:text-sm"
		>
			<Icon className="size-3.5 shrink-0" />
			<span className="min-w-0 truncate whitespace-nowrap">{label}</span>
		</button>
	)
}

function DocumentPreview({ memory }: { memory: MemoryPreview | null }) {
	if (!memory) {
		return (
			<Card className="min-h-0 rounded-lg border-white/[0.08] bg-[#0D121A]/74 shadow-[0_24px_80px_rgba(0,0,0,0.24),inset_1px_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl">
				<CardContent className="flex h-full min-h-[360px] items-center justify-center text-[#8A929E] text-sm">
					Select a memory to preview it.
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="border-0 bg-surface-card/60 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md">
			<CardHeader className="p-3 pb-2">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<CardTitle className="truncate text-fg-primary text-sm">
							{memory.title ?? "Untitled memory"}
						</CardTitle>
						<CardDescription className="mt-1 flex items-center gap-1.5 text-fg-faint text-[10px]">
							<Clock className="size-3.5" />
							{formatDate(memory.createdAt)}
						</CardDescription>
					</div>
					{memory.type ? (
						<span className="rounded-full bg-[#4BA0FA]/16 px-2 py-0.5 font-semibold text-[#8BC6FF] text-[9px] uppercase tracking-[0.08em]">
							{memory.type}
						</span>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="px-3 pt-0 pb-3">
				{memory.url ? (
					<a
						href={memory.url}
						target="_blank"
						rel="noreferrer"
						className="mb-3 block truncate text-[#8BC6FF] text-[11px] underline-offset-4 hover:underline"
					>
						{memory.url}
					</a>
				) : null}
				<div className="space-y-3 text-[12px] leading-relaxed">
					{memory.summary ? (
						<section>
							<h2 className="mb-1 font-medium text-fg-primary">Summary</h2>
							<p className="line-clamp-4 text-fg-subtle">{memory.summary}</p>
						</section>
					) : null}
					<section>
						<h2 className="mb-1 font-medium text-fg-primary">Content</h2>
						<p className="line-clamp-6 whitespace-pre-wrap text-fg-subtle">
							{memory.content ?? memory.raw ?? "No content available."}
						</p>
					</section>
				</div>
			</CardContent>
		</Card>
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
