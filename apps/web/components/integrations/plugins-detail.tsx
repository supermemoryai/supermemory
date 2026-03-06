"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { fetchSubscriptionStatus } from "@lib/queries"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	ArrowRight,
	BookOpen,
	Brain,
	Check,
	CheckCircle,
	Copy,
	ExternalLink,
	Key,
	Loader,
	Plug,
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
import { analytics } from "@/lib/analytics"

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
			"Persistent memory for Claude Code. Remembers your coding context, patterns, and decisions across sessions.",
		features: [
			"Auto-recalls relevant context at session start",
			"Captures important observations from tool usage",
			"Builds persistent user profile from interactions",
		],
		icon: "/images/plugins/claude-code.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/claude-code",
		repoUrl: "https://github.com/supermemoryai/claude-supermemory",
	},
	opencode: {
		id: "opencode",
		name: "OpenCode",
		description:
			"Memory layer for OpenCode. Enhances your coding assistant with long-term memory capabilities.",
		features: [
			"Semantic search across previous sessions",
			"Auto-capture of coding decisions",
			"Context injection before each prompt",
		],
		icon: "/images/plugins/opencode.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/opencode",
	},
	clawdbot: {
		id: "clawdbot",
		name: "ClawdBot",
		description:
			"Multi-platform memory for OpenClaw. Works across Telegram, WhatsApp, Discord, Slack and more.",
		features: [
			"Cross-channel memory persistence",
			"Automatic conversation capture",
			"User profile building across platforms",
		],
		icon: "/images/plugins/clawdbot.svg",
		docsUrl: "https://docs.supermemory.ai/integrations/openclaw",
		repoUrl: "https://github.com/supermemoryai/openclaw-supermemory",
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

	const {
		data: status = { api_pro: { allowed: false, status: null } },
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const hasProProduct = status.api_pro?.status !== null

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
				productId: "api_pro",
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

	const isLoading = autumn.isLoading || isCheckingStatus
	const availablePlugins = pluginsData?.plugins ?? Object.keys(PLUGIN_CATALOG)

	return (
		<>
			{/* Marketing hero for free users */}
			{!hasProProduct && !isLoading && (
				<div
					className={cn(
						"bg-gradient-to-br from-[#0D121A] to-[#14161A] rounded-[14px] p-6 border border-[#4BA0FA]/20",
						"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
					)}
				>
					<div className="flex flex-col gap-5">
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4BA0FA]/10 shrink-0">
								<Zap className="size-6 text-[#4BA0FA]" />
							</div>
							<div className="flex-1">
								<h3
									className={cn(
										dmSans125ClassName(),
										"font-semibold text-[18px] text-[#FAFAFA]",
									)}
								>
									Unlock Persistent Memory for Your Tools
								</h3>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[14px] text-[#737373] mt-1",
									)}
								>
									Upgrade to Pro to connect plugins and give your AI tools
									long-term memory
								</p>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							{[
								{
									icon: Brain,
									title: "Context Retention",
									desc: "AI remembers your preferences across sessions",
								},
								{
									icon: Zap,
									title: "Instant Recall",
									desc: "Past decisions surface automatically when relevant",
								},
								{
									icon: Key,
									title: "Secure & Private",
									desc: "Your data stays yours with encrypted storage",
								},
							].map(({ icon: Icon, title, desc }) => (
								<div key={title} className="flex items-start gap-2.5">
									<Icon className="mt-0.5 size-4 text-[#4BA0FA] shrink-0" />
									<div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-[13px] font-medium text-[#FAFAFA]",
											)}
										>
											{title}
										</p>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-[11px] text-[#737373]",
											)}
										>
											{desc}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="flex items-center gap-3">
							{Object.values(PLUGIN_CATALOG).map((plugin) => (
								<div
									key={plugin.id}
									className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]"
								>
									<Image
										alt={plugin.name}
										className="size-5"
										height={20}
										src={plugin.icon}
										width={20}
									/>
								</div>
							))}
							<span
								className={cn(
									dmSans125ClassName(),
									"text-[12px] text-[#737373]",
								)}
							>
								Claude Code, OpenCode, ClawdBot & more
							</span>
						</div>

						<button
							type="button"
							onClick={handleUpgrade}
							className={cn(
								"w-full sm:w-auto flex items-center justify-center gap-2",
								"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white",
								"rounded-full h-11 px-6 font-medium text-sm transition-colors cursor-pointer",
								dmSans125ClassName(),
							)}
						>
							Upgrade to Pro
						</button>
					</div>
				</div>
			)}

			<div
				className={cn(
					"bg-[#14161A] rounded-[14px] p-6 relative overflow-hidden",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				<div
					className={cn(
						"flex flex-col gap-6",
						!hasProProduct && !isLoading && "opacity-30 pointer-events-none",
					)}
				>
					{/* Connected plugins */}
					{connectedPlugins.length > 0 && (
						<div className="flex flex-col gap-3">
							<span
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] text-[#FAFAFA]",
								)}
							>
								Connected Plugins
							</span>
							{connectedPlugins.map((plugin) => {
								const info = PLUGIN_CATALOG[plugin.pluginId]
								return (
									<div
										key={plugin.id}
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
														className={cn(
															dmSans125ClassName(),
															"text-[12px] text-[#00AC3F]",
														)}
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
												onClick={() => handleRevoke(plugin.keyId)}
												className="text-[#737373] hover:text-red-400 transition-colors"
											>
												<Trash2 className="size-4" />
											</button>
										</div>
									</div>
								)
							})}
						</div>
					)}

					{/* Available plugins */}
					<div className="flex flex-col gap-3">
						<span
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[16px] text-[#FAFAFA]",
							)}
						>
							{connectedPlugins.length > 0
								? "Add More Plugins"
								: "Available Plugins"}
						</span>
						<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
							{availablePlugins.map((pluginId) => {
								const plugin = PLUGIN_CATALOG[pluginId]
								if (!plugin) return null

								const isConnected = connectedPluginIds.includes(pluginId)
								const isCurrentlyConnecting = connectingPlugin === pluginId

								return (
									<div
										key={pluginId}
										className={cn(
											"bg-[#0D121A] rounded-[12px] p-4 flex flex-col gap-3 border",
											isConnected
												? "border-[#4BA0FA]/30"
												: "border-[rgba(82,89,102,0.2)]",
										)}
									>
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
												<Image
													alt={plugin.name}
													className="size-6"
													height={24}
													src={plugin.icon}
													width={24}
												/>
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span
														className={cn(
															dmSans125ClassName(),
															"font-medium text-[14px] text-[#FAFAFA]",
														)}
													>
														{plugin.name}
													</span>
													{isConnected && (
														<span className="flex items-center gap-1 text-[10px] text-[#00AC3F] border border-[#00AC3F]/30 rounded-full px-1.5 py-0.5">
															<CheckCircle className="size-2.5" /> Connected
														</span>
													)}
												</div>
												<p
													className={cn(
														dmSans125ClassName(),
														"text-[12px] text-[#737373] mt-0.5",
													)}
												>
													{plugin.description}
												</p>
											</div>
										</div>

										<ul className="space-y-1.5">
											{plugin.features.map((feature) => (
												<li key={feature} className="flex items-start gap-2">
													<ArrowRight className="mt-0.5 size-3 shrink-0 text-[#4BA0FA]" />
													<span
														className={cn(
															dmSans125ClassName(),
															"text-[12px] text-[#8B8B8B]",
														)}
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
											) : (
												<button
													type="button"
													onClick={() =>
														createPluginKeyMutation.mutate(pluginId)
													}
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
															<Loader className="size-3.5 animate-spin" />{" "}
															Connecting...
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
							})}
						</div>
					</div>
				</div>
			</div>

			{/* API Key modal */}
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
