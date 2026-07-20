"use client"

import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import {
	CalendarClock,
	ChevronDown,
	ChevronUp,
	ExternalLink,
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
import { useMemo, useRef, useState } from "react"
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
import {
	type Automation,
	type AutomationCatalogTemplate,
	type AutomationChannel,
	type AutomationDraft,
	type AutomationSettings,
	type Frequency,
	type TimezoneOption,
	automationToDraft,
	catalogTemplateToDraft,
	DEFAULT_AUTOMATION_PROMPT,
	emptyAutomationDraft,
	fromLocalCron,
	sortCatalogTemplates,
	timezoneDisplayLabel,
	timezoneOptions,
	toLocalCron,
	WEEKDAYS,
} from "./company-brain-automations/domain"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const BASE = `${BACKEND}/brain/automations`

function iconForTemplate(template: AutomationCatalogTemplate): LucideIcon {
	if (template.id === "unanswered") return MessageCircleQuestion
	if (template.id === "prs-review") return GitPullRequest
	if (template.id === "issue-triage") return ListTodo
	if (template.id === "customer-signal") return LifeBuoy
	if (template.id === "competitor-check") return Radar
	if (template.id === "release-notes") return FileText
	return CalendarClock
}

function cadenceLabel(template: AutomationCatalogTemplate): string {
	if (template.cadence.frequency === "weekly") {
		return `Weekly · ${WEEKDAYS[template.cadence.weekday ?? 1] ?? "Mon"} ${template.cadence.time}`
	}
	return `Daily · ${template.cadence.time}`
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
const CHANNEL_STATUS_VALUE = "__channel_status__"

async function apiError(response: Response, fallback: string): Promise<Error> {
	const body = (await response.json().catch(() => ({}))) as { error?: string }
	return new Error(body.error ?? fallback)
}

type AutomationChannelsResponse = {
	connected: boolean
	channels: AutomationChannel[]
	defaultAutomationChannel: string | null
}

async function fetchAutomationChannels(
	forceRefresh = false,
): Promise<AutomationChannelsResponse> {
	const res = await fetch(
		`${BASE}/channels${forceRefresh ? "?refresh=1" : ""}`,
		{
			credentials: "include",
		},
	)
	if (!res.ok) throw await apiError(res, "Couldn't load Slack channels.")
	const body = (await res.json()) as {
		connected?: boolean
		channels?: AutomationChannel[]
		defaultAutomationChannel?: string | null
	}
	return {
		connected: body.connected !== false,
		channels: body.channels ?? [],
		defaultAutomationChannel:
			typeof body.defaultAutomationChannel === "string"
				? body.defaultAutomationChannel
				: null,
	}
}

type ChannelLoadState = {
	pending: boolean
	error: string | null
	connected: boolean | null
	retry: () => void
}

function OwnerChip({ label }: { label?: string }) {
	if (!label) return null
	return (
		<span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[11px] text-[#9A9A9A]">
			{label}
		</span>
	)
}

function SlackSourceLink({
	sourceThreadUrl,
}: {
	sourceThreadUrl?: string | null
}) {
	if (!sourceThreadUrl?.startsWith("https://")) return null
	return (
		<a
			href={sourceThreadUrl}
			target="_blank"
			rel="noreferrer"
			className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#6B6B6B] transition-colors hover:text-[#FAFAFA]"
			title="Open the Slack thread where this automation was created"
		>
			Slack thread
			<ExternalLink className="size-2.5" />
		</a>
	)
}

function ChannelLoadHint({
	state,
	hasChannels,
}: {
	state: ChannelLoadState
	hasChannels: boolean
}) {
	if (
		!state.pending &&
		!state.error &&
		state.connected !== false &&
		hasChannels
	) {
		return null
	}
	const message = state.pending
		? "Loading Slack channels…"
		: state.error
			? state.error
			: state.connected === false
				? "Connect Slack to deliver automations to a channel."
				: "Company Brain isn't in any channels yet. Add it to a channel, then refresh."
	return (
		<span className="flex items-center gap-2 text-[11px] text-[#737373]">
			<span>{message}</span>
			{!state.pending && state.connected !== false ? (
				<button
					type="button"
					onClick={state.retry}
					className="shrink-0 text-[#9A9A9A] underline underline-offset-2 hover:text-[#FAFAFA]"
				>
					{state.error ? "Retry" : "Refresh"}
				</button>
			) : null}
		</span>
	)
}

function QueryErrorNotice({
	message,
	onRetry,
}: {
	message: string
	onRetry: () => void
}) {
	return (
		<div className="flex items-center justify-center gap-2 rounded-[12px] border border-white/[0.06] border-dashed px-4 py-4 text-center text-[12px] text-[#737373]">
			<span>{message}</span>
			<button
				type="button"
				onClick={onRetry}
				className="shrink-0 text-[#9A9A9A] underline underline-offset-2 hover:text-[#FAFAFA]"
			>
				Retry
			</button>
		</div>
	)
}

function AutomationCard({
	initial,
	id,
	channels,
	channelLoad,
	timezoneChoices: supportedTimezoneChoices,
	ownerLabel,
	sourceThreadUrl,
	onDone,
	onChanged,
	onCancelNew,
	onCollapse,
}: {
	initial: AutomationDraft
	id: string | null
	channels: AutomationChannel[]
	channelLoad: ChannelLoadState
	timezoneChoices: TimezoneOption[]
	ownerLabel?: string
	sourceThreadUrl?: string | null
	onDone: () => void
	onChanged: () => void
	onCancelNew?: () => void
	onCollapse?: () => void
}) {
	const [draft, setDraft] = useState<AutomationDraft>(initial)
	const timezoneChoices = useMemo(() => {
		if (
			supportedTimezoneChoices.some((option) => option.value === draft.timezone)
		) {
			return supportedTimezoneChoices
		}
		return timezoneOptions(new Date(), [
			...supportedTimezoneChoices.map((option) => option.value),
			draft.timezone,
		])
	}, [draft.timezone, supportedTimezoneChoices])
	const set = <K extends keyof AutomationDraft>(
		k: K,
		v: AutomationDraft[K],
	) => {
		const changesSchedule = k === "frequency" || k === "weekday" || k === "time"
		setDraft((draft) => ({
			...draft,
			[k]: v,
			...(changesSchedule ? { rawCron: null } : {}),
			...(k !== "frequency" && draft.frequency === "advanced" && changesSchedule
				? { frequency: "daily" as const }
				: {}),
		}))
	}

	const body = () => {
		if (!draft.title.trim()) throw new Error("Give the automation a name.")
		if (draft.deliverTo === "channel" && !draft.channelId)
			throw new Error("Pick a channel to post to.")
		const cron =
			draft.rawCron ?? toLocalCron(draft.time, draft.frequency, draft.weekday)
		if (!cron) throw new Error("Pick a valid time.")
		if (!draft.timezone.trim()) throw new Error("Enter an IANA timezone.")
		return {
			title: draft.title.trim(),
			deliverTo: draft.deliverTo,
			channelId: draft.deliverTo === "dm" ? null : draft.channelId,
			prompt: draft.prompt.trim() || DEFAULT_AUTOMATION_PROMPT,
			cron,
			timezone: draft.timezone.trim(),
			enabled: draft.enabled,
			catalogId: draft.catalogId,
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
				outcome?: "deliver" | "skip" | "complete"
			}
			if (!res.ok || b.ok === false)
				throw new Error(b.reason ?? b.error ?? "Couldn't run.")
			return b.outcome ?? "deliver"
		},
		onSuccess: (outcome) => {
			toast.success(
				outcome === "complete"
					? "Condition met — automation completed without posting."
					: outcome === "skip"
						? "Automation checked and skipped this occurrence."
						: "Automation triggered — check the channel.",
			)
			if (outcome === "complete") {
				setDraft((current) => ({ ...current, enabled: false }))
			}
			onChanged()
		},
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
					<OwnerChip label={ownerLabel} />
					<SlackSourceLink sourceThreadUrl={sourceThreadUrl} />
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
						placeholder={DEFAULT_AUTOMATION_PROMPT}
						value={draft.prompt}
						onChange={(e) => set("prompt", e.target.value)}
					/>
				</label>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
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
								{!channels.length ? (
									<SelectItem
										value={CHANNEL_STATUS_VALUE}
										className={cn(selectItemClass, "cursor-default opacity-60")}
										disabled
									>
										{channelLoad.pending
											? "Loading Slack channels…"
											: channelLoad.error
												? "Slack channels unavailable"
												: channelLoad.connected === false
													? "Slack isn't connected"
													: "No Slack channels available"}
									</SelectItem>
								) : null}
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
						<ChannelLoadHint
							state={channelLoad}
							hasChannels={channels.length > 0}
						/>
					</div>

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
									{draft.frequency === "advanced" ? (
										<SelectItem
											value="advanced"
											className={selectItemClass}
											disabled
										>
											Advanced cron
										</SelectItem>
									) : null}
									<SelectItem value="daily" className={selectItemClass}>
										Daily
									</SelectItem>
									<SelectItem value="weekdays" className={selectItemClass}>
										Weekdays
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

					<label className="flex flex-col gap-1">
						<span className={fieldLabel}>Schedule timezone</span>
						<select
							aria-label="Schedule timezone"
							className={cn(controlClass, "cursor-pointer")}
							disabled={disabled}
							value={draft.timezone}
							onChange={(event) => set("timezone", event.target.value)}
						>
							{timezoneChoices.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<span className="text-[11px] text-[#5E5E5E]">
							GMT shows the current offset. The saved city timezone keeps this
							local time correct through daylight-saving changes.
						</span>
						{draft.rawCron ? (
							<span className="text-[11px] text-[#8B7447]">
								Advanced Slack schedule ({draft.rawCron}) is preserved until you
								change the frequency, day, or time.
							</span>
						) : null}
					</label>
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
	channels: AutomationChannel[]
	ownerLabel?: string
	onExpand: () => void
	onChanged: () => void
}) {
	const parsed = fromLocalCron(automation.cron)
	const target =
		automation.deliverTo === "dm"
			? "DM to you"
			: `#${channels.find((c) => c.id === automation.channelId)?.name ?? "channel"}`
	const cadence = parsed
		? parsed.frequency === "weekly"
			? `Weekly ${WEEKDAYS[parsed.weekday] ?? "Mon"} ${parsed.time}`
			: parsed.frequency === "weekdays"
				? `Weekdays ${parsed.time}`
				: `Daily ${parsed.time}`
		: `Cron ${automation.cron}`
	const scheduleLabel = `${cadence} · ${timezoneDisplayLabel(automation.timezone || "UTC")}`

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
					catalogId: automation.catalogId,
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
				outcome?: "deliver" | "skip" | "complete"
			}
			if (!res.ok || b.ok === false)
				throw new Error(b.reason ?? b.error ?? "Couldn't run.")
			return b.outcome ?? "deliver"
		},
		onSuccess: (outcome) => {
			toast.success(
				outcome === "complete"
					? "Condition met — automation completed without posting."
					: outcome === "skip"
						? "Automation checked and skipped this occurrence."
						: "Automation triggered — check the channel.",
			)
			onChanged()
		},
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

			<div className="flex min-w-0 flex-1 flex-col text-left">
				<div className="flex min-w-0 items-center gap-2">
					<button
						type="button"
						onClick={onExpand}
						className={cn(
							dmSans125ClassName(),
							"min-w-0 truncate text-[13px] font-medium text-[#FAFAFA]",
						)}
					>
						{automation.title}
					</button>
					<OwnerChip label={ownerLabel} />
					<SlackSourceLink
						sourceThreadUrl={
							automation.origin === "slack" ? automation.sourceThreadUrl : null
						}
					/>
				</div>
				<button
					type="button"
					onClick={onExpand}
					className="truncate text-left text-[12px] text-[#6B6B6B]"
				>
					{target} · {scheduleLabel}
				</button>
			</div>

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
	preset: AutomationCatalogTemplate
	onPick: () => void
}) {
	const Icon = iconForTemplate(preset)
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
	const [drafts, setDrafts] = useState<
		{ key: number; draft: AutomationDraft }[]
	>([])
	const [openId, setOpenId] = useState<string | null>(null)
	const supportedTimezoneChoices = useMemo(() => timezoneOptions(), [])
	const draftKey = useRef(0)
	const addDraft = (draft: AutomationDraft) =>
		setDrafts((d) => [...d, { key: draftKey.current++, draft }])
	const removeDraft = (key: number) =>
		setDrafts((d) => d.filter((x) => x.key !== key))

	const listQuery = useQuery({
		queryKey: ["company-brain-automations", "list", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BASE}/`, { credentials: "include" })
			if (!res.ok) throw await apiError(res, "Couldn't load automations.")
			return ((await res.json()) as { automations: Automation[] }).automations
		},
		enabled: isCompanyBrain && !!org?.id,
	})

	const channelsQuery = useQuery({
		queryKey: ["company-brain-automations", "channels", org?.id],
		queryFn: () => fetchAutomationChannels(),
		enabled: isCompanyBrain && !!org?.id,
		staleTime: 60_000,
	})

	const catalogQuery = useQuery({
		queryKey: ["company-brain-automations", "catalog"],
		queryFn: async () => {
			const res = await fetch(`${BASE}/catalog`, { credentials: "include" })
			if (!res.ok) {
				throw await apiError(res, "Couldn't load automation templates.")
			}
			return (
				(
					(await res.json()) as {
						templates: AutomationCatalogTemplate[]
					}
				).templates ?? []
			)
		},
		enabled: isCompanyBrain && !!org?.id,
		staleTime: 5 * 60_000,
	})

	const settingsQuery = useQuery({
		queryKey: ["company-brain-automations", "settings", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BASE}/settings`, { credentials: "include" })
			if (!res.ok) {
				throw await apiError(res, "Couldn't load automation settings.")
			}
			return (await res.json()) as AutomationSettings
		},
		enabled: isCompanyBrain && !!org?.id,
	})

	const appsQuery = useQuery({
		queryKey: ["company-brain-automations", "apps", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND}/brain/mcp-connections/`, {
				credentials: "include",
			})
			if (!res.ok) {
				throw await apiError(res, "Couldn't check connected apps.")
			}
			const body = (await res.json()) as {
				connections?: { serverSlug: string }[]
			}
			return (body.connections ?? []).map((c) => c.serverSlug)
		},
		enabled: isCompanyBrain && !!org?.id,
	})

	const updateDefaultChannel = useMutation({
		mutationFn: async (channelId: string) => {
			const res = await fetch(`${BASE}/settings`, {
				method: "PATCH",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ defaultAutomationChannel: channelId }),
			})
			const body = (await res.json().catch(() => ({}))) as {
				error?: string
				defaultAutomationChannel?: string
			}
			if (!res.ok)
				throw new Error(body.error ?? "Couldn't update the default channel.")
			return body.defaultAutomationChannel ?? channelId
		},
		onSuccess: (defaultAutomationChannel) => {
			queryClient.setQueryData<AutomationSettings>(
				["company-brain-automations", "settings", org?.id],
				(current) => ({
					defaultAutomationChannel,
					canEdit: current?.canEdit ?? true,
				}),
			)
			void queryClient.invalidateQueries({
				queryKey: ["company-brain-automations", "settings", org?.id],
			})
			toast.success("Default automation channel updated.")
		},
		onError: (error) =>
			toast.error(
				error instanceof Error
					? error.message
					: "Couldn't update the default channel.",
			),
	})

	if (!isCompanyBrain) return null

	const channels = channelsQuery.data?.channels ?? []
	const publicChannels = channels.filter((channel) => !channel.isPrivate)
	const channelError =
		channelsQuery.error instanceof Error ? channelsQuery.error.message : null
	const channelLoad: ChannelLoadState = {
		pending: channelsQuery.isPending || channelsQuery.isFetching,
		error: channelError,
		connected: channelsQuery.data?.connected ?? null,
		retry: () => {
			void queryClient
				.fetchQuery({
					queryKey: ["company-brain-automations", "channels", org?.id],
					queryFn: () => fetchAutomationChannels(true),
					staleTime: 0,
				})
				.catch(() => undefined)
		},
	}
	const automations = listQuery.data ?? []
	const templates = sortCatalogTemplates(
		catalogQuery.data ?? [],
		new Set(appsQuery.data ?? []),
	)
	const ownerLabelFor = (userId: string | null): string | undefined => {
		if (!userId) return undefined
		if (userId === user?.id) return "You"
		const m = org?.members?.find((mem) => mem.userId === userId)
		return m?.user?.name ?? m?.user?.email ?? "A teammate"
	}
	const refresh = () => {
		void queryClient.invalidateQueries({
			queryKey: ["company-brain-automations", "list", org?.id],
		})
	}
	const listError =
		listQuery.error instanceof Error ? listQuery.error.message : null
	const catalogError =
		catalogQuery.error instanceof Error ? catalogQuery.error.message : null
	const appsError =
		appsQuery.error instanceof Error ? appsQuery.error.message : null
	const usedCatalogIds = new Set(
		automations.flatMap((automation) =>
			automation.catalogId ? [automation.catalogId] : [],
		),
	)
	const availableTemplates =
		listQuery.data !== undefined && catalogQuery.data !== undefined
			? templates.filter((template) => !usedCatalogIds.has(template.id))
			: []
	const defaultChannelId =
		settingsQuery.data?.defaultAutomationChannel ??
		channelsQuery.data?.defaultAutomationChannel ??
		""
	const settingsError =
		settingsQuery.error instanceof Error ? settingsQuery.error.message : null
	const defaultChannelMissing = Boolean(
		defaultChannelId &&
			!publicChannels.some((channel) => channel.id === defaultChannelId),
	)
	const defaultChannelHint = settingsQuery.isPending
		? "Loading automation settings…"
		: settingsError
			? settingsError
			: settingsQuery.data?.canEdit === false
				? "Only organization owners and admins can change this setting."
				: channelLoad.pending
					? "Loading Slack channels…"
					: channelLoad.error
						? channelLoad.error
						: channelLoad.connected === false
							? "Connect Slack before choosing a default channel."
							: !publicChannels.length
								? "No public channels are available. Add Company Brain to one, then refresh."
								: defaultChannelMissing
									? "The saved default is no longer available. Choose another channel."
									: null
	const retryDefaultChannel = settingsError
		? () => {
				void settingsQuery.refetch()
			}
		: channelLoad.error ||
				(channelLoad.connected !== false &&
					!channelLoad.pending &&
					!publicChannels.length)
			? channelLoad.retry
			: null

	return (
		<section className="flex flex-col gap-5 px-1">
			<div className="flex flex-col items-stretch justify-between gap-3 rounded-[14px] bg-[#14161A] px-4 py-3 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] sm:flex-row sm:items-center sm:gap-4">
				<div className="min-w-0">
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[13px] font-medium text-[#FAFAFA]",
						)}
					>
						Default automation channel
					</p>
					<p className="mt-0.5 text-[11px] text-[#6B6B6B]">
						Team automations created in Slack post here unless another channel
						is named.
					</p>
				</div>
				<div className="flex w-full flex-col gap-1 sm:w-[280px] sm:shrink-0">
					<div className="flex items-center gap-2">
						<Select
							value={defaultChannelId || undefined}
							onValueChange={(value) => updateDefaultChannel.mutate(value)}
							disabled={
								settingsQuery.data?.canEdit !== true ||
								settingsQuery.isPending ||
								Boolean(settingsError) ||
								channelLoad.pending ||
								Boolean(channelLoad.error) ||
								channelLoad.connected === false ||
								updateDefaultChannel.isPending ||
								!publicChannels.length
							}
						>
							<SelectTrigger className={controlClass}>
								<SelectValue placeholder="Select a public channel…" />
							</SelectTrigger>
							<SelectContent className={selectContentClass}>
								{publicChannels.map((channel) => (
									<SelectItem
										key={channel.id}
										value={channel.id}
										className={selectItemClass}
									>
										# {channel.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{updateDefaultChannel.isPending ? (
							<Loader2 className="size-4 shrink-0 animate-spin text-[#737373]" />
						) : null}
					</div>
					{defaultChannelHint ? (
						<p className="flex items-center gap-2 text-[11px] text-[#737373]">
							<span>{defaultChannelHint}</span>
							{retryDefaultChannel ? (
								<button
									type="button"
									onClick={retryDefaultChannel}
									className="shrink-0 text-[#9A9A9A] underline underline-offset-2 hover:text-[#FAFAFA]"
								>
									{settingsError || channelLoad.error ? "Retry" : "Refresh"}
								</button>
							) : null}
						</p>
					) : null}
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[12px] font-medium text-[#9A9A9A]",
						)}
					>
						Your automations
					</p>
					<button
						type="button"
						onClick={() => addDraft(emptyAutomationDraft(defaultChannelId))}
						className={cn(
							dmSans125ClassName(),
							"inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] font-medium text-[#9A9A9A] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA]",
						)}
					>
						<Plus className="size-3.5" />
						New automation
					</button>
				</div>
				{automations.map((a) =>
					openId === a.id ? (
						<AutomationCard
							key={a.id}
							id={a.id}
							initial={automationToDraft(a)}
							channels={channels}
							channelLoad={channelLoad}
							timezoneChoices={supportedTimezoneChoices}
							ownerLabel={ownerLabelFor(a.createdBy)}
							sourceThreadUrl={a.origin === "slack" ? a.sourceThreadUrl : null}
							onDone={() => {
								setOpenId(null)
								refresh()
							}}
							onChanged={refresh}
							onCollapse={() => setOpenId(null)}
						/>
					) : (
						<AutomationRow
							key={a.id}
							automation={a}
							channels={channels}
							ownerLabel={ownerLabelFor(a.createdBy)}
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
						channelLoad={channelLoad}
						timezoneChoices={supportedTimezoneChoices}
						onDone={() => {
							removeDraft(key)
							refresh()
						}}
						onChanged={refresh}
						onCancelNew={() => removeDraft(key)}
					/>
				))}
				{listQuery.isPending ? (
					<p className="text-[12px] text-[#6B6B6B]">Loading automations…</p>
				) : null}
				{listError ? (
					<QueryErrorNotice
						message={listError}
						onRetry={() => {
							void listQuery.refetch()
						}}
					/>
				) : null}
				{listQuery.data !== undefined &&
				!listError &&
				!automations.length &&
				!drafts.length ? (
					<p className="rounded-[12px] border border-white/[0.06] border-dashed px-4 py-5 text-center text-[12px] text-[#6B6B6B]">
						No automations yet. Start with a template or create your own.
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-3">
				<p
					className={cn(
						dmSans125ClassName(),
						"text-[12px] font-medium text-[#9A9A9A]",
					)}
				>
					Templates
				</p>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{availableTemplates.map((template) => (
						<PresetCard
							key={template.id}
							preset={template}
							onPick={() =>
								addDraft(catalogTemplateToDraft(template, defaultChannelId))
							}
						/>
					))}
				</div>
				{catalogQuery.isPending || listQuery.isPending ? (
					<p className="text-[12px] text-[#6B6B6B]">Loading templates…</p>
				) : null}
				{catalogError ? (
					<QueryErrorNotice
						message={catalogError}
						onRetry={() => {
							void catalogQuery.refetch()
						}}
					/>
				) : null}
				{appsError && !catalogError ? (
					<QueryErrorNotice
						message={appsError}
						onRetry={() => {
							void appsQuery.refetch()
						}}
					/>
				) : null}
				{catalogQuery.data !== undefined &&
				listQuery.data !== undefined &&
				!catalogError &&
				!listError &&
				!availableTemplates.length ? (
					<p className="rounded-[12px] border border-white/[0.06] border-dashed px-4 py-5 text-center text-[12px] text-[#6B6B6B]">
						All templates are already in your automations.
					</p>
				) : null}
			</div>
		</section>
	)
}
