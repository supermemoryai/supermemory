"use client"

import { useAuth } from "@lib/auth-context"
import { useSession } from "@lib/auth"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { useCustomer } from "autumn-js/react"
import { ArrowRight, Loader, XCircle } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

function isValidLocalhostCallback(callback: string): boolean {
	try {
		const url = new URL(callback)
		const isLocalhost =
			url.hostname === "localhost" || url.hostname === "127.0.0.1"
		const isHttp = url.protocol === "http:"
		const isCallbackPath = url.pathname === "/callback"
		return isLocalhost && isHttp && isCallbackPath
	} catch {
		return false
	}
}

interface PluginInfo {
	name: string
	description: string
	features: string[]
	icon: string
}

const PLUGIN_INFO: Record<string, PluginInfo> = {
	claude_code: {
		name: "Claude Code",
		description:
			"Persistent memory for Claude Code. Remembers your coding context, patterns, and decisions across sessions.",
		features: [
			"Auto-recalls relevant context at session start",
			"Captures important observations from tool usage",
			"Builds persistent user profile from interactions",
		],
		icon: "/images/plugins/claude-code.svg",
	},
	opencode: {
		name: "OpenCode",
		description:
			"Memory layer for OpenCode. Enhances your coding assistant with long-term memory capabilities.",
		features: [
			"Semantic search across previous sessions",
			"Auto-capture of coding decisions",
			"Context injection before each prompt",
		],
		icon: "/images/plugins/opencode.svg",
	},
	clawdbot: {
		name: "ClawdBot",
		description:
			"Multi-platform memory for OpenClaw. Works across Telegram, WhatsApp, Discord, Slack and more.",
		features: [
			"Cross-channel memory persistence",
			"Automatic conversation capture",
			"User profile building across platforms",
		],
		icon: "/images/plugins/clawdbot.svg",
	},
	cursor: {
		name: "Cursor",
		description:
			"Memory layer for Cursor. Enhances your AI coding assistant with persistent context.",
		features: [
			"Remembers coding patterns across sessions",
			"Auto-capture of project decisions",
			"Context-aware suggestions",
		],
		icon: "/images/plugins/cursor.svg",
	},
}

function getPluginName(client: string): string {
	return PLUGIN_INFO[client]?.name ?? "External Tool"
}

type Status = "loading" | "creating" | "success" | "error" | "upgrade"

const pageWrapperClass =
	"flex items-center justify-center min-h-screen bg-background p-4"
const cardClass = cn(
	"bg-[#14161A] rounded-[14px] p-6 w-full max-w-[400px]",
	"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
)

function AuthConnectContent() {
	const params = useSearchParams()
	const { data: session, isPending } = useSession()
	const { org } = useAuth()
	const autumn = useCustomer()
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState<string | null>(null)
	const [isUpgrading, setIsUpgrading] = useState(false)

	const callback = params.get("callback")
	const client = params.get("client")
	const validClient = client && client in PLUGIN_INFO ? client : null
	const displayName = validClient ? getPluginName(validClient) : "External Tool"
	const pluginInfo = validClient ? PLUGIN_INFO[validClient] : null

	async function handleConnect() {
		if (!callback) {
			setStatus("error")
			setError("Missing callback parameter.")
			return
		}
		if (!isValidLocalhostCallback(callback)) {
			setStatus("error")
			setError("Invalid callback URL.")
			return
		}
		if (!session || !org) return

		try {
			setStatus("creating")
			const fetchParams = new URLSearchParams({ callback })
			if (validClient) fetchParams.set("client", validClient)

			const res = await fetch(`${API_URL}/v3/auth/key?${fetchParams}`, {
				credentials: "include",
			})

			if (!res.ok) {
				if (res.status === 403) {
					setStatus("upgrade")
					return
				}
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(errorData.message || "Failed to get API key")
			}

			const data = (await res.json()) as { key: string }
			setStatus("success")

			const redirectUrl = new URL(callback)
			redirectUrl.searchParams.set("apikey", data.key)
			window.location.href = redirectUrl.toString()
		} catch (err) {
			console.error("Failed to get API key:", err)
			setStatus("error")
			setError(err instanceof Error ? err.message : "Failed to get API key")
		}
	}

	async function handleUpgrade() {
		try {
			setIsUpgrading(true)
			const safeSuccessUrl = `${window.location.origin}${window.location.pathname}?callback=${encodeURIComponent(callback ?? "")}&client=${encodeURIComponent(validClient ?? "")}`
			await autumn.attach({
				productId: "api_pro",
				successUrl: safeSuccessUrl,
			})
		} catch (err) {
			console.error("Upgrade failed:", err)
			setIsUpgrading(false)
		}
	}

	if (isPending) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<div className="size-6 border-2 border-[#4BA0FA] border-t-transparent rounded-full animate-spin" />
			</div>
		)
	}

	if (status === "loading") {
		return (
			<div className={pageWrapperClass}>
				<div className={cardClass}>
					<div className="flex flex-col items-center gap-5">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
							{pluginInfo ? (
								<Image
									alt={pluginInfo.name}
									className="size-6"
									height={24}
									src={pluginInfo.icon}
									width={24}
								/>
							) : (
								<ArrowRight className="size-5 text-[#4BA0FA]" />
							)}
						</div>
						<div className="text-center">
							<h2
								className={dmSans125ClassName(
									"font-semibold text-[18px] text-[#FAFAFA]",
								)}
							>
								Connect {displayName}
							</h2>
							<p
								className={dmSans125ClassName(
									"text-[13px] text-[#737373] mt-1",
								)}
							>
								{pluginInfo?.description ??
									`Allow ${displayName} to access your Supermemory account.`}
							</p>
						</div>

						{pluginInfo && (
							<ul className="w-full space-y-2.5">
								{pluginInfo.features.map((feature) => (
									<li key={feature} className="flex items-start gap-2.5">
										<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
										<span
											className={dmSans125ClassName(
												"text-[13px] text-[#8B8B8B]",
											)}
										>
											{feature}
										</span>
									</li>
								))}
							</ul>
						)}

						<button
							type="button"
							onClick={handleConnect}
							className={cn(
								"relative w-full h-11 rounded-[10px] flex items-center justify-center",
								"text-[#FAFAFA] font-medium text-[14px] tracking-[-0.14px]",
								"shadow-[0px_2px_10px_rgba(5,1,0,0.2)]",
								"cursor-pointer transition-opacity hover:opacity-90",
								dmSans125ClassName(),
							)}
							style={{
								background:
									"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
								boxShadow:
									"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
							}}
						>
							Approve Connection
							<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (status === "upgrade") {
		return (
			<div className={pageWrapperClass}>
				<div className={cardClass}>
					<div className="flex flex-col items-center gap-5">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
							{pluginInfo ? (
								<Image
									alt={pluginInfo.name}
									className="size-6"
									height={24}
									src={pluginInfo.icon}
									width={24}
								/>
							) : (
								<ArrowRight className="size-5 text-[#4BA0FA]" />
							)}
						</div>
						<div className="text-center">
							<h2
								className={dmSans125ClassName(
									"font-semibold text-[18px] text-[#FAFAFA]",
								)}
							>
								{pluginInfo?.name ?? displayName}
							</h2>
							<p
								className={dmSans125ClassName(
									"text-[13px] text-[#737373] mt-1",
								)}
							>
								{pluginInfo?.description ??
									`A paid plan is required to use ${displayName} with Supermemory.`}
							</p>
						</div>

						{pluginInfo && (
							<ul className="w-full space-y-2.5">
								{pluginInfo.features.map((feature) => (
									<li key={feature} className="flex items-start gap-2.5">
										<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
										<span
											className={dmSans125ClassName(
												"text-[13px] text-[#8B8B8B]",
											)}
										>
											{feature}
										</span>
									</li>
								))}
							</ul>
						)}

						<button
							type="button"
							onClick={handleUpgrade}
							disabled={isUpgrading || autumn.isLoading}
							className={cn(
								"relative w-full h-11 rounded-[10px] flex items-center justify-center",
								"text-[#FAFAFA] font-medium text-[14px] tracking-[-0.14px]",
								"shadow-[0px_2px_10px_rgba(5,1,0,0.2)]",
								"disabled:opacity-60 disabled:cursor-not-allowed",
								"cursor-pointer transition-opacity hover:opacity-90",
								dmSans125ClassName(),
							)}
							style={{
								background:
									"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
								boxShadow:
									"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
							}}
						>
							{isUpgrading || autumn.isLoading ? (
								<>
									<Loader className="size-4 animate-spin mr-2" />
									Upgrading...
								</>
							) : (
								"Upgrade to Pro \u2014 $19/month"
							)}
							<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
						</button>

						<a
							href="https://app.supermemory.ai/?view=integrations/plugins"
							className={dmSans125ClassName(
								"text-[12px] text-[#737373] hover:text-[#FAFAFA] transition-colors",
							)}
						>
							View all plans
						</a>
					</div>
				</div>
			</div>
		)
	}

	if (status === "error") {
		return (
			<div className={pageWrapperClass}>
				<div className={cardClass}>
					<div className="flex flex-col items-center gap-4 text-center">
						<XCircle className="size-10 text-red-400" />
						<div>
							<h2
								className={dmSans125ClassName(
									"font-semibold text-[18px] text-[#FAFAFA]",
								)}
							>
								Connection failed
							</h2>
							<p
								className={dmSans125ClassName(
									"text-[13px] text-[#737373] mt-1",
								)}
							>
								{error}
							</p>
						</div>

						<div className="flex flex-col gap-2 w-full">
							<button
								type="button"
								onClick={() => window.location.reload()}
								className={cn(
									"w-full flex items-center justify-center gap-2 rounded-full h-10 px-4",
									"bg-[#0D121A] border border-[#1E293B] text-[#FAFAFA]",
									"text-[13px] font-medium cursor-pointer transition-colors hover:bg-[#1E293B]",
									dmSans125ClassName(),
								)}
							>
								Try again
							</button>
							<a
								href="https://app.supermemory.ai"
								className={dmSans125ClassName(
									"text-[12px] text-[#737373] hover:text-[#FAFAFA] transition-colors",
								)}
							>
								Go to app
							</a>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<div className="flex flex-col items-center gap-3">
				<div className="size-6 border-2 border-[#4BA0FA] border-t-transparent rounded-full animate-spin" />
				<p className={dmSans125ClassName("text-sm text-[#737373]")}>
					{status === "creating" && `Connecting ${displayName}...`}
					{status === "success" &&
						`Success! Redirecting back to ${displayName}...`}
				</p>
			</div>
		</div>
	)
}

export default function AuthConnectPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen bg-background">
					<div className="size-6 border-2 border-[#4BA0FA] border-t-transparent rounded-full animate-spin" />
				</div>
			}
		>
			<AuthConnectContent />
		</Suspense>
	)
}
