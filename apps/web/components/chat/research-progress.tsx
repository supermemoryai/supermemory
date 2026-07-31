"use client"

import {
	CheckCircle2Icon,
	CircleIcon,
	DownloadIcon,
	ExternalLinkIcon,
	Loader2Icon,
	SearchIcon,
	SquareIcon,
	TelescopeIcon,
	XCircleIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import type { NovaResearchEvent, NovaResearchRun } from "@/lib/nova-research"

function toolLabel(name: string | null, fallback: string | null): string {
	if (fallback) return fallback
	return (name ?? "Research tool")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

function eventIcon(event: NovaResearchEvent) {
	if (event.status === "running" || event.status === "pending") {
		return <Loader2Icon className="size-3.5 animate-spin text-[#8DBDFF]" />
	}
	if (event.status === "failed" || event.type === "error") {
		return <XCircleIcon className="size-3.5 text-red-400" />
	}
	if (event.type === "tool") {
		return <CheckCircle2Icon className="size-3.5 text-emerald-400/85" />
	}
	return <CircleIcon className="size-3 fill-[#267BF1] text-[#267BF1]" />
}

function isUsefulTimelineEvent(event: NovaResearchEvent): boolean {
	return (
		event.type === "assistant" ||
		event.type === "tool" ||
		event.type === "status" ||
		event.type === "artifact" ||
		event.type === "error"
	)
}

export function ResearchProgress({
	run,
	apiBase,
	onCancel,
	className,
}: {
	run: NovaResearchRun
	apiBase: string
	onCancel: () => void
	className?: string
}) {
	const active = run.status === "queued" || run.status === "running"
	const failed = run.status === "failed"
	const cancelled = run.status === "cancelled"
	const timeline = run.events.filter(isUsefulTimelineEvent)
	const statusLabel = active
		? "Researching"
		: failed
			? "Research failed"
			: cancelled
				? "Research stopped"
				: "Research complete"

	return (
		<section
			className={cn(
				"w-full overflow-hidden rounded-2xl border border-[#1B2D47] bg-[linear-gradient(145deg,rgba(8,20,38,0.96),rgba(4,9,17,0.96))] shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
				dmSansClassName(),
				className,
			)}
			aria-live="polite"
		>
			<div className="flex items-start justify-between gap-3 border-[#1B2D47] border-b px-4 py-3.5">
				<div className="flex min-w-0 items-start gap-3">
					<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#267BF1]/25 bg-[#267BF1]/10">
						{active ? (
							<Loader2Icon className="size-4 animate-spin text-[#8DBDFF]" />
						) : (
							<TelescopeIcon className="size-4 text-[#8DBDFF]" />
						)}
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-medium text-sm text-white">{statusLabel}</h3>
							<span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/45">
								{run.toolCallCount} tool call
								{run.toolCallCount === 1 ? "" : "s"}
							</span>
						</div>
						<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/48">
							{run.query}
						</p>
					</div>
				</div>
				{active ? (
					<button
						type="button"
						onClick={onCancel}
						className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white/85"
					>
						<SquareIcon className="size-2.5 fill-current" /> Stop
					</button>
				) : run.reportMarkdown ? (
					<a
						href={`${apiBase}/chat/research/${run.id}/report.md`}
						download
						className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#267BF1]/30 bg-[#267BF1]/10 px-2.5 py-1.5 text-[11px] text-[#A8CCFF] transition-colors hover:bg-[#267BF1]/20"
					>
						<DownloadIcon className="size-3" /> Markdown
					</a>
				) : null}
			</div>

			{run.plan ? (
				<div className="border-[#1B2D47]/80 border-b px-4 py-3">
					<div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
						Plan
					</div>
					<div className="grid gap-1.5 sm:grid-cols-2">
						{run.plan.steps.map((step) => (
							<div
								key={step.id}
								className="flex min-w-0 items-center gap-2 text-xs text-white/58"
							>
								{step.status === "complete" ? (
									<CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-400/80" />
								) : step.status === "in_progress" ? (
									<Loader2Icon className="size-3.5 shrink-0 animate-spin text-[#8DBDFF]" />
								) : (
									<CircleIcon className="size-3.5 shrink-0 text-white/20" />
								)}
								<span className="truncate">{step.title}</span>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className="max-h-72 overflow-y-auto px-4 py-3">
				<div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[6px] before:w-px before:bg-[#1B2D47]">
					{timeline.length === 0 ? (
						<div className="flex items-center gap-2 text-xs text-white/45">
							<Loader2Icon className="size-3.5 animate-spin text-[#8DBDFF]" />
							Preparing the investigation…
						</div>
					) : (
						timeline.map((event) => (
							<div key={event.id} className="relative flex items-start gap-3">
								<div className="z-10 flex size-3.5 shrink-0 items-center justify-center bg-[#081426]">
									{eventIcon(event)}
								</div>
								<div className="min-w-0 flex-1 -mt-0.5">
									<div className="text-xs leading-relaxed text-white/72">
										{event.type === "tool"
											? toolLabel(event.toolName, event.title)
											: event.message || event.title}
									</div>
									{event.type === "tool" && event.toolName ? (
										<div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/28">
											<SearchIcon className="size-2.5" /> {event.toolName}
										</div>
									) : null}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{run.sources.length > 0 ? (
				<div className="flex items-center gap-2 overflow-x-auto border-[#1B2D47]/80 border-t px-4 py-2.5">
					<span className="shrink-0 text-[10px] text-white/30">Sources</span>
					{run.sources.slice(0, 8).map((source) =>
						source.url ? (
							<a
								key={source.id}
								href={source.url}
								target="_blank"
								rel="noreferrer"
								className="flex max-w-44 shrink-0 items-center gap-1 truncate rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-white/48 hover:text-white/75"
							>
								<span className="truncate">{source.title || source.url}</span>
								<ExternalLinkIcon className="size-2.5 shrink-0" />
							</a>
						) : (
							<span
								key={source.id}
								className="max-w-44 shrink-0 truncate rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-white/48"
							>
								{source.title || source.space || "Memory"}
							</span>
						),
					)}
				</div>
			) : null}
		</section>
	)
}
