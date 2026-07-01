"use client"

import { cn } from "@lib/utils"
import { ArrowRight, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { dmSans125ClassName } from "@/lib/fonts"
import { useSettingsModal } from "@/components/settings/settings-modal"
import { brainConnectorIcon, SlackMark } from "../brain-connector-icons"

// Apps surfaced on the dashboard; the rest live behind "More" in settings.
const FEATURED_SLUGS = ["linear", "granola", "sentry"] as const
// Example prompts on the right card — can include apps not shown on the left.
const PREVIEW_PROMPT_SLUGS = ["linear", "granola", "github", "sentry"] as const

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const MCP_BASE = `${BACKEND}/brain/mcp-connections`

const cardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}
const tileStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

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

// Example asks that connecting each app unlocks for the Slack agent.
const AGENT_PROMPTS: Record<string, string> = {
	linear: "What's blocking the sprint?",
	github: "Summarize the open PRs on auth",
	sentry: "Any new errors since the deploy?",
	notion: "Find our launch checklist",
	posthog: "How's activation trending this week?",
	plain: "What are customers asking about?",
	granola: "Recap yesterday's standup",
}

function titleCase(s: string) {
	return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ConnectionsBoard() {
	const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
	const [rows, setRows] = useState<ConnRow[]>([])
	const [slack, setSlack] = useState<{
		connected: boolean
		teamName: string | null
	} | null>(null)
	const [busy, setBusy] = useState<string | null>(null)

	const load = useCallback(async () => {
		try {
			const [cat, conn, s] = await Promise.all([
				fetch(`${MCP_BASE}/catalog`, { credentials: "include" }),
				fetch(`${MCP_BASE}/`, { credentials: "include" }),
				fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
			])
			if (cat.ok)
				setCatalog(
					((await cat.json()) as { catalog?: CatalogEntry[] }).catalog ?? [],
				)
			else setCatalog([])
			if (conn.ok)
				setRows(
					((await conn.json()) as { connections?: ConnRow[] }).connections ??
						[],
				)
			if (s.ok) setSlack(await s.json())
		} catch {
			setCatalog([])
		}
	}, [])

	useEffect(() => {
		void load()
		const onFocus = () => void load()
		window.addEventListener("focus", onFocus)
		return () => window.removeEventListener("focus", onFocus)
	}, [load])

	const isConnected = (slug: string) =>
		rows.some((r) => r.serverSlug === slug && r.status === "active")

	const connect = async (entry: CatalogEntry) => {
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
			const data = (await res.json()) as { authUrl?: string; ok?: boolean }
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

	const { openSettings } = useSettingsModal()
	const apps = catalog ?? []
	const loading = catalog === null
	const featured = FEATURED_SLUGS.map((slug) =>
		apps.find((a) => a.slug === slug),
	).filter((a): a is CatalogEntry => Boolean(a))
	const previewApps = PREVIEW_PROMPT_SLUGS.map((slug) =>
		apps.find((a) => a.slug === slug),
	).filter((a): a is CatalogEntry => Boolean(a))
	const remainingCount = Math.max(apps.length - featured.length, 0)
	const connectedCount = apps.filter((a) => isConnected(a.slug)).length

	return (
		<div className="space-y-4">
			{slack && !slack.connected && <SlackBanner />}

			<div className="grid items-start gap-4 lg:grid-cols-5">
				<section
					className="relative flex h-fit min-w-0 flex-col gap-2 overflow-hidden rounded-[18px] bg-[#1B1F24] p-5 lg:col-span-3"
					style={cardStyle}
				>
					<div>
						<p
							className={cn(
								"text-[15px] font-semibold text-[#fafafa]",
								dmSans125ClassName(),
							)}
						>
							Connect your tools
						</p>
						<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
							Give your Slack agent live access to the apps your team already
							uses.
						</p>
					</div>

					<div className="overflow-hidden rounded-[12px] bg-[#14161A]">
						{loading ? (
							Array.from({ length: 3 }).map((_, i) => (
								<TileSkeleton key={i} showDivider={i < 2} />
							))
						) : (
							<>
								{featured.map((entry, i) => (
									<AppTile
										key={entry.slug}
										icon={brainConnectorIcon(entry.slug, entry.name, "size-5")}
										name={entry.name}
										subtitle={titleCase(entry.category)}
										connected={isConnected(entry.slug)}
										busy={busy === entry.slug}
										onConnect={() => connect(entry)}
										showDivider={i < featured.length - 1 || remainingCount > 0}
									/>
								))}
								{remainingCount > 0 && (
									<MoreTile
										count={remainingCount}
										onClick={() => openSettings("company-brain")}
									/>
								)}
							</>
						)}
					</div>
				</section>

				<AgentPreview
					apps={previewApps}
					isConnected={isConnected}
					connectedCount={connectedCount}
				/>
			</div>
		</div>
	)
}

function AgentPreview({
	apps,
	isConnected,
	connectedCount,
}: {
	apps: CatalogEntry[]
	isConnected: (slug: string) => boolean
	connectedCount: number
}) {
	const prompts = apps
		.filter((a) => AGENT_PROMPTS[a.slug])
		.slice(0, 6)
		.map((a) => ({
			slug: a.slug,
			name: a.name,
			prompt: AGENT_PROMPTS[a.slug],
			connected: isConnected(a.slug),
		}))

	return (
		<section
			className="relative flex h-fit min-w-0 flex-col gap-2 overflow-hidden rounded-[18px] bg-[#1B1F24] p-5 lg:col-span-2"
			style={cardStyle}
		>
			<div className="flex items-center gap-2">
				<SlackMark className="size-4" />
				<p
					className={cn(
						"text-[15px] font-semibold text-[#fafafa]",
						dmSans125ClassName(),
					)}
				>
					Ask in Slack
				</p>
			</div>
			<p className="text-[12px] font-medium leading-[1.5] text-[#737373]">
				{connectedCount > 0
					? "Things your agent can answer now:"
					: "Connect a tool and your agent can answer:"}
			</p>

			<div className="overflow-hidden rounded-[12px] bg-[#14161A]">
				{prompts.map((p, i) => (
					<div
						key={p.slug}
						className={cn(
							"grid min-h-11 grid-cols-[28px_1fr] items-center gap-x-3 px-3 py-2.5 transition-opacity",
							i < prompts.length - 1 && "border-b border-[#1B1F24]",
							p.connected ? "opacity-100" : "opacity-60",
						)}
					>
						<div
							className="flex size-7 items-center justify-center overflow-hidden rounded-[8px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
							style={tileStyle}
						>
							{brainConnectorIcon(p.slug, p.name, "size-4")}
						</div>
						<p className="text-[12.5px] font-medium leading-snug text-[#d4d4d8]">
							"{p.prompt}"
						</p>
					</div>
				))}
			</div>
		</section>
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
				"flex min-h-[52px] items-center gap-3 px-3 py-2.5",
				showDivider && "border-b border-[#1B1F24]",
			)}
		>
			<div
				className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
				style={tileStyle}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-semibold leading-none text-[#fafafa]">
					{name}
				</p>
				<p className="mt-1 truncate text-[11px] font-medium leading-none text-[#737373]">
					{subtitle}
				</p>
			</div>
			{connected ? (
				<span className="flex w-[88px] shrink-0 items-center justify-end gap-1.5 text-[12px] font-medium text-[#fafafa]">
					<span className="size-[7px] rounded-full bg-[#00AC3F]" />
					Connected
				</span>
			) : (
				<button
					type="button"
					onClick={onConnect}
					disabled={busy}
					className={cn(
						dmSans125ClassName(),
						"flex w-[88px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 py-1.5 text-[12px] font-medium text-[#fafafa] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:opacity-50",
					)}
				>
					{busy && <Loader2 className="size-3.5 animate-spin" />}
					Connect
				</button>
			)}
		</div>
	)
}

function MoreTile({ count, onClick }: { count: number; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				dmSans125ClassName(),
				"flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#171A1F]",
			)}
		>
			<div
				className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[#2A3140] bg-[#080B0F] text-[11px] font-semibold text-[#737373]"
				style={tileStyle}
			>
				+{count}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-semibold leading-none text-[#fafafa]">
					{count} more {count === 1 ? "app" : "apps"}
				</p>
				<p className="mt-1 truncate text-[11px] font-medium leading-none text-[#737373]">
					Notion, PostHog, Plain and more
				</p>
			</div>
			<div className="flex w-[88px] shrink-0 justify-end">
				<ArrowRight className="size-4 text-[#52525B]" />
			</div>
		</button>
	)
}

function TileSkeleton({ showDivider = false }: { showDivider?: boolean }) {
	return (
		<div
			className={cn(
				"flex min-h-[52px] items-center gap-3 px-3 py-2.5",
				showDivider && "border-b border-[#1B1F24]",
			)}
		>
			<div className="size-9 animate-pulse rounded-[10px] bg-[#1c1f24]" />
			<div className="flex-1 space-y-2">
				<div className="h-3 w-20 animate-pulse rounded bg-[#1c1f24]" />
				<div className="h-2.5 w-28 animate-pulse rounded bg-[#1c1f24]" />
			</div>
			<div className="h-7 w-[88px] animate-pulse rounded-full bg-[#1c1f24]" />
		</div>
	)
}

function SlackBanner() {
	return (
		<section
			className="relative overflow-hidden rounded-[18px] bg-[#1B1F24] p-5"
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
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3.5">
					<div
						className="flex size-12 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
						style={tileStyle}
					>
						<SlackMark className="size-7" />
					</div>
					<div className="min-w-0">
						<p
							className={cn(
								"text-[16px] font-semibold text-[#fafafa]",
								dmSans125ClassName(),
							)}
						>
							Company Brain in Slack
						</p>
						<p className="mt-0.5 text-[13px] font-medium leading-[1.5] text-[#737373]">
							Install Supermemory so your team can{" "}
							<span className="text-[#A1A1AA]">@supermemory</span> in any
							channel.
						</p>
					</div>
				</div>

				<a
					href={`${BACKEND}/brain/slack/oauth/install`}
					className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1D1C1D] transition-transform hover:scale-[1.02] sm:self-auto"
				>
					<SlackMark className="size-[18px]" />
					Add to Slack
				</a>
			</div>
		</section>
	)
}
