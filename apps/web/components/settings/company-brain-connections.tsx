"use client"

import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { cn } from "@lib/utils"
import { Loader2, Lock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { dmSans125ClassName } from "@/lib/fonts"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { useAuth } from "@lib/auth-context"
import { brainConnectorIcon, SlackMark } from "../brain-connector-icons"
import { PillButton } from "../integrations/install-steps"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const MCP_BASE = `${BACKEND}/brain/mcp-connections`

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
	serverUrl?: string
	authType: AuthType
	status: "active" | "pending" | "error"
	userId: string | null
}
type SlackStatus = { connected: boolean; teamName: string | null }
type Scope = "org" | "user"

function titleCase(s: string) {
	return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function slugifyMcpName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 63)
}

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

function StatusDot({ connected }: { connected: boolean }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium",
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
	name,
	subtitle,
	icon,
	connected,
	canConnect,
	canDisconnect,
	lockedHint,
	busy,
	onConnect,
	onDisconnect,
}: {
	name: string
	subtitle: string
	icon: React.ReactNode
	connected: boolean
	canConnect: boolean
	canDisconnect: boolean
	lockedHint?: string
	busy: boolean
	onConnect: () => void
	onDisconnect: () => void
}) {
	return (
		<div className="flex min-h-[152px] min-w-0 flex-col justify-between gap-4 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					{icon}
				</div>
				<div className="min-w-0 pt-0.5">
					<p
						className={cn(
							dmSans125ClassName(),
							"truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						{name}
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 line-clamp-2 break-words text-[12px] font-medium leading-5 text-[#737373]",
						)}
					>
						{subtitle}
					</p>
				</div>
			</div>
			<div className="flex min-h-9 items-center justify-between gap-3 border-[#1E293B]/50 border-t pt-3">
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

function ScopeToggle({
	scope,
	onChange,
}: {
	scope: Scope
	onChange: (s: Scope) => void
}) {
	const items: { id: Scope; label: string }[] = [
		{ id: "org", label: "Organization" },
		{ id: "user", label: "Personal" },
	]
	return (
		<div className="inline-flex rounded-full border border-[#1E293B] bg-[#0D121A] p-1">
			{items.map((it) => (
				<button
					key={it.id}
					type="button"
					onClick={() => onChange(it.id)}
					className={cn(
						dmSans125ClassName(),
						"rounded-full px-4 h-8 text-[13px] font-medium transition-colors",
						scope === it.id
							? "bg-[#1E293B] text-[#FAFAFA]"
							: "text-[#737373] hover:text-[#FAFAFA]",
					)}
				>
					{it.label}
				</button>
			))}
		</div>
	)
}

function RowSkeleton() {
	return (
		<div className="min-h-[152px] rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="flex items-center gap-3">
				<div className="size-10 animate-pulse rounded-[10px] bg-[#1c1f24]" />
				<div className="space-y-2">
					<div className="h-3 w-24 animate-pulse rounded bg-[#1c1f24]" />
					<div className="h-2.5 w-32 animate-pulse rounded bg-[#1c1f24]" />
				</div>
			</div>
			<div className="mt-8 h-8 w-28 animate-pulse rounded-full bg-[#1c1f24] ml-auto" />
		</div>
	)
}

export default function CompanyBrainConnections() {
	const isCompanyBrain = useHasCompanyBrain()
	const { user } = useAuth()
	const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
	const [catalogLoaded, setCatalogLoaded] = useState(false)
	const [rows, setRows] = useState<ConnRow[]>([])
	const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
	const [busy, setBusy] = useState<string | null>(null)
	const [scope, setScope] = useState<Scope>("user")
	const [customName, setCustomName] = useState("")
	const [customServerUrl, setCustomServerUrl] = useState("")

	const { isAdmin } = useOrgMemberRole(isCompanyBrain)

	const load = useCallback(async () => {
		const [catRes, connRes, slackRes] = await Promise.all([
			fetch(`${MCP_BASE}/catalog`, { credentials: "include" }),
			fetch(`${MCP_BASE}/`, { credentials: "include" }),
			fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
		])
		if (catRes.ok) {
			const data = (await catRes.json()) as { catalog?: CatalogEntry[] }
			setCatalog(Array.isArray(data.catalog) ? data.catalog : [])
			setCatalogLoaded(true)
		} else {
			setCatalog([])
			setCatalogLoaded(false)
			toast.error("Couldn't load the app catalog.")
		}
		if (connRes.ok) {
			const data = (await connRes.json()) as { connections?: ConnRow[] }
			setRows(Array.isArray(data.connections) ? data.connections : [])
		} else {
			setRows([])
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

	// A row with userId === null is the org-shared connection; any other row
	// returned to the caller is their own personal one.
	const isConnected = (slug: string, shared: boolean) =>
		rows.some(
			(r) =>
				r.serverSlug === slug &&
				r.status === "active" &&
				(shared ? r.userId === null : r.userId !== null),
		)

	const isStaff =
		user?.email?.toLowerCase().endsWith("@supermemory.com") ?? false

	const connect = async (entry: CatalogEntry, shared: boolean) => {
		const key = `${entry.slug}:${shared ? "org" : "user"}`
		setBusy(key)
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
					body: JSON.stringify({ token, shared }),
				})
				if (res.status === 403) {
					toast.error("Only admins can connect the shared org account.")
					return
				}
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
				body: JSON.stringify({ shared, redirectUrl: window.location.href }),
			})
			if (res.status === 403) {
				toast.error("Only admins can connect the shared org account.")
				return
			}
			if (!res.ok) {
				toast.error("Couldn't start the connection.")
				return
			}
			const data = (await res.json()) as {
				authUrl?: string
				ok?: boolean
				error?: string
			}
			if (data.authUrl) {
				window.open(data.authUrl, "_blank", "noopener")
			} else if (data.ok) {
				toast.success(`${entry.name} connected.`)
				await load()
			} else {
				toast.error(data.error ?? "Couldn't start the connection.")
			}
		} catch {
			toast.error("Couldn't start the connection.")
		} finally {
			setBusy(null)
		}
	}

	const connectCustom = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const slug = slugifyMcpName(customName)
		const serverUrl = customServerUrl.trim()
		if (!slug) {
			toast.error("Enter a custom MCP name.")
			return
		}
		if (!serverUrl) {
			toast.error("Enter an OAuth MCP URL.")
			return
		}
		if (apps.some((entry) => entry.slug === slug)) {
			toast.error("That name is already used by a catalog app.")
			return
		}

		const key = `custom:${slug}`
		setBusy(key)
		try {
			const res = await fetch(`${MCP_BASE}/${slug}/connect`, {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					serverUrl,
					shared: false,
					redirectUrl: window.location.href,
				}),
			})
			if (res.status === 403) {
				toast.error("Custom MCP URLs are staff-only.")
				return
			}
			const data = (await res.json().catch(() => ({}))) as {
				authUrl?: string
				ok?: boolean
				error?: string
			}
			if (!res.ok) {
				toast.error(data.error ?? "Couldn't start the custom connection.")
				return
			}
			if (data.authUrl) {
				window.open(data.authUrl, "_blank", "noopener")
			} else if (data.ok) {
				toast.success(`${slug} connected.`)
				setCustomName("")
				setCustomServerUrl("")
				await load()
			} else {
				toast.error(data.error ?? "Couldn't start the custom connection.")
			}
		} catch {
			toast.error("Couldn't start the custom connection.")
		} finally {
			setBusy(null)
		}
	}

	const disconnect = async (entry: CatalogEntry, shared: boolean) => {
		if (
			!window.confirm(
				`Disconnect ${entry.name} from ${shared ? "the shared org account" : "your personal account"}?`,
			)
		)
			return
		const key = `${entry.slug}:${shared ? "org" : "user"}`
		setBusy(key)
		try {
			const res = await fetch(
				`${MCP_BASE}/${entry.slug}?shared=${shared ? "true" : "false"}`,
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
			toast.success(`${entry.name} disconnected.`)
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

	const loading = catalog === null
	const apps = catalog ?? []
	const catalogSlugs = new Set(apps.map((entry) => entry.slug))
	const canClassifyCustomRows = catalogLoaded && apps.length > 0
	const customRows = canClassifyCustomRows
		? rows.filter(
				(row) =>
					row.userId !== null &&
					row.status === "active" &&
					typeof row.serverUrl === "string" &&
					row.serverUrl.length > 0 &&
					!catalogSlugs.has(row.serverSlug),
			)
		: []
	const shared = scope === "org"
	const description = shared
		? "Connected by admins. Used for reads when you haven't connected your own."
		: "Your personal accounts, used for your actions and your reads."

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between gap-3">
				<ScopeToggle scope={scope} onChange={setScope} />
				{slackStatus?.connected && slackStatus.teamName ? (
					<p
						className={cn(
							dmSans125ClassName(),
							"ml-auto text-[13px] font-medium text-[#737373]",
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

			<p
				className={cn(
					dmSans125ClassName(),
					"px-1 text-[13px] font-medium text-[#737373]",
				)}
			>
				{description}
			</p>

			<div className="grid gap-3 md:grid-cols-2">
				{loading ? (
					<>
						<RowSkeleton />
						<RowSkeleton />
						<RowSkeleton />
					</>
				) : (
					<>
						{!shared && isStaff ? (
							<form
								onSubmit={connectCustom}
								className="flex min-h-[152px] min-w-0 flex-col justify-between gap-3 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
							>
								<div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[14px] font-semibold text-[#FAFAFA]",
										)}
									>
										Custom MCP server
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"mt-1 line-clamp-2 text-[12px] font-medium text-[#737373]",
										)}
									>
										Add a personal OAuth MCP server by URL.
									</p>
								</div>
								<div className="space-y-2">
									<input
										value={customName}
										onChange={(event) => setCustomName(event.target.value)}
										placeholder="Name"
										className="h-8 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3 text-[12px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"
									/>
									<input
										value={customServerUrl}
										onChange={(event) => setCustomServerUrl(event.target.value)}
										placeholder="https://example.com/mcp"
										className="h-8 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3 text-[12px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"
									/>
									<div className="flex justify-end border-[#1E293B]/50 border-t pt-3">
										<PillButton
											type="submit"
											disabled={busy?.startsWith("custom:") ?? false}
										>
											{busy?.startsWith("custom:") && (
												<Loader2 className="size-3.5 animate-spin" />
											)}
											Connect
										</PillButton>
									</div>
								</div>
							</form>
						) : null}

						{apps.map((entry) => (
							<AppCard
								key={`${scope}-${entry.slug}`}
								name={entry.name}
								subtitle={titleCase(entry.category)}
								icon={brainConnectorIcon(entry.slug, entry.name)}
								connected={isConnected(entry.slug, shared)}
								canConnect={shared ? isAdmin : true}
								canDisconnect={shared ? isAdmin : true}
								lockedHint={shared ? "Admin only" : undefined}
								busy={busy === `${entry.slug}:${scope}`}
								onConnect={() => connect(entry, shared)}
								onDisconnect={() => disconnect(entry, shared)}
							/>
						))}
						{!shared &&
							customRows.map((row) => (
								<AppCard
									key={`custom-${row.serverSlug}`}
									name={titleCase(row.serverSlug.replace(/-/g, " "))}
									subtitle={row.serverUrl ?? "Custom OAuth MCP"}
									icon={brainConnectorIcon(row.serverSlug, row.serverSlug)}
									connected
									canConnect={false}
									canDisconnect
									busy={busy === `${row.serverSlug}:user`}
									onConnect={() => {}}
									onDisconnect={() =>
										disconnect(
											{
												slug: row.serverSlug,
												name: titleCase(row.serverSlug.replace(/-/g, " ")),
												category: "Custom OAuth MCP",
												authType: "oauth",
											},
											false,
										)
									}
								/>
							))}
					</>
				)}
			</div>
		</div>
	)
}
