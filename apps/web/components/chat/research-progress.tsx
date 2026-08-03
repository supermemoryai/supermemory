"use client"

import { useState } from "react"
import {
	ArrowRightIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ChevronUpIcon,
	CircleHelpIcon,
	CircleIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	SearchIcon,
	SquareIcon,
	XCircleIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { SuperLoader } from "@/components/superloader"
import { dmSansClassName } from "@/lib/fonts"
import {
	pendingResearchClarification,
	type NovaResearchClarificationAnswer,
	type NovaResearchConnectionState,
	type NovaResearchEvent,
	type NovaResearchRun,
	researchFailurePresentation,
	researchPlanStepDisplayStatus,
	researchToolFailureDescription,
} from "@/lib/nova-research"
import { ResearchClarification } from "./research-clarification"

function toolLabel(name: string | null, fallback: string | null): string {
	if (fallback) return fallback
	return (name ?? "Research tool")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

function eventLabel(event: NovaResearchEvent): string | null {
	if (event.type === "error") return "A research step could not complete."
	if (event.type === "tool" && event.status === "failed") {
		return `${toolLabel(event.toolName, null)} failed`
	}
	if (event.status === "failed") return "A research step could not complete."
	if (event.title === "Research capabilities enabled" && event.message) {
		return `Enabled ${event.message} research`
	}
	if (event.type === "tool") return toolLabel(event.toolName, event.title)

	const label = event.message || event.title
	if (!label) return null
	if (
		event.type === "assistant" &&
		(label.length > 600 || /<response\b|(?:^|\n)#{1,6}\s/.test(label))
	) {
		return "Nova prepared a draft report."
	}
	return label.length > 600 ? `${label.slice(0, 597)}…` : label
}

function eventIcon(event: NovaResearchEvent) {
	if (event.status === "running" || event.status === "pending") {
		return <span className="size-2 animate-pulse rounded-full bg-white/45" />
	}
	if (event.status === "failed" || event.type === "error") {
		return <XCircleIcon className="size-3.5 text-red-400" />
	}
	if (event.type === "tool") {
		return <CheckCircle2Icon className="size-3.5 text-emerald-400/80" />
	}
	if (event.type === "assistant") {
		return <ArrowRightIcon className="size-3.5 text-white/45" />
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
	connectionState = { status: "connected", attempts: 0 },
	onRetryConnection,
	onRetryFinalization,
	onRunAgain,
	className,
}: {
	run: NovaResearchRun
	onCancel: () => Promise<void> | void
	onSubmitClarification: (
		requestId: string,
		answers: NovaResearchClarificationAnswer[],
	) => Promise<void>
	connectionState?: NovaResearchConnectionState
	onRetryConnection?: () => void
	onRetryFinalization?: () => Promise<void>
	onRunAgain?: () => Promise<void>
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
	const [pendingAction, setPendingAction] = useState<
		"cancel" | "retry-finalization" | "run-again" | null
	>(null)
	const [actionError, setActionError] = useState<string | null>(null)
	const timeline = run.events.filter(isUsefulTimelineEvent)
	const clarification = pendingResearchClarification(run)
	const failure = failed ? researchFailurePresentation(run) : null
	const statusLabel = awaitingInput
		? "Waiting for your answers"
		: active
			? "Researching"
			: failed
				? (failure?.title ?? "Research could not complete")
				: cancelled
					? "Research stopped"
					: "Research complete"

	const invokeAction = async (
		action: NonNullable<typeof pendingAction>,
		callback: (() => Promise<void> | void) | undefined,
	) => {
		if (!callback || pendingAction) return
		setPendingAction(action)
		setActionError(null)
		try {
			await callback()
		} catch {
			setActionError(
				action === "cancel"
					? "Could not stop this research. Please try again."
					: action === "retry-finalization"
						? "Could not retry the report yet. Your collected sources are still preserved."
						: "Could not start a new research run. Please try again.",
			)
		} finally {
			setPendingAction(null)
		}
	}

	return (
		<section
			className={cn("w-full py-1", dmSansClassName(), className)}
			aria-live="polite"
			data-testid="nova-research-activity"
		>
			<div className="flex items-center gap-2">
				{awaitingInput ? (
					<CircleHelpIcon className="size-4 shrink-0 text-white/45" />
				) : active ? (
					<SuperLoader
						size={34}
						label={statusLabel}
						colorClassName="text-[#4BA0FA]"
						className="!min-w-0 !gap-0 [&>span]:hidden"
					/>
				) : failed ? (
					<XCircleIcon className="size-4 shrink-0 text-red-400" />
				) : cancelled ? (
					<SquareIcon className="size-3.5 shrink-0 text-white/40" />
				) : (
					<CheckCircle2Icon className="size-4 shrink-0 text-emerald-400/80" />
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
						onClick={() => void invokeAction("cancel", onCancel)}
						disabled={pendingAction !== null}
						className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/75"
					>
						<SquareIcon className="size-2.5 fill-current" />
						{pendingAction === "cancel" ? "Stopping…" : "Stop"}
					</button>
				) : null}
			</div>

			{active && connectionState.status === "reconnecting" ? (
				<output className="mt-3 flex items-center gap-2 rounded-xl bg-[#14161A] px-3 py-2 text-xs text-white/55 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.55)]">
					<RefreshCwIcon className="size-3.5 animate-spin text-white/45" />
					<span className="min-w-0 flex-1">
						{connectionState.attempts >= 3
							? "Connection lost. Reconnecting to research updates…"
							: "Research updates are delayed. Reconnecting…"}
					</span>
					{onRetryConnection ? (
						<button
							type="button"
							onClick={onRetryConnection}
							className="shrink-0 rounded-full bg-[#0D121A] px-3 py-1.5 text-white/70 transition-colors hover:text-white"
						>
							Retry now
						</button>
					) : null}
				</output>
			) : null}

			{failure ? (
				<div
					className="mt-3 rounded-xl bg-[#191D24] p-3.5 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.55)]"
					role="alert"
				>
					<p className="text-sm font-medium text-white/80">{failure.title}</p>
					<p className="mt-1 text-xs leading-relaxed text-white/50">
						{failure.description}
					</p>
					{failure.incidentId ? (
						<p className="mt-1.5 font-mono text-[10px] text-white/30">
							Reference: {failure.incidentId}
						</p>
					) : null}
					<div className="mt-3 flex flex-wrap gap-2">
						{failure.canRetryFinalization && onRetryFinalization ? (
							<button
								type="button"
								onClick={() =>
									void invokeAction("retry-finalization", onRetryFinalization)
								}
								disabled={pendingAction !== null}
								className="rounded-full bg-[#0D121A] px-3 py-1.5 text-xs text-white/75 transition-colors hover:text-white disabled:opacity-50"
							>
								{pendingAction === "retry-finalization"
									? "Retrying…"
									: (failure.retryLabel ?? "Retry report")}
							</button>
						) : null}
						{onRunAgain ? (
							<button
								type="button"
								onClick={() => void invokeAction("run-again", onRunAgain)}
								disabled={pendingAction !== null}
								className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/75 disabled:opacity-50"
							>
								<RotateCcwIcon className="size-3" />
								{pendingAction === "run-again" ? "Starting…" : "Run again"}
							</button>
						) : null}
					</div>
				</div>
			) : cancelled && onRunAgain ? (
				<div className="mt-3">
					<button
						type="button"
						onClick={() => void invokeAction("run-again", onRunAgain)}
						disabled={pendingAction !== null}
						className="inline-flex items-center gap-1.5 rounded-full bg-[#14161A] px-3 py-1.5 text-xs text-white/55 transition-colors hover:text-white disabled:opacity-50"
					>
						<RotateCcwIcon className="size-3" />
						{pendingAction === "run-again" ? "Starting…" : "Run again"}
					</button>
				</div>
			) : null}

			{actionError ? (
				<p className="mt-2 text-xs text-red-300/80" role="alert">
					{actionError}
				</p>
			) : null}
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
								{run.plan.steps.map((step) => {
									const displayStatus = researchPlanStepDisplayStatus(
										run.status,
										step.status,
									)
									return (
										<div
											key={step.id}
											className={cn(
												"flex min-w-0 items-center gap-2 text-xs",
												displayStatus === "complete"
													? "text-white/55"
													: "text-white/35",
											)}
										>
											{displayStatus === "complete" ? (
												<CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-400/80" />
											) : displayStatus === "in_progress" ? (
												<span className="size-2 shrink-0 animate-pulse rounded-full bg-white/45" />
											) : displayStatus === "failed" ? (
												<XCircleIcon className="size-3.5 shrink-0 text-red-400/75" />
											) : displayStatus === "cancelled" ? (
												<SquareIcon className="size-3 shrink-0 text-white/30" />
											) : (
												<CircleIcon className="size-3.5 shrink-0 text-white/15" />
											)}
											<span>{step.title}</span>
										</div>
									)
								})}
							</div>
						</div>
					) : null}

					<div className="max-h-72 space-y-3 overflow-y-auto pr-2">
						{timeline.length === 0 ? (
							<div className="flex items-center gap-2 text-xs text-white/45">
								<CircleIcon className="size-3 fill-white/30 text-white/30" />
								Preparing the investigation…
							</div>
						) : (
							timeline.map((event) => {
								const label = eventLabel(event)
								if (!label) return null
								const toolFailureDescription =
									researchToolFailureDescription(event)
								return (
									<div key={event.id} className="flex items-start gap-2.5">
										<div className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
											{eventIcon(event)}
										</div>
										<div className="min-w-0 flex-1 text-xs leading-relaxed text-white/65">
											{label}
											{toolFailureDescription ? (
												<div className="mt-0.5 text-[10px] text-white/30">
													{toolFailureDescription}
												</div>
											) : event.type === "tool" && event.toolName ? (
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
