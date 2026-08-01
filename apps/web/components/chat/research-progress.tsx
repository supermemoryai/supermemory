"use client"

import { useState } from "react"
import {
	ArrowRightIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ChevronUpIcon,
	CircleHelpIcon,
	CircleIcon,
	Loader2Icon,
	SearchIcon,
	SquareIcon,
	XCircleIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import {
	pendingResearchClarification,
	type NovaResearchClarificationAnswer,
	type NovaResearchEvent,
	type NovaResearchRun,
} from "@/lib/nova-research"
import { ResearchClarification } from "./research-clarification"

function toolLabel(name: string | null, fallback: string | null): string {
	if (fallback) return fallback
	return (name ?? "Research tool")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

function eventLabel(event: NovaResearchEvent): string | null {
	if (event.title === "Research capabilities enabled" && event.message) {
		return `Enabled ${event.message} research`
	}
	if (event.type === "tool") return toolLabel(event.toolName, event.title)
	return event.message || event.title
}

function eventIcon(event: NovaResearchEvent) {
	if (event.status === "running" || event.status === "pending") {
		return <Loader2Icon className="size-3.5 animate-spin text-white/55" />
	}
	if (event.status === "failed" || event.type === "error") {
		return <XCircleIcon className="size-3.5 text-red-400" />
	}
	if (event.type === "tool") {
		return <CheckCircle2Icon className="size-3.5 text-emerald-400/80" />
	}
	if (event.type === "assistant") {
		return <ArrowRightIcon className="size-3.5 text-blue-400/85" />
	}
	return <CircleIcon className="size-3 fill-white/35 text-white/35" />
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
	onCancel,
	onSubmitClarification,
	className,
}: {
	run: NovaResearchRun
	onCancel: () => void
	onSubmitClarification: (
		requestId: string,
		answers: NovaResearchClarificationAnswer[],
	) => Promise<void>
	className?: string
}) {
	const active =
		run.status === "queued" ||
		run.status === "running" ||
		run.status === "awaiting_input"
	const failed = run.status === "failed"
	const cancelled = run.status === "cancelled"
	const awaitingInput = run.status === "awaiting_input"
	const [expanded, setExpanded] = useState(true)
	const timeline = run.events.filter(isUsefulTimelineEvent)
	const clarification = pendingResearchClarification(run)
	const statusLabel = awaitingInput
		? "Waiting for your answers"
		: active
			? "Researching"
			: failed
				? "Research failed"
				: cancelled
					? "Research stopped"
					: "Research complete"

	return (
		<section
			className={cn("w-full py-1", dmSansClassName(), className)}
			aria-live="polite"
			data-testid="nova-research-activity"
		>
			<div className="flex items-center gap-2">
				{awaitingInput ? (
					<CircleHelpIcon className="size-4 shrink-0 text-blue-400/85" />
				) : active ? (
					<Loader2Icon className="size-4 shrink-0 animate-spin text-white/65" />
				) : failed ? (
					<XCircleIcon className="size-4 shrink-0 text-red-400" />
				) : (
					<ArrowRightIcon className="size-4 shrink-0 text-blue-400/85" />
				)}
				<button
					type="button"
					onClick={() => setExpanded((value) => !value)}
					className="flex min-w-0 items-center gap-1.5 text-left text-sm text-white/72 transition-colors hover:text-white"
					aria-expanded={expanded}
				>
					<span className="font-medium">{statusLabel}</span>
					<span className="text-xs text-white/35">
						· {run.toolCallCount} tool call{run.toolCallCount === 1 ? "" : "s"}
					</span>
					{expanded ? (
						<ChevronUpIcon className="size-3.5 text-white/35" />
					) : (
						<ChevronDownIcon className="size-3.5 text-white/35" />
					)}
				</button>
				{active ? (
					<button
						type="button"
						onClick={onCancel}
						className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/75"
					>
						<SquareIcon className="size-2.5 fill-current" /> Stop
					</button>
				) : null}
			</div>
			{clarification ? (
				<ResearchClarification
					key={clarification.id}
					request={clarification}
					onSubmit={(answers) =>
						onSubmitClarification(clarification.id, answers)
					}
				/>
			) : null}

			{expanded && !clarification ? (
				<div className="mt-3 ml-[7px] border-white/10 border-l pl-5">
					{run.plan ? (
						<div className="mb-4">
							<div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">
								Plan
							</div>
							<div className="space-y-1.5">
								{run.plan.steps.map((step) => (
									<div
										key={step.id}
										className="flex min-w-0 items-center gap-2 text-xs text-white/55"
									>
										{step.status === "complete" ? (
											<CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-400/80" />
										) : step.status === "in_progress" ? (
											<Loader2Icon className="size-3.5 shrink-0 animate-spin text-white/60" />
										) : (
											<CircleIcon className="size-3.5 shrink-0 text-white/20" />
										)}
										<span>{step.title}</span>
									</div>
								))}
							</div>
						</div>
					) : null}

					<div className="max-h-72 space-y-3 overflow-y-auto pr-2">
						{timeline.length === 0 ? (
							<div className="flex items-center gap-2 text-xs text-white/45">
								<Loader2Icon className="size-3.5 animate-spin" />
								Preparing the investigation…
							</div>
						) : (
							timeline.map((event) => {
								const label = eventLabel(event)
								if (!label) return null
								return (
									<div key={event.id} className="flex items-start gap-2.5">
										<div className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
											{eventIcon(event)}
										</div>
										<div className="min-w-0 flex-1 text-xs leading-relaxed text-white/65">
											{label}
											{event.type === "tool" && event.toolName ? (
												<div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/25">
													<SearchIcon className="size-2.5" /> {event.toolName}
												</div>
											) : null}
										</div>
									</div>
								)
							})
						)}
					</div>
				</div>
			) : null}
		</section>
	)
}
