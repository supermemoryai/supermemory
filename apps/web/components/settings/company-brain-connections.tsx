"use client"

import { authClient } from "@lib/auth"
import { cn } from "@lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Lock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { dmSans125ClassName } from "@/lib/fonts"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { PillButton } from "../integrations/install-steps"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type ConnRow = { toolkit: string; org: boolean; user: boolean }
type SlackStatus = { connected: boolean; teamName: string | null }

function SecondaryButton({
	children,
	href,
}: {
	children: React.ReactNode
	href: string
}) {
	return (
		<a
			href={href}
			className={cn(
				dmSans125ClassName(),
				"inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#1E293B] bg-[#0D121A] px-4 h-9",
				"text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#1E293B]",
			)}
		>
			{children}
		</a>
	)
}

function SlackMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 122.8 122.8" className={className} aria-hidden="true">
			<path
				d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"
				fill="#E01E5A"
			/>
			<path
				d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
				fill="#E01E5A"
			/>
			<path
				d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"
				fill="#36C5F0"
			/>
			<path
				d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
				fill="#36C5F0"
			/>
			<path
				d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"
				fill="#2EB67D"
			/>
			<path
				d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
				fill="#2EB67D"
			/>
			<path
				d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"
				fill="#ECB22E"
			/>
			<path
				d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
				fill="#ECB22E"
			/>
		</svg>
	)
}

function GithubMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>GitHub</title>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	)
}

function LinearMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<title>Linear</title>
			<path d="M3.084 12.866a8.916 8.916 0 0 0 8.05 8.05.27.27 0 0 0 .222-.46l-7.812-7.812a.27.27 0 0 0-.46.222Zm-.044-1.955a.27.27 0 0 0 .078.21l9.76 9.76c.06.06.142.087.21.078a8.87 8.87 0 0 0 1.273-.218.27.27 0 0 0 .127-.453L3.712 9.51a.27.27 0 0 0-.453.127 8.87 8.87 0 0 0-.218 1.273Zm.69-2.706a.27.27 0 0 0 .06.29l11.715 11.716a.27.27 0 0 0 .29.06 8.96 8.96 0 0 0 .837-.384.27.27 0 0 0 .066-.439L4.553 7.302a.27.27 0 0 0-.44.066 8.96 8.96 0 0 0-.383.837Zm1.11-1.798a.27.27 0 0 1-.017-.366A8.948 8.948 0 0 1 18.07 18.69a.27.27 0 0 1-.366-.017L4.94 6.407Z" />
		</svg>
	)
}

const TOOLKITS: Record<
	string,
	{ label: string; subtitle: string; icon: React.ReactNode }
> = {
	github: {
		label: "GitHub",
		subtitle: "Repos, pull requests and issues",
		icon: <GithubMark className="size-5 text-[#FAFAFA]" />,
	},
	linear: {
		label: "Linear",
		subtitle: "Issues, projects and cycles",
		icon: <LinearMark className="size-5 text-[#5E6AD2]" />,
	},
}

function StatusDot({ connected }: { connected: boolean }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex items-center gap-1.5 text-[13px] font-medium",
				connected ? "text-[#FAFAFA]" : "text-[#737373]",
			)}
		>
			<span
				className={cn(
					"size-[7px] shrink-0 rounded-full",
					connected ? "bg-[#00AC3F]" : "bg-[#3A4150]",
				)}
			/>
			{connected ? "Connected" : "Not connected"}
		</span>
	)
}

function AppCard({
	toolkit,
	connected,
	canConnect,
	canDisconnect,
	lockedHint,
	busy,
	onConnect,
	onDisconnect,
}: {
	toolkit: string
	connected: boolean
	canConnect: boolean
	canDisconnect: boolean
	lockedHint?: string
	busy: boolean
	onConnect: () => void
	onDisconnect: () => void
}) {
	const meta = TOOLKITS[toolkit] ?? {
		label: toolkit,
		subtitle: "",
		icon: null,
	}
	return (
		<div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] sm:p-5">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					{meta.icon}
				</div>
				<div className="min-w-0">
					<p
						className={cn(
							dmSans125ClassName(),
							"font-semibold text-[15px] tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						{meta.label}
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"truncate text-[12px] font-medium text-[#737373]",
						)}
					>
						{meta.subtitle}
					</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-3">
				<StatusDot connected={connected} />
				{connected && canDisconnect ? (
					<PillButton onClick={onDisconnect} disabled={busy}>
						{busy && <Loader2 className="size-3.5 animate-spin" />}
						Disconnect
					</PillButton>
				) : (
					!connected &&
					(canConnect ? (
						<PillButton onClick={onConnect} disabled={busy}>
							{busy && <Loader2 className="size-3.5 animate-spin" />}
							Connect
						</PillButton>
					) : lockedHint ? (
						<span className="flex items-center gap-1 text-[12px] font-medium text-[#737373]">
							<Lock className="size-3" />
							{lockedHint}
						</span>
					) : null)
				)}
			</div>
		</div>
	)
}

function Section({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-3">
			<div className="px-1">
				<p
					className={cn(
						dmSans125ClassName(),
						"font-semibold text-[15px] tracking-[-0.15px] text-[#FAFAFA]",
					)}
				>
					{title}
				</p>
				<p
					className={cn(
						dmSans125ClassName(),
						"mt-0.5 text-[13px] font-medium text-[#737373]",
					)}
				>
					{description}
				</p>
			</div>
			{children}
		</div>
	)
}

function CardSkeleton() {
	return (
		<div className="flex items-center gap-3 rounded-[14px] bg-[#14161A] p-5 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="size-10 animate-pulse rounded-[10px] bg-[#1c1f24]" />
			<div className="space-y-2">
				<div className="h-3.5 w-24 animate-pulse rounded bg-[#1c1f24]" />
				<div className="h-3 w-40 animate-pulse rounded bg-[#1c1f24]" />
			</div>
		</div>
	)
}

export default function CompanyBrainConnections() {
	const isCompanyBrain = useHasCompanyBrain()
	const [rows, setRows] = useState<ConnRow[] | null>(null)
	const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
	const [busy, setBusy] = useState<string | null>(null)

	const roleQuery = useQuery({
		queryKey: ["company-brain-connections", "role"],
		queryFn: async () =>
			(await authClient.organization.getActiveMember()).data?.role ?? null,
		staleTime: 60_000,
		enabled: isCompanyBrain,
	})
	const role = (roleQuery.data ?? "").toLowerCase()
	const isAdmin = role === "owner" || role === "admin"

	const load = useCallback(async () => {
		const [connRes, slackRes] = await Promise.all([
			fetch(`${BACKEND}/brain/connections`, { credentials: "include" }),
			fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
		])
		if (connRes.ok) {
			const data = (await connRes.json()) as { toolkits?: ConnRow[] }
			setRows(Array.isArray(data.toolkits) ? data.toolkits : [])
		} else {
			setRows([])
			toast.error("Couldn't load connections.")
		}
		if (slackRes.ok) {
			setSlackStatus((await slackRes.json()) as SlackStatus)
		} else {
			setSlackStatus({ connected: false, teamName: null })
		}
	}, [])

	useEffect(() => {
		if (!isCompanyBrain) return
		void load()
		const onFocus = () => void load()
		window.addEventListener("focus", onFocus)
		return () => window.removeEventListener("focus", onFocus)
	}, [isCompanyBrain, load])

	const connect = async (toolkit: string, scope: "user" | "org") => {
		setBusy(`${toolkit}:${scope}`)
		try {
			const res = await fetch(
				`${BACKEND}/brain/connections/${toolkit}/link?scope=${scope}`,
				{ method: "POST", credentials: "include" },
			)
			if (res.status === 403) {
				toast.error("Only admins can connect the shared org account.")
				return
			}
			if (!res.ok) {
				toast.error("Couldn't start the connection.")
				return
			}
			const data = (await res.json()) as { url?: string; error?: string }
			if (data.url) window.open(data.url, "_blank", "noopener")
			else toast.error(data.error ?? "Couldn't start the connection.")
		} catch {
			toast.error("Couldn't start the connection.")
		} finally {
			setBusy(null)
		}
	}

	const disconnect = async (toolkit: string, scope: "user" | "org") => {
		const label = TOOLKITS[toolkit]?.label ?? toolkit
		if (
			!window.confirm(
				`Disconnect ${label} from ${scope === "org" ? "the shared org account" : "your personal account"}?`,
			)
		)
			return
		setBusy(`${toolkit}:${scope}`)
		try {
			const res = await fetch(
				`${BACKEND}/brain/connections/${toolkit}?scope=${scope}`,
				{ method: "DELETE", credentials: "include" },
			)
			if (res.status === 403) {
				toast.error("Only admins can disconnect the shared org account.")
				return
			}
			if (!res.ok) {
				toast.error("Couldn't disconnect.")
				return
			}
			toast.success(`${label} disconnected.`)
			await load()
		} catch {
			toast.error("Couldn't disconnect.")
		} finally {
			setBusy(null)
		}
	}

	if (!isCompanyBrain) {
		return (
			<p
				className={cn(
					dmSans125ClassName(),
					"text-[14px] font-medium text-[#737373]",
				)}
			>
				Company Brain isn't enabled for this organization.
			</p>
		)
	}

	const loading = rows === null

	return (
		<div className="space-y-7">
			<div className="flex items-center justify-end gap-3">
				{slackStatus?.connected && slackStatus.teamName ? (
					<p
						className={cn(
							dmSans125ClassName(),
							"mr-auto text-[13px] font-medium text-[#737373]",
						)}
					>
						Slack · {slackStatus.teamName}
					</p>
				) : null}
				{isAdmin ? (
					<SecondaryButton href={`${BACKEND}/brain/slack/oauth/install`}>
						<SlackMark className="size-4" />
						Reconnect Slack
					</SecondaryButton>
				) : null}
			</div>
			<Section
				title="Organization (shared)"
				description="Connected by admins. Used for reads when you haven't connected your own."
			>
				{loading ? (
					<CardSkeleton />
				) : (
					rows.map((row) => (
						<AppCard
							key={`org-${row.toolkit}`}
							toolkit={row.toolkit}
							connected={row.org}
							canConnect={isAdmin}
							canDisconnect={isAdmin}
							lockedHint="Admin only"
							busy={busy === `${row.toolkit}:org`}
							onConnect={() => connect(row.toolkit, "org")}
							onDisconnect={() => disconnect(row.toolkit, "org")}
						/>
					))
				)}
			</Section>

			<Section
				title="Your connections"
				description="Your personal accounts — used for your actions and your reads."
			>
				{loading ? (
					<CardSkeleton />
				) : (
					rows.map((row) => (
						<AppCard
							key={`user-${row.toolkit}`}
							toolkit={row.toolkit}
							connected={row.user}
							canConnect
							canDisconnect
							busy={busy === `${row.toolkit}:user`}
							onConnect={() => connect(row.toolkit, "user")}
							onDisconnect={() => disconnect(row.toolkit, "user")}
						/>
					))
				)}
			</Section>
		</div>
	)
}
