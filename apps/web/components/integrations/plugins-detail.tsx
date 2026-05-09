"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { hasActivePlan } from "@lib/queries"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	ArrowRight,
	BookOpen,
	Check,
	CheckCircle,
	Copy,
	ExternalLink,
	Loader,
	Trash2,
	Zap,
} from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogPortal,
} from "@ui/components/dialog"

/** Match `FREE_TIER_PLUGIN_IDS` in mono `packages/lib/plugins.ts`. */
function isFreeTierPlugin(pluginId: string): boolean {
	return pluginId === "hermes"
}

interface PluginInfo {
	id: string
	name: string
	description: string
	features: string[]
	icon: string
	docsUrl?: string
	repoUrl?: string
}

const PLUGIN_CATALOG: Record<string, PluginInfo> = {
	claude_code: {
		id: "claude_code",
		name: "Claude Code",
		description:
			"Claude Code remembers your conventions, past decisions, and project context across every session — no re-explaining yourself.",
		features: [
			"Picks up where you left off at session start",
			"Captures decisions and patterns from tool usage",
			"Builds a persistent profile of how you work",
		],
		icon: "/images/plugins/claude-code.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/claude-code",
		repoUrl: "https://github.com/supermemoryai/claude-supermemory",
	},
	opencode: {
		id: "opencode",
		name: "OpenCode",
		description:
			"Gives OpenCode persistent memory — your patterns, preferences, and decisions carry forward automatically, session to session.",
		features: [
			"Semantic search across previous sessions",
			"Auto-capture of coding decisions",
			"Context injected before each prompt",
		],
		icon: "/images/plugins/opencode.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/opencode",
	},
	openclaw: {
		id: "openclaw",
		name: "OpenClaw",
		description:
			"Persists memory across Telegram, WhatsApp, Discord, and Slack. OpenClaw knows who users are and what they talked about before.",
		features: [
			"Cross-channel memory that follows the user",
			"Automatic conversation capture",
			"User profiles built across every platform",
		],
		icon: "/images/plugins/openclaw.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/openclaw",
		repoUrl: "https://github.com/supermemoryai/openclaw-supermemory",
	},
	hermes: {
		id: "hermes",
		name: "Hermes",
		description:
			"Hermes never forgets. Conversations, user profiles, and context persist so every session feels like a continuation, not a cold start.",
		features: [
			"Semantic search across previous sessions",
			"Auto-capture of conversation context",
			"Persistent user profile built over time",
		],
		icon: "/images/plugins/hermes.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/hermes",
		repoUrl: "https://github.com/NousResearch/hermes-agent",
	},
}

interface ConnectedPlugin {
	id: string
	keyId: string
	pluginId: string
	createdAt: string
	lastUsed?: string | null
	keyStart?: string | null
}

function ProUpgradeNudge({ onUpgrade }: { onUpgrade: () => void }) {
	return (
		<div className="flex items-center justify-between gap-3 bg-[#4BA0FA]/5 border border-[#4BA0FA]/20 rounded-xl px-4 py-3 mb-6">
			<div className="flex items-center gap-2">
				<Zap className="size-4 text-[#4BA0FA] shrink-0" />
				<p className={cn(dmSans125ClassName(), "text-[13px] text-[#8B8B8B]")}>
					Unlock Claude Code, OpenCode, OpenClaw and more with{" "}
					<span className="text-white font-medium">Pro</span>
				</p>
			</div>
			<button
				type="button"
				onClick={onUpgrade}
				className={cn(
					"shrink-0 flex items-center gap-1.5 text-[12px] font-medium text-white",
					"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 rounded-full px-3 h-7 transition-colors cursor-pointer",
					dmSans125ClassName(),
				)}
			>
				Upgrade
			</button>
		</div>
	)
}

function ConnectedPluginRow({
	plugin,
	info,
	onRevoke,
}: {
	plugin: ConnectedPlugin
	info: PluginInfo | undefined
	onRevoke: (keyId: string) => void
}) {
	return (
		<div
			className={cn(
				"bg-[#0D121A] border border-[rgba(82,89,102,0.2)] rounded-[12px] px-4 py-3",
				"shadow-[0px_1px_2px_0px_rgba(0,43,87,0.1)]",
			)}
		>
			<div className="flex items-center gap-3">
				{info && (
					<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
						<Image
							alt={info.name}
							className="size-6"
							height={24}
							src={info.icon}
							width={24}
						/>
					</div>
				)}
				<div className="flex-1">
					<p
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px] text-[#FAFAFA]",
						)}
					>
						{info?.name || plugin.pluginId}
					</p>
					<div className="flex items-center gap-2">
						<div className="size-[7px] rounded-full bg-[#00AC3F]" />
						<span
							className={cn(dmSans125ClassName(), "text-[12px] text-[#00AC3F]")}
						>
							Connected
						</span>
						{plugin.keyStart && (
							<span
								className={cn(
									dmSans125ClassName(),
									"text-[12px] text-[#737373] font-mono",
								)}
							>
								{plugin.keyStart}...
							</span>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => onRevoke(plugin.keyId)}
					className="text-[#737373] hover:text-red-400 transition-colors"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</div>
	)
}

function PluginCard({
	plugin,
	pluginId,
	isConnected,
	isCurrentlyConnecting,
	connectingPlugin,
	needsProUpgrade,
	onConnect,
	onUpgrade,
}: {
	plugin: PluginInfo
	pluginId: string
	isConnected: boolean
	isCurrentlyConnecting: boolean
	connectingPlugin: string | null
	needsProUpgrade: boolean
	onConnect: (id: string) => void
	onUpgrade: () => void
}) {
	return (
		<div
			className={cn(
				"bg-[#0D121A] rounded-[12px] p-4 flex flex-col gap-3 border",
				isConnected
					? "border-[#4BA0FA]/30"
					: needsProUpgrade
						? "border-[rgba(82,89,102,0.12)]"
						: "border-[rgba(82,89,102,0.2)]",
			)}
		>
			<div className="flex items-start gap-3">
				<div
					className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]",
						needsProUpgrade && "opacity-50",
					)}
				>
					<Image
						alt={plugin.name}
						className="size-6"
						height={24}
						src={plugin.icon}
						width={24}
					/>
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span
							className={cn(
								dmSans125ClassName(),
								"font-medium text-[14px]",
								needsProUpgrade ? "text-[#737373]" : "text-[#FAFAFA]",
							)}
						>
							{plugin.name}
						</span>
						{isConnected && (
							<span className="flex items-center gap-1 text-[10px] text-[#00AC3F] border border-[#00AC3F]/30 rounded-full px-1.5 py-0.5">
								<CheckCircle className="size-2.5" /> Connected
							</span>
						)}
						{needsProUpgrade && (
							<span className="text-[10px] font-bold text-[#00171A] bg-[#4BA0FA] px-1.5 py-0.5 rounded-[3px]">
								PRO
							</span>
						)}
					</div>
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[12px] mt-0.5",
							needsProUpgrade ? "text-[#4B5563]" : "text-[#737373]",
						)}
					>
						{plugin.description}
					</p>
				</div>
			</div>

			<ul className={cn("space-y-1.5", needsProUpgrade && "opacity-40")}>
				{plugin.features.map((feature) => (
					<li key={feature} className="flex items-start gap-2">
						<ArrowRight className="mt-0.5 size-3 shrink-0 text-[#4BA0FA]" />
						<span
							className={cn(dmSans125ClassName(), "text-[12px] text-[#8B8B8B]")}
						>
							{feature}
						</span>
					</li>
				))}
			</ul>

			<div className="mt-auto flex flex-col gap-2">
				{isConnected ? (
					<button
						type="button"
						disabled
						className={cn(
							"w-full flex items-center justify-center gap-2 rounded-full h-9 px-4 text-[12px] font-medium",
							"bg-[#080B0F] text-[#737373] border border-[#1E293B] opacity-60",
							dmSans125ClassName(),
						)}
					>
						<CheckCircle className="size-3.5" /> Already Connected
					</button>
				) : needsProUpgrade ? (
					<button
						type="button"
						onClick={onUpgrade}
						className={cn(
							"w-full flex items-center justify-center gap-2 rounded-full h-9 px-4 text-[12px] font-medium",
							"bg-[#080B0F] text-[#FAFAFA] border border-[#1E293B] hover:border-[#4BA0FA]/40 transition-colors cursor-pointer",
							dmSans125ClassName(),
						)}
					>
						Upgrade for this plugin
					</button>
				) : (
					<button
						type="button"
						onClick={() => onConnect(pluginId)}
						disabled={!!connectingPlugin}
						className={cn(
							"w-full flex items-center justify-center gap-2 rounded-full h-9 px-4 text-[12px] font-medium",
							"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white transition-colors cursor-pointer",
							"disabled:opacity-50 disabled:cursor-not-allowed",
							dmSans125ClassName(),
						)}
					>
						{isCurrentlyConnecting ? (
							<>
								<Loader className="size-3.5 animate-spin" /> Connecting...
							</>
						) : (
							"Connect Plugin"
						)}
					</button>
				)}
				<div className="flex gap-2">
					{plugin.docsUrl && (
						<a
							href={plugin.docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								"flex-1 flex items-center justify-center gap-1 text-[11px] text-[#737373] hover:text-white transition-colors",
								dmSans125ClassName(),
							)}
						>
							<BookOpen className="size-3" /> Docs
						</a>
					)}
					{plugin.repoUrl && (
						<a
							href={plugin.repoUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								"flex-1 flex items-center justify-center gap-1 text-[11px] text-[#737373] hover:text-white transition-colors",
								dmSans125ClassName(),
							)}
						>
							<ExternalLink className="size-3" /> GitHub
						</a>
					)}
				</div>
			</div>
		</div>
	)
}

export function PluginsDetail() {
	const { org } = useAuth()
	const autumn = useCustomer()
	const queryClient = useQueryClient()
	const [connectingPlugin, setConnectingPlugin] = useState<string | null>(null)
	const [newKey, setNewKey] = useState<{ open: boolean; key: string }>({
		open: false,
		key: "",
	})
	const [keyCopied, setKeyCopied] = useState(false)

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
						lastUsed: key.lastRequest?.toISOString() ?? null,
						keyStart: key.start ?? null,
					})
				}
			} catch {}
		}
		return plugins
	}, [apiKeys])

	const connectedPluginIds = useMemo(
		() => connectedPlugins.map((p) => p.pluginId),
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
		onSuccess: (data) => {
			setNewKey({ open: true, key: data.key })
			toast.success("Plugin connected!")
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
			await autumn.attach({
				planId: "api_pro",
				successUrl: "https://app.supermemory.ai/?view=integrations",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
		}
	}

	const handleCopyKey = async () => {
		try {
			await navigator.clipboard.writeText(newKey.key)
			setKeyCopied(true)
			setTimeout(() => setKeyCopied(false), 2000)
			toast.success("API key copied!")
		} catch {
			toast.error("Failed to copy")
		}
	}

	const isLoading = autumn.isLoading
	const availablePlugins = pluginsData?.plugins ?? Object.keys(PLUGIN_CATALOG)

	const allCatalogPluginIds = useMemo(
		() => availablePlugins.filter((id) => PLUGIN_CATALOG[id]),
		[availablePlugins],
	)

	return (
		<>
			<div
				className={cn(
					"bg-[#14161A] rounded-[14px] p-6 relative overflow-hidden",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				{!hasProProduct && !isLoading && (
					<ProUpgradeNudge onUpgrade={handleUpgrade} />
				)}

				{connectedPlugins.length > 0 && (
					<div className="flex flex-col gap-3 mb-6">
						<span
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[16px] text-[#FAFAFA]",
							)}
						>
							Connected
						</span>
						{connectedPlugins.map((plugin) => (
							<ConnectedPluginRow
								key={plugin.id}
								plugin={plugin}
								info={PLUGIN_CATALOG[plugin.pluginId]}
								onRevoke={handleRevoke}
							/>
						))}
					</div>
				)}

				<div className="flex flex-col gap-3">
					<span
						className={cn(
							dmSans125ClassName(),
							"font-semibold text-[16px] text-[#FAFAFA]",
						)}
					>
						{connectedPlugins.length > 0
							? "Add more plugins"
							: "Available plugins"}
					</span>
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{allCatalogPluginIds.map((pluginId) => {
							const plugin = PLUGIN_CATALOG[pluginId]
							if (!plugin) return null
							const isConnected = connectedPluginIds.includes(pluginId)
							const isCurrentlyConnecting = connectingPlugin === pluginId
							const needsProUpgrade =
								!isLoading && !hasProProduct && !isFreeTierPlugin(pluginId)
							return (
								<PluginCard
									key={pluginId}
									plugin={plugin}
									pluginId={pluginId}
									isConnected={isConnected}
									isCurrentlyConnecting={isCurrentlyConnecting}
									connectingPlugin={connectingPlugin}
									needsProUpgrade={needsProUpgrade}
									onConnect={(id) => createPluginKeyMutation.mutate(id)}
									onUpgrade={handleUpgrade}
								/>
							)
						})}
					</div>
				</div>
			</div>

			<Dialog
				open={newKey.open}
				onOpenChange={(open) =>
					setNewKey({ open, key: open ? newKey.key : "" })
				}
			>
				<DialogPortal>
					<DialogContent className="bg-[#14161A] border border-white/10 text-[#FAFAFA] md:max-w-md z-100">
						<DialogHeader>
							<DialogTitle
								className={cn(
									dmSans125ClassName(),
									"text-[#FAFAFA] text-lg font-semibold",
								)}
							>
								Plugin Connected
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<p className={cn(dmSans125ClassName(), "text-sm text-[#737373]")}>
								Save your API key now — you won't be able to see it again.
							</p>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={newKey.key}
									readOnly
									className={cn(
										"flex-1 bg-[#0D121A] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] font-mono",
										dmSans125ClassName(),
									)}
								/>
								<button
									type="button"
									onClick={handleCopyKey}
									className="p-2 rounded-lg bg-[#0D121A] border border-white/10 text-[#737373] hover:text-[#FAFAFA] transition-colors"
								>
									{keyCopied ? (
										<Check className="h-4 w-4 text-[#4BA0FA]" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</button>
							</div>
							<button
								type="button"
								onClick={() => {
									handleCopyKey()
									setNewKey({ open: false, key: "" })
								}}
								className={cn(
									"w-full flex items-center justify-center gap-2",
									"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white",
									"rounded-lg h-11 px-4 font-medium text-sm transition-colors",
									dmSans125ClassName(),
								)}
							>
								<Copy className="size-4" /> Copy & Close
							</button>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</>
	)
}
