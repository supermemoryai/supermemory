"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { useSyncRuns } from "@/hooks/use-sync-runs"
import type { SyncRun } from "@/hooks/use-sync-runs"
import {
	formatRelativeTime,
	TRIGGER_TYPE_LABELS,
} from "@/components/settings/sync-utils"

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
	completed: { dot: "bg-[#00AC3F]", text: "text-[#00AC3F]" },
	failed: { dot: "bg-[#EF4444]", text: "text-[#EF4444]" },
	running: { dot: "bg-[#4BA0FA] animate-pulse", text: "text-[#4BA0FA]" },
}

function pluralize(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/** Calendar-day bucket label for grouping runs in the timeline. */
function dayLabel(date: string) {
	const d = new Date(date)
	if (Number.isNaN(d.getTime())) return "Unknown"
	const today = new Date()
	const startOfDay = (x: Date) =>
		new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
	const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86_400_000)
	if (diffDays <= 0) return "Today"
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 7) return `${diffDays} days ago`
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function StatTile({ value, label }: { value: string; label: string }) {
	return (
		<div className="flex-1 bg-[#0D0F14] rounded-[10px] border border-[rgba(82,89,102,0.2)] px-3 py-2 flex flex-col gap-0.5">
			<span
				className={cn(
					dmSans125ClassName(),
					"text-[15px] font-medium text-[#FAFAFA] tabular-nums",
				)}
			>
				{value}
			</span>
			<span className={cn(dmSans125ClassName(), "text-[11px] text-[#737373]")}>
				{label}
			</span>
		</div>
	)
}

function SummaryStats({ runs }: { runs: SyncRun[] }) {
	const totalItems = runs.reduce((sum, r) => sum + r.itemsProcessed, 0)
	const finished = runs.filter((r) => r.status !== "running")
	const succeeded = finished.filter((r) => r.status === "completed").length
	const successRate =
		finished.length > 0 ? Math.round((succeeded / finished.length) * 100) : null

	return (
		<div className="flex items-stretch gap-2">
			<StatTile
				value={String(runs.length)}
				label={runs.length === 1 ? "sync" : "syncs"}
			/>
			<StatTile
				value={String(totalItems)}
				label={totalItems === 1 ? "item" : "items"}
			/>
			<StatTile
				value={successRate === null ? "—" : `${successRate}%`}
				label="success"
			/>
		</div>
	)
}

function TimelineRow({ run, isLast }: { run: SyncRun; isLast: boolean }) {
	const colors = STATUS_COLORS[run.status] ?? {
		dot: "bg-[#4BA0FA] animate-pulse",
		text: "text-[#4BA0FA]",
	}
	const triggerLabel = TRIGGER_TYPE_LABELS[run.triggerType] ?? run.triggerType
	const statusLabel = run.status.charAt(0).toUpperCase() + run.status.slice(1)

	return (
		<div className="flex gap-2.5">
			{/* Timeline rail: dot + connecting line */}
			<div className="flex flex-col items-center pt-1.5">
				<div className={cn("size-[7px] rounded-full shrink-0", colors.dot)} />
				{!isLast && <div className="w-px flex-1 bg-[#1A1D24] mt-1" />}
			</div>

			{/* Content */}
			<div className={cn("flex-1 min-w-0", isLast ? "pb-0" : "pb-3")}>
				<div className="flex items-baseline justify-between gap-2">
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span
							className={cn(
								dmSans125ClassName(),
								"text-[13px] font-medium shrink-0",
								colors.text,
							)}
						>
							{statusLabel}
						</span>
						<span
							className={cn(
								dmSans125ClassName(),
								"text-[12px] text-[#737373] truncate",
							)}
						>
							· {triggerLabel}
						</span>
					</div>
					<span
						className={cn(
							dmSans125ClassName(),
							"text-[12px] text-[#737373] shrink-0",
						)}
					>
						{formatRelativeTime(run.startedAt)}
					</span>
				</div>

				{(run.itemsProcessed > 0 || run.itemsFailed > 0) && (
					<div
						className={cn(
							dmSans125ClassName(),
							"text-[12px] text-[#737373] mt-0.5",
						)}
					>
						{pluralize(run.itemsProcessed, "item")} processed
						{run.itemsFailed > 0 && (
							<span className="text-[#EF4444]">
								{" "}
								· {run.itemsFailed} failed
							</span>
						)}
					</div>
				)}

				{run.error && (
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[12px] text-[#EF4444]/80 break-words line-clamp-3 mt-0.5",
						)}
					>
						{run.error}
					</p>
				)}
			</div>
		</div>
	)
}

function Timeline({ runs }: { runs: SyncRun[] }) {
	// Group consecutive runs by calendar-day label, preserving server order.
	const groups: { label: string; runs: SyncRun[] }[] = []
	for (const run of runs) {
		const label = dayLabel(run.startedAt)
		const last = groups.at(-1)
		if (last && last.label === label) {
			last.runs.push(run)
		} else {
			groups.push({ label, runs: [run] })
		}
	}

	return (
		<div className="flex flex-col gap-3">
			{groups.map((group, gi) => (
				<div key={`${group.label}-${gi}`} className="flex flex-col gap-1.5">
					<span
						className={cn(
							dmSans125ClassName(),
							"text-[10px] uppercase tracking-wide text-[#525966]",
						)}
					>
						{group.label}
					</span>
					<div className="flex flex-col">
						{group.runs.map((run, i) => (
							<TimelineRow
								key={run.id}
								run={run}
								isLast={i === group.runs.length - 1}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

interface SyncHistoryPanelProps {
	connectionId: string
	/** Only fetch / render when expanded. */
	isOpen: boolean
}

/** Inline sync-history view (stats strip + timeline) rendered inside an expanded connection row. */
export function SyncHistoryPanel({
	connectionId,
	isOpen,
}: SyncHistoryPanelProps) {
	const {
		data: syncRuns,
		isLoading,
		error,
		refetch,
	} = useSyncRuns(isOpen ? connectionId : "")

	if (!isOpen) return null

	const hasRuns = !isLoading && !error && syncRuns && syncRuns.length > 0

	return (
		<div className="flex flex-col gap-3">
			{isLoading && (
				<div className="flex items-center justify-center py-6">
					<div className="size-5 border-2 border-[#737373] border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			{error && !isLoading && (
				<div className="flex items-center justify-center gap-2 py-6">
					<span
						className={cn(dmSans125ClassName(), "text-[13px] text-[#737373]")}
					>
						Failed to load sync history
					</span>
					<button
						type="button"
						onClick={() => refetch()}
						className={cn(
							dmSans125ClassName(),
							"text-[13px] text-[#4BA0FA] hover:text-[#4BA0FA]/80 underline cursor-pointer",
						)}
					>
						Try again
					</button>
				</div>
			)}

			{!isLoading && !error && syncRuns && syncRuns.length === 0 && (
				<div className="flex items-center justify-center py-6">
					<span
						className={cn(dmSans125ClassName(), "text-[13px] text-[#737373]")}
					>
						No syncs yet — runs will appear here.
					</span>
				</div>
			)}

			{hasRuns && (
				<>
					<SummaryStats runs={syncRuns} />
					<Timeline runs={syncRuns} />
				</>
			)}
		</div>
	)
}
