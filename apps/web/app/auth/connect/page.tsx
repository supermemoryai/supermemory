"use client"

import { useAuth } from "@lib/auth-context"
import { useSession } from "@lib/auth"
import { hasActivePlan } from "@lib/queries"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { isFreeTierPlugin } from "@/lib/plugin-catalog"
import { useCustomer } from "autumn-js/react"
import { ArrowRight, Check, Loader, XCircle } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"

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
		icon: "/images/plugins/cursor.svg",
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

function pluginAccessError(client: string): string {
	return `${getPluginName(client)} requires a Pro plan or higher.`
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

function PluginAccessList({
	blockedClients,
	eligibleClients,
}: {
	blockedClients: string[]
	eligibleClients: string[]
}) {
	const rows = [
		...eligibleClients.map((id) => ({ id, state: "eligible" as const })),
		...blockedClients.map((id) => ({ id, state: "blocked" as const })),
	]

	if (rows.length === 0) return null

	return (
		<div className="w-full space-y-2">
			<p
				className={dmSans125ClassName("text-[12px] font-medium text-[#FAFAFA]")}
			>
				Connection summary
			</p>
			<div className="space-y-2">
				{rows.map(({ id, state }) => {
					const plugin = PLUGIN_INFO[id]
					const eligible = state === "eligible"
					return (
						<div className="flex items-center gap-3" key={`${id}-${state}`}>
							{plugin && (
								<Image
									alt=""
									className="size-5 object-contain"
									height={20}
									src={plugin.icon}
									width={20}
								/>
							)}
							<div className="min-w-0 flex-1">
								<div className="flex min-w-0 items-center gap-1.5">
									<p
										className={dmSans125ClassName(
											"truncate text-[13px] text-[#FAFAFA]",
										)}
									>
										{getPluginName(id)}
									</p>
									{eligible && (
										<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-[#24413C] bg-[#0B1717] text-[#8BD8CB]">
											<Check className="size-3" strokeWidth={2} />
										</span>
									)}
									{!eligible && (
										<span
											className={dmSans125ClassName(
												"shrink-0 rounded-full bg-[#4BA0FA]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#8BC6FF]",
											)}
										>
											PRO
										</span>
									)}
								</div>
								<p className={dmSans125ClassName("text-[12px] text-[#737373]")}>
									{eligible
										? "Available on your current plan"
										: "Upgrade required"}
								</p>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
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
	const router = useRouter()
	const { data: session, isPending } = useSession()
	const { org, organizations, isRestoring } = useAuth()
	const autumn = useCustomer()
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState<string | null>(null)
	const [isUpgrading, setIsUpgrading] = useState(false)
	const hasAutoConnectedAfterUpgrade = useRef(false)

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
		() =>
			Array.from(
				new Set(rawRequestedClients.filter((value) => value in PLUGIN_INFO)),
			),
		[rawRequestedClients],
	)
	const invalidClients = useMemo(
		() => rawRequestedClients.filter((value) => !(value in PLUGIN_INFO)),
		[rawRequestedClients],
	)
	const validClient = requestedClients[0] ?? null
	const displayName = formatPluginNames(requestedClients)
	const pluginInfo =
		requestedClients.length === 1 && validClient
			? PLUGIN_INFO[validClient]
			: null
	const hasProProduct = hasActivePlan(autumn.data?.subscriptions, "api_pro")
	const eligibleClients = useMemo(
		() =>
			requestedClients.filter(
				(requestedClient) => hasProProduct || isFreeTierPlugin(requestedClient),
			),
		[hasProProduct, requestedClients],
	)
	const blockedClients = useMemo(
		() =>
			requestedClients.filter(
				(requestedClient) => !eligibleClients.includes(requestedClient),
			),
		[eligibleClients, requestedClients],
	)
	const needsPlanStatus = requestedClients.some(
		(requestedClient) => !isFreeTierPlugin(requestedClient),
	)
	const shouldAutoConnectAfterUpgrade =
		params.get("upgrade_complete") === "true"
	const eligibleDisplayName = formatPluginNames(eligibleClients)
	const blockedDisplayName = formatPluginNames(blockedClients)

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

	const handleConnect = useCallback(async () => {
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
			if (eligibleClients.length === 0) {
				setStatus("upgrade")
				setError(`Upgrade to Pro to connect ${blockedDisplayName}.`)
				return
			}
			if (shouldAutoConnectAfterUpgrade && blockedClients.length > 0) {
				setStatus("upgrade")
				setError(
					"Your plan update is still processing. Please try again in a moment.",
				)
				return
			}

			const fetchParams = new URLSearchParams({ callback })
			fetchParams.set("client", eligibleClients[0] ?? "")

			const res = await fetch(`${API_URL}/v3/auth/key?${fetchParams}`, {
				credentials: "include",
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				if (res.status === 403) {
					setStatus("upgrade")
					setError(
						errorData.message ||
							`Upgrade to Pro to connect ${eligibleDisplayName}.`,
					)
					return
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
							eligibleClients.map((eligibleClient) => [
								eligibleClient,
								data.key,
							]),
						),
					),
				)
				if (blockedClients.length > 0) {
					redirectUrl.searchParams.set(
						"errors",
						encodeBase64UrlJson(
							Object.fromEntries(
								blockedClients.map((blockedClient) => [
									blockedClient,
									pluginAccessError(blockedClient),
								]),
							),
						),
					)
				}
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
	}, [
		blockedClients,
		blockedDisplayName,
		callback,
		eligibleClients,
		eligibleDisplayName,
		hasClientList,
		invalidClients,
		org,
		requestedClients.length,
		session,
		shouldAutoConnectAfterUpgrade,
	])

	async function handleUpgrade() {
		try {
			setIsUpgrading(true)
			const successParams = new URLSearchParams(params.toString())
			successParams.set("upgrade_complete", "true")
			const safeSuccessUrl = `${window.location.origin}${window.location.pathname}?${successParams.toString()}`
			await autumn.attach({
				planId: "api_pro",
				successUrl: safeSuccessUrl,
			})
		} catch (err) {
			console.error("Upgrade failed:", err)
			setIsUpgrading(false)
		}
	}

	// Show a spinner while session/org data is loading or while we're about
	// to redirect to onboarding (prevents a brief flash of the connect card).
	const isAuthLoading =
		isPending ||
		isRestoring ||
		organizations === null ||
		(needsPlanStatus && autumn.isLoading)
	useEffect(() => {
		if (!shouldAutoConnectAfterUpgrade) return
		if (hasAutoConnectedAfterUpgrade.current) return
		if (status !== "loading") return
		if (isAuthLoading || shouldRedirectToOnboarding || !session || !org) return

		hasAutoConnectedAfterUpgrade.current = true
		void handleConnect()
	}, [
		shouldAutoConnectAfterUpgrade,
		status,
		isAuthLoading,
		shouldRedirectToOnboarding,
		session,
		org,
		handleConnect,
	])

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

						{(requestedClients.length > 1 || blockedClients.length > 0) && (
							<PluginAccessList
								blockedClients={blockedClients}
								eligibleClients={eligibleClients}
							/>
						)}

						{requestedClients.length <= 1 &&
						blockedClients.length === 0 &&
						pluginInfo ? (
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
						) : requestedClients.length <= 1 && blockedClients.length === 0 ? (
							<ul className="w-full space-y-2.5">
								<li className="flex items-start gap-2.5">
									<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
									<span
										className={dmSans125ClassName("text-[13px] text-[#8B8B8B]")}
									>
										Share one persistent memory layer across selected coding
										agents.
									</span>
								</li>
								<li className="flex items-start gap-2.5">
									<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
									<span
										className={dmSans125ClassName("text-[13px] text-[#8B8B8B]")}
									>
										Recall project context, coding decisions, and prior
										sessions.
									</span>
								</li>
								<li className="flex items-start gap-2.5">
									<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
									<span
										className={dmSans125ClassName("text-[13px] text-[#8B8B8B]")}
									>
										Keep each connected plugin ready without separate auth
										steps.
									</span>
								</li>
							</ul>
						) : null}

						<div className="flex w-full flex-col items-center gap-2">
							{eligibleClients.length > 0 ? (
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
									{blockedClients.length > 0
										? "Approve available plugins"
										: "Approve Connection"}
									<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</button>
							) : (
								<button
									type="button"
									onClick={handleUpgrade}
									disabled={isUpgrading || autumn.isLoading}
									className={cn(
										"relative w-full h-11 rounded-[10px] flex items-center justify-center",
										"text-[#FAFAFA] font-medium text-[14px] disabled:opacity-60 disabled:cursor-not-allowed",
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
									{isUpgrading || autumn.isLoading ? (
										<>
											<Loader className="size-4 animate-spin mr-2" />
											Upgrading...
										</>
									) : (
										"Upgrade to Pro"
									)}
									<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</button>
							)}

							{eligibleClients.length > 0 && blockedClients.length > 0 && (
								<button
									type="button"
									onClick={handleUpgrade}
									disabled={isUpgrading || autumn.isLoading}
									className={cn(
										"inline-flex min-h-8 items-center justify-center gap-1.5 text-[12px] text-[#737373] hover:text-[#FAFAFA]",
										"disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors",
										dmSans125ClassName(),
									)}
								>
									{isUpgrading || autumn.isLoading ? (
										"Opening upgrade..."
									) : (
										<>
											<Image
												alt=""
												className="size-3.5 rounded-[3px] object-contain opacity-90"
												height={14}
												src="/images/logo.png"
												width={14}
											/>
											<span>{`Upgrade to include ${blockedDisplayName}`}</span>
										</>
									)}
								</button>
							)}
						</div>
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
						<PluginLogoStack
							clients={
								blockedClients.length > 0 ? blockedClients : requestedClients
							}
						/>
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
								{error ??
									pluginInfo?.description ??
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
									Upgrading…
								</>
							) : (
								"Upgrade to Pro \u2014 $19/month"
							)}
							<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
						</button>

						<a
							href="https://app.supermemory.ai/settings#billing"
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
