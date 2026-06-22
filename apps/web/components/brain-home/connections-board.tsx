"use client"

import { $fetch } from "@lib/api"
import { cn } from "@lib/utils"
import { useQuery } from "@tanstack/react-query"
import { GoogleDrive, Notion } from "@ui/assets/icons"
import { Cloud, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { dmSans125ClassName } from "@/lib/fonts"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const cardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}
const tileStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

type ConnRow = { toolkit: string; org: boolean; user: boolean }

export function ConnectionsBoard() {
	const [brainRows, setBrainRows] = useState<ConnRow[] | null>(null)
	const [slack, setSlack] = useState<{
		connected: boolean
		teamName: string | null
	} | null>(null)
	const [busy, setBusy] = useState<string | null>(null)

	const loadBrain = useCallback(async () => {
		try {
			const [c, s] = await Promise.all([
				fetch(`${BACKEND}/brain/connections`, { credentials: "include" }),
				fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
			])
			if (c.ok)
				setBrainRows(((await c.json()) as { toolkits: ConnRow[] }).toolkits)
			if (s.ok) setSlack(await s.json())
		} catch {}
	}, [])

	useEffect(() => {
		void loadBrain()
		const onFocus = () => void loadBrain()
		window.addEventListener("focus", onFocus)
		return () => window.removeEventListener("focus", onFocus)
	}, [loadBrain])

	const { data: connectors } = useQuery({
		queryKey: ["brain-home", "connectors"],
		queryFn: async () => {
			const res = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (res.error) return [] as Array<{ provider?: string }>
			return (res.data ?? []) as Array<{ provider?: string }>
		},
		staleTime: 30_000,
	})

	const connectorConnected = (provider: string) =>
		Boolean(connectors?.some((c) => c.provider === provider))

	const connectBrain = async (toolkit: string) => {
		setBusy(`brain:${toolkit}`)
		try {
			const res = await fetch(
				`${BACKEND}/brain/connections/${toolkit}/link?scope=user`,
				{ method: "POST", credentials: "include" },
			)
			if (!res.ok) {
				toast.error("Couldn't start the connection.")
				return
			}
			const data = (await res.json()) as { url?: string }
			if (data.url) window.open(data.url, "_blank", "noopener")
			else toast.error("Couldn't start the connection.")
		} catch {
			toast.error("Couldn't start the connection.")
		} finally {
			setBusy(null)
		}
	}

	const connectConnector = async (
		provider: "google-drive" | "notion" | "onedrive",
	) => {
		setBusy(`conn:${provider}`)
		try {
			const res = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: { redirectUrl: window.location.href, containerTags: [] },
			})
			const data = res.data as { authLink?: string } | undefined
			if (data?.authLink) window.location.href = data.authLink
			else toast.error("Couldn't start the connection.")
		} catch {
			toast.error("Couldn't start the connection.")
		} finally {
			setBusy(null)
		}
	}

	const brainConnected = (toolkit: string) =>
		Boolean(brainRows?.find((r) => r.toolkit === toolkit)?.org) ||
		Boolean(brainRows?.find((r) => r.toolkit === toolkit)?.user)

	return (
		<div className="space-y-4">
			{slack && !slack.connected && <SlackBanner />}

			<div className="grid gap-4 lg:grid-cols-2">
				<Group
					title="Tool integrations"
					subtitle="Apps your agents can act on."
				>
					<AppCard
						icon={<GithubMark className="size-5 text-[#fafafa]" />}
						name="GitHub"
						subtitle="Repos, pull requests and issues."
						connected={brainConnected("github")}
						busy={busy === "brain:github"}
						onConnect={() => connectBrain("github")}
					/>
					<AppCard
						icon={<LinearMark className="size-5 text-[#5E6AD2]" />}
						name="Linear"
						subtitle="Issues, projects and cycles."
						connected={brainConnected("linear")}
						busy={busy === "brain:linear"}
						onConnect={() => connectBrain("linear")}
					/>
				</Group>

				<Group
					title="Connectors"
					subtitle="Sync documents into your brain."
					cta={
						<Link
							href="/settings/integrations"
							className="inline-flex items-center gap-1 text-[12px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
						>
							All connectors
							<ExternalLink className="size-3" aria-hidden />
						</Link>
					}
				>
					<AppCard
						icon={<GoogleDrive className="size-5" />}
						name="Google Drive"
						subtitle="Docs, sheets and slides."
						connected={connectorConnected("google-drive")}
						busy={busy === "conn:google-drive"}
						onConnect={() => connectConnector("google-drive")}
					/>
					<AppCard
						icon={<Notion className="size-5" />}
						name="Notion"
						subtitle="Pages, databases and blocks."
						connected={connectorConnected("notion")}
						busy={busy === "conn:notion"}
						onConnect={() => connectConnector("notion")}
					/>
					<AppCard
						icon={<Cloud className="size-5 text-[#0F6CBD]" />}
						name="OneDrive"
						subtitle="Files from Microsoft 365."
						connected={connectorConnected("onedrive")}
						busy={busy === "conn:onedrive"}
						onConnect={() => connectConnector("onedrive")}
					/>
				</Group>
			</div>
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

function Group({
	title,
	subtitle,
	accent,
	cta,
	children,
}: {
	title: string
	subtitle: string
	accent?: boolean
	cta?: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<section
			className="relative flex flex-col gap-2.5 overflow-hidden rounded-[18px] bg-[#1B1F24] p-5"
			style={cardStyle}
		>
			{accent && (
				<div
					aria-hidden
					className="absolute -top-px right-8 left-8 h-px"
					style={{
						background:
							"linear-gradient(to right, transparent, rgba(75,160,250,0.45), transparent)",
					}}
				/>
			)}
			<div className="mb-1 flex items-start justify-between gap-3">
				<div>
					<p
						className={cn(
							"text-[15px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						{title}
					</p>
					<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
						{subtitle}
					</p>
				</div>
				{cta}
			</div>
			{children}
		</section>
	)
}

function AppCard({
	icon,
	name,
	subtitle,
	connected,
	busy,
	onConnect,
}: {
	icon: React.ReactNode
	name: string
	subtitle: string
	connected: boolean
	busy: boolean
	onConnect: () => void
}) {
	return (
		<div className="flex items-center gap-3 rounded-[12px] bg-[#14161A] p-3">
			<div
				className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
				style={tileStyle}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[14px] font-semibold leading-tight text-[#fafafa]">
					{name}
				</p>
				<p className="mt-0.5 truncate text-[12px] font-medium text-[#737373]">
					{subtitle}
				</p>
			</div>
			{connected ? (
				<span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#fafafa]">
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
						"flex shrink-0 items-center gap-1.5 rounded-full bg-[#0D121A] px-3.5 py-2 text-[13px] font-medium text-[#fafafa] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:opacity-50",
					)}
				>
					{busy && <Loader2 className="size-3.5 animate-spin" />}
					Connect
				</button>
			)}
		</div>
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

function SlackMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 122.8 122.8" className={className} aria-hidden="true">
			<title>Slack</title>
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
