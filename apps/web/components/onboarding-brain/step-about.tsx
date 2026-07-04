"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Textarea } from "@ui/components/textarea"
import {
	ArrowRight,
	Brain,
	Building2,
	LayoutGrid,
	Loader2,
	Mail,
	Plug,
	Terminal,
	UserPlus,
	Users2,
	Wand2,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import type { BrainMode } from "./types"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export interface AboutValues {
	name: string
	about: string
	workspaceName: string
	workspaceDomain: string
}

interface Props {
	mode: BrainMode
	onModeChange: (m: BrainMode) => void
	allowTeam: boolean
	domain: string | null
	suggestedWorkspaceName: string
	defaultName: string
	avatarUrl: string | null
	values: AboutValues
	onChange: (next: AboutValues) => void
	onContinue: () => void
	submitting?: boolean
}

export const cardSurfaceStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

export const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

export const fieldLabel = "pl-2 pb-2 font-semibold text-[14px] text-[#737373]"
export const inputClass =
	"bg-[#0F1217] border border-[rgba(82,89,102,0.2)] rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#525D6E] h-12 px-4 shadow-none focus-visible:ring-0 focus-visible:border-[rgba(115,115,115,0.3)] transition-colors"

export function StepAbout({
	mode,
	onModeChange,
	allowTeam,
	domain,
	suggestedWorkspaceName,
	defaultName,
	avatarUrl,
	values,
	onChange,
	onContinue,
	submitting,
}: Props) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: one-time initialization when defaults become available
	useEffect(() => {
		const patch: Partial<AboutValues> = {}
		if (!values.name && defaultName) patch.name = defaultName
		if (!values.workspaceName && suggestedWorkspaceName) {
			patch.workspaceName = suggestedWorkspaceName
		}
		if (!values.workspaceDomain && domain) {
			patch.workspaceDomain = domain
		}
		if (Object.keys(patch).length > 0) onChange({ ...values, ...patch })
	}, [defaultName, suggestedWorkspaceName, domain])

	const teamGated = mode === "team" && !allowTeam
	const isTeam = mode === "team" && !teamGated

	// Default the workspace name per mode: name-derived for Personal (field hidden),
	// email-derived for Team unless the user has typed their own.
	const workspaceTouched = useRef(false)
	// biome-ignore lint/correctness/useExhaustiveDependencies: derive on mode/name changes only
	useEffect(() => {
		if (mode === "personal") {
			const first = values.name.trim().split(/\s+/)[0]
			const derived = first
				? `${first}'s Brain`
				: suggestedWorkspaceName || "My brain"
			if (values.workspaceName !== derived) {
				onChange({ ...values, workspaceName: derived })
			}
		} else if (!workspaceTouched.current) {
			const derived = suggestedWorkspaceName || ""
			if (values.workspaceName !== derived) {
				onChange({ ...values, workspaceName: derived })
			}
		}
	}, [mode, values.name, suggestedWorkspaceName])

	// Auto-draft the "what does your company do" blurb from the domain.
	const valuesRef = useRef(values)
	valuesRef.current = values
	const aboutTouched = useRef(false)
	const summarizedDomain = useRef<string | null>(null)
	const latestDraftDomain = useRef<string | null>(null)
	const [drafting, setDrafting] = useState(false)
	const [drafted, setDrafted] = useState(false)

	const draftCompany = async (rawDomain: string) => {
		const d = rawDomain.trim().toLowerCase()
		if (!d || summarizedDomain.current === d) return
		if (aboutTouched.current && valuesRef.current.about.trim()) return
		summarizedDomain.current = d
		latestDraftDomain.current = d
		setDrafting(true)
		try {
			const res = await fetch(`${BACKEND}/brain/company-summary`, {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ domain: d }),
			})
			// Ignore a stale response if the domain changed mid-flight.
			if (latestDraftDomain.current !== d) return
			if (!res.ok) return
			const data = (await res.json()) as { summary?: string | null }
			if (
				data.summary &&
				!aboutTouched.current &&
				latestDraftDomain.current === d
			) {
				onChange({ ...valuesRef.current, about: data.summary })
				setDrafted(true)
			}
		} catch {
			if (latestDraftDomain.current === d) summarizedDomain.current = null
		} finally {
			if (latestDraftDomain.current === d) setDrafting(false)
		}
	}

	// Draft once when entering Team with a domain already filled (e.g. from email).
	// biome-ignore lint/correctness/useExhaustiveDependencies: run on team-entry only
	useEffect(() => {
		if (!isTeam) return
		const d = (values.workspaceDomain || domain || "").trim()
		if (d && !values.about.trim()) draftCompany(d)
	}, [isTeam])

	const canContinue =
		!teamGated &&
		values.name.trim().length > 0 &&
		values.workspaceName.trim().length > 0

	return (
		<div className="max-w-xl mx-auto space-y-5">
			<section
				className="rounded-[22px] bg-[#1B1F24] p-6 md:p-8"
				style={cardSurfaceStyle}
			>
				<ModeToggle mode={mode} onChange={onModeChange} />

				<div className="mt-7 flex items-center gap-4">
					<UserAvatar
						url={avatarUrl}
						name={values.name || defaultName}
						className="size-12 shrink-0"
					/>
					<div className="min-w-0">
						<p
							className={cn(
								"font-semibold text-[#fafafa] text-[20px]",
								dmSans125ClassName(),
							)}
						>
							Tell us about you
						</p>
						<p className="text-[#737373] font-medium text-[14px] leading-[1.4] mt-0.5">
							So your brain sounds like yours, not the docs.
						</p>
					</div>
				</div>

				<div className="mt-6 space-y-4">
					<div className={cn("grid gap-4", isTeam && "sm:grid-cols-2")}>
						<div>
							<p className={fieldLabel}>Your name</p>
							<Input
								value={values.name}
								onChange={(e) => onChange({ ...values, name: e.target.value })}
								placeholder="e.g. Mahesh"
								className={inputClass}
								style={inputBevelStyle}
							/>
						</div>

						{isTeam && (
							<div>
								<p className={fieldLabel}>Workspace name</p>
								<Input
									value={values.workspaceName}
									onChange={(e) => {
										workspaceTouched.current = true
										onChange({ ...values, workspaceName: e.target.value })
									}}
									placeholder={suggestedWorkspaceName || "Acme"}
									className={inputClass}
									style={inputBevelStyle}
								/>
							</div>
						)}
					</div>

					{/* Company domain slides in only for Team mode. */}
					<AnimatePresence initial={false}>
						{isTeam && (
							<motion.div
								key="domain"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.22, ease: "easeOut" }}
								className="overflow-hidden"
							>
								<p className={fieldLabel}>Company domain</p>
								<div className="relative">
									<div
										className="absolute left-1.5 top-1/2 -translate-y-1/2 size-9 rounded-[8px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center overflow-hidden"
										style={inputBevelStyle}
									>
										{values.workspaceDomain || domain ? (
											<DomainLogo
												domain={values.workspaceDomain || domain || ""}
											/>
										) : (
											<Building2 className="size-4 text-[#737373]" />
										)}
									</div>
									<Input
										value={values.workspaceDomain}
										onChange={(e) =>
											onChange({ ...values, workspaceDomain: e.target.value })
										}
										onBlur={(e) => {
											const d = e.target.value.trim()
											if (d !== values.workspaceDomain) {
												onChange({ ...values, workspaceDomain: d })
											}
											draftCompany(d)
										}}
										placeholder="your-team.com"
										className={cn(inputClass, "pl-14")}
										style={inputBevelStyle}
									/>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{!teamGated && (
						<div>
							<div className="mb-2 flex items-center justify-between gap-2 pl-2">
								<p className="font-semibold text-[14px] text-[#737373]">
									{isTeam ? (
										"What does your company do?"
									) : (
										<>
											What are you here for?{" "}
											<span className="text-[#525D6E] font-medium">
												(optional)
											</span>
										</>
									)}
								</p>
								{isTeam &&
									(drafting ? (
										<span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#737373]">
											<Loader2 className="size-3 animate-spin" />
											Drafting from your site…
										</span>
									) : drafted ? (
										<span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#525D6E]">
											<Wand2 className="size-3" />
											Drafted from your site · edit anything
										</span>
									) : null)}
							</div>
							<Textarea
								value={drafting ? "" : values.about}
								onChange={(e) => {
									aboutTouched.current = true
									setDrafted(false)
									onChange({ ...values, about: e.target.value })
								}}
								placeholder={
									drafting
										? ""
										: isTeam
											? "A sentence or two — what your company builds, who you serve, how the team works."
											: "A sentence or two — what you do, what you're hoping the brain helps with."
								}
								rows={3}
								disabled={drafting}
								className={cn(
									inputClass,
									"h-auto resize-none py-3 leading-[1.5]",
									drafting && "opacity-60",
								)}
								style={inputBevelStyle}
							/>
						</div>
					)}
				</div>

				{teamGated ? (
					<motion.div
						key="gate"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.22, ease: "easeOut" }}
						className="mt-6"
					>
						<TeamBetaGate onUsePersonal={() => onModeChange("personal")} />
					</motion.div>
				) : (
					<motion.div
						key={`perks-${mode}`}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2 }}
					>
						<PerksFooter
							perks={mode === "team" ? TEAM_PERKS : PERSONAL_PERKS}
						/>
					</motion.div>
				)}
			</section>

			<div className="flex items-center justify-end gap-[22px] px-1">
				<Button
					variant="insideOut"
					onClick={onContinue}
					disabled={!canContinue || submitting}
					className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
				>
					{submitting ? (
						<>
							Creating…
							<Loader2 className="size-3.5 animate-spin" />
						</>
					) : (
						<>
							Continue
							<ArrowRight className="size-3.5" />
						</>
					)}
				</Button>
			</div>
		</div>
	)
}

const PERSONAL_PERKS: Perk[] = [
	{
		icon: <Brain className="size-4 text-[#8B8B8B]" />,
		title: "Your own brain",
		blurb: "Notes, docs, bookmarks — all searchable in one place.",
	},
	{
		icon: <Plug className="size-4 text-[#8B8B8B]" />,
		title: "Plug into your AI tools",
		blurb: "Claude, Cursor, ChatGPT — your context, everywhere.",
	},
	{
		icon: <Users2 className="size-4 text-[#8B8B8B]" />,
		title: "Switch to a team anytime",
		blurb: "Invite teammates whenever you're ready.",
	},
]

const TEAM_PERKS: Perk[] = [
	{
		icon: <UserPlus className="size-4 text-[#8B8B8B]" />,
		title: "Invite teammates",
		blurb: "Everyone contributes to the same brain.",
	},
	{
		icon: <Terminal className="size-4 text-[#8B8B8B]" />,
		title: "Shared coding agent context",
		blurb: "Claude, Cursor, MCP — same brain across the team.",
	},
	{
		icon: <LayoutGrid className="size-4 text-[#8B8B8B]" />,
		title: "Org-wide spaces",
		blurb: "Carve out sales, eng, design with their own access.",
	},
]

export function DomainLogo({ domain }: { domain: string }) {
	const sources = [
		`https://logo.clearbit.com/${domain}`,
		`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
		`https://icons.duckduckgo.com/ip3/${domain}.ico`,
	]
	const [idx, setIdx] = useState(0)
	if (idx >= sources.length) {
		return <Building2 className="size-5 text-[#737373]" />
	}
	return (
		<img
			src={sources[idx]}
			alt={domain}
			className="size-6 object-contain"
			onError={() => setIdx((i) => i + 1)}
		/>
	)
}

function TeamBetaGate({ onUsePersonal }: { onUsePersonal: () => void }) {
	return (
		<div
			className="relative overflow-hidden rounded-[14px] bg-[#1B1F24] p-5 md:p-6"
			style={cardSurfaceStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
				}}
			/>
			<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4BA0FA]">
				Private beta
			</p>
			<p
				className={cn(
					"mt-1.5 text-[15px] font-semibold leading-snug text-[#fafafa]",
					dmSans125ClassName(),
				)}
			>
				Team workspaces are invite-only
			</p>
			<p className="mt-1.5 text-[13px] leading-relaxed text-[#737373]">
				We're onboarding teams to Company Brain one at a time. Email us for
				access — or start with a personal workspace and invite your team later.
			</p>
			<div className="mt-4 flex w-full flex-col items-center gap-2.5">
				<a
					href="mailto:support@supermemory.com?subject=Company%20Brain%20beta%20access"
					className="group inline-flex items-center gap-2 rounded-[10px] border border-[rgba(82,89,102,0.2)] bg-[#14161A] px-3.5 py-2 text-[13px] font-medium text-[#fafafa] transition-colors hover:border-[rgba(75,160,250,0.4)]"
				>
					<Mail className="size-3.5 text-[#4BA0FA]" />
					support@supermemory.com
					<ArrowRight className="size-3.5 text-[#525D6E] transition-colors group-hover:text-[#fafafa]" />
				</a>
				<button
					type="button"
					onClick={onUsePersonal}
					className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
				>
					Start with a personal workspace
					<ArrowRight className="size-3.5" />
				</button>
			</div>
		</div>
	)
}

function ModeToggle({
	mode,
	onChange,
}: {
	mode: BrainMode
	onChange: (m: BrainMode) => void
}) {
	const items: { id: BrainMode; label: string }[] = [
		{ id: "personal", label: "Personal" },
		{ id: "team", label: "Team" },
	]
	return (
		<div
			className="relative grid grid-cols-2 items-center rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.2)] p-1 text-[13px] font-medium w-full"
			style={{
				boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
			}}
		>
			<motion.span
				aria-hidden
				className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full"
				style={{ background: "#00173C", border: "1px solid #2261CA66" }}
				animate={{ x: mode === "team" ? "100%" : "0%" }}
				transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
			/>
			{items.map((item) => {
				const isActive = mode === item.id
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onChange(item.id)}
						className={cn(
							"relative z-10 h-8 rounded-full text-center transition-colors duration-200",
							isActive
								? "text-[#fafafa]"
								: "text-[#737373] hover:text-[#fafafa]",
						)}
					>
						{item.label}
					</button>
				)
			})}
		</div>
	)
}

export function UserAvatar({
	url,
	name,
	className,
}: {
	url: string | null
	name: string
	className?: string
}) {
	const [errored, setErrored] = useState(false)
	const initial = (name?.trim()?.[0] ?? "?").toUpperCase()
	const hasImage = url && !errored

	return (
		<div
			className={cn(
				"rounded-full overflow-hidden bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center",
				className,
			)}
			style={inputBevelStyle}
		>
			{hasImage ? (
				<img
					src={url}
					alt={name}
					className="size-full object-cover"
					onError={() => setErrored(true)}
				/>
			) : (
				<span className="text-[20px] font-semibold text-[#fafafa]">
					{initial}
				</span>
			)}
		</div>
	)
}

type Perk = { icon: React.ReactNode; title: string; blurb: string }

function PerksFooter({ perks }: { perks: Perk[] }) {
	return (
		<div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
			{perks.map((p) => (
				<span
					key={p.title}
					className="inline-flex items-center gap-1.5 text-[12px] text-[#A1A1AA] font-medium"
				>
					<span className="shrink-0">{p.icon}</span>
					{p.title}
				</span>
			))}
		</div>
	)
}
