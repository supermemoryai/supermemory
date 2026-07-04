"use client"

import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	ArrowRight,
	Check,
	Loader2,
	Mail,
	Plus,
	Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
	brainConnectorIcon,
	SlackMark,
} from "@/components/brain-connector-icons"
import { useSettingsModal } from "@/components/settings/settings-modal"
import { useResearchStatus } from "@/hooks/use-research-status"
import { dmSans125ClassName } from "@/lib/fonts"
import { cardSurfaceStyle, inputBevelStyle, inputClass } from "./step-about"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const MCP_BASE = `${BACKEND}/brain/mcp-connections`

const FEATURED_SLUGS = ["linear", "granola", "sentry"] as const
const SETUP_STEPS = ["slack", "apps", "invite"] as const
type SetupStepId = (typeof SETUP_STEPS)[number]

const ROTATE_MS = 35_000
const REVEAL_DELAY_MS = 1_800

const tileStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

type AuthType = "oauth" | "static" | "none"
type CatalogEntry = {
	slug: string
	name: string
	category: string
	authType: AuthType
	tokenHint?: string
}
type ConnRow = {
	serverSlug: string
	status: "active" | "pending" | "error"
	userId: string | null
}

export type ParallelSetupStats = {
	slackConnected: boolean
	appsConnected: number
	invitesSent: number
}

const STEP_META: Record<
	SetupStepId,
	{ label: string; hint: string }
> = {
	slack: {
		label: "Add to Slack",
		hint: "Ask your company brain in-channel.",
	},
	apps: {
		label: "Connect apps",
		hint: "",
	},
	invite: {
		label: "Invite teammates",
		hint: "Multiply what the brain remembers.",
	},
}

function titleCase(s: string) {
	return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ResearchActionRail({
	domain,
	onStatsChange,
}: {
	domain: string
	onStatsChange?: (stats: ParallelSetupStats) => void
}) {
	const { org } = useAuth()
	const { openSettings } = useSettingsModal()
	const { events } = useResearchStatus()
	const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
	const [rows, setRows] = useState<ConnRow[]>([])
	const [slack, setSlack] = useState<{
		connected: boolean
		teamName: string | null
	} | null>(null)
	const [busy, setBusy] = useState<string | null>(null)
	const [invites, setInvites] = useState<{ email: string }[]>([])
	const [draft, setDraft] = useState("")
	const [invitesSent, setInvitesSent] = useState(0)
	const [sendingInvites, setSendingInvites] = useState(false)
	const [spotlight, setSpotlight] = useState<SetupStepId>("slack")
	const [rotationPaused, setRotationPaused] = useState(false)
	const [minDelayPassed, setMinDelayPassed] = useState(false)
	const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const domainOrFallback = (domain || "your-team.com").trim().toLowerCase()

	const load = useCallback(async () => {
		try {
			const [cat, conn, s] = await Promise.all([
				fetch(`${MCP_BASE}/catalog`, { credentials: "include" }),
				fetch(`${MCP_BASE}/`, { credentials: "include" }),
				fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
			])
			try {
				if (cat.ok) {
					const data: { catalog?: CatalogEntry[] } = await cat.json()
					setCatalog(data.catalog ?? [])
				} else setCatalog([])
			} catch {
				setCatalog([])
			}
			try {
				if (conn.ok) {
					const data: { connections?: ConnRow[] } = await conn.json()
					setRows(data.connections ?? [])
				} else setRows([])
			} catch {
				setRows([])
			}
			try {
				if (s.ok) setSlack(await s.json())
			} catch {}
		} catch {
			setCatalog([])
			setRows([])
		}
	}, [])

	useEffect(() => {
		void load()
		const onFocus = () => void load()
		window.addEventListener("focus", onFocus)
		return () => window.removeEventListener("focus", onFocus)
	}, [load])

	useEffect(() => {
		const t = window.setTimeout(() => setMinDelayPassed(true), REVEAL_DELAY_MS)
		return () => window.clearTimeout(t)
	}, [])

	const isConnected = useCallback(
		(slug: string) =>
			rows.some((r) => r.serverSlug === slug && r.status === "active"),
		[rows],
	)

	const apps = catalog ?? []
	const featured = FEATURED_SLUGS.map((slug) =>
		apps.find((a) => a.slug === slug),
	).filter((a): a is CatalogEntry => Boolean(a))
	const appsConnected = apps.filter((a) => isConnected(a.slug)).length
	const slackConnected = slack?.connected ?? false

	const stepDone = useCallback(
		(id: SetupStepId) => {
			if (id === "slack") return slackConnected
			if (id === "apps") return appsConnected > 0
			return invitesSent > 0
		},
		[slackConnected, appsConnected, invitesSent],
	)

	const incompleteSteps = useMemo(
		() => SETUP_STEPS.filter((id) => !stepDone(id)),
		[stepDone],
	)

	const pauseRotation = useCallback((ms = 60_000) => {
		setRotationPaused(true)
		if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
		pauseTimerRef.current = setTimeout(() => setRotationPaused(false), ms)
	}, [])

	useEffect(() => {
		return () => {
			if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
		}
	}, [])

	useEffect(() => {
		if (rotationPaused || incompleteSteps.length === 0) return
		if (!incompleteSteps.includes(spotlight)) {
			setSpotlight(incompleteSteps[0] ?? "slack")
		}
		const timer = window.setInterval(() => {
			setSpotlight((prev) => {
				const pool = SETUP_STEPS.filter((id) => !stepDone(id))
				if (pool.length === 0) return prev
				const idx = pool.indexOf(prev)
				return pool[(idx + 1) % pool.length] ?? pool[0] ?? "slack"
			})
		}, ROTATE_MS)
		return () => window.clearInterval(timer)
	}, [rotationPaused, incompleteSteps, spotlight, stepDone])

	useEffect(() => {
		onStatsChange?.({
			slackConnected,
			appsConnected,
			invitesSent,
		})
	}, [slackConnected, appsConnected, invitesSent, onStatsChange])

	const setupBeatDone = events.some(
		(e) => e.aspect === "prepare" && e.status === "complete",
	)
	const revealed = minDelayPassed && (setupBeatDone || events.length >= 2)

	const focusStep = (id: SetupStepId) => {
		setSpotlight(id)
		pauseRotation()
	}

	const connect = async (entry: CatalogEntry) => {
		pauseRotation()
		setBusy(entry.slug)
		try {
			if (entry.authType === "static") {
				const token = window.prompt(
					`Paste a token for ${entry.name}.${entry.tokenHint ? `\n${entry.tokenHint}` : ""}`,
				)
				if (!token) return
				const res = await fetch(`${MCP_BASE}/${entry.slug}/connect-static`, {
					method: "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ token, shared: false }),
				})
				if (!res.ok) {
					toast.error("Couldn't connect.")
					return
				}
				toast.success(`${entry.name} connected.`)
				await load()
				return
			}
			const res = await fetch(`${MCP_BASE}/${entry.slug}/connect`, {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					shared: false,
					redirectUrl: window.location.href,
				}),
			})
			if (!res.ok) {
				toast.error("Couldn't start the connection.")
				return
			}
			const data: { authUrl?: string; ok?: boolean } = await res.json()
			if (data.authUrl) window.open(data.authUrl, "_blank", "noopener")
			else if (data.ok) {
				toast.success(`${entry.name} connected.`)
				await load()
			} else toast.error("Couldn't start the connection.")
		} catch {
			toast.error("Couldn't start the connection.")
		} finally {
			setBusy(null)
		}
	}

	const addInvites = (text: string) => {
		const found = text.match(EMAIL_RE) ?? []
		if (found.length === 0) return
		const existing = new Set(invites.map((i) => i.email.toLowerCase()))
		const next: { email: string }[] = []
		for (const raw of found) {
			const email = raw.trim().toLowerCase()
			if (!email || existing.has(email)) continue
			existing.add(email)
			next.push({ email })
		}
		if (next.length === 0) {
			setDraft("")
			return
		}
		setInvites((prev) => [...prev, ...next])
		setDraft("")
	}

	const sendInvites = async () => {
		if (sendingInvites || invites.length === 0) return
		if (!org?.id) {
			toast.error("Organization isn't ready yet.")
			return
		}
		setSendingInvites(true)
		try {
			const results = await Promise.allSettled(
				invites.map((inv) =>
					authClient.organization.inviteMember({
						email: inv.email,
						role: "member",
						organizationId: org.id,
						resend: true,
					}),
				),
			)
			const failed = results.filter(
				(r) =>
					r.status === "rejected" ||
					(r.status === "fulfilled" && Boolean(r.value?.error)),
			).length
			const sent = invites.length - failed
			if (sent > 0) {
				setInvitesSent((n) => n + sent)
				setInvites([])
				toast.success(
					`Sent ${sent} invite${sent === 1 ? "" : "s"} to your team.`,
				)
			}
			if (failed > 0) {
				toast.error(
					`${failed} invite${failed === 1 ? "" : "s"} couldn't be sent.`,
				)
			}
		} catch {
			toast.error("Couldn't send invites. Try again in a moment.")
		} finally {
			setSendingInvites(false)
		}
	}

	const doneSummary = (id: SetupStepId) => {
		if (id === "slack") return slack?.teamName ?? "Connected"
		if (id === "apps")
			return `${appsConnected} connected`
		return `${invitesSent} sent`
	}

	return (
		<div
			style={cardSurfaceStyle}
			className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-[#161A20]/95"
		>
			<div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
				<p
					className={cn(
						"text-[13px] font-medium text-[#737373]",
						dmSans125ClassName(),
					)}
				>
					While we research
				</p>

				{!revealed ? (
					<ol className="mt-5 flex flex-col opacity-40">
						{SETUP_STEPS.map((id, i) => {
							const isLast = i === SETUP_STEPS.length - 1
							const meta = STEP_META[id]
							return (
								<li key={id} className="relative flex gap-3.5 pb-5 last:pb-0">
									<div className="relative flex w-3.5 shrink-0 justify-center">
										<span className="flex size-3.5 shrink-0 items-center justify-center">
											<span className="size-2 rounded-full bg-[#4BA0FA]/35" />
										</span>
										{!isLast && (
											<span className="absolute left-1/2 top-[18px] -bottom-[14px] w-px -translate-x-1/2 bg-[#2E353D]/70" />
										)}
									</div>
									<span className="text-[13px] font-medium text-[#525D6E]">
										{meta.label}
									</span>
								</li>
							)
						})}
					</ol>
				) : (
					<ol className="mt-5 flex flex-col">
						{SETUP_STEPS.map((id, i) => {
							const done = stepDone(id)
							const active = !done && spotlight === id
							const isLast = i === SETUP_STEPS.length - 1
							const meta = STEP_META[id]

							return (
								<li
									key={id}
									className="relative flex gap-3.5 pb-5 last:pb-0"
								>
									<div className="relative flex w-3.5 shrink-0 justify-center">
										<SetupDot done={done} active={active} />
										{!isLast && (
											<span className="absolute left-1/2 top-[18px] -bottom-[14px] w-px -translate-x-1/2 bg-[#2E353D]/70" />
										)}
									</div>

									<div className="min-w-0 flex-1 -mt-px">
										<button
											type="button"
											onClick={() => focusStep(id)}
											className="w-full text-left"
										>
											<span
												className={cn(
													"text-[13px] font-medium leading-[14px] transition-colors",
													active && "text-[#FAFAFA]",
													done && "text-[#525D6E]",
													!active && !done && "text-[#737373] hover:text-[#A1A1AA]",
												)}
											>
												{meta.label}
											</span>
											{done && (
												<p className="mt-1 text-[12px] font-medium text-[#525D6E]">
													{doneSummary(id)}
												</p>
											)}
										</button>

										<AnimatePresence initial={false} mode="popLayout">
											{active && (
												<motion.div
													key={`${id}-body`}
													initial={{ opacity: 0, y: 4 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -2 }}
													transition={{ duration: 0.18 }}
													className="mt-3"
												>
													{meta.hint ? (
														<p className="text-[12px] font-medium leading-[1.5] text-[#525D6E]">
															{meta.hint}
														</p>
													) : null}

													<div className={cn(meta.hint ? "mt-3" : "mt-2")}>
														{id === "slack" && (
															<SlackStepBody
																connected={slackConnected}
																teamName={slack?.teamName ?? null}
															/>
														)}
														{id === "apps" && (
															<AppsStepBody
																catalog={catalog}
																featured={featured}
																isConnected={isConnected}
																busy={busy}
																onConnect={connect}
																onBrowse={() => {
																	pauseRotation()
																	openSettings("company-brain")
																}}
															/>
														)}
														{id === "invite" && (
															<InviteStepBody
																domain={domainOrFallback}
																draft={draft}
																invites={invites}
																invitesSent={invitesSent}
																sendingInvites={sendingInvites}
																onDraftChange={setDraft}
																onAddInvites={addInvites}
																onRemoveInvite={(email) =>
																	setInvites((prev) =>
																		prev.filter((i) => i.email !== email),
																	)
																}
																onSendInvites={sendInvites}
																onFocus={() => pauseRotation()}
															/>
														)}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</li>
							)
						})}
					</ol>
				)}
			</div>
		</div>
	)
}

function SetupDot({ done, active }: { done: boolean; active: boolean }) {
	if (done) {
		return (
			<span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#4BA0FA]">
				<Check className="size-2.5 text-[#05080D]" strokeWidth={3} />
			</span>
		)
	}
	if (active) {
		return (
			<span className="flex size-3.5 shrink-0 items-center justify-center">
				<span className="size-2.5 rounded-full bg-[#4BA0FA]" />
			</span>
		)
	}
	return (
		<span className="flex size-3.5 shrink-0 items-center justify-center">
			<span className="size-2 rounded-full bg-[#4BA0FA]/35" />
		</span>
	)
}

function SlackStepBody({
	connected,
	teamName,
}: {
	connected: boolean
	teamName: string | null
}) {
	if (connected) {
		return (
			<p className="text-[12px] font-medium text-[#525D6E]">
				Live in {teamName ?? "your workspace"}
			</p>
		)
	}
	return (
		<a
			href={`${BACKEND}/brain/slack/oauth/install`}
			className={cn(
				"inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1D1C1D] transition-opacity hover:opacity-90",
				dmSans125ClassName(),
			)}
		>
			<SlackMark className="size-4" />
			Add to Slack
		</a>
	)
}

function AppsStepBody({
	catalog,
	featured,
	isConnected,
	busy,
	onConnect,
	onBrowse,
}: {
	catalog: CatalogEntry[] | null
	featured: CatalogEntry[]
	isConnected: (slug: string) => boolean
	busy: string | null
	onConnect: (entry: CatalogEntry) => void
	onBrowse: () => void
}) {
	if (catalog === null) {
		return (
			<div className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#14161A]/80">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className={cn(
							"flex h-12 items-center gap-3 px-3",
							i < 2 && "border-b border-white/[0.04]",
						)}
					>
						<div className="size-8 animate-pulse rounded-[8px] bg-[#1c2128]" />
						<div className="h-2.5 flex-1 animate-pulse rounded bg-[#1c2128]" />
					</div>
				))}
			</div>
		)
	}

	if (featured.length === 0) {
		return (
			<button
				type="button"
				onClick={onBrowse}
				className="text-[12px] font-medium text-[#737373] transition-colors hover:text-[#A1A1AA]"
			>
				Browse connections →
			</button>
		)
	}

	const allConnected = featured.every((e) => isConnected(e.slug))

	return (
		<div className="space-y-2.5">
			<div
				className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#14161A]/80"
				style={inputBevelStyle}
			>
				{featured.map((entry, i) => (
					<AppTile
						key={entry.slug}
						icon={brainConnectorIcon(entry.slug, entry.name, "size-4")}
						name={entry.name}
						subtitle={titleCase(entry.category)}
						connected={isConnected(entry.slug)}
						busy={busy === entry.slug}
						onConnect={() => onConnect(entry)}
						showDivider={i < featured.length - 1}
					/>
				))}
			</div>
			<button
				type="button"
				onClick={onBrowse}
				className="text-[12px] font-medium text-[#525D6E] transition-colors hover:text-[#A1A1AA]"
			>
				{allConnected ? "Browse more connections →" : "More connections →"}
			</button>
		</div>
	)
}

function InviteStepBody({
	domain,
	draft,
	invites,
	invitesSent,
	sendingInvites,
	onDraftChange,
	onAddInvites,
	onRemoveInvite,
	onSendInvites,
	onFocus,
}: {
	domain: string
	draft: string
	invites: { email: string }[]
	invitesSent: number
	sendingInvites: boolean
	onDraftChange: (v: string) => void
	onAddInvites: (text: string) => void
	onRemoveInvite: (email: string) => void
	onSendInvites: () => void
	onFocus: () => void
}) {
	return (
		<div className="space-y-2.5">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					onAddInvites(draft)
				}}
				className="flex gap-2"
			>
				<div className="relative flex-1">
					<Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#525D6E]" />
					<Input
						value={draft}
						onChange={(e) => onDraftChange(e.target.value)}
						onFocus={onFocus}
						onPaste={(e) => {
							const pasted = e.clipboardData.getData("text")
							if (pasted && EMAIL_RE.test(pasted)) {
								e.preventDefault()
								onAddInvites(pasted)
							}
						}}
						placeholder={`teammate@${domain}`}
						className={cn(inputClass, "h-10 pl-9 text-[13px]")}
						style={inputBevelStyle}
					/>
				</div>
				<Button
					type="submit"
					variant="insideOut"
					disabled={!draft.trim()}
					className="rounded-full size-10 p-0 text-[#fafafa] shrink-0"
				>
					<Plus className="size-4" />
				</Button>
			</form>
			{invites.length > 0 && (
				<div className="space-y-1.5">
					{invites.map((inv) => (
						<div
							key={inv.email}
							className="flex items-center gap-2 py-1"
						>
							<span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#737373]">
								{inv.email}
							</span>
							<button
								type="button"
								onClick={() => onRemoveInvite(inv.email)}
								className="text-[#525D6E] hover:text-[#A1A1AA] p-0.5"
								aria-label={`Remove ${inv.email}`}
							>
								<Trash2 className="size-3.5" />
							</button>
						</div>
					))}
					<Button
						variant="insideOut"
						onClick={onSendInvites}
						disabled={sendingInvites}
						className="w-full rounded-full h-9 text-[13px] font-medium text-[#fafafa]"
					>
						{sendingInvites ? (
							<>
								Sending…
								<Loader2 className="size-3.5 animate-spin" />
							</>
						) : (
							<>
								Send {invites.length} invite
								{invites.length === 1 ? "" : "s"}
								<ArrowRight className="size-3.5" />
							</>
						)}
					</Button>
				</div>
			)}
			{invitesSent > 0 && invites.length === 0 && (
				<p className="text-[12px] font-medium text-[#525D6E]">
					{invitesSent} invite{invitesSent === 1 ? "" : "s"} sent
				</p>
			)}
		</div>
	)
}

function AppTile({
	icon,
	name,
	subtitle,
	connected,
	busy,
	onConnect,
	showDivider = false,
}: {
	icon: React.ReactNode
	name: string
	subtitle: string
	connected: boolean
	busy: boolean
	onConnect: () => void
	showDivider?: boolean
}) {
	return (
		<div
			className={cn(
				"flex min-h-[48px] items-center gap-2.5 px-3 py-2",
				showDivider && "border-b border-white/[0.04]",
			)}
		>
			<div
				className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
				style={tileStyle}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[12px] font-semibold leading-none text-[#E4E4E7]">
					{name}
				</p>
				<p className="mt-0.5 truncate text-[11px] font-medium text-[#525D6E]">
					{subtitle}
				</p>
			</div>
			{connected ? (
				<Check className="size-3.5 shrink-0 text-[#4BA0FA]" strokeWidth={2.5} />
			) : (
				<button
					type="button"
					onClick={onConnect}
					disabled={busy}
					className={cn(
						dmSans125ClassName(),
						"flex shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-[#FAFAFA] transition-opacity hover:bg-white/[0.1] disabled:opacity-50",
					)}
				>
					{busy ? <Loader2 className="size-3 animate-spin" /> : "Connect"}
				</button>
			)}
		</div>
	)
}