"use client"

import { LogoFull } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { cn } from "@lib/utils"
import { ArrowRight, Check, Globe, Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "motion/react"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import {
	type ResearchEvent,
	type ResearchStat,
	useResearchStatus,
} from "@/hooks/use-research-status"
import {
	cardSurfaceStyle,
	DomainLogo,
	fieldLabel,
	inputBevelStyle,
	inputClass,
	UserAvatar,
} from "./step-about"
import { ResearchActionRail } from "./research-action-rail"
import {
	type CompanyBrainConfirmResult,
	workspaceNameFromDomain,
} from "./types"

interface CompanyBrainOnboardingProps {
	name: string
	avatarUrl: string | null
	domain: string
	submitting: boolean
	onConfirm: (domain: string) => Promise<CompanyBrainConfirmResult>
	onDone: () => void
}

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type Phase = "confirm" | "research"

function normalizeDomain(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.replace(/\/.*$/, "")
}

export function CompanyBrainOnboarding({
	name,
	avatarUrl,
	domain: initialDomain,
	submitting,
	onConfirm,
	onDone,
}: CompanyBrainOnboardingProps) {
	const [phase, setPhase] = useState<Phase>("confirm")
	const [domain, setDomain] = useState(initialDomain)
	const [serverSchedulesResearch, setServerSchedulesResearch] = useState(false)
	const firstName = name.trim().split(/\s+/)[0] ?? ""
	const clean = normalizeDomain(domain)
	const queryClient = useQueryClient()
	const { status: researchStatus } = useResearchStatus(phase === "research")
	const researchDone = researchStatus === "done"

	const handleConfirm = async () => {
		if (!clean || submitting) return
		const result = await onConfirm(clean)
		if (!result.ok) return
		setServerSchedulesResearch(result.serverSchedulesResearch)
		setPhase("research")
	}

	// New-org signup schedules research after provisioning; if that hook is slow
	// or fails, force-start from the client so onboarding doesn't stall.
	useEffect(() => {
		if (phase !== "research" || !serverSchedulesResearch || !clean) return
		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const res = await fetch(`${BACKEND}/brain/research/status`, {
						credentials: "include",
						headers: { "X-App-Source": "nova" },
					})
					if (!res.ok) return
					const state = (await res.json()) as {
						status?: string | null
						events?: { aspect: string }[]
					}
					if (state.status === "done") return
					// Real research aspects use ord >= 2; bail if one is already underway.
					if ((state.events?.length ?? 0) >= 3) return
					await fetch(`${BACKEND}/brain/research/start`, {
						method: "POST",
						credentials: "include",
						headers: {
							"content-type": "application/json",
							"X-App-Source": "nova",
						},
						body: JSON.stringify({ domain: clean }),
					})
					queryClient.invalidateQueries({ queryKey: ["brain-research-status"] })
				} catch {}
			})()
		}, 40_000)
		return () => window.clearTimeout(timer)
	}, [phase, serverSchedulesResearch, clean, queryClient])

	return (
		<div
			className={cn(
				"relative h-dvh bg-[#05080D] text-[#FAFAFA] flex flex-col overflow-hidden",
				dmSansClassName(),
			)}
		>
			<Backdrop />

			<header className="relative z-10 flex items-center px-6 md:px-10 py-4">
				<LogoFull className="h-5 md:h-6 text-[#fafafa]" />
			</header>

			<main
				className={cn(
					"relative z-10 flex-1 flex flex-col min-h-0",
					phase === "confirm"
						? "justify-center items-center px-4 md:px-10"
						: "justify-start items-stretch pt-2 px-4 md:px-8 xl:px-14",
				)}
			>
				{/* Persistent card: full confirm card, then morphs into a slim docked header. */}
				<motion.div
					layout
					transition={{ type: "spring", stiffness: 260, damping: 30 }}
					style={cardSurfaceStyle}
					className={cn(
						"w-full mx-auto rounded-[22px] bg-[#1B1F24]",
						phase === "confirm"
							? "max-w-xl p-6 md:p-8"
							: "max-w-7xl px-5 py-3 xl:max-w-[1360px]",
					)}
				>
					<AnimatePresence mode="wait" initial={false}>
						{phase === "confirm" ? (
							<motion.div
								key="confirm"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								<ConfirmBody
									firstName={firstName}
									name={name}
									avatarUrl={avatarUrl}
									domain={domain}
									onDomainChange={setDomain}
									onConfirm={handleConfirm}
									submitting={submitting}
								/>
							</motion.div>
						) : (
							<motion.div
								key="docked"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.25, delay: 0.1 }}
							>
								<DockedHeader
									domain={clean}
									done={researchDone}
									onContinue={onDone}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				{phase === "confirm" && (
					<div className="w-full max-w-xl mx-auto mt-5 flex items-center justify-end px-1">
						<Button
							variant="insideOut"
							onClick={handleConfirm}
							disabled={!clean || submitting}
							className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
						>
							{submitting ? (
								<>
									Starting…
									<Loader2 className="size-3.5 animate-spin" />
								</>
							) : (
								<>
									Confirm
									<ArrowRight className="size-3.5" />
								</>
							)}
						</Button>
					</div>
				)}

				<AnimatePresence>
					{phase === "research" && (
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.15, duration: 0.3 }}
							className="relative w-full max-w-7xl xl:max-w-[1360px] mx-auto flex flex-col flex-1 min-h-0 mt-4 mb-8 gap-4"
						>
							<div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-4">
								<div className="flex min-h-[280px] min-w-0 flex-[1.15] flex-col lg:min-w-0 lg:self-stretch">
									<ResearchTranscript />
								</div>
								<motion.div
									initial={{ opacity: 0, x: 10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.35, duration: 0.4 }}
									className="flex min-w-0 flex-none flex-col lg:w-[420px] lg:min-w-[340px] lg:max-w-[420px]"
								>
									<ResearchActionRail domain={clean} />
								</motion.div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	)
}

function ConfirmBody({
	firstName,
	name,
	avatarUrl,
	domain,
	onDomainChange,
	onConfirm,
	submitting,
}: {
	firstName: string
	name: string
	avatarUrl: string | null
	domain: string
	onDomainChange: (v: string) => void
	onConfirm: () => void
	submitting: boolean
}) {
	return (
		<>
			<div className="flex items-center gap-4">
				<UserAvatar url={avatarUrl} name={name} className="size-12 shrink-0" />
				<div className="min-w-0">
					<p
						className={cn(
							"font-semibold text-[#fafafa] text-[20px]",
							dmSans125ClassName(),
						)}
					>
						{firstName ? `Hey ${firstName} 👋` : "Hey there 👋"}
					</p>
					<p className="text-[#737373] font-medium text-[14px] leading-[1.4] mt-0.5">
						I'll research your company and set up its Brain.
					</p>
				</div>
			</div>

			<div className="mt-6">
				<p className={fieldLabel}>Company domain</p>
				<div className="relative">
					<div
						className="absolute left-1.5 top-1/2 -translate-y-1/2 size-9 rounded-[8px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center overflow-hidden"
						style={inputBevelStyle}
					>
						<DomainLogo domain={normalizeDomain(domain) || "supermemory.ai"} />
					</div>
					<Input
						value={domain}
						onChange={(e) => onDomainChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !submitting) onConfirm()
						}}
						placeholder="your-team.com"
						spellCheck={false}
						autoComplete="off"
						className={cn(inputClass, "pl-14")}
						style={inputBevelStyle}
					/>
				</div>
			</div>
		</>
	)
}

function DockedHeader({
	domain,
	done,
	onContinue,
}: {
	domain: string
	done: boolean
	onContinue: () => void
}) {
	const brandName = workspaceNameFromDomain(domain) || domain
	return (
		<div className="flex items-center gap-3">
			<div
				className="size-8 rounded-[8px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center overflow-hidden shrink-0"
				style={inputBevelStyle}
			>
				<DomainLogo domain={domain} />
			</div>
			<span className="text-[14px] font-semibold text-[#fafafa]">{brandName}</span>
			<span
				className={cn(
					"text-[12px] font-medium",
					done ? "text-[#5CD68A]" : "text-[#737373]",
				)}
			>
				{done ? "Company Brain ready" : "Building your Company Brain…"}
			</span>
			{done ? (
				<Button
					type="button"
					onClick={onContinue}
					className={cn(
						"ml-auto rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#1D1C1D] shadow-[0_4px_24px_rgba(75,160,250,0.25)] hover:bg-white/95",
						dmSans125ClassName(),
					)}
				>
					Continue
					<ArrowRight className="size-3.5" />
				</Button>
			) : (
				<Loader2 className="size-3.5 animate-spin text-[#4BA0FA] ml-auto" />
			)}
		</div>
	)
}

function ResearchTranscript() {
	const { status, events } = useResearchStatus()
	const running = status !== "done"
	const scrollRef = useRef<HTMLDivElement>(null)

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new events
	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		})
	}, [events.length])

	return (
		<div className="flex flex-1 min-h-0 flex-col gap-4">
			<div
				style={cardSurfaceStyle}
				className="relative flex min-h-0 flex-col overflow-hidden rounded-[22px] bg-[#1B1F24]"
			>
				<div
					ref={scrollRef}
					className="flex-1 min-h-0 overflow-y-auto px-6 pt-8 pb-8"
				>
					<Timeline events={events} running={running} />
				</div>
				{/* Top-only overlay in the card color: text slides up under a solid edge. */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-9 rounded-t-[22px]"
					style={{
						background:
							"linear-gradient(to bottom, #1B1F24 0%, rgba(27,31,36,0) 100%)",
					}}
				/>
			</div>
		</div>
	)
}

function Timeline({
	events,
	running,
}: {
	events: ResearchEvent[]
	running: boolean
}) {
	if (events.length === 0) {
		return (
			<div className="flex items-center gap-3 text-[13px] font-medium text-[#737373]">
				<Loader2 className="size-4 animate-spin text-[#4BA0FA]" />
				Starting deep research…
			</div>
		)
	}

	return (
		<ol className="flex flex-col gap-0">
			<AnimatePresence initial={false}>
				{events.map((e, i) => {
					const isLast = i === events.length - 1
					const active = running && e.status === "in_progress"
					return (
						<motion.li
							key={e.aspect}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
							className="relative flex gap-3.5 pb-6 last:pb-0"
						>
							<div className="relative flex w-3.5 shrink-0 justify-center">
								<EventDot status={e.status} active={active} />
								{!isLast && (
									<span className="absolute left-1/2 top-[19px] -bottom-[18px] w-px -translate-x-1/2 bg-[#2E353D]" />
								)}
							</div>
							<div className="flex flex-1 flex-col gap-2 -mt-px">
								<span
									className={cn(
										"text-[14px] font-medium leading-[14px]",
										e.status === "error"
											? "text-[#E5735A]"
											: active
												? "text-[#fafafa]"
												: "text-[#A1A1AA]",
									)}
								>
									{e.label}
								</span>
								{e.detail && e.status !== "in_progress" && (
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-[12.5px] leading-[1.6] text-[#737373]"
									>
										<CitedText text={e.detail} />
									</motion.p>
								)}
								{e.status === "complete" && e.stats.length > 0 && (
									<StatStrip stats={e.stats} />
								)}
								{e.status === "complete" && e.highlights.length > 0 && (
									<Chips items={e.highlights} />
								)}
								{e.status === "complete" && e.sources.length > 0 && (
									<SourceChips urls={e.sources} />
								)}
								{active && <ThinkingLine />}
							</div>
						</motion.li>
					)
				})}
			</AnimatePresence>
		</ol>
	)
}

// grok inlines citations as `[[1]](url)` (sometimes consecutive). Render them
// as compact superscript links and collapse any leftover `[n]` bare markers.
const CITE_RE = /\[\[(\d+)\]\]\((https?:\/\/[^)\s]+)\)/g

function CitedText({ text }: { text: string }) {
	const nodes: ReactNode[] = []
	let last = 0
	let m: RegExpExecArray | null
	CITE_RE.lastIndex = 0
	// biome-ignore lint/suspicious/noAssignInExpressions: regex walk
	while ((m = CITE_RE.exec(text)) !== null) {
		if (m.index > last) {
			nodes.push(cleanBareCites(text.slice(last, m.index)))
		}
		nodes.push(
			<a
				key={`${m.index}-${m[1]}`}
				href={m[2]}
				target="_blank"
				rel="noreferrer"
				className="mx-px align-super text-[9px] font-semibold text-[#4BA0FA] hover:underline"
			>
				{m[1]}
			</a>,
		)
		last = m.index + m[0].length
	}
	if (last < text.length) nodes.push(cleanBareCites(text.slice(last)))
	return <>{nodes}</>
}

function cleanBareCites(s: string): string {
	return s.replace(/\[\[?\d+\]\]?/g, "").replace(/\s{2,}/g, " ")
}

const THINKING_PHRASES = [
	"Searching the web…",
	"Reading sources…",
	"Cross-checking facts…",
	"Summarizing findings…",
]

function ThinkingLine() {
	const [i, setI] = useState(0)
	useEffect(() => {
		const t = setInterval(
			() => setI((v) => (v + 1) % THINKING_PHRASES.length),
			1600,
		)
		return () => clearInterval(t)
	}, [])
	return (
		<motion.p
			key={i}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="text-[12px] leading-[1.5] text-[#525D6E]"
		>
			{THINKING_PHRASES[i]}
		</motion.p>
	)
}

// Boxless stat strip: values over tiny labels, split by hairline dividers.
function StatStrip({ stats }: { stats: ResearchStat[] }) {
	const shown = stats.slice(0, 3)
	if (!shown.length) return null
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="mt-2.5 flex flex-wrap items-stretch gap-x-5 gap-y-3"
		>
			{shown.map((s, i) => (
				<div
					key={`${s.label}-${s.value}`}
					className={cn(
						"flex flex-col gap-1",
						i > 0 && "border-l border-[rgba(82,89,102,0.2)] pl-5",
					)}
				>
					<span className="text-[15px] font-semibold leading-none text-[#fafafa]">
						{s.value}
					</span>
					<span className="text-[10px] uppercase tracking-[0.08em] text-[#525D6E]">
						{s.label}
					</span>
				</div>
			))}
		</motion.div>
	)
}

// Quiet outline chips, short entities only (no sentences).
function Chips({ items }: { items: string[] }) {
	const shown = items.filter((t) => t.length <= 42).slice(0, 4)
	if (!shown.length) return null
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="mt-2.5 flex flex-wrap gap-1.5"
		>
			{shown.map((t) => (
				<span
					key={t}
					className="rounded-md border border-[rgba(82,89,102,0.22)] px-2 py-[3px] text-[11px] font-medium text-[#8B8B8B]"
				>
					{t}
				</span>
			))}
		</motion.div>
	)
}

function hostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "")
	} catch {
		return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
	}
}

function SourceFavicon({ host }: { host: string }) {
	const sources = [
		`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=32`,
		`https://icons.duckduckgo.com/ip3/${host}.ico`,
	]
	const [idx, setIdx] = useState(0)
	if (idx >= sources.length) {
		return <Globe className="size-3 text-[#525D6E]" />
	}
	return (
		<img
			src={sources[idx]}
			alt=""
			className="size-4 rounded-[3px] object-contain"
			onError={() => setIdx((i) => i + 1)}
		/>
	)
}

// Minimal, deduped source row: favicon + muted domain, no boxes.
function SourceChips({ urls }: { urls: string[] }) {
	const seen = new Set<string>()
	const hosts: { host: string; url: string }[] = []
	for (const url of urls) {
		const host = hostname(url)
		if (seen.has(host)) continue
		seen.add(host)
		hosts.push({ host, url })
	}
	const shown = hosts.slice(0, 4)
	const extra = hosts.length - shown.length
	if (!shown.length) return null
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5"
		>
			<span className="text-[10px] uppercase tracking-[0.08em] text-[#525D6E]">
				Sources
			</span>
			{shown.map(({ host, url }) => (
				<a
					key={url}
					href={url}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
				>
					<span className="flex size-4 items-center justify-center">
						<SourceFavicon host={host} />
					</span>
					{host}
				</a>
			))}
			{extra > 0 && (
				<span className="text-[11px] font-medium text-[#525D6E]">+{extra}</span>
			)}
		</motion.div>
	)
}

// All dots render in a 14px box so their centers align regardless of shape.
function EventDot({ status, active }: { status: string; active: boolean }) {
	if (active) {
		return <Loader2 className="size-3.5 shrink-0 animate-spin text-[#4BA0FA]" />
	}
	if (status === "complete") {
		return (
			<span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#4BA0FA]">
				<Check className="size-2.5 text-[#05080D]" />
			</span>
		)
	}
	return (
		<span className="flex size-3.5 shrink-0 items-center justify-center">
			<span
				className={cn(
					"size-2.5 rounded-full",
					status === "error" ? "bg-[#E5735A]" : "bg-[#4BA0FA]/60",
				)}
			/>
		</span>
	)
}

function Backdrop() {
	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(75,160,250,0.08) 0%, rgba(34,97,202,0.04) 35%, transparent 70%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					backgroundImage:
						"radial-gradient(circle at center, rgba(105,167,240,0.22) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
					maskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
				}}
			/>
		</>
	)
}
