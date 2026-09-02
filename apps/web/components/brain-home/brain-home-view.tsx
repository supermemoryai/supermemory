"use client"

import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Check, FileText, Loader2, UserPlus } from "lucide-react"
import { useQueryState } from "nuqs"
import { useSettingsModal } from "@/components/settings/settings-modal"
import { useBrainTrial } from "@/hooks/use-brain-trial"
import { useTrialStatus } from "@/hooks/use-trial-status"
import { dmSans125ClassName } from "@/lib/fonts"
import { useViewMode } from "@/lib/view-mode-context"
import {
	AskInSlackCard,
	CONNECT_TOOLS_CARD_ID,
	ConnectToolsCard,
	useConnectionsBoard,
} from "./connections-board"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const cardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

type RecentDoc = {
	id?: string
	title?: string | null
	createdAt?: string | Date | null
	updatedAt?: string | Date | null
}

type RolloutOverview = {
	status: "running" | "done" | "failed"
	discovered: number
	joined: number
	ready: number
	introduced: number
	failed: number
}

type BrainOverview = {
	research: { status: string | null }
	slack: {
		connected: boolean
		teamName: string | null
		rollout: RolloutOverview | null
	}
	connections: { apps: number }
	members: { count: number }
}

function useBrainOverview() {
	const { user, org } = useAuth()
	const enabled = !!user && !!org?.id

	const docs = useQuery({
		queryKey: ["brain-recents", org?.id],
		queryFn: async () => {
			const res = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 6,
					sort: "createdAt",
					order: "desc",
					containerTags: [],
				},
				disableValidation: true,
			})
			if (res.error) throw new Error(res.error?.message)
			return res.data as unknown as {
				documents?: RecentDoc[]
				pagination?: { totalItems?: number }
			}
		},
		staleTime: 60_000,
		enabled,
	})

	const lastUpdated = useQuery({
		queryKey: ["brain-last-updated", org?.id],
		queryFn: async () => {
			const res = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 1,
					sort: "updatedAt",
					order: "desc",
					containerTags: [],
				},
				disableValidation: true,
			})
			if (res.error) return null
			const docs = (res.data as { documents?: RecentDoc[] })?.documents
			return docs?.[0]?.updatedAt ?? null
		},
		staleTime: 60_000,
		enabled,
	})

	const connectors = useQuery({
		queryKey: ["brain-home", "connectors"],
		queryFn: async () => {
			const res = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (res.error) return [] as Array<{ provider?: string }>
			return (res.data ?? []) as Array<{ provider?: string }>
		},
		staleTime: 30_000,
		enabled,
	})

	const mcp = useQuery({
		queryKey: ["mcp-status"],
		queryFn: async () => {
			const res = await $fetch("@get/mcp/has-login")
			if (res.error) return false
			return Boolean((res.data as { previousLogin?: boolean })?.previousLogin)
		},
		staleTime: 60_000,
		enabled,
	})

	const overview = useQuery({
		queryKey: ["brain-overview", org?.id],
		queryFn: async (): Promise<BrainOverview | null> => {
			const res = await fetch(`${BACKEND}/brain/overview`, {
				credentials: "include",
			})
			if (!res.ok) return null
			return (await res.json()) as BrainOverview
		},
		staleTime: 30_000,
		enabled,
	})

	const memoriesCount = docs.data?.pagination?.totalItems ?? 0
	const slackConnected = overview.data?.slack.connected ?? false
	const appsCount =
		(overview.data?.connections.apps ?? 0) + (connectors.data?.length ?? 0)
	const connectedCount = appsCount + (slackConnected ? 1 : 0)

	const currentRole = org?.members
		?.find((m) => m.userId === user?.id)
		?.role?.toLowerCase()

	return {
		loading: docs.isPending,
		recentDocs: docs.data?.documents ?? [],
		lastUpdatedAt: lastUpdated.data ?? null,
		memoriesCount,
		connectedCount,
		membersCount: overview.data?.members.count ?? org?.members?.length ?? 0,
		canInvite: currentRole === "owner" || currentRole === "admin",
		hasSource: connectedCount > 0,
		hasAgent: mcp.data ?? false,
		hasMemory: memoriesCount > 0,
		hasApps: appsCount > 0,
		slackConnected,
		researchStatus: overview.data?.research.status ?? null,
		rollout: overview.data?.slack.rollout ?? null,
	}
}

export function BrainHomeView() {
	const o = useBrainOverview()
	const trial = useBrainTrial()
	const board = useConnectionsBoard()
	// Rows with no reported state (older orgs, pre-Slack) don't count or render.
	const milestones = [
		...(o.researchStatus != null ? [o.researchStatus === "done"] : []),
		o.slackConnected,
		...(o.rollout != null ? [o.rollout.status === "done"] : []),
		o.hasApps,
		o.membersCount > 1,
		o.hasMemory,
	]
	const milestonesDone = milestones.filter(Boolean).length
	const milestonesTotal = milestones.length
	const showTimeline =
		!o.loading && (trial.state !== "none" || milestonesDone < milestonesTotal)

	return (
		<div className="mx-auto max-w-[1080px] space-y-6">
			<StatsRow
				memories={o.memoriesCount}
				connected={o.connectedCount}
				members={o.membersCount}
				canInvite={o.canInvite}
				setupDone={milestonesDone}
				setupTotal={milestonesTotal}
				lastUpdatedAt={o.lastUpdatedAt}
			/>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
				<div className="min-w-0 space-y-6">
					{board.showBoard && <ConnectToolsCard board={board} />}
					<RecentMemories docs={o.recentDocs} loading={o.loading} />
				</div>
				<div className="min-w-0 space-y-6">
					{showTimeline && (
						<BrainTimeline
							researchStatus={o.researchStatus}
							slackConnected={o.slackConnected}
							rollout={o.rollout}
							hasApps={o.hasApps}
							invited={o.membersCount > 1}
							hasMemory={o.hasMemory}
							canInvite={o.canInvite}
							toolsCardVisible={board.showBoard}
						/>
					)}
					<AskInSlackCard board={board} />
				</div>
			</div>
		</div>
	)
}

function StatsRow({
	memories,
	connected,
	members,
	canInvite,
	setupDone,
	setupTotal,
	lastUpdatedAt,
}: {
	memories: number
	connected: number
	members: number
	canInvite: boolean
	setupDone: number
	setupTotal: number
	lastUpdatedAt: string | Date | null
}) {
	const { openSettings } = useSettingsModal()
	const [, setInvite] = useQueryState("invite")

	const onInvite = () => {
		setInvite("1")
		openSettings("account")
	}

	const tiles: {
		label: string
		value: string
		action?: React.ReactNode
	}[] = [
		{ label: "Memories", value: memories.toLocaleString() },
		{ label: "Connected sources", value: String(connected) },
		{
			label: "Active members",
			value: String(members),
			action: canInvite ? (
				<button
					type="button"
					onClick={onInvite}
					className="hidden items-center gap-1 text-[11px] font-medium text-[#737373] transition-colors hover:text-[#fafafa] sm:inline-flex"
				>
					<UserPlus className="size-3" />
					Invite
				</button>
			) : undefined,
		},
		setupDone < setupTotal
			? { label: "Setup", value: `${setupDone}/${setupTotal}` }
			: {
					label: "Last updated",
					value: formatWhen(lastUpdatedAt) || "—",
				},
	]
	return (
		<section
			className="grid grid-cols-4 divide-x divide-white/[0.04] overflow-hidden rounded-[16px] bg-[#1B1F24]"
			style={cardStyle}
		>
			{tiles.map((t, index) => (
				<div
					key={t.label}
					className={cn(
						"relative min-w-0 px-3 py-3 sm:px-5 sm:py-4",
						index === 2 && canInvite && "pr-8 sm:pr-5",
					)}
				>
					<div className="flex min-w-0 items-start justify-between gap-2">
						<p className="min-w-0 truncate text-[8px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#737373] sm:text-[10px] sm:tracking-[0.12em]">
							<MobileStatLabel label={t.label} />
						</p>
						{t.action}
					</div>
					<p
						className={cn(
							"mt-1 text-[17px] font-semibold leading-none tabular-nums text-[#fafafa] sm:mt-1.5 sm:text-[22px]",
							dmSans125ClassName(),
						)}
					>
						{t.value}
					</p>
					{index === 2 && canInvite && (
						<button
							type="button"
							onClick={onInvite}
							aria-label="Invite teammates"
							title="Invite teammates"
							className="absolute right-1.5 bottom-1.5 inline-flex size-6 items-center justify-center rounded-md bg-white/[0.03] text-[#737373] transition-colors hover:bg-white/[0.07] hover:text-[#fafafa] sm:hidden"
						>
							<UserPlus className="size-3" />
						</button>
					)}
				</div>
			))}
		</section>
	)
}

function MobileStatLabel({ label }: { label: string }) {
	const mobile =
		label === "Connected sources"
			? "Sources"
			: label === "Active members"
				? "Members"
				: label

	return (
		<>
			<span className="sm:hidden">{mobile}</span>
			<span className="hidden sm:inline">{label}</span>
		</>
	)
}

function RecentMemories({
	docs,
	loading,
}: {
	docs: RecentDoc[]
	loading: boolean
}) {
	return (
		<section
			className="min-w-0 rounded-[18px] bg-[#1B1F24] p-5"
			style={cardStyle}
		>
			<p
				className={cn(
					"mb-3 text-[15px] font-semibold text-[#fafafa]",
					dmSans125ClassName(),
				)}
			>
				Recent memories
			</p>

			{loading ? (
				<div className="flex items-center gap-2 py-6 text-[13px] font-medium text-[#737373]">
					<Loader2 className="size-4 animate-spin" />
					Loading…
				</div>
			) : docs.length === 0 ? (
				<div className="flex items-center gap-3 rounded-[12px] bg-[#14161A] px-4 py-5">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0F1217] text-[#525D6E]">
						<FileText className="size-4" />
					</div>
					<div className="min-w-0">
						<p className="text-[13px] font-medium text-[#fafafa]">
							No memories yet
						</p>
						<p className="mt-0.5 text-[12px] font-medium leading-[1.5] text-[#737373]">
							Connect a source or ask your brain below — what you save shows up
							here.
						</p>
					</div>
				</div>
			) : (
				<ul className="divide-y divide-white/[0.04]">
					{docs.map((doc, i) => (
						<li
							key={doc.id ?? i}
							className="flex items-center gap-3 px-1 py-2.5"
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0F1217] text-[#737373]">
								<FileText className="size-3.5" />
							</div>
							<p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#fafafa]">
								{doc.title?.trim() || "Untitled memory"}
							</p>
							<span className="shrink-0 text-[11px] font-medium text-[#737373]">
								{formatWhen(doc.createdAt)}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

function TrialStrip() {
	const trial = useBrainTrial()
	const { openSettings } = useSettingsModal()

	if (trial.state === "ended") {
		return (
			<div className="mb-4 flex items-center justify-between gap-3 rounded-[12px] bg-[#14161A] px-3.5 py-2.5">
				<p className="text-[12px] font-medium text-[#E5735A]">
					Trial ended · your brain is paused
				</p>
				<button
					type="button"
					onClick={() => openSettings("billing")}
					className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#1D1C1D] transition-opacity hover:opacity-90"
				>
					Activate
				</button>
			</div>
		)
	}

	if (trial.state !== "trialing" || !trial.startedAtMs || !trial.endsAtMs) {
		return null
	}

	const DAY_MS = 24 * 60 * 60 * 1000
	const totalDays = Math.max(
		1,
		Math.round((trial.endsAtMs - trial.startedAtMs) / DAY_MS),
	)
	const days = trial.daysRemaining ?? 0
	const dayNum = Math.min(totalDays, Math.max(1, totalDays - days + 1))
	const pct = Math.min(100, Math.max(4, (dayNum / totalDays) * 100))

	return (
		<button
			type="button"
			onClick={() => openSettings("billing")}
			className="mb-4 block w-full cursor-pointer rounded-[12px] bg-[#14161A] px-3.5 py-2.5 text-left transition-colors hover:bg-[#171A1F]"
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-[12px] font-medium text-[#fafafa]">
					Free trial ·{" "}
					<span className={cn(days <= 3 ? "text-[#E5A45A]" : "text-[#737373]")}>
						{days} day{days === 1 ? "" : "s"} left
					</span>
				</p>
				<p className="shrink-0 text-[11px] font-medium text-[#525D6E]">
					Ends{" "}
					{new Date(trial.endsAtMs).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</p>
			</div>
			<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
				<div
					className={cn(
						"h-full rounded-full",
						days <= 3 ? "bg-[#E5A45A]" : "bg-[#4BA0FA]",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</button>
	)
}

function BrainTimeline({
	researchStatus,
	slackConnected,
	rollout,
	hasApps,
	invited,
	hasMemory,
	canInvite,
	toolsCardVisible,
}: {
	researchStatus: string | null
	slackConnected: boolean
	rollout: RolloutOverview | null
	hasApps: boolean
	invited: boolean
	hasMemory: boolean
	canInvite: boolean
	toolsCardVisible: boolean
}) {
	const { needsSetup } = useTrialStatus()
	const { openSettings } = useSettingsModal()
	const { setViewMode } = useViewMode()
	const [, setInvite] = useQueryState("invite")

	const onInvite = () => {
		setInvite("1")
		openSettings("account")
	}

	const onSetUpApps = () => {
		const card = document.getElementById(CONNECT_TOOLS_CARD_ID)
		if (toolsCardVisible && card) {
			card.scrollIntoView({ behavior: "smooth", block: "center" })
		} else {
			void setViewMode("configure")
		}
	}

	const researching =
		researchStatus === "queued" || researchStatus === "running"
	type Step = {
		done: boolean
		busy?: boolean
		title: string
		hint?: string
		action?: { label: string; onClick?: () => void; href?: string }
	}
	// Rows with unreported state are omitted rather than shown as never-started.
	const steps: Step[] = [
		...(researchStatus != null
			? [
					{
						done: researchStatus === "done",
						busy: researching,
						title: researching
							? "Researching your company…"
							: "Company research",
					},
				]
			: []),
		{
			done: slackConnected,
			title: slackConnected ? "Slack connected" : "Connect Slack",
			hint: slackConnected
				? undefined
				: needsSetup
					? "Starts with your trial."
					: "Ask your brain from any channel.",
			action:
				slackConnected || needsSetup
					? undefined
					: { label: "Add", href: `${BACKEND}/brain/slack/oauth/install` },
		},
		...(rollout != null
			? [
					{
						done: rollout.status === "done",
						busy: rollout.status === "running",
						title:
							rollout.status === "running"
								? `Learning from channels… ${rollout.ready}/${rollout.discovered} ready`
								: rollout.status === "done"
									? `Learning from channels · ${rollout.ready} ready`
									: "Learning from channels",
					},
				]
			: []),
		{
			done: hasApps,
			title: "Connect apps",
			hint: hasApps ? undefined : "Linear, Notion, GitHub and more.",
			action: hasApps ? undefined : { label: "Set up", onClick: onSetUpApps },
		},
		{
			done: invited,
			title: "Invite teammates",
			hint: invited ? undefined : "Multiply what the brain remembers.",
			action:
				invited || !canInvite
					? undefined
					: { label: "Invite", onClick: onInvite },
		},
		{
			done: hasMemory,
			title: "First memories captured",
			hint: hasMemory ? undefined : "Save a doc, or ask your brain below.",
		},
	]

	return (
		<section
			className="relative h-fit overflow-hidden rounded-[18px] bg-[#1B1F24] p-5"
			style={cardStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px right-8 left-8 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.45), transparent)",
				}}
			/>
			<p
				className={cn(
					"text-[15px] font-semibold text-[#fafafa]",
					dmSans125ClassName(),
				)}
			>
				Your Company Brain
			</p>
			<p className="mb-4 mt-0.5 text-[12px] font-medium text-[#737373]">
				How far you've come.
			</p>

			<TrialStrip />

			<ul className="space-y-2.5">
				{steps.map((step) => (
					<li key={step.title} className="flex items-start gap-3">
						<span
							aria-hidden
							className={cn(
								"mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
								step.done
									? "border-[#4BA0FA] bg-[#4BA0FA]"
									: "border-[rgba(82,89,102,0.4)]",
							)}
						>
							{step.done ? (
								<Check className="size-3 text-white" />
							) : step.busy ? (
								<Loader2 className="size-3 animate-spin text-[#4BA0FA]" />
							) : null}
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-2">
								<p
									className={cn(
										"text-[13px] font-medium",
										step.done ? "text-[#737373]" : "text-[#fafafa]",
									)}
								>
									{step.title}
								</p>
								{!step.done &&
									step.action &&
									(step.action.href ? (
										<a
											href={step.action.href}
											className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-[#4BA0FA] transition-opacity hover:opacity-80"
										>
											{step.action.label}
											<ArrowRight className="size-3" />
										</a>
									) : (
										<button
											type="button"
											onClick={step.action.onClick}
											className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-[12px] font-medium text-[#4BA0FA] transition-opacity hover:opacity-80"
										>
											{step.action.label}
											<ArrowRight className="size-3" />
										</button>
									))}
							</div>
							{!step.done && step.hint && (
								<p className="mt-0.5 text-[12px] font-medium leading-[1.4] text-[#737373]">
									{step.hint}
								</p>
							)}
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

function formatWhen(value?: string | Date | null): string {
	if (!value) return ""
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return ""
	const min = Math.round((Date.now() - d.getTime()) / 60000)
	if (min < 1) return "just now"
	if (min < 60) return `${min}m`
	const hr = Math.round(min / 60)
	if (hr < 24) return `${hr}h`
	const day = Math.round(hr / 24)
	if (day < 7) return `${day}d`
	return d.toLocaleDateString()
}
