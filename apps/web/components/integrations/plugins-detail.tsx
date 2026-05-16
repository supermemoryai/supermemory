"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { hasActivePlan } from "@lib/queries"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { BookOpen, Check, ChevronDown, Loader, X, Zap } from "lucide-react"
import Image from "next/image"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import {
	PLUGIN_CATALOG,
	isFreeTierPlugin,
	type InstallStep,
	type PluginInfo,
} from "@/lib/plugin-catalog"
import { INSET, InstallSteps, PillButton } from "./install-steps"

interface ConnectedPlugin {
	id: string
	keyId: string
	pluginId: string
	createdAt: string
	keyStart?: string | null
}

function SectionHeader({ children }: { children: ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"text-[16px] font-semibold text-[#FAFAFA]",
			)}
		>
			{children}
		</p>
	)
}

function PluginIconBox({
	src,
	alt,
	dimmed,
}: {
	src: string
	alt: string
	dimmed?: boolean
}) {
	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
				dimmed && "opacity-50",
			)}
		>
			<Image alt={alt} className="size-6" height={24} src={src} width={24} />
		</div>
	)
}

function ProChip() {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"shrink-0 rounded-[4px] border border-[#4BA0FA]/25 bg-[#4BA0FA]/10 px-1.5 py-0.5",
				"text-[10px] font-semibold uppercase tracking-wide text-[#4BA0FA]",
			)}
		>
			Pro
		</span>
	)
}

function DocsLink({ href }: { href: string }) {
	return (
		<a
			aria-label="Open plugin docs"
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				dmSans125ClassName(),
				"flex size-8 shrink-0 items-center justify-center gap-1 rounded-full text-[12px] text-[#A1A1AA] transition-colors hover:text-white sm:h-auto sm:w-auto sm:justify-start sm:rounded-none",
			)}
		>
			<BookOpen className="size-3.5" />{" "}
			<span className="hidden sm:inline">Docs</span>
		</a>
	)
}

function DisconnectButton({ onConfirm }: { onConfirm: () => void }) {
	const [confirming, setConfirming] = useState(false)
	useEffect(() => {
		if (!confirming) return
		const t = setTimeout(() => setConfirming(false), 3000)
		return () => clearTimeout(t)
	}, [confirming])
	return (
		<button
			type="button"
			onClick={() => (confirming ? onConfirm() : setConfirming(true))}
			className={cn(
				dmSans125ClassName(),
				"shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
				confirming
					? "bg-red-500/15 text-red-400"
					: "text-[#737373] hover:bg-white/5 hover:text-red-400",
			)}
		>
			{confirming ? "Confirm" : "Disconnect"}
		</button>
	)
}

function ConnectedPill({
	connectedKeys,
	onRevoke,
}: {
	connectedKeys: ConnectedPlugin[]
	onRevoke: (keyId: string) => void
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						dmSans125ClassName(),
						"flex h-8 min-w-[104px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#00AC3F] sm:h-9 sm:min-w-[116px] sm:gap-2 sm:px-4 sm:text-[13px]",
						"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80",
					)}
				>
					<span className="size-[7px] rounded-full bg-[#00AC3F]" />
					Connected
					<ChevronDown className="size-3 text-[#737373]" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className={cn(
					dmSans125ClassName(),
					"w-[260px] rounded-xl border border-white/10 bg-[#1B1F24] p-2 text-[#FAFAFA]",
				)}
			>
				<p
					className={cn(
						dmSans125ClassName(),
						"px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-[#737373]",
					)}
				>
					{connectedKeys.length > 1
						? `${connectedKeys.length} connections`
						: "Connection"}
				</p>
				<div className="flex flex-col">
					{connectedKeys.map((k) => (
						<div
							key={k.keyId}
							className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
						>
							<span
								className={cn(
									dmSans125ClassName(),
									"min-w-0 flex-1 truncate font-mono text-[12px] text-[#A1A1AA]",
								)}
							>
								{k.keyStart ? `${k.keyStart}…` : "API key"}
							</span>
							<DisconnectButton onConfirm={() => onRevoke(k.keyId)} />
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}

function PluginRow({
	plugin,
	pluginId,
	connectedKeys,
	needsProUpgrade,
	isConnecting,
	actionsDisabled,
	onConnect,
	onUpgrade,
	onRevoke,
}: {
	plugin: PluginInfo
	pluginId: string
	connectedKeys: ConnectedPlugin[]
	needsProUpgrade: boolean
	isConnecting: boolean
	actionsDisabled: boolean
	onConnect: (id: string) => void
	onUpgrade: () => void
	onRevoke: (keyId: string) => void
}) {
	const isConnected = connectedKeys.length > 0
	return (
		<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-b border-white/[0.06] py-4 last:border-b-0 sm:flex sm:items-center sm:gap-3.5">
			<PluginIconBox
				src={plugin.icon}
				alt={plugin.name}
				dimmed={needsProUpgrade && !isConnected}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 items-center gap-2">
					{isConnected && (
						<span className="size-1.5 shrink-0 rounded-full bg-[#00AC3F]" />
					)}
					<span
						className={cn(
							dmSans125ClassName(),
							"min-w-0 truncate text-[14px] font-medium text-[#FAFAFA]",
						)}
					>
						{plugin.name}
					</span>
					{!isConnected && needsProUpgrade && <ProChip />}
				</div>
				<p
					className={cn(
						dmSans125ClassName(),
						"mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#A1A1AA] sm:truncate sm:text-[13px]",
					)}
				>
					{plugin.tagline}
				</p>
			</div>
			<div className="col-start-2 flex min-w-0 shrink-0 items-center gap-2 sm:col-start-auto sm:gap-4">
				{plugin.docsUrl && <DocsLink href={plugin.docsUrl} />}
				{isConnected ? (
					<ConnectedPill connectedKeys={connectedKeys} onRevoke={onRevoke} />
				) : needsProUpgrade ? (
					<PillButton onClick={onUpgrade}>
						<Zap className="size-3.5 text-[#4BA0FA]" /> Upgrade
					</PillButton>
				) : (
					<PillButton
						onClick={() => onConnect(pluginId)}
						disabled={actionsDisabled}
					>
						{isConnecting ? (
							<>
								<Loader className="size-3.5 animate-spin" /> Connecting…
							</>
						) : (
							"Connect"
						)}
					</PillButton>
				)}
			</div>
		</div>
	)
}

type TierFilter = "all" | "pro" | "free"

const TIER_FILTERS: { value: TierFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "pro", label: "Pro" },
	{ value: "free", label: "Free" },
]

function TierFilterToggle({
	value,
	onChange,
}: {
	value: TierFilter
	onChange: (value: TierFilter) => void
}) {
	return (
		<div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#0D121A] p-0.5 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]">
			{TIER_FILTERS.map((filter) => (
				<button
					key={filter.value}
					type="button"
					onClick={() => onChange(filter.value)}
					className={cn(
						dmSans125ClassName(),
						"rounded-full px-3 h-7 text-[12px] font-medium transition-colors",
						value === filter.value
							? "bg-white/[0.10] text-[#FAFAFA]"
							: "text-[#A1A1AA] hover:text-[#FAFAFA]",
					)}
				>
					{filter.label}
				</button>
			))}
		</div>
	)
}

export function PluginsDetail() {
	const { org } = useAuth()
	const autumn = useCustomer()
	const queryClient = useQueryClient()
	const [tierFilter, setTierFilter] = useState<TierFilter>("all")
	const [connectingPlugin, setConnectingPlugin] = useState<string | null>(null)
	const [newKey, setNewKey] = useState<{
		open: boolean
		key: string
		pluginId: string | null
	}>({
		open: false,
		key: "",
		pluginId: null,
	})

	const hasProProduct = hasActivePlan(autumn.data?.subscriptions, "api_pro")

	const { data: pluginsData } = useQuery({
		queryFn: async () => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const res = await fetch(`${API_URL}/v3/auth/plugins`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to fetch plugins")
			return (await res.json()) as { plugins: string[] }
		},
		queryKey: ["plugins"],
	})

	const { data: apiKeys = [], refetch: refetchKeys } = useQuery({
		enabled: !!org?.id,
		queryFn: async () => {
			if (!org?.id) return []
			const data = await authClient.apiKey.list({
				fetchOptions: { query: { metadata: { organizationId: org.id } } },
			})
			return data.filter((key) => key.metadata?.organizationId === org.id)
		},
		queryKey: ["api-keys", org?.id],
	})

	const connectedPlugins = useMemo<ConnectedPlugin[]>(() => {
		const plugins: ConnectedPlugin[] = []
		for (const key of apiKeys) {
			if (!key.metadata) continue
			try {
				const metadata =
					typeof key.metadata === "string"
						? (JSON.parse(key.metadata) as {
								sm_type?: string
								sm_client?: string
							})
						: (key.metadata as { sm_type?: string; sm_client?: string })

				if (metadata.sm_type === "plugin_auth" && metadata.sm_client) {
					plugins.push({
						id: key.id,
						keyId: key.id,
						pluginId: metadata.sm_client,
						createdAt: key.createdAt.toISOString(),
						keyStart: key.start ?? null,
					})
				}
			} catch {}
		}
		return plugins
	}, [apiKeys])

	const connectedPluginIds = useMemo(
		() => new Set(connectedPlugins.map((p) => p.pluginId)),
		[connectedPlugins],
	)

	const createPluginKeyMutation = useMutation({
		mutationFn: async (pluginId: string) => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const params = new URLSearchParams({ client: pluginId })
			const res = await fetch(`${API_URL}/v3/auth/key?${params}`, {
				credentials: "include",
			})
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error(
						"This plugin requires a Pro plan. Hermes is available on the Free plan.",
					)
				}
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(errorData.message || "Failed to create plugin key")
			}
			return (await res.json()) as { key: string }
		},
		onMutate: (pluginId) => setConnectingPlugin(pluginId),
		onError: (err) => {
			toast.error("Failed to connect plugin", {
				description: err instanceof Error ? err.message : "Unknown error",
			})
		},
		onSettled: () => {
			setConnectingPlugin(null)
			queryClient.invalidateQueries({ queryKey: ["api-keys", org?.id] })
		},
		onSuccess: (data, pluginId) => {
			setNewKey({ open: true, key: data.key, pluginId })
		},
	})

	const handleRevoke = async (keyId: string) => {
		try {
			await authClient.apiKey.delete({ keyId })
			toast.success("Plugin disconnected")
			refetchKeys()
		} catch {
			toast.error("Failed to disconnect plugin")
		}
	}

	const handleUpgrade = async () => {
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/?view=integrations`,
			})
			if (result?.paymentUrl) {
				window.open(result.paymentUrl, "_self")
				return
			}
			autumn.refetch?.()
		} catch (error) {
			console.error(error)
			toast.error("Failed to start checkout. Please try again.")
		}
	}

	const isLoading = autumn.isLoading
	const availablePlugins = pluginsData?.plugins ?? Object.keys(PLUGIN_CATALOG)

	const catalogRows = useMemo(
		() => availablePlugins.filter((id) => PLUGIN_CATALOG[id]),
		[availablePlugins],
	)

	const visibleRows = useMemo(() => {
		const filtered = catalogRows.filter((id) => {
			if (tierFilter === "free") return isFreeTierPlugin(id)
			if (tierFilter === "pro") return !isFreeTierPlugin(id)
			return true
		})
		// Connected plugins float to the top (stable within each group).
		return [...filtered].sort(
			(a, b) =>
				Number(connectedPluginIds.has(b)) - Number(connectedPluginIds.has(a)),
		)
	}, [catalogRows, tierFilter, connectedPluginIds])

	const dialogPlugin = newKey.pluginId
		? PLUGIN_CATALOG[newKey.pluginId]
		: undefined

	const pluginSteps = dialogPlugin?.installSteps ?? []
	// If a step already embeds the key (an `export …="sm_…"` line), don't also
	// show the bare key in its own step — that's the repetition to avoid.
	// Otherwise (wizard-style installs) lead with a copy-the-key step.
	const stepsEmbedKey = pluginSteps.some((s) => s.code?.includes("sm_..."))
	const setupSteps: InstallStep[] = stepsEmbedKey
		? pluginSteps
		: [
				{
					title: "Copy your API key",
					description:
						"You won't be able to see it again — store it somewhere safe.",
					code: newKey.key,
					copyLabel: "API key",
					secret: true,
				},
				...pluginSteps,
			]

	return (
		<>
			<div
				className={cn(
					"relative overflow-hidden rounded-[14px] bg-[#14161A] p-4 sm:p-6",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3">
						<SectionHeader>Plugins</SectionHeader>
						{catalogRows.length > 0 && (
							<TierFilterToggle value={tierFilter} onChange={setTierFilter} />
						)}
					</div>
					<div className="flex flex-col">
						{visibleRows.map((pluginId) => {
							const plugin = PLUGIN_CATALOG[pluginId]
							if (!plugin) return null
							const needsProUpgrade =
								!isLoading && !hasProProduct && !isFreeTierPlugin(pluginId)
							return (
								<PluginRow
									key={pluginId}
									plugin={plugin}
									pluginId={pluginId}
									connectedKeys={connectedPlugins.filter(
										(p) => p.pluginId === pluginId,
									)}
									needsProUpgrade={needsProUpgrade}
									isConnecting={connectingPlugin === pluginId}
									actionsDisabled={!!connectingPlugin}
									onConnect={(id) => createPluginKeyMutation.mutate(id)}
									onUpgrade={handleUpgrade}
									onRevoke={handleRevoke}
								/>
							)
						})}
						{visibleRows.length === 0 && (
							<p
								className={cn(
									dmSans125ClassName(),
									"py-6 text-center text-[13px] text-[#A1A1AA]",
								)}
							>
								No plugins in this category.
							</p>
						)}
					</div>
				</div>
			</div>

			<Dialog
				open={newKey.open}
				onOpenChange={(open) =>
					setNewKey((s) => ({
						open,
						key: open ? s.key : "",
						pluginId: open ? s.pluginId : null,
					}))
				}
			>
				<DialogContent
					showCloseButton={false}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
					}}
					className={cn(
						dmSans125ClassName(),
						"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[560px] sm:rounded-[22px]",
					)}
				>
					<DialogTitle className="sr-only">
						Set up {dialogPlugin?.name ?? "your plugin"}
					</DialogTitle>

					<div className="flex shrink-0 items-center gap-3">
						{dialogPlugin && (
							<PluginIconBox src={dialogPlugin.icon} alt={dialogPlugin.name} />
						)}
						<div className="min-w-0 flex-1">
							<p
								className={cn(
									dmSans125ClassName(),
									"truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]",
								)}
							>
								Set up {dialogPlugin?.name ?? "your plugin"}
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"mt-0.5 truncate text-[12px] text-[#A1A1AA]",
								)}
							>
								Copy your key and run these steps to finish.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{dialogPlugin?.docsUrl && (
								<a
									href={dialogPlugin.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										dmSans125ClassName(),
										"flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-white",
										INSET,
									)}
								>
									<BookOpen className="size-3.5" /> Docs
								</a>
							)}
							<DialogPrimitive.Close
								type="button"
								aria-label="Close"
								className={cn(
									"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
									INSET,
								)}
							>
								<X className="size-4 text-[#737373]" />
							</DialogPrimitive.Close>
						</div>
					</div>

					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<div
							className={cn(
								"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
								INSET,
							)}
						>
							<InstallSteps steps={setupSteps} apiKey={newKey.key} />
						</div>
					</div>

					<div className="flex shrink-0 items-center justify-end">
						<button
							type="button"
							onClick={() =>
								setNewKey({ open: false, key: "", pluginId: null })
							}
							className={cn(
								dmSans125ClassName(),
								"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
								INSET,
							)}
						>
							<Check className="size-3.5 text-[#4BA0FA]" /> Done
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
