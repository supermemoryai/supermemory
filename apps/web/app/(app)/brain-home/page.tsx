"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { GoogleDrive, Notion } from "@ui/assets/icons"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { ArrowRight, Mail, MessageSquare, Plus, Sparkles } from "lucide-react"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"
import { Header } from "@/components/header"
import { HomeChatComposer } from "@/components/chat/home-chat-composer"
import {
	RecommendedRail,
	SourcesHealthRail,
} from "@/components/brain-home/widgets"

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

type Space = {
	id: string
	name: string
	icon: React.ReactNode
	itemCount: number
	lastSync: string
}

const _SPACES: Space[] = [
	{
		id: "drive",
		name: "My Drive",
		icon: <GoogleDrive className="size-4" />,
		itemCount: 287,
		lastSync: "2h ago",
	},
	{
		id: "notion",
		name: "Company Notion",
		icon: <Notion className="size-4" />,
		itemCount: 142,
		lastSync: "12m ago",
	},
	{
		id: "gmail",
		name: "Gmail",
		icon: <Mail className="size-4 text-[#EA4335]" />,
		itemCount: 1843,
		lastSync: "Just now",
	},
]

type Stat = {
	label: string
	value: string
	delta?: string
	deltaTint?: "up" | "down" | "neutral"
}

const STATS: Stat[] = [
	{
		label: "Items ingested",
		value: "2,272",
		delta: "+148 this week",
		deltaTint: "up",
	},
	{
		label: "Agent sessions",
		value: "184",
		delta: "+42 vs last wk",
		deltaTint: "up",
	},
	{
		label: "Active contributors",
		value: "4",
		delta: "of 6 invited",
		deltaTint: "neutral",
	},
	{
		label: "Top space",
		value: "Gmail",
		delta: "1,843 items",
		deltaTint: "neutral",
	},
]

type AgentSeries = {
	key: string
	label: string
	color: string
}

const AGENT_SERIES: AgentSeries[] = [
	{ key: "cursor", label: "Cursor", color: "#4BA0FA" },
	{ key: "claudeCode", label: "Claude Code", color: "#FF8A47" },
	{ key: "claudeDesktop", label: "Claude Desktop", color: "#B19CFF" },
	{ key: "chatgpt", label: "ChatGPT", color: "#10A37F" },
	{ key: "other", label: "Other", color: "#525D6E" },
]

const SESSIONS_BY_DAY: {
	label: string
	values: Record<string, number>
}[] = [
	{
		label: "Mon",
		values: {
			cursor: 8,
			claudeCode: 4,
			claudeDesktop: 3,
			chatgpt: 2,
			other: 1,
		},
	},
	{
		label: "Tue",
		values: {
			cursor: 10,
			claudeCode: 6,
			claudeDesktop: 4,
			chatgpt: 3,
			other: 1,
		},
	},
	{
		label: "Wed",
		values: {
			cursor: 12,
			claudeCode: 9,
			claudeDesktop: 5,
			chatgpt: 4,
			other: 1,
		},
	},
	{
		label: "Thu",
		values: {
			cursor: 9,
			claudeCode: 5,
			claudeDesktop: 4,
			chatgpt: 3,
			other: 1,
		},
	},
	{
		label: "Fri",
		values: {
			cursor: 14,
			claudeCode: 10,
			claudeDesktop: 6,
			chatgpt: 4,
			other: 2,
		},
	},
	{
		label: "Sat",
		values: {
			cursor: 5,
			claudeCode: 3,
			claudeDesktop: 2,
			chatgpt: 1,
			other: 1,
		},
	},
	{
		label: "Sun",
		values: {
			cursor: 17,
			claudeCode: 12,
			claudeDesktop: 7,
			chatgpt: 4,
			other: 1,
		},
	},
]

const RECENT_ANSWERS = [
	{
		question: "What did we decide about pricing?",
		answer: "Pro stays at $20/mo. No overages, top-up only.",
		who: "You",
		when: "2h ago",
	},
	{
		question: "What's blocking the Acme deal?",
		answer: "MSA review — Jane drafting a net-30 counter.",
		who: "You",
		when: "4h ago",
	},
	{
		question: "Who owns the onboarding rewrite?",
		answer: "Design team. Ship target Friday.",
		who: "Sarah Kim",
		when: "Yesterday",
	},
]

const WEEKLY_DIGEST = {
	range: "Mon – Fri",
	headline:
		"Your brain captured 642 items, surfaced 12 decisions, and answered 184 questions across the team.",
	bullets: [
		{
			label: "5 deadlines coming up next week",
			tint: "text-[#4BA0FA]",
		},
		{
			label: "2 conflicts surfaced between Notion and Slack",
			tint: "text-[#FF8A47]",
		},
		{
			label: "Sarah Kim led contributions with 14 docs",
			tint: "text-[#A1A1AA]",
		},
	],
}

const TEAM_THIS_WEEK = [
	{
		name: "Sarah Kim",
		email: "sarah@acme.com",
		contributions: 14,
		summary: "14 docs · 3 spaces",
		color: "#FF8A47",
	},
	{
		name: "Jane Doe",
		email: "jane@acme.com",
		contributions: 11,
		summary: "11 docs · 2 spaces",
		color: "#4BA0FA",
	},
	{
		name: "Mahesh S.",
		email: "mahesh@acme.com",
		contributions: 9,
		summary: "9 docs · 1 space",
		color: "#A1A1AA",
	},
	{
		name: "Alex Chen",
		email: "alex@acme.com",
		contributions: 7,
		summary: "7 docs · 2 spaces",
		color: "#10A37F",
	},
]

const TEAM_RECENT = [
	{ who: "Sarah Kim", what: "added a memo to acme-deal-q2", when: "14m" },
	{ who: "Jane Doe", what: "updated the Acme MSA draft", when: "1h" },
	{ who: "You", what: 'asked "What did we decide about pricing?"', when: "2h" },
	{
		who: "Sarah Kim",
		what: "connected Notion to Sales space",
		when: "Yesterday",
	},
]

const ACTIVITY = [
	{
		when: "2m",
		text: "23 new docs ingested from Drive",
		source: "drive",
	},
	{
		when: "14m",
		text: "Jane added a memo to acme-deal-q2",
		source: "notion",
	},
	{
		when: "1h",
		text: "Decision surfaced: pricing locked at $20 Pro",
		source: "slack",
	},
	{
		when: "3h",
		text: "14 Notion pages updated by Sarah Kim",
		source: "notion",
	},
	{
		when: "5h",
		text: "New entity formed: pricing-v3",
		source: "system",
	},
	{
		when: "Yesterday",
		text: "MSA contract uploaded · auto-tagged contracts/MSA",
		source: "drive",
	},
]

const _RECENT_ITEMS: Record<string, { title: string; meta: string }[]> = {
	drive: [
		{ title: "Q2 Roadmap.docx", meta: "Edited 1h ago · Jane" },
		{ title: "Acme · MSA draft v3.pdf", meta: "Added 2h ago" },
		{ title: "Pricing model.xlsx", meta: "Edited 4h ago · Mahesh" },
		{ title: "Customer feedback Q1.docx", meta: "Yesterday" },
		{ title: "Brand assets / logos", meta: "2 days ago" },
	],
	notion: [
		{ title: "Engineering / Weekly sync", meta: "Updated 12m ago" },
		{ title: "Sales / Acme account", meta: "Updated 1h ago" },
		{ title: "Brand / Voice & tone", meta: "Yesterday" },
		{ title: "Onboarding rewrite spec", meta: "2 days ago" },
	],
	gmail: [
		{ title: "Re: Acme contract review", meta: "Just now · jane@acme.com" },
		{ title: "Customer feedback digest", meta: "10m ago" },
		{ title: "Re: Pricing decision", meta: "1h ago" },
		{ title: "Onboarding ship plan", meta: "3h ago" },
	],
}

export default function BrainHomePage() {
	return (
		<Suspense fallback={null}>
			<BrainHomeInner />
		</Suspense>
	)
}

function BrainHomeInner() {
	const searchParams = useSearchParams()
	const empty = searchParams?.get("empty") === "1"

	return (
		<div
			className={cn(
				"relative min-h-dvh bg-[#05080D] text-[#fafafa]",
				dmSansClassName(),
			)}
		>
			<div className="pointer-events-none fixed inset-0 z-0">
				<AnimatedGradientBackground
					animateFromBottom={false}
					topPosition="20%"
				/>
				<div className="absolute inset-0 bg-[#05080D]/55" aria-hidden />
				<div
					id="brain-home-grid"
					className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.22)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
				/>
			</div>

			<Header onAddMemory={() => {}} onOpenSearch={() => {}} />

			<main className="relative z-10 px-6 md:px-10 py-8 pb-[180px]">
				<div className="max-w-[1280px] mx-auto space-y-6">
					<StatsStrip stats={STATS} empty={empty} />

					<div className="grid lg:grid-cols-[1fr_320px] gap-6">
						<div className="space-y-8 min-w-0">
							<BrainPulseBlock empty={empty} />
							<BrainActivityChart empty={empty} />
							<ActivityFeedBlock empty={empty} />
						</div>

						<aside className="lg:sticky lg:top-6 lg:self-start h-fit space-y-4">
							<TeamActivityRail empty={empty} />
							<SourcesHealthRail empty={empty} />
							<RecommendedRail />
						</aside>
					</div>
				</div>
			</main>

			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-56 bg-gradient-to-t from-[#05080D] via-[#05080D]/95 to-transparent" />
			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
				<div className="pointer-events-auto">
					<HomeChatComposer onStartChat={() => {}} />
				</div>
			</div>
		</div>
	)
}

function StatsStrip({ stats, empty }: { stats: Stat[]; empty?: boolean }) {
	const EMPTY_STATS: Stat[] = [
		{
			label: "Items ingested",
			value: "—",
			delta: "Connect a source",
			deltaTint: "neutral",
		},
		{
			label: "Agent sessions",
			value: "—",
			delta: "Install an agent",
			deltaTint: "neutral",
		},
		{
			label: "Active contributors",
			value: "1",
			delta: "Just you so far",
			deltaTint: "neutral",
		},
		{
			label: "Top space",
			value: "—",
			delta: "Nothing connected",
			deltaTint: "neutral",
		},
	]
	const visible = empty ? EMPTY_STATS : stats
	return (
		<section
			className="rounded-[16px] bg-[#1B1F24] grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]"
			style={modalCardStyle}
		>
			{visible.map((s) => (
				<div key={s.label} className="px-5 py-4">
					<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
						{s.label}
					</p>
					<p
						className={cn(
							"text-[22px] font-semibold mt-1.5 tabular-nums leading-none",
							empty && s.value === "—" ? "text-[#525D6E]" : "text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						{s.value}
					</p>
					{s.delta && (
						<p
							className={cn(
								"text-[11px] font-medium mt-1.5",
								s.deltaTint === "up"
									? "text-[#4BA0FA]"
									: s.deltaTint === "down"
										? "text-[#FF8A47]"
										: "text-[#737373]",
							)}
						>
							{s.delta}
						</p>
					)}
				</div>
			))}
		</section>
	)
}

function BrainActivityChart({ empty }: { empty?: boolean }) {
	if (empty) {
		return (
			<section
				className="rounded-[20px] bg-[#1B1F24] p-5 md:p-6 relative overflow-hidden"
				style={modalCardStyle}
			>
				<div
					aria-hidden
					className="absolute -top-px left-0 right-0 h-px"
					style={{
						background:
							"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
					}}
				/>
				<p
					className={cn(
						"text-[16px] font-semibold text-[#fafafa]",
						dmSans125ClassName(),
					)}
				>
					Sessions by agent
				</p>
				<p className="text-[12px] text-[#737373] font-medium mt-0.5">
					0 sessions yet — once you install Cursor, Claude Code, or any
					MCP-capable agent, usage shows up here.
				</p>
				<div className="mt-6 flex items-end gap-2 opacity-30" aria-hidden>
					{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
						<div key={d} className="flex-1 flex flex-col items-center gap-2">
							<div
								className="w-full rounded-[4px] bg-[#1F2937]"
								style={{ height: "4px" }}
							/>
							<span className="text-[10px] text-[#525D6E] font-medium">
								{d}
							</span>
						</div>
					))}
				</div>
				<button
					type="button"
					className="mt-5 text-[12px] text-[#4BA0FA] hover:text-[#7eb9fc] transition-colors font-medium inline-flex items-center gap-1.5"
				>
					Install an agent <ArrowRight className="size-3.5" />
				</button>
			</section>
		)
	}
	const totalsByAgent = AGENT_SERIES.map((s) => ({
		...s,
		total: SESSIONS_BY_DAY.reduce((sum, d) => sum + (d.values[s.key] ?? 0), 0),
	}))
	const grandTotal = totalsByAgent.reduce((sum, s) => sum + s.total, 0)
	const dayTotals = SESSIONS_BY_DAY.map((d) =>
		AGENT_SERIES.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0),
	)
	const max = Math.max(...dayTotals)

	return (
		<section
			className="rounded-[20px] bg-[#1B1F24] p-5 md:p-6 relative overflow-hidden"
			style={modalCardStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
				}}
			/>
			<div className="flex flex-wrap items-end justify-between gap-3 mb-5">
				<div>
					<p
						className={cn(
							"text-[16px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Sessions by agent
					</p>
					<p className="text-[12px] text-[#737373] font-medium mt-0.5">
						{grandTotal} agent sessions, last 7 days — which tool the team
						reached for.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
					{totalsByAgent.map((s) => (
						<span
							key={s.key}
							className="inline-flex items-center gap-1.5 text-[#A1A1AA]"
						>
							<span
								aria-hidden
								className="size-2 rounded-full"
								style={{ background: s.color }}
							/>
							{s.label}{" "}
							<span className="text-[#fafafa] tabular-nums">{s.total}</span>
						</span>
					))}
				</div>
			</div>

			<div className="flex items-end gap-2">
				{SESSIONS_BY_DAY.map((d, dayIdx) => {
					const BAR_AREA_PX = 140
					const totalForDay = dayTotals[dayIdx] ?? 0
					const barHeightPx = Math.max(
						6,
						Math.round((totalForDay / max) * BAR_AREA_PX),
					)
					return (
						<div
							key={d.label}
							className="flex-1 flex flex-col items-center gap-2"
						>
							<div
								className="w-full flex items-end"
								style={{ height: `${BAR_AREA_PX}px` }}
							>
								<div
									className="w-full rounded-[4px] overflow-hidden flex flex-col"
									style={{ height: `${barHeightPx}px` }}
									title={`${d.label}: ${totalForDay} sessions`}
								>
									{AGENT_SERIES.map((series, sIdx) => {
										const val = d.values[series.key] ?? 0
										if (val === 0) return null
										const segHeight =
											totalForDay > 0 ? (val / totalForDay) * 100 : 0
										return (
											<div
												key={series.key}
												style={{
													height: `${segHeight}%`,
													background: series.color,
												}}
												className={cn(
													sIdx === 0 && "rounded-t-[4px]",
													sIdx === AGENT_SERIES.length - 1 && "rounded-b-[4px]",
												)}
												title={`${series.label} · ${val}`}
											/>
										)
									})}
								</div>
							</div>
							<span className="text-[10px] text-[#737373] font-medium tabular-nums">
								{d.label}
							</span>
						</div>
					)
				})}
			</div>
		</section>
	)
}

function _TabButton({
	active,
	onClick,
	icon,
	label,
	count,
}: {
	active: boolean
	onClick: () => void
	icon: React.ReactNode
	label: string
	count: number
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[12px] font-medium transition-colors",
				active
					? "bg-white/[0.10] text-[#fafafa]"
					: "text-[#A1A1AA] hover:text-[#fafafa] hover:bg-white/[0.04]",
			)}
		>
			{icon}
			<span className="leading-none">{label}</span>
			<span
				className={cn(
					"text-[10px] font-semibold tabular-nums leading-none",
					active ? "text-[#A1A1AA]" : "text-[#525D6E]",
				)}
			>
				{count.toLocaleString()}
			</span>
		</button>
	)
}

function SectionHeader({ title, cta }: { title: string; cta?: string }) {
	return (
		<div className="flex items-end justify-between mb-3 px-1">
			<p className="text-[11px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
				{title}
			</p>
			{cta && (
				<button
					type="button"
					className="text-[12px] text-[#737373] hover:text-[#fafafa] transition-colors font-medium"
				>
					{cta}
				</button>
			)}
		</div>
	)
}

function BrainPulseBlock({ empty }: { empty?: boolean }) {
	return (
		<section className="grid lg:grid-cols-[2fr_3fr] gap-3 items-stretch">
			<RecentAnswersCard empty={empty} />
			<WeeklyDigestCard empty={empty} />
		</section>
	)
}

function RecentAnswersCard({ empty }: { empty?: boolean }) {
	return (
		<div
			className="rounded-[14px] bg-[#1B1F24] p-4 flex flex-col"
			style={modalCardStyle}
		>
			<div className="flex items-center justify-between mb-3">
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
					Recent answers
				</p>
				{!empty && (
					<button
						type="button"
						className="text-[10px] text-[#737373] hover:text-[#fafafa] transition-colors font-medium"
					>
						See all →
					</button>
				)}
			</div>
			{empty ? (
				<div className="flex-1 flex flex-col items-start justify-center py-4 gap-1.5">
					<p className="text-[13px] text-[#fafafa] font-medium">
						No questions asked yet.
					</p>
					<p className="text-[11px] text-[#737373] font-medium leading-[1.5]">
						Ask the brain something below — answers and the team's history will
						show up here.
					</p>
				</div>
			) : (
				<ul className="space-y-2.5">
					{RECENT_ANSWERS.map((a) => (
						<li
							key={a.question}
							className="border-l border-[#2261CA33] pl-2.5 hover:border-[#4BA0FA] transition-colors"
						>
							<p className="text-[12px] text-[#fafafa] font-semibold leading-snug truncate">
								{a.question}
							</p>
							<p className="text-[11px] text-[#A1A1AA] leading-[1.4] font-medium mt-0.5 line-clamp-1">
								→ {a.answer}
							</p>
							<p className="text-[10px] text-[#737373] font-medium mt-1">
								{a.who} · {a.when}
							</p>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

function WeeklyDigestCard({ empty }: { empty?: boolean }) {
	if (empty) {
		return (
			<div
				className="rounded-[14px] bg-[#1B1F24] p-4 md:p-5 flex flex-col relative overflow-hidden"
				style={modalCardStyle}
			>
				<div
					aria-hidden
					className="absolute -top-px left-0 right-0 h-px"
					style={{
						background:
							"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
					}}
				/>
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold mb-3">
					This week
				</p>
				<p
					className={cn(
						"text-[14px] font-semibold text-[#fafafa] leading-snug",
						dmSans125ClassName(),
					)}
				>
					Your brain is just getting started.
				</p>
				<p className="text-[12px] text-[#737373] font-medium leading-[1.5] mt-2">
					Once sources are connected and the team starts asking questions,
					you'll see decisions, deadlines, and contributor highlights here.
				</p>
				<button
					type="button"
					className="mt-auto pt-4 self-start text-[11px] text-[#4BA0FA] hover:text-[#7eb9fc] transition-colors font-medium inline-flex items-center gap-1.5"
				>
					Connect a source <ArrowRight className="size-3" />
				</button>
			</div>
		)
	}
	return (
		<div
			className="rounded-[14px] bg-[#1B1F24] p-4 md:p-5 flex flex-col relative overflow-hidden"
			style={modalCardStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
				}}
			/>
			<div className="flex items-end justify-between mb-3">
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
					This week
				</p>
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#525D6E] font-semibold">
					{WEEKLY_DIGEST.range}
				</p>
			</div>

			<p
				className={cn(
					"text-[14px] font-semibold text-[#fafafa] leading-snug",
					dmSans125ClassName(),
				)}
			>
				{WEEKLY_DIGEST.headline.split(/(\d+)/).map((piece, i) =>
					/^\d+$/.test(piece) ? (
						<span key={i} className="text-[#4BA0FA]">
							{piece}
						</span>
					) : (
						<span key={i}>{piece}</span>
					),
				)}
			</p>

			<ul className="mt-3 space-y-1.5">
				{WEEKLY_DIGEST.bullets.map((b) => (
					<li key={b.label} className="flex items-start gap-2">
						<span
							aria-hidden
							className={cn("mt-1.5 size-1 rounded-full bg-current", b.tint)}
						/>
						<span className={cn("text-[12px] font-medium", b.tint)}>
							{b.label}
						</span>
					</li>
				))}
			</ul>

			<button
				type="button"
				className="mt-auto pt-3 self-start text-[11px] text-[#A1A1AA] hover:text-[#fafafa] transition-colors font-medium inline-flex items-center gap-1.5"
			>
				Open weekly digest <ArrowRight className="size-3" />
			</button>
		</div>
	)
}

function ActivityFeedBlock({ empty }: { empty?: boolean }) {
	if (empty) {
		return (
			<section>
				<SectionHeader title="Activity feed" />
				<div
					className="rounded-[14px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] px-4 py-6 flex items-start gap-3"
					style={inputBevelStyle}
				>
					<div className="size-7 rounded-[8px] bg-[#0F1217] flex items-center justify-center shrink-0">
						<Sparkles className="size-3.5 text-[#525D6E]" />
					</div>
					<div className="min-w-0">
						<p className="text-[13px] text-[#fafafa] font-medium">
							Nothing happening yet.
						</p>
						<p className="text-[12px] text-[#737373] font-medium mt-1 leading-[1.5]">
							As sources sync and the team starts using the brain, every event
							will show up here in real time.
						</p>
					</div>
				</div>
			</section>
		)
	}
	const sourceIcon = (s: string) => {
		if (s === "drive") return <GoogleDrive className="size-3.5" />
		if (s === "notion") return <Notion className="size-3.5" />
		if (s === "slack")
			return <MessageSquare className="size-3.5 text-[#4BA0FA]" />
		return <Sparkles className="size-3.5 text-[#8B8B8B]" />
	}
	return (
		<section>
			<SectionHeader title="Activity feed" cta="Show more →" />
			<div
				className="rounded-[14px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] divide-y divide-white/[0.04]"
				style={inputBevelStyle}
			>
				{ACTIVITY.map((a, i) => (
					<div key={i} className="flex items-center gap-3 px-4 py-3">
						<div className="size-7 rounded-[8px] bg-[#0F1217] flex items-center justify-center shrink-0">
							{sourceIcon(a.source)}
						</div>
						<p className="flex-1 text-[13px] text-[#fafafa] font-medium">
							{a.text}
						</p>
						<span className="text-[11px] text-[#737373] font-medium tabular-nums shrink-0">
							{a.when}
						</span>
					</div>
				))}
			</div>
		</section>
	)
}

function TeamActivityRail({ empty }: { empty?: boolean }) {
	if (empty) {
		return (
			<section
				className="rounded-[20px] bg-[#1B1F24] p-5 md:p-6"
				style={modalCardStyle}
			>
				<p
					className={cn(
						"text-[16px] font-semibold leading-tight",
						dmSans125ClassName(),
					)}
				>
					Just you so far
				</p>
				<p className="text-[11px] text-[#737373] font-medium mt-0.5 leading-[1.5]">
					A brain gets sharper as more people contribute. Invite teammates to
					see who's adding what.
				</p>
				<button
					type="button"
					className="mt-5 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)] text-[12px] font-medium text-[#fafafa] hover:bg-[#14161A] transition-colors"
				>
					<Plus className="size-3.5" />
					Invite teammates
				</button>
			</section>
		)
	}
	return (
		<section
			className="rounded-[20px] bg-[#1B1F24] p-5 md:p-6"
			style={modalCardStyle}
		>
			<div className="flex items-center justify-between mb-1">
				<p
					className={cn(
						"text-[16px] font-semibold leading-tight",
						dmSans125ClassName(),
					)}
				>
					Team activity
				</p>
				<span className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
					This week
				</span>
			</div>
			<p className="text-[11px] text-[#737373] font-medium">
				What your team's been adding to the brain.
			</p>

			<div className="mt-5 space-y-2.5">
				{TEAM_THIS_WEEK.map((member) => (
					<div
						key={member.email}
						className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-white/[0.03] transition-colors"
					>
						<div
							className="size-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-[#0F1217] shrink-0"
							style={{ background: member.color }}
						>
							{member.name[0]}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[13px] text-[#fafafa] font-medium truncate">
								{member.name}
							</p>
							<p className="text-[11px] text-[#737373] font-medium truncate">
								{member.summary}
							</p>
						</div>
						<span className="text-[12px] text-[#A1A1AA] tabular-nums font-semibold shrink-0">
							{member.contributions}
						</span>
					</div>
				))}
			</div>

			<div className="mt-5 pt-4 border-t border-white/[0.04]">
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold mb-2.5">
					Recent
				</p>
				<ul className="space-y-2">
					{TEAM_RECENT.map((event, i) => (
						<li
							key={i}
							className="text-[12px] text-[#A1A1AA] leading-[1.5] font-medium"
						>
							<span className="text-[#fafafa]">{event.who}</span> {event.what}
							<span className="text-[#525D6E]"> · {event.when}</span>
						</li>
					))}
				</ul>
			</div>

			<button
				type="button"
				className="mt-5 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)] text-[12px] font-medium text-[#fafafa] hover:bg-[#14161A] transition-colors"
			>
				<Plus className="size-3.5" />
				Invite teammates
			</button>
		</section>
	)
}
