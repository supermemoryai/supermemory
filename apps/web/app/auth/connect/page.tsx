"use client"

import { useAuth } from "@lib/auth-context"
import { useSession } from "@lib/auth"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { ArrowRight, XCircle } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"

import { PENDING_CONNECT_URL_KEY } from "@/lib/constants"

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
	openclaw: {
		name: "OpenClaw",
		description:
			"Multi-platform memory for OpenClaw. Works across Telegram, WhatsApp, Discord, Slack and more.",
		features: [
			"Cross-channel memory persistence",
			"Automatic conversation capture",
			"User profile building across platforms",
		],
		icon: "/images/plugins/openclaw.svg",
	},
	hermes: {
		name: "Hermes",
		description: "Memory layer for Hermes agent",
		features: [
			"Semantic search across previous sessions",
			"Auto-capture of conversation context",
			"Builds persistent user profile from interactions",
		],
		icon: "/images/plugins/hermes.svg",
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
		icon: "/images/plugins/cursor.png",
	},
	codex: {
		name: "OpenAI Codex",
		description:
			"Persistent memory for OpenAI Codex CLI. Remembers your coding context, patterns, and decisions across sessions.",
		features: [
			"Auto-recalls relevant context before each prompt",
			"Captures coding decisions and patterns automatically",
			"Builds persistent user profile across projects",
		],
		icon: "/images/plugins/codex.png",
	},
}

const MULTI_PLUGIN_FEATURES = [
	"Share one persistent memory layer across selected coding agents.",
	"Recall project context, coding decisions, and prior sessions.",
	"Connect every selected plugin with one approval.",
]

function isKnownPlugin(value: string): boolean {
	return Object.hasOwn(PLUGIN_INFO, value)
}

function getPluginName(client: string): string {
	return PLUGIN_INFO[client]?.name ?? "External Tool"
}

function formatPluginNames(clients: string[]): string {
	const names = clients.map((id) => getPluginName(id))
	if (names.length === 0) return "External Tool"
	if (names.length === 1) return names[0] ?? "External Tool"
	if (names.length === 2) {
		return `${names[0] ?? "External Tool"} and ${names[1] ?? "External Tool"}`
	}

	return `${names.slice(0, -1).join(", ")}, and ${names.at(-1) ?? "External Tool"}`
}

function encodeBase64UrlJson(value: Record<string, string>): string {
	return btoa(JSON.stringify(value))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "")
}

function PluginLogoStack({ clients }: { clients: string[] }) {
	if (clients.length === 0) {
		return (
			<div className="flex size-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
				<ArrowRight className="size-5 text-[#4BA0FA]" />
			</div>
		)
	}

	return (
		<div className="flex items-center justify-center">
			{clients.map((id, index) => {
				const plugin = PLUGIN_INFO[id]
				return (
					<div
						className="-ml-2 flex size-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F] p-2 first:ml-0"
						key={`${id}-${index}`}
						style={{ zIndex: clients.length - index }}
						title={plugin?.name ?? id}
					>
						{plugin ? (
							<Image
								alt={plugin.name}
								className="size-6 object-contain"
								height={24}
								src={plugin.icon}
								width={24}
							/>
						) : (
							<ArrowRight className="size-5 text-[#4BA0FA]" />
						)}
					</div>
				)
			})}
		</div>
	)
}

type Status = "loading" | "creating" | "success" | "error"

const pageWrapperClass =
	"flex items-center justify-center min-h-screen bg-background p-4"
const cardClass = cn(
	"bg-[#14161A] rounded-[14px] p-6 w-full max-w-[400px]",
	"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
)

function AuthConnectContent() {
	const params = useSearchParams()
	const router = useRouter()
	const { data: session, isPending } = useSession()
	const { org, organizations, isRestoring } = useAuth()
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState<string | null>(null)

	const callback = params.get("callback")
	const client = params.get("client")
	const clientsParam = params.get("clients")
	const hasClientList = params.has("clients")
	const rawRequestedClients = useMemo(
		() =>
			(clientsParam !== null ? clientsParam.split(",") : client ? [client] : [])
				.map((value) => value.trim())
				.filter(Boolean),
		[client, clientsParam],
	)
	const requestedClients = useMemo(
		() => Array.from(new Set(rawRequestedClients.filter(isKnownPlugin))),
		[rawRequestedClients],
	)
	const invalidClients = useMemo(
		() => rawRequestedClients.filter((value) => !isKnownPlugin(value)),
		[rawRequestedClients],
	)
	const validClient = requestedClients[0] ?? null
	const displayName = formatPluginNames(requestedClients)
	const pluginInfo =
		requestedClients.length === 1 && validClient
			? PLUGIN_INFO[validClient]
			: null

	// Redirect new users (logged in but no organization) to onboarding.
	// Store the current connect URL so onboarding can redirect back here.
	const shouldRedirectToOnboarding =
		!isPending &&
		!isRestoring &&
		!!session &&
		Array.isArray(organizations) &&
		organizations.length === 0

	useEffect(() => {
		if (isPending || isRestoring) return
		if (!session) return
		if (organizations === null) return // orgs query still pending
		if (organizations.length > 0) return // has orgs, nothing to do

		try {
			sessionStorage.setItem(PENDING_CONNECT_URL_KEY, window.location.href)
		} catch (e) {
			console.warn("Failed to access sessionStorage for pending connect URL", e)
		}
		router.replace("/onboarding")
	}, [isPending, isRestoring, session, organizations, router])

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
		if (invalidClients.length > 0) {
			setStatus("error")
			setError(`Unsupported plugin requested: ${invalidClients.join(", ")}.`)
			return
		}
		if (requestedClients.length === 0) {
			setStatus("error")
			setError("Invalid or missing client.")
			return
		}
		if (!session || !org) {
			setStatus("error")
			setError(
				"Your account is not fully set up yet. Please complete onboarding first.",
			)
			return
		}

		try {
			setStatus("creating")
			const fetchParams = new URLSearchParams({ callback })
			fetchParams.set("client", requestedClients[0] ?? "")

			const res = await fetch(`${API_URL}/v3/auth/key?${fetchParams}`, {
				credentials: "include",
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(errorData.message || "Failed to get API key")
			}

			const data = (await res.json()) as { key: string }
			setStatus("success")

			const redirectUrl = new URL(callback)
			if (hasClientList) {
				redirectUrl.searchParams.set(
					"keys",
					encodeBase64UrlJson(
						Object.fromEntries(
							requestedClients.map((requestedClient) => [
								requestedClient,
								data.key,
							]),
						),
					),
				)
			} else {
				redirectUrl.searchParams.set("apikey", data.key)
			}
			redirectUrl.searchParams.set("api_url", API_URL)
			window.location.href = redirectUrl.toString()
		} catch (err) {
			console.error("Failed to get API key:", err)
			setStatus("error")
			setError(err instanceof Error ? err.message : "Failed to get API key")
		}
	}

	// Show a spinner while session/org data is loading or while we're about
	// to redirect to onboarding (prevents a brief flash of the connect card).
	const isAuthLoading = isPending || isRestoring || organizations === null

	useEffect(() => {
		if (status !== "loading") return
		if (rawRequestedClients.length === 0) {
			setStatus("error")
			setError("Invalid or missing client.")
			return
		}
		if (invalidClients.length > 0) {
			setStatus("error")
			setError(`Unsupported plugin requested: ${invalidClients.join(", ")}.`)
		}
	}, [invalidClients, rawRequestedClients.length, status])

	if (isAuthLoading || shouldRedirectToOnboarding) {
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
						<PluginLogoStack clients={requestedClients} />
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
									(requestedClients.length > 1
										? "Use one Supermemory account across these plugins."
										: `Use your Supermemory account with ${displayName}.`)}
							</p>
						</div>

						<ul className="w-full space-y-2.5">
							{(pluginInfo?.features ?? MULTI_PLUGIN_FEATURES).map(
								(feature) => (
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
								),
							)}
						</ul>

						<button
							type="button"
							onClick={handleConnect}
							className={cn(
								"relative w-full h-11 rounded-[10px] flex items-center justify-center",
								"text-[#FAFAFA] font-medium text-[14px]",
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
								onClick={() => void handleConnect()}
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
					{status === "creating" && `Connecting ${displayName}…`}
					{status === "success" &&
						`Success! Redirecting back to ${displayName}…`}
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
