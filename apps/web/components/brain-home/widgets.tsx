"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { GoogleDrive, Notion } from "@ui/assets/icons"
import {
	AlertCircle,
	ArrowRight,
	Calendar,
	CheckCircle2,
	FileText,
	Github,
	Loader2,
	MessageSquare,
	Plus,
	Quote,
	Sparkles,
	Target,
} from "lucide-react"
import {
	ACTIVITY,
	AGENT_SERIES,
	CONNECTED_SOURCES,
	RECENT_ANSWERS,
	RECOMMENDED_SOURCES,
	SESSIONS_BY_DAY,
	STATS,
	TEAM_RECENT,
	TEAM_THIS_WEEK,
	WEEKLY_DIGEST,
	type ActivityEvent,
	type ConnectedSource,
	type RecommendedSource,
	type Stat,
} from "./data"

function GmailIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 256 193"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path
				d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z"
				fill="#4285F4"
			/>
			<path
				d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798z"
				fill="#34A853"
			/>
			<path
				d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.668 33.95-4.668 41.685L128 145.504z"
				fill="#EA4335"
			/>
			<path
				d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z"
				fill="#FBBC04"
			/>
			<path
				d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z"
				fill="#C5221F"
			/>
		</svg>
	)
}

export const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

export const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

export function StatsStrip({ stats = STATS }: { stats?: Stat[] }) {
	return (
		<section
			className="rounded-[16px] bg-[#1B1F24] grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]"
			style={modalCardStyle}
		>
			{stats.map((s) => (
				<div key={s.label} className="px-5 py-4">
					<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
						{s.label}
					</p>
					<p
						className={cn(
							"text-[22px] font-semibold text-[#fafafa] mt-1.5 tabular-nums leading-none",
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

export function SectionHeader({ title, cta }: { title: string; cta?: string }) {
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

export function RecentAnswersCard() {
	return (
		<div
			className="rounded-[14px] bg-[#1B1F24] p-4 flex flex-col"
			style={modalCardStyle}
		>
			<div className="flex items-center justify-between mb-3">
				<p className="text-[10px] uppercase tracking-[0.12em] text-[#737373] font-semibold">
					Recent answers
				</p>
				<button
					type="button"
					className="text-[10px] text-[#737373] hover:text-[#fafafa] transition-colors font-medium"
				>
					See all →
				</button>
			</div>
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
		</div>
	)
}

export function WeeklyDigestCard() {
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

export function BrainPulseBlock() {
	return (
		<section className="grid lg:grid-cols-[2fr_3fr] gap-3 items-stretch">
			<RecentAnswersCard />
			<WeeklyDigestCard />
		</section>
	)
}

export function BrainActivityChart() {
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

function activitySourceIcon(s: ActivityEvent["source"]) {
	if (s === "drive") return <GoogleDrive className="size-3.5" />
	if (s === "notion") return <Notion className="size-3.5" />
	if (s === "slack")
		return <MessageSquare className="size-3.5 text-[#4BA0FA]" />
	if (s === "answer") return <Sparkles className="size-3.5 text-[#4BA0FA]" />
	if (s === "decision")
		return <CheckCircle2 className="size-3.5 text-[#4BA0FA]" />
	return <Sparkles className="size-3.5 text-[#8B8B8B]" />
}

export function ActivityFeedBlock() {
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
							{activitySourceIcon(a.source)}
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

export function TeamActivityRail() {
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

export function BrainHomeBackground() {
	return (
		<div className="pointer-events-none fixed inset-0 z-0">
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(75,160,250,0.08) 0%, rgba(34,97,202,0.04) 35%, transparent 70%)",
				}}
			/>
			<div className="absolute inset-0 bg-[#05080D]/55" aria-hidden />
			<div
				id="brain-home-grid"
				className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.18)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
			/>
		</div>
	)
}

export function Quotation({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1 text-[#737373]">
			<Quote className="size-3" />
			{children}
		</span>
	)
}

function connectedSourceIcon(key: ConnectedSource["iconKey"]) {
	if (key === "drive") return <GoogleDrive className="size-4" />
	if (key === "notion") return <Notion className="size-4" />
	if (key === "gmail") return <GmailIcon className="size-4" />
	if (key === "github") return <Github className="size-4 text-[#fafafa]" />
	return <FileText className="size-4 text-[#8B8B8B]" />
}

function sourceStatusMeta(status: ConnectedSource["status"]) {
	if (status === "healthy")
		return {
			dot: "bg-[#4BA0FA]",
			tint: "text-[#4BA0FA]",
			icon: <CheckCircle2 className="size-3" />,
		}
	if (status === "syncing")
		return {
			dot: "bg-[#A1A1AA]",
			tint: "text-[#A1A1AA]",
			icon: <Loader2 className="size-3 animate-spin" />,
		}
	if (status === "warning")
		return {
			dot: "bg-[#FF8A47]",
			tint: "text-[#FF8A47]",
			icon: <AlertCircle className="size-3" />,
		}
	return {
		dot: "bg-[#FF5C5C]",
		tint: "text-[#FF5C5C]",
		icon: <AlertCircle className="size-3" />,
	}
}

export function SourcesHealthRail({ empty }: { empty?: boolean }) {
	if (empty) {
		return (
			<section className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] p-4">
				<p
					className={cn(
						"text-[14px] font-semibold leading-tight",
						dmSans125ClassName(),
					)}
				>
					Sources health
				</p>
				<p className="text-[11px] text-[#737373] font-medium mt-0.5 leading-[1.5]">
					Nothing connected yet — Drive, Notion, Gmail and more are ready when
					you are.
				</p>
				<button
					type="button"
					className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)] text-[12px] font-medium text-[#fafafa] hover:bg-[#14161A] transition-colors"
				>
					<Plus className="size-3.5" />
					Connect a source
				</button>
			</section>
		)
	}
	const issueCount = CONNECTED_SOURCES.filter(
		(s) => s.status === "warning" || s.status === "error",
	).length
	return (
		<section className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] p-4">
			<div className="flex items-center justify-between mb-1">
				<p
					className={cn(
						"text-[14px] font-semibold leading-tight",
						dmSans125ClassName(),
					)}
				>
					Sources health
				</p>
				{issueCount > 0 ? (
					<span className="text-[10px] uppercase tracking-[0.12em] text-[#FF8A47] font-semibold">
						{issueCount} need attention
					</span>
				) : (
					<span className="text-[10px] uppercase tracking-[0.12em] text-[#4BA0FA] font-semibold">
						All healthy
					</span>
				)}
			</div>
			<p className="text-[11px] text-[#737373] font-medium">
				Is the brain getting fed?
			</p>

			<ul className="mt-3 space-y-0.5">
				{CONNECTED_SOURCES.map((s) => {
					const meta = sourceStatusMeta(s.status)
					return (
						<li
							key={s.id}
							className="flex items-center gap-2.5 rounded-[8px] px-1.5 py-2 hover:bg-white/[0.03] transition-colors"
						>
							<div className="size-6 flex items-center justify-center shrink-0">
								{connectedSourceIcon(s.iconKey)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between gap-2">
									<p className="text-[12px] text-[#fafafa] font-medium truncate">
										{s.name}
									</p>
									<span className="text-[10px] text-[#737373] font-medium tabular-nums shrink-0">
										{s.when}
									</span>
								</div>
								<p
									className={cn(
										"text-[11px] font-medium mt-0.5 inline-flex items-center gap-1",
										meta.tint,
									)}
								>
									{meta.icon}
									<span className="truncate">{s.statusMessage ?? s.delta}</span>
								</p>
							</div>
						</li>
					)
				})}
			</ul>
		</section>
	)
}

function recommendedIcon(key: RecommendedSource["iconKey"]) {
	if (key === "slack")
		return <MessageSquare className="size-4 text-[#4BA0FA]" />
	if (key === "github") return <Github className="size-4 text-[#fafafa]" />
	if (key === "linear") return <Target className="size-4 text-[#fafafa]" />
	if (key === "granola") return <Sparkles className="size-4 text-[#FF8A47]" />
	if (key === "calendar") return <Calendar className="size-4 text-[#A1A1AA]" />
	return <FileText className="size-4 text-[#8B8B8B]" />
}

export function RecommendedRail() {
	return (
		<section className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] p-4">
			<p
				className={cn(
					"text-[14px] font-semibold leading-tight",
					dmSans125ClassName(),
				)}
			>
				Add more to the brain
			</p>
			<p className="text-[11px] text-[#737373] font-medium mt-0.5">
				Teams like yours connect these next.
			</p>

			<ul className="mt-3 space-y-0.5">
				{RECOMMENDED_SOURCES.map((r) => (
					<li
						key={r.id}
						className="group flex items-start gap-2.5 rounded-[8px] px-1.5 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
					>
						<div className="size-6 flex items-center justify-center shrink-0">
							{recommendedIcon(r.iconKey)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-2">
								<p className="text-[12px] text-[#fafafa] font-medium truncate">
									{r.name}
								</p>
								<ArrowRight className="size-3 text-[#525D6E] group-hover:text-[#fafafa] transition-colors shrink-0" />
							</div>
							<p className="text-[11px] text-[#737373] font-medium leading-[1.4] mt-0.5 line-clamp-2">
								{r.reason}
							</p>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}
