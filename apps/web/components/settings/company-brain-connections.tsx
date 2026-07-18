"use client"

import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronDown, Loader2, Plus, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
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

const pillLinkClass = cn(
	"relative flex h-8 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 sm:h-9 sm:min-w-[116px] sm:px-5",
	"text-[12px] font-medium text-[#FAFAFA] sm:text-[14px]",
	"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
	"cursor-pointer transition-opacity hover:opacity-80",
)

function ScopeChip({
	label,
	connected,
}: {
	label: string
	connected: boolean
}) {
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
			{label}
		</span>
	)
}

const menuItemClass =
	"gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"

function AppCard({
	name,
	subtitle,
	icon,
	userConnected,
	orgConnected,
	isAdmin,
	personalOnly,
	busy,
	onConnect,
	onDisconnect,
}: {
	name: string
	subtitle: string
	icon: React.ReactNode
	userConnected: boolean
	orgConnected: boolean
	isAdmin: boolean
	personalOnly?: boolean
	busy: boolean
	onConnect: (shared: boolean) => void
	onDisconnect: (shared: boolean) => void
}) {
	const anyConnected = userConnected || orgConnected
	const showOrgChip = !personalOnly && (orgConnected || isAdmin)
	const adminMenu = isAdmin && !personalOnly

	return (
		<div className="flex min-w-0 flex-col justify-between gap-3 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
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
				<div className="flex min-w-0 items-center gap-3">
					{personalOnly || !anyConnected ? (
						<ScopeChip
							label={userConnected ? "Connected" : "Not connected"}
							connected={userConnected}
						/>
					) : (
						<>
							<ScopeChip label="You" connected={userConnected} />
							{showOrgChip ? (
								<ScopeChip label="Workspace" connected={orgConnected} />
							) : null}
						</>
					)}
				</div>
				{adminMenu ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								disabled={busy}
								className={cn(
									dmSans125ClassName(),
									"relative flex h-8 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 sm:h-9 sm:min-w-[116px] sm:px-5",
									"text-[12px] font-medium text-[#FAFAFA] sm:text-[14px]",
									"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
									"cursor-pointer transition-opacity hover:opacity-80",
									"disabled:cursor-not-allowed disabled:opacity-50",
								)}
							>
								{busy ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<>
										{anyConnected ? "Manage" : "Connect"}
										<ChevronDown className="size-3.5 text-[#737373]" />
									</>
								)}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className={cn(
								dmSans125ClassName(),
								"min-w-[220px] rounded-xl border border-white/[0.08] p-1.5 shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
							)}
							style={{
								background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
							}}
						>
							<DropdownMenuItem
								className={menuItemClass}
								onClick={() =>
									userConnected ? onDisconnect(false) : onConnect(false)
								}
							>
								{userConnected ? "Disconnect my account" : "Connect my account"}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={menuItemClass}
								onClick={() =>
									orgConnected ? onDisconnect(true) : onConnect(true)
								}
							>
								{orgConnected
									? "Disconnect workspace"
									: "Connect for workspace"}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : userConnected ? (
					<PillButton onClick={() => onDisconnect(false)} disabled={busy}>
						{busy && <Loader2 className="size-3.5 animate-spin" />}
						Disconnect
					</PillButton>
				) : personalOnly ? null : (
					<PillButton onClick={() => onConnect(false)} disabled={busy}>
						{busy && <Loader2 className="size-3.5 animate-spin" />}
						Connect
					</PillButton>
				)}
			</div>
		</div>
	)
}

function SlackCard({
	status,
	isAdmin,
	installHref,
}: {
	status: SlackStatus | null
	isAdmin: boolean
	installHref: string
}) {
	const connected = status?.connected ?? false
	return (
		<div className="flex min-w-0 flex-col justify-between gap-3 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					<SlackMark className="size-5" />
				</div>
				<div className="min-w-0 pt-0.5">
					<p
						className={cn(
							dmSans125ClassName(),
							"truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						Slack
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 line-clamp-2 break-words text-[12px] font-medium leading-5 text-[#737373]",
						)}
					>
						Messaging
					</p>
				</div>
			</div>
			<div className="flex min-h-9 items-center justify-between gap-3 border-[#1E293B]/50 border-t pt-3">
				<ScopeChip
					label={
						connected
							? status?.teamName
								? `Workspace · ${status.teamName}`
								: "Workspace"
							: "Not connected"
					}
					connected={connected}
				/>
				{isAdmin ? (
					<a
						href={installHref}
						className={cn(dmSans125ClassName(), pillLinkClass)}
					>
						{connected ? "Reconnect" : "Connect"}
					</a>
				) : null}
			</div>
		</div>
	)
}

function RowSkeleton() {
	return (
		<div className="rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="flex items-center gap-3">
				<div className="size-10 animate-pulse rounded-[10px] bg-[#1c1f24]" />
				<div className="space-y-2">
					<div className="h-3 w-24 animate-pulse rounded bg-[#1c1f24]" />
					<div className="h-2.5 w-32 animate-pulse rounded bg-[#1c1f24]" />
				</div>
			</div>
			<div className="mt-5 h-8 w-28 animate-pulse rounded-full bg-[#1c1f24] ml-auto" />
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
	const [customOpen, setCustomOpen] = useState(false)
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
				setCustomOpen(false)
				setCustomName("")
				setCustomServerUrl("")
			} else if (data.ok) {
				toast.success(`${slug} connected.`)
				setCustomOpen(false)
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
	return (
		<div className="space-y-5">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{loading ? (
					<>
						<RowSkeleton />
						<RowSkeleton />
						<RowSkeleton />
					</>
				) : (
					<>
						<SlackCard
							status={slackStatus}
							isAdmin={isAdmin}
							installHref={`${BACKEND}/brain/slack/oauth/install`}
						/>
						{apps.map((entry) => (
							<AppCard
								key={entry.slug}
								name={entry.name}
								subtitle={titleCase(entry.category)}
								icon={brainConnectorIcon(entry.slug, entry.name)}
								userConnected={isConnected(entry.slug, false)}
								orgConnected={isConnected(entry.slug, true)}
								isAdmin={isAdmin}
								busy={busy?.startsWith(`${entry.slug}:`) ?? false}
								onConnect={(shared) => connect(entry, shared)}
								onDisconnect={(shared) => disconnect(entry, shared)}
							/>
						))}
						{customRows.map((row) => (
							<AppCard
								key={`custom-${row.serverSlug}`}
								name={titleCase(row.serverSlug.replace(/-/g, " "))}
								subtitle={row.serverUrl ?? "Custom OAuth MCP"}
								icon={brainConnectorIcon(row.serverSlug, row.serverSlug)}
								userConnected
								orgConnected={false}
								isAdmin={false}
								personalOnly
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
						{isStaff ? (
							<button
								type="button"
								onClick={() => setCustomOpen(true)}
								className={cn(
									dmSans125ClassName(),
									"flex min-h-[104px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A313C] border-dashed",
									"text-[13px] font-medium text-[#737B87] transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]",
								)}
							>
								<Plus className="size-4" />
								Add custom MCP
							</button>
						) : null}
					</>
				)}
			</div>

			<Dialog open={customOpen} onOpenChange={setCustomOpen}>
				<DialogContent
					className={cn(
						"w-[90%]! max-w-[440px]! flex flex-col gap-4 rounded-[22px] border-none bg-[#1B1F24] p-4",
						dmSans125ClassName(),
					)}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
					showCloseButton={false}
				>
					<div className="flex items-start justify-between gap-4">
						<DialogHeader className="flex-1 space-y-1 pl-1">
							<DialogTitle className="font-semibold text-[#FAFAFA]">
								Custom MCP server
							</DialogTitle>
							<p className="text-[13px] font-medium leading-[1.35] text-[#737373]">
								Add a personal OAuth MCP server by URL.
							</p>
						</DialogHeader>
						<DialogPrimitive.Close
							className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] bg-[#0D121A] transition-opacity hover:opacity-100 focus:outline-hidden"
							style={{
								boxShadow:
									"0 0.711px 2.842px 0 rgba(0, 0, 0, 0.25), 0.178px 0.178px 0.178px 0 rgba(255, 255, 255, 0.10) inset",
							}}
						>
							<XIcon className="size-4 text-[#737373]" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<form onSubmit={connectCustom} className="flex flex-col gap-2">
						<input
							value={customName}
							onChange={(event) => setCustomName(event.target.value)}
							placeholder="Name"
							className="h-9 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3.5 text-[13px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"
						/>
						<input
							value={customServerUrl}
							onChange={(event) => setCustomServerUrl(event.target.value)}
							placeholder="https://example.com/mcp"
							className="h-9 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3.5 text-[13px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"
						/>
						<div className="flex justify-end pt-2">
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
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
