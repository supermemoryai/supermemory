"use client"

import { invoke } from "@tauri-apps/api/core"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { Check, FolderOpen } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { clearSession, getSession, type AuthSession } from "@/lib/auth"
import {
	getSpotlightShortcut,
	setSpotlightShortcut,
	type SpotlightShortcut,
} from "@/lib/spotlight"
import {
	getDefaultSmfsContainerTag,
	getSmfsLogs,
	getSmfsProfile,
	getSmfsState,
	mountSmfs,
	onSmfsStatus,
	revealSmfs,
	SMFS_CONTAINER_TAG_PREFIX,
	type SmfsProfile,
	type SmfsStatus,
	syncSmfs,
	unmountSmfs,
} from "@/lib/smfs"
import {
	connectDesktopTool,
	detectDesktopTools,
	disconnectDesktopTool,
	type DesktopToolId,
	type DesktopToolPreview,
	previewConnectDesktopTool,
	previewDisconnectDesktopTool,
} from "@/lib/tools"
import {
	sortDesktopToolCards,
	toDesktopToolCard,
	type DesktopToolCard,
} from "@/lib/tool-catalog"

type AppInfo = {
	name: string
	version: string
	platform: string
}

export default function SettingsPage() {
	const router = useRouter()
	const [info, setInfo] = useState<AppInfo | null>(null)
	const [session, setSession] = useState<AuthSession | null>(null)
	const [shortcut, setShortcut] = useState<SpotlightShortcut | null>(null)
	const [shortcutError, setShortcutError] = useState<string | null>(null)
	const [savingShortcut, setSavingShortcut] = useState<string | null>(null)
	const [smfsStatuses, setSmfsStatuses] = useState<SmfsStatus[]>([])
	const [smfsTag, setSmfsTag] = useState("sm_fs_desktop")
	const [smfsError, setSmfsError] = useState<string | null>(null)
	const [smfsBusy, setSmfsBusy] = useState<string | null>(null)
	const [smfsLogs, setSmfsLogs] = useState<string | null>(null)
	const [smfsProfile, setSmfsProfile] = useState<SmfsProfile | null>(null)
	const [tools, setTools] = useState<DesktopToolCard[]>([])
	const [toolsError, setToolsError] = useState<string | null>(null)
	const [toolsBusy, setToolsBusy] = useState<string | null>(null)
	const [toolPreview, setToolPreview] = useState<DesktopToolPreview | null>(
		null,
	)

	const refreshSmfsState = useCallback(async () => {
		setSmfsError(null)
		try {
			setSmfsStatuses(await getSmfsState())
		} catch (err) {
			setSmfsError(formatError(err, "Could not load SMFS status"))
		}
	}, [])

	const refreshTools = useCallback(async () => {
		setToolsError(null)
		try {
			const statuses = await detectDesktopTools()
			setTools(sortDesktopToolCards(statuses.map(toDesktopToolCard)))
		} catch (err) {
			setToolsError(formatError(err, "Could not detect tools"))
		}
	}, [])

	useEffect(() => {
		invoke<AppInfo>("app_info")
			.then(setInfo)
			.catch(() => setInfo(null))
		getSession()
			.then(setSession)
			.catch(() => setSession(null))
		getSpotlightShortcut()
			.then(setShortcut)
			.catch(() => setShortcut(null))
		getDefaultSmfsContainerTag()
			.then(setSmfsTag)
			.catch(() => setSmfsTag("sm_fs_desktop"))
		refreshSmfsState()
		refreshTools()
	}, [refreshSmfsState, refreshTools])

	useEffect(() => {
		let unlisten: (() => void) | undefined

		onSmfsStatus((event) => {
			if (event.statuses.length > 0) {
				setSmfsStatuses(event.statuses)
			}
			setSmfsError(event.error ?? null)
		})
			.then((handler) => {
				unlisten = handler
			})
			.catch(() => {
				unlisten = undefined
			})

		return () => {
			unlisten?.()
		}
	}, [])

	async function signOut() {
		await clearSession()
		router.replace("/login")
	}

	async function updateShortcut(accelerator: string) {
		setShortcutError(null)
		setSavingShortcut(accelerator)
		try {
			setShortcut(await setSpotlightShortcut(accelerator))
		} catch (err) {
			setShortcutError(
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Could not update shortcut",
			)
		} finally {
			setSavingShortcut(null)
		}
	}

	async function runSmfsAction(
		action: string,
		fn: () => Promise<SmfsStatus | string | undefined>,
	) {
		setSmfsError(null)
		setSmfsBusy(action)
		try {
			const result = await fn()
			setSmfsProfile(null)
			if (typeof result === "string") {
				setSmfsLogs(result || "No logs available.")
			} else if (result) {
				setSmfsStatuses([result])
			} else {
				await refreshSmfsState()
			}
		} catch (err) {
			setSmfsError(formatError(err, `Could not ${action}`))
		} finally {
			setSmfsBusy(null)
		}
	}

	const smfsStatus = smfsStatuses[0]
	const smfsSuffix = smfsTag.startsWith(SMFS_CONTAINER_TAG_PREFIX)
		? smfsTag.slice(SMFS_CONTAINER_TAG_PREFIX.length)
		: smfsTag

	async function loadSmfsProfile() {
		setSmfsError(null)
		setSmfsBusy("read profile.md")
		try {
			setSmfsProfile(await getSmfsProfile(smfsTag))
		} catch (err) {
			setSmfsError(formatError(err, "Could not read profile.md"))
		} finally {
			setSmfsBusy(null)
		}
	}

	async function previewToolAction(
		toolId: DesktopToolId,
		action: "connect" | "disconnect",
	) {
		setToolsError(null)
		setToolsBusy(`${action}:${toolId}`)
		try {
			const preview =
				action === "connect"
					? await previewConnectDesktopTool(toolId)
					: await previewDisconnectDesktopTool(toolId)
			setToolPreview(preview)
		} catch (err) {
			setToolsError(formatError(err, `Could not preview ${action}`))
		} finally {
			setToolsBusy(null)
		}
	}

	async function applyToolPreview() {
		if (!toolPreview) return

		setToolsError(null)
		setToolsBusy(`${toolPreview.action}:${toolPreview.tool.id}`)
		try {
			if (toolPreview.action === "connect") {
				await connectDesktopTool(toolPreview.tool.id)
			} else {
				await disconnectDesktopTool(toolPreview.tool.id)
			}
			setToolPreview(null)
			await refreshTools()
		} catch (err) {
			setToolsError(formatError(err, `Could not ${toolPreview.action} tool`))
		} finally {
			setToolsBusy(null)
		}
	}

	return (
		<div className="mx-auto w-full max-w-2xl p-8">
			<h1 className="mb-6 font-semibold text-2xl">Settings</h1>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">Account</CardTitle>
					<CardDescription>
						Keychain-backed desktop session for API requests.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<Row
						label="User"
						value={session?.email ?? session?.userId ?? "..."}
					/>
					<Row label="API" value={session?.apiUrl ?? "..."} />
					<Button variant="outline" onClick={signOut}>
						Sign out
					</Button>
				</CardContent>
			</Card>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">Spotlight</CardTitle>
					<CardDescription>
						Global shortcut for the floating memory search window.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<Row
						label="Current"
						value={formatShortcut(shortcut?.accelerator ?? "...")}
					/>
					<div className="grid gap-2 sm:grid-cols-3">
						{SHORTCUT_OPTIONS.map((option) => {
							const selected = shortcut?.accelerator === option.accelerator
							return (
								<Button
									key={option.accelerator}
									type="button"
									variant={selected ? "default" : "outline"}
									disabled={savingShortcut !== null}
									onClick={() => updateShortcut(option.accelerator)}
								>
									{savingShortcut === option.accelerator
										? "Saving..."
										: option.label}
								</Button>
							)
						})}
					</div>
					{shortcutError ? (
						<p className="text-destructive text-sm">{shortcutError}</p>
					) : null}
				</CardContent>
			</Card>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">Memory filesystem</CardTitle>
					<CardDescription>
						Desktop-managed SMFS mount for a filesystem-backed space.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<label className="block space-y-1">
						<span className="font-medium text-muted-foreground text-xs">
							Filesystem space tag
						</span>
						<span className="flex overflow-hidden rounded-md border border-border bg-background">
							<span className="flex shrink-0 items-center border-border border-r bg-muted/30 px-3 font-mono text-muted-foreground text-xs">
								{SMFS_CONTAINER_TAG_PREFIX}
							</span>
							<input
								value={smfsSuffix}
								onChange={(event) =>
									setSmfsTag(
										`${SMFS_CONTAINER_TAG_PREFIX}${sanitizeSmfsSuffix(
											event.target.value,
										)}`,
									)
								}
								disabled={smfsBusy !== null || smfsStatus?.ownedByApp}
								className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
								aria-label="SMFS container tag suffix"
							/>
						</span>
					</label>
					<Row label="Active tag" value={smfsStatus?.tag ?? smfsTag} />
					<Row label="Required prefix" value={SMFS_CONTAINER_TAG_PREFIX} />
					<Row label="State" value={formatSmfsState(smfsStatus?.state)} />
					<Row label="Mount path" value={smfsStatus?.mountPath ?? "..."} />
					<Row label="Binary" value={smfsStatus?.binaryPath ?? "..."} />
					<Row
						label="Ownership"
						value={
							smfsStatus?.ownedByApp
								? "Managed by desktop"
								: smfsStatus?.state === "external"
									? "External mount"
									: "Not mounted"
						}
					/>
					<Row
						label="profile.md"
						value={
							smfsStatus?.profileAvailable
								? "Available"
								: smfsStatus?.state === "mounted" ||
										smfsStatus?.state === "external"
									? "Not ready yet"
									: "Unavailable"
						}
					/>
					<div className="grid gap-2 sm:grid-cols-5">
						<Button
							type="button"
							variant="outline"
							disabled={smfsBusy !== null}
							onClick={() =>
								runSmfsAction("refresh SMFS", async () => {
									await refreshSmfsState()
									return undefined
								})
							}
						>
							Refresh
						</Button>
						<Button
							type="button"
							disabled={smfsBusy !== null || smfsStatus?.state === "external"}
							onClick={() =>
								runSmfsAction("mount SMFS", () => mountSmfs(smfsTag))
							}
						>
							Mount
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={smfsBusy !== null || !smfsStatus?.ownedByApp}
							onClick={() =>
								runSmfsAction("sync SMFS", () => syncSmfs(smfsTag))
							}
						>
							Sync
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={smfsBusy !== null}
							onClick={() =>
								runSmfsAction("reveal SMFS", async () => {
									await revealSmfs(smfsTag)
									return undefined
								})
							}
						>
							Reveal
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={smfsBusy !== null || !smfsStatus?.ownedByApp}
							onClick={() =>
								runSmfsAction("unmount SMFS", () => unmountSmfs(smfsTag))
							}
						>
							Unmount
						</Button>
					</div>
					<Button
						type="button"
						variant="outline"
						disabled={smfsBusy !== null}
						onClick={() =>
							runSmfsAction("read SMFS logs", () => getSmfsLogs(smfsTag, 200))
						}
					>
						Load logs
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={
							smfsBusy !== null ||
							!(
								smfsStatus?.state === "mounted" ||
								smfsStatus?.state === "external" ||
								smfsStatus?.state === "degraded"
							)
						}
						onClick={() => loadSmfsProfile()}
					>
						Read profile.md
					</Button>
					{smfsBusy ? (
						<p className="text-muted-foreground text-xs">Working: {smfsBusy}</p>
					) : null}
					{(smfsError ?? smfsStatus?.error) ? (
						<p className="text-destructive text-sm">
							{smfsError ?? smfsStatus?.error}
						</p>
					) : null}
					{smfsStatus?.state === "missing-binary" ? (
						<p className="text-muted-foreground text-xs">
							Install SMFS locally or set SUPERMEMORY_DESKTOP_SMFS_BIN to a
							binary path while developing. Production builds should bundle the
							sidecar in src-tauri/binaries.
						</p>
					) : null}
					{smfsProfile ? (
						<div className="space-y-2">
							<Row label="Profile path" value={smfsProfile.path} />
							<pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/20 p-3 whitespace-pre-wrap text-xs">
								{smfsProfile.content}
							</pre>
						</div>
					) : null}
					{smfsLogs ? (
						<pre className="max-h-52 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs">
							{smfsLogs}
						</pre>
					) : null}
				</CardContent>
			</Card>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">AI tools</CardTitle>
					<CardDescription>
						Detect local tools and connect them to the Supermemory MCP server.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							disabled={toolsBusy !== null}
							onClick={() => refreshTools()}
						>
							Refresh
						</Button>
					</div>
					<div className="grid gap-3 lg:grid-cols-2">
						{tools.map((tool) => (
							<SettingsToolCard
								key={tool.id}
								tool={tool}
								busy={toolsBusy !== null}
								onPreviewConnect={() => previewToolAction(tool.id, "connect")}
								onPreviewDisconnect={() =>
									previewToolAction(tool.id, "disconnect")
								}
							/>
						))}
					</div>
					{toolsError ? (
						<p className="text-destructive text-sm">{toolsError}</p>
					) : null}
					{toolPreview ? (
						<div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
							<div className="space-y-1">
								<p className="font-medium">
									{toolPreview.action === "connect" ? "Connect" : "Disconnect"}{" "}
									{toolPreview.tool.name}
								</p>
								<Row label="Config" value={toolPreview.configPath} />
								<Row
									label="Backup"
									value={
										toolPreview.backupPath ?? "Created only if file exists"
									}
								/>
							</div>
							<pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-3 whitespace-pre-wrap text-xs">
								{toolPreview.diff}
							</pre>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={toolsBusy !== null}
									onClick={() => setToolPreview(null)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={toolsBusy !== null}
									onClick={() => applyToolPreview()}
								>
									{toolsBusy ? "Applying..." : "Apply"}
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">About</CardTitle>
					<CardDescription>
						Native runtime details, read from the Rust core over IPC.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<Row label="App" value={info?.name ?? "…"} />
					<Row label="Version" value={info?.version ?? "…"} />
					<Row label="Platform" value={info?.platform ?? "…"} />
				</CardContent>
			</Card>

			<p className="mt-6 text-muted-foreground text-sm">
				Not signed in?{" "}
				<Link
					href="/login"
					className="text-primary underline-offset-4 hover:underline"
				>
					Go to login
				</Link>
			</p>
		</div>
	)
}

const SHORTCUT_OPTIONS = [
	{ label: "⌘ ⇧ M", accelerator: "CommandOrControl+Shift+M" },
	{ label: "⌘ ⇧ Space", accelerator: "CommandOrControl+Shift+Space" },
	{ label: "⌘ ⌥ M", accelerator: "CommandOrControl+Option+M" },
] as const

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

function SettingsToolCard({
	tool,
	busy,
	onPreviewConnect,
	onPreviewDisconnect,
}: {
	tool: DesktopToolCard
	busy: boolean
	onPreviewConnect: () => void
	onPreviewDisconnect: () => void
}) {
	return (
		<div
			className={cn(
				"flex min-h-[190px] flex-col rounded-[18px] bg-[#1B1F24] p-5 transition-colors",
				tool.connected && "ring-1 ring-[#2261CA33]",
			)}
			style={modalCardStyle}
		>
			<div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3">
				<div className="pt-0.5">
					<div
						className="flex size-12 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
						style={inputBevelStyle}
					>
						<img
							src={tool.iconSrc}
							alt=""
							className="size-7 object-contain"
							draggable={false}
						/>
					</div>
				</div>
				<div className="min-w-0 pr-1">
					<p className="font-semibold text-[#FAFAFA] text-[15px] leading-tight">
						{tool.name}
					</p>
					<p className="mt-1 line-clamp-2 font-medium text-[#737373] text-[12px] leading-[1.35]">
						{tool.description}
					</p>
				</div>
				{tool.connected ? (
					<span className="mt-1 inline-flex shrink-0 items-center gap-1 font-semibold text-[#4BA0FA] text-[11px] uppercase tracking-[0.08em]">
						<Check className="size-3" />
						Connected
					</span>
				) : (
					<Button
						type="button"
						variant="insideOut"
						disabled={busy}
						onClick={onPreviewConnect}
						className="h-9 shrink-0 gap-1.5 rounded-full px-4 font-medium text-[#FAFAFA] text-[13px]"
					>
						{tool.primaryAction === "connect" ? "Connect" : "Set up"}
					</Button>
				)}
			</div>

			<ul className="mt-4 space-y-1.5">
				{tool.perks.map((perk) => (
					<li
						key={perk}
						className="flex items-start gap-2.5 font-medium text-[#737373] text-[12px] leading-[1.5]"
					>
						<span
							aria-hidden
							className="mt-[7px] size-1 shrink-0 rounded-full bg-[#525D6E]"
						/>
						<span>{perk}</span>
					</li>
				))}
			</ul>

			<div className="mt-auto flex items-end justify-between gap-3 pt-4">
				<div className="min-w-0">
					<p
						className="truncate font-mono font-medium text-[#737373] text-[11px]"
						title={tool.configPath}
					>
						{tool.configPath}
					</p>
					<p className="mt-1 line-clamp-1 font-medium text-[#525D6E] text-[11px]">
						{tool.detected
							? tool.version
								? `Detected ${tool.version}`
								: "Detected on this Mac"
							: "Not detected yet"}
					</p>
				</div>
				<SettingsToolTargetChip label="Supermemory MCP" />
			</div>

			{tool.connected ? (
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={onPreviewDisconnect}
					className="mt-4 h-8 rounded-full border-white/[0.08] bg-white/[0.03] text-xs hover:bg-white/[0.06]"
				>
					Disconnect
				</Button>
			) : null}
		</div>
	)
}

function SettingsToolTargetChip({ label }: { label: string }) {
	return (
		<div
			className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[#737373] text-[11px]"
			title={`This tool will connect to ${label}.`}
		>
			<span className="text-[#525D6E] text-[10px] uppercase tracking-[0.08em]">
				Uses
			</span>
			<FolderOpen className="size-3 text-[#737373]" />
			<span className="text-[#FAFAFA]">{label}</span>
		</div>
	)
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="truncate font-medium tabular-nums" title={value}>
				{value}
			</span>
		</div>
	)
}

function formatShortcut(value: string) {
	return value
		.replace("CommandOrControl", "⌘")
		.replace("Command", "⌘")
		.replace("Control", "⌃")
		.replace("Option", "⌥")
		.replace("Alt", "⌥")
		.replace("Shift", "⇧")
		.replaceAll("+", " ")
}

function formatError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}

function sanitizeSmfsSuffix(value: string) {
	return value.replace(/[^A-Za-z0-9_-]/g, "")
}

function formatSmfsState(state?: SmfsStatus["state"]) {
	switch (state) {
		case "degraded":
			return "Mounted with warnings"
		case "external":
			return "External mount"
		case "error":
			return "Error"
		case "missing-binary":
			return "Missing binary"
		case "mounted":
			return "Mounted"
		case "unmounted":
			return "Unmounted"
		default:
			return "Loading"
	}
}
