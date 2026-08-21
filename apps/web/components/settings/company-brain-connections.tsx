"use client"

import { useRouter } from "next/navigation"
import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronDown, Loader2, Plus, Search, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import type { McpDirectoryEntry } from "@/lib/mcp-directory"
import { brainConnectorIcon, SlackMark } from "../brain-connector-icons"
import { ConnectorCard, ScopeChip } from "../directory/connector-card"
import {
	railItemClass,
	SectionRail,
	sectionLabelClass,
} from "../directory/section-rail"
import { PillButton } from "../integrations/install-steps"
import {
	categoryLabel,
	DirectoryEntryCard,
	entrySlug,
	isEntrySetUppable,
	listableDirectoryEntries,
	McpDirectoryGrid,
	normalizeServerUrl,
	useMcpDirectory,
} from "./mcp-directory-browser"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const MCP_BASE = `${BACKEND}/brain/mcp-connections`

const RECOMMENDED_DIRECTORY_COUNT = 9

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

function customConnectionName(slug: string) {
	return titleCase(slug.replace(/-sm-dir-[a-z0-9]{6}$/, "").replace(/-/g, " "))
}

function directorySlugOf(entry: McpDirectoryEntry) {
	return `${slugifyMcpName(entry.name).slice(0, 49)}-sm-dir-${stableDirectorySuffix(
		entry.url ?? entry.note ?? entry.id,
	)}`
}

function stableDirectorySuffix(value: string) {
	let hash = 0x811c9dc5
	for (const character of value) {
		hash ^= character.codePointAt(0) ?? 0
		hash = Math.imul(hash, 0x01000193)
	}
	return (hash >>> 0).toString(36).slice(0, 6).padStart(6, "0")
}

const pillLinkClass = cn(
	"relative flex h-8 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 sm:h-9 sm:min-w-[116px] sm:px-5",
	"text-[12px] font-medium text-[#FAFAFA] sm:text-[14px]",
	"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
	"cursor-pointer transition-opacity hover:opacity-80",
)

const menuItemClass =
	"gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"

const menuContentClass = cn(
	dmSans125ClassName(),
	"min-w-[220px] rounded-xl border border-white/[0.08] p-1.5 shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
)

const menuContentStyle = {
	background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
} as const

const customInputClass =
	"h-9 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3.5 text-[13px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"

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
		<ConnectorCard
			name={name}
			subtitle={subtitle}
			icon={icon}
			footerLeft={
				personalOnly || !anyConnected ? (
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
				)
			}
			footerRight={
				adminMenu ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								disabled={busy}
								className={cn(
									dmSans125ClassName(),
									pillLinkClass,
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
							className={menuContentClass}
							style={menuContentStyle}
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
				)
			}
		/>
	)
}

function SlackCard({
	status,
	isAdmin,
	installHref,
	onDisconnect,
}: {
	status: SlackStatus | null
	isAdmin: boolean
	installHref: string
	onDisconnect: () => Promise<void>
}) {
	const connected = status?.connected ?? false
	const [confirming, setConfirming] = useState(false)
	const [disconnecting, setDisconnecting] = useState(false)
	useEffect(() => {
		if (!confirming) return
		const timer = setTimeout(() => setConfirming(false), 4000)
		return () => clearTimeout(timer)
	}, [confirming])
	return (
		<ConnectorCard
			name="Slack"
			subtitle="Messaging"
			icon={<SlackMark className="size-5" />}
			topRight={
				connected && status?.teamName ? (
					<span
						className={cn(
							dmSans125ClassName(),
							"max-w-[45%] shrink-0 truncate pt-0.5 text-[12px] font-medium text-[#737373]",
						)}
					>
						{status.teamName}
					</span>
				) : undefined
			}
			footerLeft={
				<ScopeChip
					label={connected ? "Connected" : "Not connected"}
					connected={connected}
				/>
			}
			footerRight={
				isAdmin ? (
					<div className="flex items-center gap-2">
						{connected ? (
							<button
								type="button"
								disabled={disconnecting}
								onClick={() => {
									if (!confirming) {
										setConfirming(true)
										return
									}
									setConfirming(false)
									setDisconnecting(true)
									void onDisconnect().finally(() => setDisconnecting(false))
								}}
								className={cn(
									dmSans125ClassName(),
									"cursor-pointer text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
									confirming
										? "text-red-400 hover:text-red-300"
										: "text-[#6B6B6B] hover:text-[#FAFAFA]",
								)}
							>
								{disconnecting
									? "Disconnecting…"
									: confirming
										? "Confirm?"
										: "Disconnect"}
							</button>
						) : null}
						<a
							href={installHref}
							className={cn(dmSans125ClassName(), pillLinkClass)}
						>
							{connected ? "Reconnect" : "Connect"}
						</a>
					</div>
				) : undefined
			}
		/>
	)
}

// Compact icon for an installed integration — the user already knows what it
// is, so the full card lives only in Recommended/search. Clicking opens the
// same manage menu the cards use.
function InstalledTile({
	name,
	icon,
	children,
}: {
	name: string
	icon: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					title={name}
					aria-label={`Manage ${name}`}
					className={cn(
						"flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[12px] bg-[#14161A]",
						"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors hover:bg-[#1B2028]",
					)}
				>
					{icon}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className={menuContentClass}
				style={menuContentStyle}
			>
				<p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold text-[#737373]">
					{name}
				</p>
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
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
	const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
	const [catalogLoaded, setCatalogLoaded] = useState(false)
	const [rows, setRows] = useState<ConnRow[]>([])
	const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
	const [busy, setBusy] = useState<string | null>(null)
	const [query, setQuery] = useState("")
	const [marketplaceCategory, setMarketplaceCategory] = useState("all")
	const [customOpen, setCustomOpen] = useState(false)
	const [customName, setCustomName] = useState("")
	const [customServerUrl, setCustomServerUrl] = useState("")
	const [customToken, setCustomToken] = useState("")
	const [customHeaderName, setCustomHeaderName] = useState("")
	const [customExtraHeaders, setCustomExtraHeaders] = useState<
		{ name: string; value: string }[]
	>([])
	const [customAdvancedOpen, setCustomAdvancedOpen] = useState(false)
	const [customAuthMethod, setCustomAuthMethod] = useState<"oauth" | "api-key">(
		"oauth",
	)
	const [directoryEntry, setDirectoryEntry] =
		useState<McpDirectoryEntry | null>(null)
	const deepLinkHandled = useRef(false)
	const router = useRouter()

	const { isAdmin } = useOrgMemberRole(isCompanyBrain)
	const directory = useMcpDirectory()
	const directoryEntries = useMemo(
		() => listableDirectoryEntries(directory.entries),
		[directory.entries],
	)

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

	const resetCustomForm = () => {
		setCustomOpen(false)
		setDirectoryEntry(null)
		setCustomName("")
		setCustomServerUrl("")
		setCustomToken("")
		setCustomHeaderName("")
		setCustomExtraHeaders([])
		setCustomAdvancedOpen(false)
		setCustomAuthMethod("oauth")
	}

	const setUpDirectoryEntry = useCallback((entry: McpDirectoryEntry) => {
		setDirectoryEntry(entry)
		setCustomName(entry.name)
		setCustomServerUrl(entry.url ?? "")
		setCustomAdvancedOpen(false)
		setCustomAuthMethod(entry.authMethods[0] ?? "oauth")
		setCustomOpen(true)
	}, [])

	// Deep link from Company Brain for apps it cannot authorize on their behalf.
	useEffect(() => {
		if (deepLinkHandled.current) return
		const slug = new URLSearchParams(window.location.search).get("mcpSetup")
		if (!slug) return
		if (!directory.entries.length) return
		deepLinkHandled.current = true
		const entry = directory.entries.find((e) => directorySlugOf(e) === slug)
		if (entry) setUpDirectoryEntry(entry)
		else toast.error("That app is no longer in the MCP directory.")
		// Router, not history: a replaceState here races the router and gets reverted.
		router.replace(window.location.pathname, { scroll: false })
	}, [directory.entries, setUpDirectoryEntry, router])

	const connectCustom = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const slug = directoryEntry
			? directorySlugOf(directoryEntry)
			: slugifyMcpName(customName)
		const serverUrl = customServerUrl.trim()
		if (!slug) {
			toast.error("Enter a custom MCP name.")
			return
		}
		if (!directoryEntry && /-sm-dir-[a-z0-9]{6}$/.test(slug)) {
			toast.error(
				"Choose a name that doesn't use the reserved directory suffix.",
			)
			return
		}
		if (!serverUrl) {
			toast.error("Enter an MCP URL.")
			return
		}
		if (apps.some((entry) => entry.slug === slug)) {
			toast.error("That name is already used by a catalog app.")
			return
		}

		const key = `custom:${slug}`
		setBusy(key)
		try {
			const token = customAuthMethod === "api-key" ? customToken.trim() : ""
			if (customAuthMethod === "api-key" && !token) {
				toast.error("Enter an API key.")
				return
			}
			if (token) {
				const rows = customExtraHeaders
					.map((h) => [h.name.trim(), h.value.trim()] as const)
					.filter(([name, value]) => name && value)
				const duplicate = rows.find(
					([name], i) =>
						rows.findIndex(([n]) => n.toLowerCase() === name.toLowerCase()) !==
						i,
				)
				if (duplicate) {
					toast.error(`Duplicate header: ${duplicate[0]}`)
					return
				}
				const res = await fetch(`${MCP_BASE}/${slug}/connect-static`, {
					method: "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						serverUrl,
						token,
						headerName: customHeaderName.trim() || undefined,
						extraHeaders: Object.fromEntries(rows),
						shared: false,
					}),
				})
				const data = (await res.json().catch(() => ({}))) as {
					ok?: boolean
					error?: string
				}
				if (!res.ok || !data.ok) {
					toast.error(data.error ?? "Couldn't connect.")
					return
				}
				toast.success(`${customName} connected.`)
				resetCustomForm()
				await load()
				return
			}
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
				resetCustomForm()
			} else if (data.ok) {
				toast.success(`${customName} connected.`)
				resetCustomForm()
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

	const loading = catalog === null
	const apps = catalog ?? []
	const catalogSlugs = useMemo(
		() => new Set(apps.map((entry) => entry.slug)),
		[apps],
	)
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

	const connectedUrls = useMemo(
		() =>
			new Set(
				rows
					.filter(
						(row) =>
							row.status === "active" &&
							typeof row.serverUrl === "string" &&
							row.serverUrl.length > 0,
					)
					.map((row) => normalizeServerUrl(row.serverUrl ?? "")),
			),
		[rows],
	)

	const isEntryConnected = useCallback(
		(entry: McpDirectoryEntry) => {
			const slug = entrySlug(entry)
			if (catalogSlugs.has(slug)) {
				return rows.some(
					(row) => row.status === "active" && row.serverSlug === slug,
				)
			}
			return entry.url
				? connectedUrls.has(normalizeServerUrl(entry.url))
				: false
		},
		[catalogSlugs, connectedUrls, rows],
	)

	const slackConnected = slackStatus?.connected ?? false
	const isAppConnected = (slug: string) =>
		isConnected(slug, false) || isConnected(slug, true)
	const installedApps = apps.filter((entry) => isAppConnected(entry.slug))
	const recommendedApps = apps.filter((entry) => !isAppConnected(entry.slug))
	const hasInstalled =
		slackConnected || installedApps.length > 0 || customRows.length > 0

	// Popular, connectable directory servers we don't already show as apps.
	const recommendedDirectoryEntries = useMemo(
		() =>
			directoryEntries
				.filter(
					(entry) =>
						isEntrySetUppable(entry) &&
						!catalogSlugs.has(entrySlug(entry)) &&
						!isEntryConnected(entry),
				)
				.sort((a, b) => b.popularity - a.popularity)
				.slice(0, RECOMMENDED_DIRECTORY_COUNT),
		[catalogSlugs, directoryEntries, isEntryConnected],
	)

	// Top categories become the marketplace filter tags.
	const marketplaceCategories = useMemo(() => {
		const counts = new Map<string, number>()
		for (const entry of directoryEntries) {
			for (const category of entry.categories) {
				counts.set(category, (counts.get(category) ?? 0) + 1)
			}
		}
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([category]) => category)
	}, [directoryEntries])

	const marketplaceEntries = useMemo(
		() =>
			marketplaceCategory === "all"
				? directoryEntries
				: directoryEntries.filter((entry) =>
						entry.categories.includes(marketplaceCategory),
					),
		[directoryEntries, marketplaceCategory],
	)

	const needle = query.trim().toLowerCase()
	const searching = needle.length > 0
	const catalogMatches = searching
		? apps.filter(
				(entry) =>
					entry.name.toLowerCase().includes(needle) ||
					entry.category.toLowerCase().includes(needle),
			)
		: []
	const slackMatches = searching && "slack messaging".includes(needle)

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

	const slackInstallHref = `${BACKEND}/brain/slack/oauth/install`

	const disconnectSlack = async () => {
		try {
			const res = await fetch(`${BACKEND}/brain/slack/workspace`, {
				method: "DELETE",
				credentials: "include",
			})
			if (res.status === 403) {
				toast.error("Only admins can disconnect Slack.")
				return
			}
			if (!res.ok) {
				toast.error("Couldn't disconnect Slack.")
				return
			}
		} catch {
			toast.error("Couldn't disconnect Slack.")
			return
		}
		toast.success("Slack disconnected.")
		await load().catch(() => undefined)
	}

	const slackCard = (
		<SlackCard
			status={slackStatus}
			isAdmin={isAdmin}
			installHref={slackInstallHref}
			onDisconnect={disconnectSlack}
		/>
	)

	const appCard = (entry: CatalogEntry) => (
		<AppCard
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
	)

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-2">
				<label className="relative block flex-1">
					<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#737373]" />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search integrations"
						className="h-10 w-full rounded-xl border border-[#252B34] bg-[#111419] pr-3 pl-9 text-[13px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#3A4150]"
					/>
				</label>
				<button
					type="button"
					onClick={() => setCustomOpen(true)}
					className={cn(
						dmSans125ClassName(),
						"flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[#252B34] bg-[#111419] px-3.5 text-[13px] font-medium text-[#D4D4D8]",
						"transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]",
					)}
				>
					<Plus className="size-4" />
					<span className="hidden sm:inline">Add custom MCP</span>
				</button>
			</div>

			{loading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<RowSkeleton />
					<RowSkeleton />
					<RowSkeleton />
				</div>
			) : searching ? (
				<div className="space-y-3">
					{slackMatches || catalogMatches.length > 0 ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{slackMatches ? slackCard : null}
							{catalogMatches.map((entry) => (
								<div key={entry.slug}>{appCard(entry)}</div>
							))}
						</div>
					) : null}
					<McpDirectoryGrid
						query={query}
						entries={directoryEntries}
						loadError={directory.error}
						excludeSlugs={catalogSlugs}
						isEntryConnected={isEntryConnected}
						onSetUp={setUpDirectoryEntry}
						suppressEmpty={slackMatches || catalogMatches.length > 0}
					/>
				</div>
			) : (
				<div className="flex flex-col gap-6">
					{hasInstalled ? (
						<section className="flex flex-col gap-3">
							<h3 className={sectionLabelClass}>Installed</h3>
							<div className="flex flex-wrap items-center gap-2">
								{slackConnected ? (
									<InstalledTile
										name={
											slackStatus?.teamName
												? `Slack · ${slackStatus.teamName}`
												: "Slack"
										}
										icon={<SlackMark className="size-5" />}
									>
										{isAdmin ? (
											<>
												<DropdownMenuItem asChild className={menuItemClass}>
													<a href={slackInstallHref}>Reconnect</a>
												</DropdownMenuItem>
												<DropdownMenuItem
													className={menuItemClass}
													onClick={() => {
														if (window.confirm("Disconnect Slack?")) {
															void disconnectSlack()
														}
													}}
												>
													Disconnect
												</DropdownMenuItem>
											</>
										) : (
											<DropdownMenuItem disabled className={menuItemClass}>
												Managed by workspace admins
											</DropdownMenuItem>
										)}
									</InstalledTile>
								) : null}
								{installedApps.map((entry) => {
									const userConnected = isConnected(entry.slug, false)
									const orgConnected = isConnected(entry.slug, true)
									return (
										<InstalledTile
											key={entry.slug}
											name={entry.name}
											icon={brainConnectorIcon(entry.slug, entry.name)}
										>
											{isAdmin ? (
												<>
													<DropdownMenuItem
														className={menuItemClass}
														onClick={() =>
															userConnected
																? disconnect(entry, false)
																: connect(entry, false)
														}
													>
														{userConnected
															? "Disconnect my account"
															: "Connect my account"}
													</DropdownMenuItem>
													<DropdownMenuItem
														className={menuItemClass}
														onClick={() =>
															orgConnected
																? disconnect(entry, true)
																: connect(entry, true)
														}
													>
														{orgConnected
															? "Disconnect workspace"
															: "Connect for workspace"}
													</DropdownMenuItem>
												</>
											) : userConnected ? (
												<DropdownMenuItem
													className={menuItemClass}
													onClick={() => disconnect(entry, false)}
												>
													Disconnect
												</DropdownMenuItem>
											) : (
												<DropdownMenuItem disabled className={menuItemClass}>
													Managed by workspace admins
												</DropdownMenuItem>
											)}
										</InstalledTile>
									)
								})}
								{customRows.map((row) => (
									<InstalledTile
										key={`custom-${row.serverSlug}`}
										name={customConnectionName(row.serverSlug)}
										icon={brainConnectorIcon(row.serverSlug, row.serverSlug)}
									>
										<DropdownMenuItem
											className={menuItemClass}
											onClick={() =>
												disconnect(
													{
														slug: row.serverSlug,
														name: customConnectionName(row.serverSlug),
														category: "Custom MCP",
														authType: "oauth",
													},
													false,
												)
											}
										>
											Disconnect
										</DropdownMenuItem>
									</InstalledTile>
								))}
							</div>
						</section>
					) : null}
					<SectionRail label="Recommended" scrollbar="visible">
						{!slackConnected ? (
							<div className={railItemClass}>{slackCard}</div>
						) : null}
						{recommendedApps.map((entry) => (
							<div key={entry.slug} className={railItemClass}>
								{appCard(entry)}
							</div>
						))}
						{recommendedDirectoryEntries.map((entry) => (
							<div key={entry.id} className={railItemClass}>
								<DirectoryEntryCard
									entry={entry}
									connected={false}
									onSetUp={setUpDirectoryEntry}
								/>
							</div>
						))}
					</SectionRail>
					<section className="flex flex-col gap-3">
						<div className="flex items-baseline justify-between gap-3">
							<h3 className={sectionLabelClass}>Marketplace</h3>
							{marketplaceEntries.length > 0 ? (
								<span className="text-[12px] font-medium text-[#737373]">
									{marketplaceEntries.length.toLocaleString()} servers
								</span>
							) : null}
						</div>
						{marketplaceCategories.length > 0 ? (
							<div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
								{["all", ...marketplaceCategories].map((category) => (
									<button
										key={category}
										type="button"
										onClick={() => setMarketplaceCategory(category)}
										className={cn(
											"h-7 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors",
											marketplaceCategory === category
												? "bg-[#252B34] font-semibold text-[#FAFAFA]"
												: "text-[#737373] hover:bg-[#14161A] hover:text-[#D4D4D8]",
										)}
									>
										{category === "all" ? "All" : categoryLabel(category)}
									</button>
								))}
							</div>
						) : null}
						<McpDirectoryGrid
							key={marketplaceCategory}
							entries={marketplaceEntries}
							loadError={directory.error}
							excludeSlugs={catalogSlugs}
							isEntryConnected={isEntryConnected}
							onSetUp={setUpDirectoryEntry}
						/>
					</section>
				</div>
			)}

			{/* Reset on every close path so the API key never lingers in state. */}
			<Dialog
				open={customOpen}
				onOpenChange={(open: boolean) =>
					open ? setCustomOpen(true) : resetCustomForm()
				}
			>
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
								{directoryEntry
									? `Set up ${directoryEntry.name}`
									: "Add custom connector"}
							</DialogTitle>
							<p className="text-[13px] font-medium leading-[1.35] text-[#737373]">
								{directoryEntry?.availability === "tenant"
									? "Enter your workspace-specific MCP URL, then choose how this server authenticates."
									: "Confirm the remote MCP URL, then choose how this server authenticates."}
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
							className={customInputClass}
						/>
						<input
							value={customServerUrl}
							onChange={(event) => setCustomServerUrl(event.target.value)}
							placeholder="Remote MCP server URL"
							className={customInputClass}
						/>

						<div
							className={cn(
								"grid gap-1 rounded-full bg-[#0D121A] p-1",
								directoryEntry?.authMethods.length === 1
									? "grid-cols-1"
									: "grid-cols-2",
							)}
						>
							{(["oauth", "api-key"] as const)
								.filter(
									(method) =>
										!directoryEntry ||
										directoryEntry.authMethods.includes(method),
								)
								.map((method) => (
									<button
										key={method}
										type="button"
										onClick={() => setCustomAuthMethod(method)}
										className={cn(
											"h-8 rounded-full text-[12px] font-semibold transition-colors",
											customAuthMethod === method
												? "bg-[#252B34] text-[#FAFAFA]"
												: "text-[#737373] hover:text-[#D4D4D8]",
										)}
									>
										{method === "oauth" ? "OAuth" : "API key"}
									</button>
								))}
						</div>

						{customAuthMethod === "api-key" && (
							<input
								value={customToken}
								onChange={(event) => setCustomToken(event.target.value)}
								type="password"
								placeholder="API key"
								required
								className={customInputClass}
							/>
						)}

						{customAuthMethod === "api-key" && (
							<button
								type="button"
								onClick={() => setCustomAdvancedOpen((open) => !open)}
								className="mt-1 flex items-center gap-1.5 self-start text-[13px] font-medium text-[#FAFAFA]"
							>
								<ChevronDown
									className={cn(
										"size-4 text-[#737373] transition-transform",
										customAdvancedOpen && "rotate-180",
									)}
								/>
								Header settings
							</button>
						)}

						{customAuthMethod === "api-key" && customAdvancedOpen && (
							<div className="flex flex-col gap-2">
								<input
									value={customHeaderName}
									onChange={(event) => setCustomHeaderName(event.target.value)}
									placeholder="Send key as header (default: Authorization)"
									className={customInputClass}
								/>
								{customExtraHeaders.length > 0 && (
									<p className="pt-1 pl-1 text-[12px] font-medium text-[#737373]">
										Extra headers
									</p>
								)}
								{customExtraHeaders.map((header, index) => (
									<div key={index} className="flex items-center gap-2">
										<input
											value={header.name}
											onChange={(event) =>
												setCustomExtraHeaders((prev) =>
													prev.map((h, i) =>
														i === index
															? { ...h, name: event.target.value }
															: h,
													),
												)
											}
											placeholder="Name"
											className={customInputClass}
										/>
										<input
											value={header.value}
											onChange={(event) =>
												setCustomExtraHeaders((prev) =>
													prev.map((h, i) =>
														i === index
															? { ...h, value: event.target.value }
															: h,
													),
												)
											}
											placeholder="Value"
											className={customInputClass}
										/>
										<button
											type="button"
											onClick={() =>
												setCustomExtraHeaders((prev) =>
													prev.filter((_, i) => i !== index),
												)
											}
											className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#737373] hover:text-[#FAFAFA]"
										>
											<XIcon className="size-3.5" />
											<span className="sr-only">Remove header</span>
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() =>
										setCustomExtraHeaders((prev) => [
											...prev,
											{ name: "", value: "" },
										])
									}
									className="self-start pl-1 text-[13px] font-medium text-[#737B87] hover:text-[#FAFAFA]"
								>
									+ Add header
								</button>
							</div>
						)}

						<p className="pt-1 pl-1 text-[12px] font-medium leading-[1.45] text-[#737373]">
							Only connect servers you trust. Supermemory can't verify which
							tools a server exposes or that they won't change.
						</p>

						<div className="flex justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={resetCustomForm}
								className={cn(
									"h-8 shrink-0 rounded-full px-4 text-[13px] font-medium text-[#737B87] sm:h-9",
									"cursor-pointer transition-colors hover:text-[#FAFAFA]",
								)}
							>
								Cancel
							</button>
							<PillButton
								type="submit"
								disabled={busy?.startsWith("custom:") ?? false}
							>
								{busy?.startsWith("custom:") && (
									<Loader2 className="size-3.5 animate-spin" />
								)}
								Add
							</PillButton>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
