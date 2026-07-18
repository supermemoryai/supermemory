"use client"

import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import {
	CalendarClock,
	ChevronDown,
	ChevronUp,
	FileText,
	GitPullRequest,
	Info,
	LifeBuoy,
	ListTodo,
	Loader2,
	MessageCircleQuestion,
	Plus,
	Radar,
	Trash2,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { dmSans125ClassName } from "@/lib/fonts"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const BASE = `${BACKEND}/brain/automations`

type Automation = {
	id: string
	enabled: boolean
	title: string
	channelId: string
	deliverTo: "channel" | "dm"
	prompt: string
	cron: string
	timezone: string | null
	createdBy: string | null
}
type Channel = { id: string; name: string; isPrivate: boolean }
type Frequency = "daily" | "weekly"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DEFAULT_PROMPT =
	"Summarize what's happened recently across the connected tools and channels: open items, unanswered questions, decisions, and anything the team should know. Keep it a short, scannable recap."

// Local day/time -> UTC cron; the Date roundtrip carries any day rollover.
function toUtcCron(
	time: string,
	frequency: Frequency,
	weekday: number,
): string | null {
	const [hh, mm] = time.split(":").map(Number)
	if (
		hh === undefined ||
		mm === undefined ||
		Number.isNaN(hh) ||
		Number.isNaN(mm)
	)
		return null
	const d = new Date()
	d.setHours(hh, mm, 0, 0)
	if (frequency === "weekly")
		d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7))
	const m = d.getUTCMinutes()
	const h = d.getUTCHours()
	return frequency === "daily"
		? `${m} ${h} * * *`
		: `${m} ${h} * * ${d.getUTCDay()}`
}

function fromUtcCron(
	cron: string,
): { frequency: Frequency; weekday: number; time: string } | null {
	const parts = cron.trim().split(/\s+/)
	if (parts.length !== 5) return null
	const [min, hr, , , dow] = parts
	const mm = Number(min)
	const hh = Number(hr)
	if (Number.isNaN(mm) || Number.isNaN(hh)) return null
	const d = new Date()
	d.setUTCHours(hh, mm, 0, 0)
	const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
	if (dow === "*") return { frequency: "daily", weekday: 1, time }
	const targetDow = Number(dow)
	if (Number.isNaN(targetDow)) return null
	d.setUTCDate(d.getUTCDate() + ((targetDow - d.getUTCDay() + 7) % 7))
	return { frequency: "weekly", weekday: d.getDay(), time }
}

type Draft = {
	title: string
	channelId: string
	deliverTo: "channel" | "dm"
	prompt: string
	frequency: Frequency
	weekday: number
	time: string
	enabled: boolean
}

function toDraft(a: Automation): Draft {
	const parsed = fromUtcCron(a.cron)
	return {
		title: a.title,
		channelId: a.channelId,
		deliverTo: a.deliverTo === "dm" ? "dm" : "channel",
		prompt: a.prompt,
		frequency: parsed?.frequency ?? "daily",
		weekday: parsed?.weekday ?? 1,
		time: parsed?.time ?? "09:00",
		enabled: a.enabled,
	}
}

const emptyDraft = (): Draft => ({
	title: "",
	channelId: "",
	deliverTo: "channel",
	prompt: DEFAULT_PROMPT,
	frequency: "daily",
	weekday: 1,
	time: "09:00",
	enabled: true,
})

type Category = "team" | "engineering" | "support" | "product"

type Preset = {
	id: string
	label: string
	description: string
	icon: LucideIcon
	category: Category
	requiresApps?: string[]
	prompt: string
	frequency: Frequency
	weekday?: number
	time: string
}

const PRESETS: Preset[] = [
	{
		id: "standup",
		category: "team",
		label: "Morning checkup",
		description:
			"Shipped work, decisions, blockers & open questions from the last 24h.",
		icon: CalendarClock,
		prompt:
			"Give a short standup for this channel: what happened in the last 24 hours across our connected tools and this channel — work shipped, decisions made, blockers, and open questions. Keep it tight and scannable.",
		frequency: "daily",
		time: "09:00",
	},
	{
		id: "weekly-recap",
		category: "team",
		label: "Company progress",
		description:
			"Decisions, shipped work & unresolved threads from the past week.",
		icon: CalendarClock,
		prompt:
			"Weekly recap for the team: decisions made, work shipped, and unresolved threads across our connected tools and channels over the past 7 days.",
		frequency: "weekly",
		weekday: 1,
		time: "09:00",
	},
	{
		id: "unanswered",
		category: "team",
		label: "Unanswered questions",
		description: "Questions in this channel from the last 24h with no reply.",
		icon: MessageCircleQuestion,
		prompt:
			"Surface questions asked in this channel in the last 24 hours that haven't gotten a reply yet, so nothing slips through.",
		frequency: "daily",
		time: "16:00",
	},
	{
		id: "prs-review",
		category: "engineering",
		label: "PRs awaiting review",
		description: "Open PRs waiting on review; flags stale ones.",
		icon: GitPullRequest,
		requiresApps: ["github"],
		prompt:
			"List open pull requests awaiting review. Flag any with no activity for 2+ days. Group by repository.",
		frequency: "daily",
		time: "09:30",
	},
	{
		id: "issue-triage",
		category: "engineering",
		label: "Issue triage",
		description: "New or unassigned issues that need a response.",
		icon: ListTodo,
		requiresApps: ["github", "linear"],
		prompt:
			"Summarize new or unassigned issues from the last 24 hours that need triage or a response.",
		frequency: "daily",
		time: "09:00",
	},
	{
		id: "customer-signal",
		category: "support",
		label: "Customer signal",
		description: "Recent customer issues & feedback and their status.",
		icon: LifeBuoy,
		requiresApps: ["plain", "linear"],
		prompt:
			"Recap customer issues and feedback raised recently across our tools and channels, with their current status.",
		frequency: "daily",
		time: "09:00",
	},
	{
		id: "competitor-check",
		category: "product",
		label: "Competitor check",
		description: "What competitors shipped, announced, or changed this week.",
		icon: Radar,
		prompt:
			"Check what our competitors shipped, announced, or changed recently — launches, pricing changes, and anything the team should react to.",
		frequency: "weekly",
		weekday: 1,
		time: "09:00",
	},
	{
		id: "release-notes",
		category: "product",
		label: "Release notes draft",
		description: "Draft notes from PRs merged since the last digest.",
		icon: FileText,
		requiresApps: ["github"],
		prompt:
			"Draft release notes from pull requests merged since the last digest, grouped into features, fixes, and chores.",
		frequency: "weekly",
		weekday: 5,
		time: "16:00",
	},
]

function presetToDraft(p: Preset): Draft {
	return {
		title: p.label,
		channelId: "",
		deliverTo: "channel",
		prompt: p.prompt,
		frequency: p.frequency,
		weekday: p.weekday ?? 1,
		time: p.time,
		enabled: true,
	}
}

// Connected-app presets first, universal next, unconnected-app presets last.
function sortPresets(connected: Set<string>): Preset[] {
	const rank = (p: Preset) => {
		if (!p.requiresApps) return 1
		return p.requiresApps.some((a) => connected.has(a)) ? 0 : 2
	}
	return [...PRESETS].sort((a, b) => rank(a) - rank(b))
}

function cadenceLabel(p: Preset): string {
	if (p.frequency === "weekly")
		return `Weekly · ${WEEKDAYS[p.weekday ?? 1] ?? "Mon"} ${p.time}`
	return `Daily · ${p.time}`
}

const controlClass = cn(
	dmSans125ClassName(),
	"h-9 w-full rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-3 text-[13px] text-[#FAFAFA] outline-none disabled:opacity-50",
)
const fieldLabel = cn(dmSans125ClassName(), "text-[12px] text-[#9A9A9A]")
const selectContentClass = cn(
	dmSans125ClassName(),
	"rounded-[10px] border-white/[0.08] bg-[#1B1F24] text-[#FAFAFA] shadow-[0px_8px_24px_rgba(0,0,0,0.5)]",
)
const selectItemClass =
	"cursor-pointer rounded-[8px] text-[13px] text-[#FAFAFA] hover:bg-white/10 hover:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white focus:bg-white/10 focus:text-white"
const DM_VALUE = "__dm__"

function AutomationCard({
	initial,
	id,
	channels,
	ownerLabel,
	onDone,
	onCancelNew,
	onCollapse,
}: {
	initial: Draft
	id: string | null
	channels: Channel[]
	ownerLabel?: string
	onDone: () => void
	onCancelNew?: () => void
	onCollapse?: () => void
}) {
	const [draft, setDraft] = useState<Draft>(initial)
	const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
		setDraft((d) => ({ ...d, [k]: v }))

	const body = () => {
		if (!draft.title.trim()) throw new Error("Give the automation a name.")
		if (draft.deliverTo === "channel" && !draft.channelId)
			throw new Error("Pick a channel to post to.")
		const cron = toUtcCron(draft.time, draft.frequency, draft.weekday)
		if (!cron) throw new Error("Pick a valid time.")
		return {
			title: draft.title.trim(),
			deliverTo: draft.deliverTo,
			channelId: draft.deliverTo === "dm" ? null : draft.channelId,
			prompt: draft.prompt.trim() || DEFAULT_PROMPT,
			cron,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			enabled: draft.enabled,
		}
	}

	const save = useMutation({
		mutationFn: async () => {
			const payload = body()
			const res = await fetch(id ? `${BASE}/${id}` : `${BASE}/`, {
				method: id ? "PUT" : "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			})
			if (res.status === 403)
				throw new Error("You can only manage automations you created.")
			if (!res.ok) {
				const b = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(b.error ?? "Couldn't save.")
			}
		},
		onSuccess: () => {
			toast.success("Automation saved.")
			onDone()
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Couldn't save."),
	})

	const trigger = useMutation({
		mutationFn: async () => {
			if (!id) throw new Error("Save the automation first.")
			const res = await fetch(`${BASE}/${id}/run-now`, {
				method: "POST",
				credentials: "include",
			})
			const b = (await res.json().catch(() => ({}))) as {
				ok?: boolean
				reason?: string
				error?: string
			}
			if (!res.ok || b.ok === false)
				throw new Error(b.reason ?? b.error ?? "Couldn't run.")
		},
		onSuccess: () => toast.success("Automation triggered — check the channel."),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Couldn't run."),
	})

	const remove = useMutation({
		mutationFn: async () => {
			if (!id) return
			const res = await fetch(`${BASE}/${id}`, {
				method: "DELETE",
				credentials: "include",
			})
			if (!res.ok) throw new Error("Couldn't delete.")
		},
		onSuccess: () => {
			toast.success("Automation removed.")
			onDone()
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Couldn't delete."),
	})

	const busy = save.isPending || trigger.isPending || remove.isPending
	const disabled = busy

	return (
		<div
			className={cn(
				"relative flex flex-col gap-3 rounded-[14px] bg-[#14161A] p-5",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-2">
					<input
						className={cn(controlClass, "flex-1 font-medium")}
						disabled={disabled}
						placeholder="Automation name (e.g. Support morning recap)"
						value={draft.title}
						onChange={(e) => set("title", e.target.value)}
					/>
					{ownerLabel ? (
						<span
							className={cn(
								dmSans125ClassName(),
								"shrink-0 rounded-full border border-white/10 px-2 py-1 text-[11px] text-[#9A9A9A]",
							)}
						>
							{ownerLabel}
						</span>
					) : null}
				</div>
				{onCollapse ? (
					<button
						type="button"
						onClick={onCollapse}
						title="Collapse"
						className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA]"
					>
						<ChevronUp className="size-4" />
					</button>
				) : null}
				<button
					type="button"
					role="switch"
					aria-checked={draft.enabled}
					disabled={disabled}
					onClick={() => set("enabled", !draft.enabled)}
					className={cn(
						"relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
						draft.enabled ? "bg-[#2563FF]" : "bg-white/10",
					)}
				>
					<span
						className={cn(
							"pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
							draft.enabled ? "translate-x-4" : "translate-x-0",
						)}
					/>
				</button>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label className="flex min-h-[200px] flex-col gap-1">
					<span className={fieldLabel}>Prompt</span>
					<textarea
						className={cn(
							dmSans125ClassName(),
							"h-full min-h-[120px] w-full flex-1 resize-none rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-3 py-2 text-[13px] leading-[1.5] text-[#FAFAFA] outline-none disabled:opacity-50",
						)}
						disabled={disabled}
						placeholder={DEFAULT_PROMPT}
						value={draft.prompt}
						onChange={(e) => set("prompt", e.target.value)}
					/>
				</label>

				<div className="flex flex-col gap-3">
					<label className="flex flex-col gap-1">
						<span className={cn(fieldLabel, "flex items-center gap-1")}>
							Deliver to
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="inline-flex text-[#6B6B6B] hover:text-[#9A9A9A]"
											tabIndex={-1}
										>
											<Info className="size-3" />
										</button>
									</TooltipTrigger>
									<TooltipContent className="max-w-[260px]">
										Only channels Company Brain has been added to are listed —
										invite the bot to a channel to use it. A DM goes privately
										to you and can also read your personal connections.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</span>
						<Select
							value={draft.deliverTo === "dm" ? DM_VALUE : draft.channelId}
							onValueChange={(v) =>
								setDraft((d) =>
									v === DM_VALUE
										? { ...d, deliverTo: "dm", channelId: "" }
										: { ...d, deliverTo: "channel", channelId: v },
								)
							}
							disabled={disabled}
						>
							<SelectTrigger className={controlClass}>
								<SelectValue placeholder="Select a channel…" />
							</SelectTrigger>
							<SelectContent className={selectContentClass}>
								<SelectItem value={DM_VALUE} className={selectItemClass}>
									📩 Direct message to me
								</SelectItem>
								{channels.map((ch) => (
									<SelectItem
										key={ch.id}
										value={ch.id}
										className={selectItemClass}
									>
										{ch.isPrivate ? "🔒 " : "# "}
										{ch.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</label>

					<div className="flex gap-3">
						<div className="flex flex-1 flex-col gap-1">
							<span className={fieldLabel}>Frequency</span>
							<Select
								value={draft.frequency}
								onValueChange={(v) => set("frequency", v as Frequency)}
								disabled={disabled}
							>
								<SelectTrigger className={controlClass}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent className={selectContentClass}>
									<SelectItem value="daily" className={selectItemClass}>
										Daily
									</SelectItem>
									<SelectItem value="weekly" className={selectItemClass}>
										Weekly
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{draft.frequency === "weekly" ? (
							<div className="flex flex-1 flex-col gap-1">
								<span className={fieldLabel}>Day</span>
								<Select
									value={String(draft.weekday)}
									onValueChange={(v) => set("weekday", Number(v))}
									disabled={disabled}
								>
									<SelectTrigger className={controlClass}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className={selectContentClass}>
										{WEEKDAYS.map((label, i) => (
											<SelectItem
												key={label}
												value={String(i)}
												className={selectItemClass}
											>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : null}

						<label className="flex flex-1 flex-col gap-1">
							<span className={fieldLabel}>Time</span>
							<input
								type="time"
								className={controlClass}
								disabled={disabled}
								value={draft.time}
								onChange={(e) => set("time", e.target.value)}
							/>
						</label>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3 pt-1">
				<div className="flex items-center gap-2">
					{id ? (
						<button
							type="button"
							disabled={disabled}
							onClick={() => remove.mutate()}
							className={cn(
								dmSans125ClassName(),
								"inline-flex size-9 items-center justify-center rounded-full text-[#8A5247] transition-colors hover:bg-[#1A0F0C]/60 hover:text-[#C73B1B] disabled:cursor-not-allowed disabled:opacity-45",
							)}
							title="Delete automation"
						>
							{remove.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Trash2 className="size-4" />
							)}
						</button>
					) : onCancelNew ? (
						<button
							type="button"
							disabled={busy}
							onClick={onCancelNew}
							className={cn(
								dmSans125ClassName(),
								"inline-flex h-9 items-center rounded-full px-3 text-[13px] text-[#9A9A9A] transition-colors hover:text-[#FAFAFA] disabled:opacity-45",
							)}
						>
							Cancel
						</button>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					{id ? (
						<button
							type="button"
							disabled={disabled}
							onClick={() => trigger.mutate()}
							className={cn(
								dmSans125ClassName(),
								"inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-transparent px-4 text-[13px] font-medium text-[#9A9A9A] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45",
							)}
						>
							{trigger.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							{trigger.isPending ? "Running…" : "Run now"}
						</button>
					) : null}
					<button
						type="button"
						disabled={disabled}
						onClick={() => save.mutate()}
						className={cn(
							dmSans125ClassName(),
							"inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#14161A] px-4 text-[13px] font-semibold text-[#FAFAFA] shadow-inside-out transition-colors hover:bg-[#121820] disabled:cursor-not-allowed disabled:opacity-45",
						)}
					>
						{save.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : null}
						{save.isPending ? "Saving…" : "Save"}
					</button>
				</div>
			</div>
		</div>
	)
}

function AutomationRow({
	automation,
	channels,
	ownerLabel,
	onExpand,
	onChanged,
}: {
	automation: Automation
	channels: Channel[]
	ownerLabel?: string
	onExpand: () => void
	onChanged: () => void
}) {
	const parsed = fromUtcCron(automation.cron)
	const target =
		automation.deliverTo === "dm"
			? "DM to you"
			: `#${channels.find((c) => c.id === automation.channelId)?.name ?? "channel"}`
	const cadence = parsed
		? parsed.frequency === "weekly"
			? `Weekly ${WEEKDAYS[parsed.weekday] ?? "Mon"} ${parsed.time}`
			: `Daily ${parsed.time}`
		: "Not scheduled"

	const toggle = useMutation({
		mutationFn: async () => {
			const res = await fetch(`${BASE}/${automation.id}`, {
				method: "PUT",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title: automation.title,
					deliverTo: automation.deliverTo,
					channelId:
						automation.deliverTo === "dm" ? null : automation.channelId,
					prompt: automation.prompt,
					cron: automation.cron,
					timezone: automation.timezone,
					enabled: !automation.enabled,
				}),
			})
			if (res.status === 403)
				throw new Error("You can only manage automations you created.")
			if (!res.ok) throw new Error("Couldn't update.")
		},
		onSuccess: onChanged,
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Couldn't update."),
	})

	const trigger = useMutation({
		mutationFn: async () => {
			const res = await fetch(`${BASE}/${automation.id}/run-now`, {
				method: "POST",
				credentials: "include",
			})
			const b = (await res.json().catch(() => ({}))) as {
				ok?: boolean
				reason?: string
				error?: string
			}
			if (!res.ok || b.ok === false)
				throw new Error(b.reason ?? b.error ?? "Couldn't run.")
		},
		onSuccess: () => toast.success("Automation triggered — check the channel."),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Couldn't run."),
	})

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-[14px] bg-[#14161A] px-4 py-3",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<button
				type="button"
				role="switch"
				aria-checked={automation.enabled}
				disabled={toggle.isPending}
				onClick={() => toggle.mutate()}
				title={automation.enabled ? "Disable" : "Enable"}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50",
					automation.enabled ? "bg-[#2563FF]" : "bg-white/10",
				)}
			>
				<span
					className={cn(
						"pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
						automation.enabled ? "translate-x-4" : "translate-x-0",
					)}
				/>
			</button>

			<button
				type="button"
				onClick={onExpand}
				className="flex min-w-0 flex-1 flex-col text-left"
			>
				<span className="flex items-center gap-2">
					<span
						className={cn(
							dmSans125ClassName(),
							"truncate text-[13px] font-medium text-[#FAFAFA]",
						)}
					>
						{automation.title}
					</span>
					{ownerLabel ? (
						<span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-[#9A9A9A]">
							{ownerLabel}
						</span>
					) : null}
				</span>
				<span className="truncate text-[12px] text-[#6B6B6B]">
					{target} · {cadence}
				</span>
			</button>

			<button
				type="button"
				disabled={trigger.isPending}
				onClick={() => trigger.mutate()}
				className={cn(
					dmSans125ClassName(),
					"inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] font-medium text-[#9A9A9A] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:opacity-45",
				)}
			>
				{trigger.isPending ? (
					<Loader2 className="size-3.5 animate-spin" />
				) : null}
				Run now
			</button>

			<button
				type="button"
				onClick={onExpand}
				title="Edit"
				className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA]"
			>
				<ChevronDown className="size-4" />
			</button>
		</div>
	)
}

function PresetCard({
	preset,
	onPick,
}: {
	preset: Preset
	onPick: () => void
}) {
	const Icon = preset.icon
	return (
		<button
			type="button"
			onClick={onPick}
			className={cn(
				dmSans125ClassName(),
				"flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-xl bg-[#14161A] p-4 text-left",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors hover:bg-[#171A1F]",
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					<Icon className="size-4 text-[#9A9A9A]" />
				</div>
				<div className="min-w-0 pt-0.5">
					<p className="truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]">
						{preset.label}
					</p>
					<p className="mt-1 line-clamp-2 break-words text-[12px] font-medium leading-5 text-[#737373]">
						{preset.description}
					</p>
				</div>
			</div>
			<div className="flex min-h-9 items-center justify-between gap-3 border-[#1E293B]/50 border-t pt-3">
				<span className="text-[12px] font-medium text-[#737373]">
					{cadenceLabel(preset)}
				</span>
				<span className="text-[12px] font-medium text-[#8B929E]">
					Use template
				</span>
			</div>
		</button>
	)
}

export default function CompanyBrainAutomations() {
	const isCompanyBrain = useHasCompanyBrain()
	const { user, org } = useAuth()
	const queryClient = useQueryClient()
	const [drafts, setDrafts] = useState<{ key: number; draft: Draft }[]>([])
	const [openId, setOpenId] = useState<string | null>(null)
	const draftKey = useRef(0)
	const addDraft = (draft: Draft) =>
		setDrafts((d) => [...d, { key: draftKey.current++, draft }])
	const removeDraft = (key: number) =>
		setDrafts((d) => d.filter((x) => x.key !== key))

	const listQuery = useQuery({
		queryKey: ["company-brain-automations", "list", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BASE}/`, { credentials: "include" })
			if (!res.ok) throw new Error("failed")
			return ((await res.json()) as { automations: Automation[] }).automations
		},
		enabled: isCompanyBrain,
	})

	const channelsQuery = useQuery({
		queryKey: ["company-brain-automations", "channels", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BASE}/channels`, { credentials: "include" })
			if (!res.ok) return [] as Channel[]
			return ((await res.json()) as { channels: Channel[] }).channels ?? []
		},
		enabled: isCompanyBrain,
	})

	const appsQuery = useQuery({
		queryKey: ["company-brain-automations", "apps", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND}/brain/mcp-connections/`, {
				credentials: "include",
			})
			if (!res.ok) return [] as string[]
			const body = (await res.json()) as {
				connections?: { serverSlug: string }[]
			}
			return (body.connections ?? []).map((c) => c.serverSlug)
		},
		enabled: isCompanyBrain,
	})

	if (!isCompanyBrain) return null

	const channels = channelsQuery.data ?? []
	const automations = listQuery.data ?? []
	const presets = sortPresets(new Set(appsQuery.data ?? []))
	const nameFor = (userId: string | null): string | undefined => {
		if (!userId) return undefined
		if (userId === user?.id) return "You"
		const m = org?.members?.find((mem) => mem.userId === userId)
		return m?.user?.name ?? m?.user?.email ?? "A teammate"
	}
	const refresh = () => {
		void queryClient.invalidateQueries({
			queryKey: ["company-brain-automations", "list"],
		})
	}
	const usedTitles = new Set(automations.map((a) => a.title))
	const availablePresets = presets.filter((p) => !usedTitles.has(p.label))
	const hasList = automations.length > 0 || drafts.length > 0

	return (
		<section className="flex flex-col gap-3 px-1">
			<div className="flex flex-col gap-3">
				{automations.map((a) =>
					openId === a.id ? (
						<AutomationCard
							key={a.id}
							id={a.id}
							initial={toDraft(a)}
							channels={channels}
							onDone={() => {
								setOpenId(null)
								refresh()
							}}
							onCollapse={() => setOpenId(null)}
						/>
					) : (
						<AutomationRow
							key={a.id}
							automation={a}
							channels={channels}
							ownerLabel={
								a.createdBy && a.createdBy !== user?.id
									? nameFor(a.createdBy)
									: undefined
							}
							onExpand={() => setOpenId(a.id)}
							onChanged={refresh}
						/>
					),
				)}

				{drafts.map(({ key, draft }) => (
					<AutomationCard
						key={key}
						id={null}
						initial={draft}
						channels={channels}
						onDone={() => {
							removeDraft(key)
							refresh()
						}}
						onCancelNew={() => removeDraft(key)}
					/>
				))}

				{hasList ? (
					<p
						className={cn(
							dmSans125ClassName(),
							"pt-2 text-[12px] font-medium text-[#6B6B6B]",
						)}
					>
						Templates
					</p>
				) : null}
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{availablePresets.map((p) => (
						<PresetCard
							key={p.id}
							preset={p}
							onPick={() => addDraft(presetToDraft(p))}
						/>
					))}
					<button
						type="button"
						onClick={() => addDraft(emptyDraft())}
						className={cn(
							dmSans125ClassName(),
							"flex min-h-[104px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A313C] border-dashed",
							"text-[13px] font-medium text-[#737B87] transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]",
						)}
					>
						<Plus className="size-4" />
						New automation
					</button>
				</div>
			</div>
		</section>
	)
}
