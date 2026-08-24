"use client"

import { useAuth } from "@lib/auth-context"
import { authClient, useSession } from "@lib/auth"
import { cn } from "@lib/utils"
import { Logo } from "@ui/assets/Logo"
import { dmSans125ClassName } from "@/lib/fonts"
import { ArrowLeft, ArrowRight, LoaderIcon, XCircle } from "lucide-react"
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

type Status = "loading" | "selection" | "approval" | "creating" | "success"

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
	const { organizations, isRestoring } = useAuth()
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState<string | null>(null)
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const [canScrollUp, setCanScrollUp] = useState(false)
	const [canScrollDown, setCanScrollDown] = useState(false)

	const callback = params.get("callback")
	const client = params.get("client")
	const clientsParam = params.get("clients")
	const hasClientList = params.has("clients")
	const isSwitchMode = params.get("mode") === "switch_organization"
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
	const requestError = useMemo(() => {
		if (!callback) return "Missing callback parameter."
		if (!isValidLocalhostCallback(callback)) return "Invalid callback URL."
		if (invalidClients.length > 0) {
			return `Unsupported plugin requested: ${invalidClients.join(", ")}.`
		}
		if (requestedClients.length === 0) return "Invalid or missing client."
		return null
	}, [callback, invalidClients, requestedClients.length])
	const selectedOrg =
		organizations?.find((organization) => organization.id === selectedOrgId) ??
		null
	const multiOrg = (organizations?.length ?? 0) > 1

	const shouldRedirectToOnboarding =
		!requestError &&
		!isPending &&
		!isRestoring &&
		!!session &&
		Array.isArray(organizations) &&
		organizations.length === 0

	useEffect(() => {
		if (requestError || isPending || isRestoring || session) return
		router.replace(
			`/login?redirect=${encodeURIComponent(window.location.href)}`,
		)
	}, [isPending, isRestoring, requestError, router, session])

	useEffect(() => {
		if (requestError) return
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
	}, [isPending, isRestoring, session, organizations, router, requestError])

	useEffect(() => {
		if (requestError || isPending || isRestoring || organizations === null)
			return
		if (!session || organizations.length === 0 || status !== "loading") return
		setStatus("selection")
	}, [requestError, isPending, isRestoring, organizations, session, status])

	useEffect(() => {
		if (status !== "approval" || !selectedOrgId || organizations === null)
			return
		if (
			organizations.some((organization) => organization.id === selectedOrgId)
		) {
			return
		}
		setSelectedOrgId(null)
		setError("That organization is no longer available. Choose another one.")
		setStatus("selection")
	}, [organizations, selectedOrgId, status])

	const measureFades = useCallback((element: HTMLDivElement | null) => {
		if (!element) return
		setCanScrollUp(element.scrollTop > 8)
		setCanScrollDown(
			element.scrollTop + element.clientHeight < element.scrollHeight - 8,
		)
	}, [])

	useEffect(() => {
		if (status !== "selection") return
		measureFades(listRef.current)
	}, [measureFades, status])

	const handleSignOut = useCallback(async () => {
		await authClient.signOut().catch(() => undefined)
		router.replace(
			`/login?redirect=${encodeURIComponent(window.location.href)}`,
		)
	}, [router])

	async function handleConnect(organization = selectedOrg): Promise<void> {
		if (requestError || !callback) return
		if (!session || !organization) {
			setError(
				selectedOrgId
					? "That organization is no longer available. Choose another one."
					: "Select an organization before approving the connection.",
			)
			setStatus(multiOrg ? "selection" : "approval")
			return
		}

		try {
			setError(null)
			setStatus("creating")
			const keyResults = await Promise.allSettled(
				requestedClients.map(async (requestedClient) => {
					const fetchParams = new URLSearchParams({
						callback,
						client: requestedClient,
						orgId: organization.id,
					})
					const res = await fetch(`${API_URL}/v3/auth/key?${fetchParams}`, {
						credentials: "include",
					})

					if (!res.ok) {
						const errorData = (await res.json().catch(() => ({}))) as {
							message?: string
						}
						throw new Error(errorData.message || "Failed to get API key")
					}

					const data = (await res.json()) as {
						key: string
						organization?: { id: string }
					}
					const expectedKeyPrefix = `sm_${organization.id}_`
					if (
						(data.organization && data.organization.id !== organization.id) ||
						!data.key.startsWith(expectedKeyPrefix)
					) {
						throw new Error(
							"The server did not create a key for the selected organization. Try again shortly.",
						)
					}

					return [requestedClient, data.key] as const
				}),
			)
			const keys: Record<string, string> = {}
			const errors: Record<string, string> = {}
			for (const [index, result] of keyResults.entries()) {
				const requestedClient = requestedClients[index]
				if (!requestedClient) continue
				if (result.status === "fulfilled") {
					keys[result.value[0]] = result.value[1]
				} else {
					errors[requestedClient] =
						result.reason instanceof Error
							? result.reason.message
							: "Failed to get API key"
				}
			}

			if (!hasClientList && Object.keys(errors).length > 0) {
				throw new Error(errors[requestedClients[0] ?? ""])
			}
			if (Object.keys(keys).length === 0) {
				throw new Error(
					Object.values(errors)[0] ?? "Failed to get plugin API keys",
				)
			}
			setStatus("success")

			const redirectUrl = new URL(callback)
			if (hasClientList) {
				redirectUrl.searchParams.set("keys", encodeBase64UrlJson(keys))
				if (Object.keys(errors).length > 0) {
					redirectUrl.searchParams.set("errors", encodeBase64UrlJson(errors))
				}
			} else {
				redirectUrl.searchParams.set(
					"apikey",
					keys[requestedClients[0] ?? ""] ?? "",
				)
			}
			redirectUrl.searchParams.set("api_url", API_URL)
			window.location.href = redirectUrl.toString()
		} catch (err) {
			console.error("Failed to get API key:", err)
			setError(err instanceof Error ? err.message : "Failed to get API key")
			setStatus(isSwitchMode ? "selection" : "approval")
		}
	}

	function selectOrganization(
		organization: NonNullable<typeof organizations>[number],
	): void {
		setError(null)
		setSelectedOrgId(organization.id)
		if (isSwitchMode) {
			void handleConnect(organization)
			return
		}
		setStatus("approval")
	}

	const isAuthLoading = isPending || isRestoring || organizations === null

	if (requestError) {
		return (
			<div className={pageWrapperClass}>
				<div className={cardClass}>
					<div className="flex flex-col items-center gap-4 text-center">
						<XCircle className="size-10 text-red-400" />
						<div>
							<h2
								className={dmSans125ClassName(
									"text-[18px] font-semibold text-[#FAFAFA]",
								)}
							>
								Connection failed
							</h2>
							<p
								className={dmSans125ClassName(
									"mt-1 text-[13px] text-[#737373]",
								)}
							>
								{requestError}
							</p>
						</div>
						<a
							className={dmSans125ClassName(
								"text-[12px] text-[#737373] transition-colors hover:text-[#FAFAFA]",
							)}
							href="https://app.supermemory.ai"
						>
							Go to app
						</a>
					</div>
				</div>
			</div>
		)
	}

	if (isAuthLoading || shouldRedirectToOnboarding || status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#08090C]">
				<div className="size-6 animate-spin rounded-full border-2 border-[#4BA0FA] border-t-transparent" />
			</div>
		)
	}

	if (status === "selection") {
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-[#08090C] p-4">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(60% 50% at 50% 0%, rgba(75,160,250,0.05), transparent 70%)",
					}}
				/>
				<div
					className={cn(
						"relative flex w-full max-w-[440px] flex-col",
						dmSans125ClassName(),
					)}
				>
					<div className="pt-2 pb-6 text-center">
						<Logo className="mx-auto h-8 w-auto text-white" />
						<h1 className="mt-6 text-[20px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
							Select an organization
						</h1>
						<p className="mt-3 text-[13px] text-[#737373]">
							Choose which organization to connect {displayName} to.
						</p>
					</div>
					<div className="relative">
						<div
							className="flex max-h-[360px] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
							onScroll={(event) => measureFades(event.currentTarget)}
							ref={listRef}
						>
							{organizations?.map((organization) => (
								<button
									aria-label={`Connect ${displayName} to ${organization.name}`}
									className="flex w-full items-center gap-3 rounded-[12px] bg-[#14161A] px-4 py-3.5 text-left transition-colors hover:bg-[#1B1E25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4BA0FA]"
									key={organization.id}
									onClick={() => selectOrganization(organization)}
									type="button"
								>
									<div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06] text-[14px] font-semibold text-[#FAFAFA]">
										{organization.name.charAt(0).toUpperCase() || "?"}
									</div>
									<span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#FAFAFA]">
										{organization.name}
									</span>
								</button>
							))}
						</div>
						<div
							aria-hidden
							className={cn(
								"pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#08090C] to-transparent transition-opacity duration-300",
								canScrollUp ? "opacity-100" : "opacity-0",
							)}
						/>
						<div
							aria-hidden
							className={cn(
								"pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#08090C] to-transparent transition-opacity duration-300",
								canScrollDown ? "opacity-100" : "opacity-0",
							)}
						/>
					</div>
					{error && (
						<p
							aria-atomic="true"
							className="pt-3 text-center text-[13px] text-red-400"
							role="alert"
						>
							{error}
						</p>
					)}
					<div className="flex flex-col items-center gap-1 pt-6">
						{session?.user.email && (
							<p className="text-[12px] text-[#737373]">
								Signed in as {session.user.email}
							</p>
						)}
						<button
							className="text-[12px] text-[#9AA0A6] transition-colors hover:text-[#FAFAFA]"
							onClick={() => void handleSignOut()}
							type="button"
						>
							Sign out
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (isSwitchMode && status === "creating") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#08090C]">
				<div className="flex flex-col items-center gap-3">
					<div className="size-6 animate-spin rounded-full border-2 border-[#4BA0FA] border-t-transparent" />
					<p className={dmSans125ClassName("text-sm text-[#737373]")}>
						Switching organization…
					</p>
				</div>
			</div>
		)
	}

	if (status === "approval" || status === "creating") {
		const creating = status === "creating"
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-[#08090C] p-4">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(60% 50% at 50% 0%, rgba(75,160,250,0.05), transparent 70%)",
					}}
				/>
				<div
					className={cn(
						"relative flex w-full max-w-[440px] flex-col overflow-hidden rounded-[14px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
						dmSans125ClassName(),
					)}
				>
					<div className="px-6 pt-7 pb-5 text-center">
						<PluginLogoStack clients={requestedClients} />
						<h2 className="mt-5 text-[19px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
							Connect {displayName}
						</h2>
						<p className="mt-1.5 text-[13px] text-[#737373]">
							{pluginInfo?.description ??
								(requestedClients.length > 1
									? "Use one Supermemory account across these plugins."
									: `Use your Supermemory account with ${displayName}.`)}
						</p>
					</div>
					<ul className="space-y-2.5 px-6 pb-5">
						{(pluginInfo?.features ?? MULTI_PLUGIN_FEATURES).map((feature) => (
							<li className="flex items-start gap-2.5" key={feature}>
								<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
								<span className="text-[13px] text-[#8B8B8B]">{feature}</span>
							</li>
						))}
					</ul>
					<div className="mx-6 h-px bg-white/[0.06]" />
					<div className="flex items-center justify-between gap-3 px-6 py-3.5">
						<div className="min-w-0">
							<span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">
								Connecting to
							</span>
							<p className="truncate text-[14px] font-medium text-[#FAFAFA]">
								{selectedOrg?.name ?? "Organization unavailable"}
							</p>
						</div>
						{multiOrg && (
							<button
								className="flex shrink-0 items-center gap-1 rounded-[7px] px-2 py-1.5 text-[12px] text-[#9AA0A6] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:opacity-50"
								disabled={creating}
								onClick={() => {
									setError(null)
									setStatus("selection")
								}}
								type="button"
							>
								<ArrowLeft className="size-3.5" />
								Change
							</button>
						)}
					</div>
					<div className="mx-6 h-px bg-white/[0.06]" />
					{error && (
						<p
							aria-atomic="true"
							className="px-6 pt-4 text-[13px] text-red-400"
							role="alert"
						>
							{error}
						</p>
					)}
					<div className="px-6 pt-4 pb-5">
						<button
							aria-busy={creating}
							aria-label={
								creating ? "Creating connection" : "Approve Connection"
							}
							className="relative flex h-11 w-full cursor-pointer items-center justify-center rounded-[10px] text-[14px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={creating || !selectedOrg}
							onClick={() => void handleConnect()}
							style={{
								background:
									"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
								boxShadow:
									"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
							}}
							type="button"
						>
							{creating ? (
								<>
									<LoaderIcon aria-hidden className="size-4 animate-spin" />
									<span className="sr-only">Creating connection</span>
								</>
							) : (
								"Approve Connection"
							)}
							<div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
						</button>
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
