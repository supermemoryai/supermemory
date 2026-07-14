"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useQueryState } from "nuqs"
import Image from "next/image"
import { Button } from "@ui/components/button"
import { Dialog, DialogClose, DialogContent } from "@ui/components/dialog"
import { GoogleDrive, Granola, Notion, OneDrive } from "@ui/assets/icons"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	AlertTriangle,
	ArrowRight,
	Check,
	ChevronLeft,
	ChevronRight,
	Coins,
	ExternalLink,
	FolderOpen,
	Github,
	LoaderIcon,
	Lock,
	Plus,
	X,
} from "lucide-react"
import {
	AppleShortcutsIcon,
	ChromeIcon,
	RaycastIcon,
} from "@/components/integration-icons"

function XBookmarksIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-4.71-6.23-5.4 6.23H2.74l7.73-8.84L1.25 2.25H8.08l4.25 5.62 5.91-5.62Zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
		</svg>
	)
}

function GrokIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764.102.248-.052.591-.317.736l-2.881 1.586 6.798-.193z" />
		</svg>
	)
}

function GmailIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 256 193"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path
				d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z"
				fill="#4285F4"
			/>
			<path
				d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798z"
				fill="#34A853"
			/>
			<path
				d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.668 33.95-4.668 41.685L128 145.504z"
				fill="#EA4335"
			/>
			<path
				d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z"
				fill="#FBBC04"
			/>
			<path
				d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z"
				fill="#C5221F"
			/>
		</svg>
	)
}
import { cn } from "@lib/utils"
import {
	PLAN_DISPLAY_NAMES,
	PLAN_RANK,
	type PlanType,
	useTokenUsage,
} from "@/hooks/use-token-usage"
import { GranolaConnectModal } from "@/components/granola-connect-modal"
import { dmSans125ClassName } from "@/lib/fonts"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"
import { useConnectorAccess } from "@/hooks/use-connector-access"
import {
	ADD_MEMORY_SHORTCUT_URL,
	CHROME_EXTENSION_URL,
	RAYCAST_EXTENSION_URL,
} from "@lib/constants"
import { useCustomer } from "autumn-js/react"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"
import type { BrainMode } from "./types"

type SourceId =
	| "drive"
	| "notion"
	| "gmail"
	| "github"
	| "onedrive"
	| "granola"
	| "bookmarks"
	| "chatapps"
	| "chrome"
	| "shortcuts"
	| "raycast"
type SourceState = "idle" | "connecting" | "connected" | "waitlist"
type DriveScope = "selective" | "full"
type RequiredPlan = "pro" | "max"

const PROVIDER_TO_SOURCE: Record<string, SourceId> = {
	"google-drive": "drive",
	notion: "notion",
	onedrive: "onedrive",
	granola: "granola",
}

const SOURCE_LABEL: Partial<Record<SourceId, string>> = {
	drive: "Google Drive",
	notion: "Notion",
	onedrive: "OneDrive",
	granola: "Granola",
}

const PLAN_LABELS: Record<RequiredPlan, string> = {
	pro: "Pro",
	max: "Max",
}

const BOOK_CALL_HREF = "https://cal.com/maheshthedev/15min"

type PlanCardDefinition = {
	id: PlanType
	name: string
	price: string
	period: string
	credits: string
	productId: "api_free" | "api_pro" | "api_max" | "api_scale" | "api_enterprise"
	description: string
	includesFrom?: string
	features: string[]
	isContactSales?: boolean
	mostPopular?: boolean
}

type CheckoutPlanId = Extract<
	PlanCardDefinition["productId"],
	"api_pro" | "api_max" | "api_scale"
>

const PLAN_CARDS: PlanCardDefinition[] = [
	{
		id: "pro",
		name: "Pro",
		price: "$19",
		period: "/mo",
		credits: "$20",
		productId: "api_pro",
		description: "For people building with AI memory",
		features: [
			"Auto top-up when balance runs low",
			"All plugins (Claude Code, Cursor, Hermes...)",
			"Priority support",
		],
	},
	{
		id: "max",
		name: "Max",
		price: "$100",
		period: "/mo",
		credits: "$130",
		productId: "api_max",
		description: "For power users who outgrow Pro",
		includesFrom: "Pro",
		mostPopular: true,
		features: ["6x the credits of Pro", "Gmail connector", "Priority support"],
	},
	{
		id: "scale",
		name: "Scale",
		price: "$399",
		period: "/mo",
		credits: "$600",
		productId: "api_scale",
		description: "For teams and production workloads",
		includesFrom: "Max",
		features: [
			"Auto top-up & spend caps",
			"S3 & Web Crawler connectors",
			"Dedicated support",
		],
	},
	{
		id: "enterprise",
		name: "Enterprise",
		price: "Custom",
		period: "",
		credits: "Unlimited",
		productId: "api_enterprise",
		description: "Custom deployments with dedicated engineering",
		includesFrom: "Scale",
		features: [
			"Custom metering & billing",
			"Custom integrations & SSO",
			"Forward-deployed engineer",
		],
		isContactSales: true,
	},
]

const PLAN_CARD_SCROLL_STEP = 406

const countsAsConnected = (state: SourceState | undefined) =>
	state === "connected" || state === "waitlist"

export interface SourcesValues {
	connected: Partial<Record<SourceId, SourceState>>
	driveScope: DriveScope
}

interface Props {
	containerTag: string
	mode: BrainMode
	values: SourcesValues
	onChange: (next: SourcesValues) => void
	onContinue: () => void
}

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

function ChatAppsIconCluster() {
	const tileClass =
		"absolute flex size-[28px] items-center justify-center rounded-[10px] border border-white/10 bg-[#0D1117] shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
	const imageClass = "size-4 object-contain"

	return (
		<div className="relative size-10" aria-hidden="true">
			<span className={cn(tileClass, "right-[17px] top-[4px] z-30")}>
				<span className="flex size-[22px] items-center justify-center rounded-[8px] bg-[#48636B]">
					<Image
						src="/mcp-supported-tools/chatgpt.png"
						alt=""
						width={14}
						height={14}
						className={imageClass}
					/>
				</span>
			</span>
			<span className={cn(tileClass, "right-[5px] top-[4px] z-20")}>
				<span className="flex size-[22px] items-center justify-center rounded-[8px] bg-[#211A18]">
					<Image
						src="/mcp-supported-tools/claude.png"
						alt=""
						width={14}
						height={14}
						className={imageClass}
					/>
				</span>
			</span>
			<span className={cn(tileClass, "right-[-7px] top-[4px] z-10")}>
				<span className="flex size-[22px] items-center justify-center rounded-[8px] bg-[#0D1117]">
					<GrokIcon className="size-5 translate-x-[0.5px] -translate-y-[0.5px] text-[#fafafa]" />
				</span>
			</span>
		</div>
	)
}

export function StepSources({
	containerTag,
	mode,
	values,
	onChange,
	onContinue,
}: Props) {
	const [moreOpen, setMoreOpen] = useState(false)
	const [plansOpen, setPlansOpen] = useState(false)
	const [granolaOpen, setGranolaOpen] = useState(false)
	const [requestedPlan, setRequestedPlan] = useState<RequiredPlan>("pro")
	const [requestedConnector, setRequestedConnector] = useState("This connector")
	const { hasMax, connectorAccess, loading: planLoading } = useConnectorAccess()
	const { org, isRestoring } = useAuth()

	useEffect(() => {
		setMoreOpen(false)
	}, [])

	const valuesRef = useRef(values)
	valuesRef.current = values
	// dedupe toasts across the param + reconcile paths
	const announced = useRef(new Set<SourceId>())
	const seeded = useRef(false)

	const markConnected = (ids: SourceId[]) => {
		const current = valuesRef.current
		const updates: Partial<Record<SourceId, SourceState>> = {}
		for (const id of ids) {
			if (current.connected[id] !== "connected") updates[id] = "connected"
		}
		if (Object.keys(updates).length > 0) {
			onChange({
				...current,
				connected: { ...current.connected, ...updates },
			})
		}
	}

	// keyed by org so it re-runs once the active org restores on reload
	const { data: liveConnections, refetch: refetchConnections } = useQuery({
		queryKey: ["onboarding-connections", org?.id],
		queryFn: async () => {
			const res = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (res.error) return [] as Array<{ provider?: string }>
			return (res.data ?? []) as Array<{ provider?: string }>
		},
		enabled: !isRestoring && !!org?.id,
		staleTime: 10_000,
		refetchOnWindowFocus: true,
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: reconcile on fetched connections only
	useEffect(() => {
		if (!liveConnections) return
		const ids = liveConnections
			.map((c) => (c.provider ? PROVIDER_TO_SOURCE[c.provider] : undefined))
			.filter((id): id is SourceId => Boolean(id))
		markConnected(ids)
		// first load: seed without toasting pre-existing connections
		if (!seeded.current) {
			seeded.current = true
			for (const id of ids) announced.current.add(id)
			return
		}
		for (const id of ids) {
			if (!announced.current.has(id)) {
				announced.current.add(id)
				toast.success(`${SOURCE_LABEL[id] ?? "Source"} connected`)
			}
		}
	}, [liveConnections])

	// Post-OAuth redirect lands with ?connected=<provider> — confirm it instantly.
	const [connectedParam, setConnectedParam] = useQueryState("connected")
	// biome-ignore lint/correctness/useExhaustiveDependencies: run when the param arrives
	useEffect(() => {
		if (!connectedParam) return
		const id = PROVIDER_TO_SOURCE[connectedParam]
		if (id) {
			markConnected([id])
			if (!announced.current.has(id)) {
				announced.current.add(id)
				toast.success(`${SOURCE_LABEL[id] ?? "Source"} connected`)
			}
		}
		setConnectedParam(null)
		const t1 = setTimeout(() => void refetchConnections(), 1500)
		const t2 = setTimeout(() => void refetchConnections(), 4000)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
		}
	}, [connectedParam])

	// company_brain unlocks pro connectors; max stays gated
	const isLocked = (plan?: RequiredPlan) => {
		if (!plan || planLoading) return false
		if (plan === "max") return !hasMax
		return !connectorAccess
	}

	const setState = (id: SourceId, state: SourceState) => {
		onChange({ ...values, connected: { ...values.connected, [id]: state } })
	}

	const connectRealProvider = async (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => {
		analytics.onboardingIntegrationClicked({ integration: provider })
		setState(id, "connecting")
		try {
			const metadata: Record<string, string> = {}
			if (provider === "google-drive") {
				metadata.scope = values.driveScope
			}
			const res = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [containerTag],
					metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				},
			})
			const data = "data" in res ? res.data : null
			if (data && "authLink" in data && data.authLink) {
				window.location.href = data.authLink
				return
			}
			throw new Error("No auth link returned")
		} catch (err) {
			setState(id, "idle")
			toast.error(
				err instanceof Error ? err.message : "Could not start connection",
			)
		}
	}

	const openExternal = (id: SourceId, url: string) => {
		analytics.onboardingIntegrationClicked({ integration: id })
		window.open(url, "_blank", "noopener,noreferrer")
		setState(id, "connected")
	}

	const requestWaitlist = (id: SourceId) => {
		analytics.onboardingIntegrationClicked({ integration: id })
		setState(id, "waitlist")
	}

	const guard = (
		plan: RequiredPlan | undefined,
		title: string,
		fn: () => void,
	) => {
		return () => {
			if (isLocked(plan) && plan) {
				setRequestedPlan(plan)
				setRequestedConnector(title)
				setPlansOpen(true)
				return
			}
			fn()
		}
	}

	const connectedCount = Object.values(values.connected).filter(
		countsAsConnected,
	).length

	const handleContinue = () => {
		analytics.onboardingSourcesCompleted({ connected_count: connectedCount })
		onContinue()
	}

	return (
		<div className="mx-auto w-full max-w-[1400px] pb-10">
			<section className="relative min-h-[calc(100dvh-136px)] py-4">
				<div className="absolute inset-x-0 top-[46%] -translate-y-1/2">
					<div className="mb-6 px-1">
						<p
							className={cn(
								"font-semibold text-[#fafafa] text-[22px]",
								dmSans125ClassName(),
							)}
						>
							{mode === "personal"
								? "Bring your context together"
								: "Connect your team's signals"}
						</p>
						<p className="text-[#737373] font-medium text-[15px] leading-[1.4] mt-1.5">
							Start with the sources that carry the most context. Add more
							anytime.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-4">
						{mode === "personal" ? (
							<>
								<SourceCard
									title="Import bookmarks"
									blurb="One-shot import of your saved tweets."
									icon={<XBookmarksIcon className="size-6 text-[#fafafa]" />}
									state={values.connected.bookmarks ?? "idle"}
									ctaLabel="Connect"
									doneLabel="Opened"
									perks={[
										"Bookmarks become searchable memories",
										"One-click import from the X bookmarks tab",
										"Works via the Chrome extension",
									]}
									onConnect={() =>
										openExternal("bookmarks", CHROME_EXTENSION_URL)
									}
								/>
								<SourceCard
									title="Import from AI chat apps"
									blurb="Bring memories from ChatGPT, Claude, Grok & more."
									icon={<ChatAppsIconCluster />}
									bareIconFrame
									state={values.connected.chatapps ?? "idle"}
									ctaLabel="Connect"
									doneLabel="Opened"
									perks={[
										"Sync your ChatGPT memories",
										"Carry context across every assistant",
										"Import once, recall anywhere",
									]}
									onConnect={() =>
										openExternal("chatapps", CHROME_EXTENSION_URL)
									}
								/>
								<NotionSourceCard
									mode={mode}
									values={values}
									isLocked={isLocked}
									guard={guard}
									connectRealProvider={connectRealProvider}
								/>
							</>
						) : (
							<>
								<NotionSourceCard
									mode={mode}
									values={values}
									isLocked={isLocked}
									guard={guard}
									connectRealProvider={connectRealProvider}
								/>
								<GranolaSourceCard
									state={values.connected.granola ?? "idle"}
									isLocked={isLocked}
									guard={guard}
									onOpen={() => setGranolaOpen(true)}
								/>
								<GoogleDriveSourceCard
									mode={mode}
									values={values}
									onChange={onChange}
									isLocked={isLocked}
									guard={guard}
									connectRealProvider={connectRealProvider}
								/>
							</>
						)}
					</div>

					<div className="absolute left-0 right-0 top-full mt-6 px-1">
						<div className="flex items-center justify-between gap-3">
							<button
								type="button"
								onClick={() => setMoreOpen((open) => !open)}
								className="text-[#737373] font-medium text-[14px] hover:text-[#fafafa] inline-flex items-center gap-1.5 transition-colors"
							>
								<Plus
									className={cn(
										"size-3.5 transition-transform duration-200",
										moreOpen && "rotate-45",
									)}
								/>
								More integrations
								<span className="text-[#525D6E]">
									(Gmail, GitHub, OneDrive…)
								</span>
							</button>
							<SourceActions
								connectedCount={connectedCount}
								onContinue={handleContinue}
								className="mt-0 px-0"
							/>
						</div>

						{moreOpen ? (
							<div className="mt-10 grid md:grid-cols-3 gap-4">
								<MoreSourcesGrid
									mode={mode}
									values={values}
									onChange={onChange}
									isLocked={isLocked}
									guard={guard}
									openExternal={openExternal}
									requestWaitlist={requestWaitlist}
									connectRealProvider={connectRealProvider}
									onOpenGranola={() => setGranolaOpen(true)}
								/>
							</div>
						) : null}
					</div>
				</div>
			</section>

			{moreOpen && <div className="h-[860px] md:h-[680px]" aria-hidden />}
			<OnboardingPlansModal
				open={plansOpen}
				onOpenChange={setPlansOpen}
				requestedConnector={requestedConnector}
				requestedPlan={requestedPlan}
			/>
			<GranolaConnectModal
				open={granolaOpen}
				onOpenChange={setGranolaOpen}
				containerTags={[containerTag]}
				onSuccess={() => {
					announced.current.add("granola")
					markConnected(["granola"])
				}}
			/>
		</div>
	)
}

function OnboardingPlansModal({
	open,
	onOpenChange,
	requestedConnector,
	requestedPlan,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	requestedConnector: string
	requestedPlan: RequiredPlan
}) {
	const autumn = useCustomer()
	const { currentPlan, isLoading } = useTokenUsage(autumn)
	const [upgradingPlan, setUpgradingPlan] = useState<CheckoutPlanId | null>(
		null,
	)
	const [planIndex, setPlanIndex] = useState(0)
	const lastPlanIndex = Math.max(0, PLAN_CARDS.length - 2)

	useEffect(() => {
		if (open) {
			setPlanIndex(0)
		}
	}, [open])

	const handleUpgrade = async (planId: CheckoutPlanId) => {
		setUpgradingPlan(planId)
		try {
			const result = await autumn.attach({
				planId,
				successUrl: window.location.href,
			})
			if ((result as { paymentUrl?: string })?.paymentUrl) {
				window.location.href = (result as { paymentUrl: string }).paymentUrl
				return
			}
			autumn.refetch?.()
		} catch (error) {
			console.error(error)
			toast.error("Failed to start checkout. Please try again.")
		} finally {
			setUpgradingPlan(null)
		}
	}

	const scrollPlans = (direction: -1 | 1) => {
		setPlanIndex((index) =>
			Math.min(lastPlanIndex, Math.max(0, index + direction)),
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[min(820px,calc(100dvh-32px))] w-[calc(100vw-48px)] max-w-[900px] overflow-x-hidden overflow-y-auto rounded-[18px] border border-white/[0.08] bg-[#1B1F24] p-0 text-[#FAFAFA] shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:max-w-[900px]"
			>
				<div className="sticky top-0 z-10 border-white/[0.08] border-b bg-[#1B1F24]/95 px-5 py-4 pr-[150px] backdrop-blur">
					<div>
						<p
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[22px] text-[#FAFAFA]",
							)}
						>
							Choose a plan
						</p>
					</div>
					<div className="absolute top-4 right-5 flex items-center gap-2">
						<button
							type="button"
							onClick={() => scrollPlans(-1)}
							disabled={planIndex === 0}
							className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#14161A] text-[#A3A3A3] transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
							aria-label="Show previous plans"
						>
							<ChevronLeft className="size-4" />
						</button>
						<button
							type="button"
							onClick={() => scrollPlans(1)}
							disabled={planIndex === lastPlanIndex}
							className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#14161A] text-[#A3A3A3] transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
							aria-label="Show next plans"
						>
							<ChevronRight className="size-4" />
						</button>
						<DialogClose asChild>
							<button
								type="button"
								className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#14161A] text-[#737373] transition-colors hover:text-[#FAFAFA]"
								aria-label="Close plans"
							>
								<X className="size-4" />
							</button>
						</DialogClose>
					</div>
					<div>
						<p className="mt-1 text-[13px] text-[#A3A3A3]">
							{requestedConnector} requires{" "}
							<span className="font-semibold text-[#FAFAFA]">
								{PLAN_LABELS[requestedPlan]}
							</span>
							.
						</p>
					</div>
				</div>

				<div className="overflow-hidden p-6">
					<div className="overflow-hidden pb-1">
						<div
							className="flex gap-4 pr-12 transition-transform duration-300 ease-out"
							style={{
								transform: `translateX(-${planIndex * PLAN_CARD_SCROLL_STEP}px)`,
							}}
						>
							{PLAN_CARDS.map((plan) => {
								const isCurrent = currentPlan === plan.id
								const isIncluded =
									!isCurrent && PLAN_RANK[currentPlan] > PLAN_RANK[plan.id]
								const isBusy = upgradingPlan === plan.productId
								const checkoutPlanId =
									plan.productId === "api_pro" ||
									plan.productId === "api_max" ||
									plan.productId === "api_scale"
										? plan.productId
										: null

								return (
									<div
										key={plan.id}
										className="w-[390px] max-w-[calc(100vw-96px)] shrink-0"
									>
										<OnboardingPlanCard
											plan={plan}
											action={
												plan.isContactSales ? (
													<a
														href={BOOK_CALL_HREF}
														target="_blank"
														rel="noreferrer"
														className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-white text-[13px] font-semibold text-[#14161A] transition-colors hover:bg-[#E6EDF5]"
													>
														Book a call
														<ExternalLink className="size-3.5" />
													</a>
												) : (
													<Button
														variant="default"
														disabled={
															isLoading ||
															isCurrent ||
															isIncluded ||
															upgradingPlan !== null
														}
														onClick={() => {
															if (checkoutPlanId) {
																handleUpgrade(checkoutPlanId)
															}
														}}
														className={cn(
															"h-10 w-full rounded-[10px] bg-[#0A65CC] text-[13px] font-semibold text-white hover:bg-[#0B72E7]",
															(isCurrent || isIncluded) &&
																"bg-white/[0.04] text-[#737373] hover:bg-white/[0.04]",
														)}
													>
														{isBusy ? (
															<LoaderIcon className="size-4 animate-spin" />
														) : isCurrent ? (
															"Your current plan"
														) : isIncluded ? (
															`Included with ${PLAN_DISPLAY_NAMES[currentPlan]}`
														) : checkoutPlanId ? (
															`Upgrade to ${plan.name}`
														) : (
															"Your current plan"
														)}
													</Button>
												)
											}
										/>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function OnboardingPlanCard({
	action,
	plan,
}: {
	action: React.ReactNode
	plan: PlanCardDefinition
}) {
	return (
		<div
			className={cn(
				"relative flex h-full min-h-[390px] min-w-0 flex-col overflow-hidden rounded-[14px] border p-5",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				plan.mostPopular
					? "border-[#4BA0FA]/40 bg-[#14161A]"
					: "border-white/[0.08] bg-[#14161A]",
			)}
		>
			{plan.mostPopular ? (
				<span className="absolute right-5 top-5 inline-flex h-[18px] items-center rounded-[3px] bg-[#4BA0FA] px-1.5 text-[10px] font-bold uppercase tracking-[0.36px] text-[#00171A]">
					Most popular
				</span>
			) : null}
			<p className="font-mono font-medium text-[#737373] text-[10px] uppercase tracking-[0.18em]">
				{plan.name}
			</p>

			<div className="mt-3 flex items-baseline gap-1">
				<span
					className={cn(
						dmSans125ClassName(),
						"font-bold text-[#FAFAFA] text-[34px] leading-none tracking-[-0.34px] tabular-nums",
					)}
				>
					{plan.price}
				</span>
				{plan.period ? (
					<span className="text-[#737373] text-[13px]">{plan.period}</span>
				) : null}
			</div>

			<p
				className={cn(
					dmSans125ClassName(),
					"mt-2 text-[#A3A3A3] text-[13px] leading-snug",
				)}
			>
				{plan.description}
			</p>

			{plan.isContactSales ? null : (
				<div className="mt-5 flex items-center gap-2 rounded-[8px] bg-white/[0.04] px-3 py-2.5 text-[#A3A3A3]">
					<Coins className="size-3.5 shrink-0 text-[#737373]" />
					<div className="min-w-0">
						<p className="font-semibold text-[#C8D0DA] text-[12px] leading-none tabular-nums">
							{plan.credits}
						</p>
						<p className="mt-0.5 text-[#737373] text-[10px] leading-none">
							of usage included
						</p>
					</div>
				</div>
			)}

			{plan.includesFrom ? (
				<div className="mt-5 flex items-center gap-3">
					<div className="h-px flex-1 bg-white/[0.08]" />
					<span className="whitespace-nowrap text-[#737373] text-[10px]">
						Everything in {plan.includesFrom}, plus
					</span>
					<div className="h-px flex-1 bg-white/[0.08]" />
				</div>
			) : null}

			<ul
				className={cn(
					"mb-6 flex flex-1 flex-col gap-3",
					plan.includesFrom ? "mt-5" : "mt-5",
					plan.isContactSales && !plan.includesFrom && "mt-7",
				)}
			>
				{plan.features.map((feature) => (
					<li
						className="flex items-start gap-2 text-[#C8D0DA] text-[13px] leading-snug"
						key={feature}
					>
						<Check className="mt-0.5 size-3.5 shrink-0 text-[#737373]" />
						<span>{feature}</span>
					</li>
				))}
			</ul>

			{action}
		</div>
	)
}

function SourceActions({
	connectedCount,
	onContinue,
	className,
}: {
	connectedCount: number
	onContinue: () => void
	className?: string
}) {
	return (
		<div
			className={cn(
				"mt-6 flex items-center justify-end gap-[22px] px-1",
				className,
			)}
		>
			<button
				type="button"
				onClick={onContinue}
				className="text-[#737373] font-medium text-[14px] hover:text-[#999] transition-colors"
			>
				Skip for now
			</button>
			<Button
				variant="insideOut"
				onClick={onContinue}
				disabled={connectedCount === 0}
				className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
			>
				Continue
				{connectedCount > 0 && (
					<span className="text-[#4BA0FA] ml-1">({connectedCount})</span>
				)}
				<ArrowRight className="size-3.5" />
			</Button>
		</div>
	)
}

function GoogleDriveSourceCard({
	mode,
	values,
	onChange,
	isLocked,
	guard,
	connectRealProvider,
}: {
	mode: BrainMode
	values: SourcesValues
	onChange: (next: SourcesValues) => void
	isLocked: (plan?: RequiredPlan) => boolean
	guard: (
		plan: RequiredPlan | undefined,
		title: string,
		fn: () => void,
	) => () => void
	connectRealProvider: (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => void
}) {
	return (
		<SourceCard
			title="Google Drive"
			blurb="Docs, sheets, slides — the working memory of your team."
			icon={<GoogleDrive className="size-7" />}
			state={values.connected.drive ?? "idle"}
			ctaLabel="Connect"
			locked={isLocked("pro")}
			requiredPlan="pro"
			perks={[
				"Docs, sheets, slides — all parsed",
				"Stays in sync as files change",
				"You pick what to share at sign-in",
			]}
			onConnect={guard("pro", "Google Drive", () =>
				connectRealProvider("google-drive", "drive"),
			)}
			headerNote={
				values.driveScope === "full" ? (
					<p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#FF8A47] font-medium">
						<AlertTriangle className="size-3 shrink-0" />
						Full Drive can exhaust your monthly usage.
					</p>
				) : null
			}
			footerLeft={
				<DriveScopePicker
					value={values.driveScope}
					onChange={(s) => onChange({ ...values, driveScope: s })}
				/>
			}
			footerRight={
				<SpaceChip name={mode === "team" ? "Team Brain" : "My Brain"} />
			}
		/>
	)
}

function NotionSourceCard({
	mode,
	values,
	isLocked,
	guard,
	connectRealProvider,
}: {
	mode: BrainMode
	values: SourcesValues
	isLocked: (plan?: RequiredPlan) => boolean
	guard: (
		plan: RequiredPlan | undefined,
		title: string,
		fn: () => void,
	) => () => void
	connectRealProvider: (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => void
}) {
	return (
		<SourceCard
			title="Notion"
			blurb="Pages, databases, the team's running wiki."
			icon={<Notion className="size-7" />}
			state={values.connected.notion ?? "idle"}
			ctaLabel="Connect"
			locked={isLocked("pro")}
			requiredPlan="pro"
			perks={[
				"Pages and database rows",
				"Stays in sync when you edit",
				"Pick which workspaces ingest",
			]}
			onConnect={guard("pro", "Notion", () =>
				connectRealProvider("notion", "notion"),
			)}
			footerRight={
				<SpaceChip name={mode === "team" ? "Team Brain" : "My Brain"} />
			}
		/>
	)
}

function GranolaSourceCard({
	state,
	isLocked,
	guard,
	onOpen,
}: {
	state: SourceState
	isLocked: (plan?: RequiredPlan) => boolean
	guard: (
		plan: RequiredPlan | undefined,
		title: string,
		fn: () => void,
	) => () => void
	onOpen: () => void
}) {
	return (
		<SourceCard
			title="Granola"
			blurb="Meeting notes into searchable decisions."
			icon={<Granola className="size-6" />}
			state={state}
			ctaLabel="Connect"
			locked={isLocked("pro")}
			requiredPlan="pro"
			perks={[
				"Meeting notes auto-captured",
				"Decisions and action items extracted",
				"Synced after every meeting",
			]}
			onConnect={guard("pro", "Granola", () => {
				analytics.onboardingIntegrationClicked({ integration: "granola" })
				onOpen()
			})}
		/>
	)
}

function MoreSourcesGrid({
	mode,
	values,
	onChange,
	isLocked,
	guard,
	openExternal,
	requestWaitlist,
	connectRealProvider,
	onOpenGranola,
}: {
	mode: BrainMode
	values: SourcesValues
	onChange: (next: SourcesValues) => void
	isLocked: (plan?: RequiredPlan) => boolean
	guard: (
		plan: RequiredPlan | undefined,
		title: string,
		fn: () => void,
	) => () => void
	openExternal: (id: SourceId, url: string) => void
	requestWaitlist: (id: SourceId) => void
	connectRealProvider: (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => void
	onOpenGranola: () => void
}) {
	return (
		<>
			<SourceCard
				title="Raycast"
				blurb="Quick add from your Mac."
				icon={<RaycastIcon className="size-7" />}
				state={values.connected.raycast ?? "idle"}
				ctaLabel="Connect"
				doneLabel="Opened"
				perks={[
					"Add memories without leaving Raycast",
					"Search your brain from anywhere",
					"Fast keyboard-first capture",
				]}
				onConnect={() => openExternal("raycast", RAYCAST_EXTENSION_URL)}
			/>
			<SourceCard
				title="Apple Shortcuts"
				blurb="One-tap capture from iPhone."
				icon={<AppleShortcutsIcon />}
				state={values.connected.shortcuts ?? "idle"}
				ctaLabel="Connect"
				doneLabel="Opened"
				perks={[
					"Save from the iOS share sheet",
					"Capture text, links and photos",
					"Works on iPhone, iPad and Mac",
				]}
				onConnect={() => openExternal("shortcuts", ADD_MEMORY_SHORTCUT_URL)}
			/>
			<SourceCard
				title="Chrome extension"
				blurb="Save pages and clip from the browser."
				icon={<ChromeIcon className="size-7" />}
				state={values.connected.chrome ?? "idle"}
				ctaLabel="Connect"
				doneLabel="Opened"
				perks={[
					"Save any page in one click",
					"Import your X bookmarks",
					"Sync ChatGPT memories",
				]}
				onConnect={() => openExternal("chrome", CHROME_EXTENSION_URL)}
			/>
			{mode === "personal" ? (
				<GoogleDriveSourceCard
					mode={mode}
					values={values}
					onChange={onChange}
					isLocked={isLocked}
					guard={guard}
					connectRealProvider={connectRealProvider}
				/>
			) : null}
			<SourceCard
				title="OneDrive"
				blurb="Office docs from OneDrive."
				icon={<OneDrive className="size-7" />}
				state={values.connected.onedrive ?? "idle"}
				ctaLabel="Connect"
				locked={isLocked("pro")}
				requiredPlan="pro"
				perks={[
					"Word, Excel, PowerPoint — all parsed",
					"Stays in sync as files change",
					"You pick what to share at sign-in",
				]}
				onConnect={guard("pro", "OneDrive", () =>
					connectRealProvider("onedrive", "onedrive"),
				)}
			/>
			<SourceCard
				title="Gmail"
				blurb="Inbox threads, decisions, customer conversations."
				icon={<GmailIcon className="size-6" />}
				state={values.connected.gmail ?? "idle"}
				ctaLabel="Connect"
				locked={isLocked("max")}
				requiredPlan="max"
				perks={[
					"Threads become searchable context",
					"Decisions and follow-ups surfaced",
					"You control which labels sync",
				]}
				onConnect={guard("max", "Gmail", () => requestWaitlist("gmail"))}
			/>
			<SourceCard
				title="GitHub"
				blurb="PRs, issues, READMEs — every code decision searchable."
				icon={<Github className="size-6 text-[#fafafa]" />}
				state={values.connected.github ?? "idle"}
				ctaLabel="Connect"
				locked={isLocked("max")}
				requiredPlan="max"
				perks={[
					"PRs and issues parsed",
					"READMEs and docs indexed",
					"Stays in sync with new activity",
				]}
				onConnect={guard("max", "GitHub", () => requestWaitlist("github"))}
			/>
			{mode === "personal" ? (
				<GranolaSourceCard
					state={values.connected.granola ?? "idle"}
					isLocked={isLocked}
					guard={guard}
					onOpen={onOpenGranola}
				/>
			) : null}
		</>
	)
}

function SourceCard({
	title,
	blurb,
	icon,
	state,
	ctaLabel,
	doneLabel,
	perks,
	bareIconFrame,
	disabled,
	locked,
	requiredPlan,
	headerNote,
	footerLeft,
	footerRight,
	onConnect,
}: {
	title: string
	blurb: string
	icon: React.ReactNode
	state: SourceState
	ctaLabel: string
	doneLabel?: string
	perks: string[]
	bareIconFrame?: boolean
	disabled?: boolean
	locked?: boolean
	requiredPlan?: RequiredPlan
	headerNote?: React.ReactNode
	footerLeft?: React.ReactNode
	footerRight?: React.ReactNode
	onConnect: () => void
}) {
	const isDone = state === "connected" || state === "waitlist"

	return (
		<div
			className={cn(
				"min-h-[190px] rounded-[18px] p-5 transition-colors bg-[#1B1F24] flex flex-col",
				isDone && "ring-1 ring-[#2261CA33]",
			)}
			style={modalCardStyle}
		>
			<div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3">
				<div className="pt-0.5">
					<div
						className={cn(
							"size-12 rounded-[12px] flex items-center justify-center shrink-0",
							bareIconFrame
								? "bg-transparent border border-transparent"
								: "bg-[#14161A] border border-[rgba(82,89,102,0.2)]",
						)}
						style={bareIconFrame ? undefined : inputBevelStyle}
					>
						{icon}
					</div>
				</div>
				<div className="min-w-0 pr-1">
					<p className="text-[15px] leading-tight font-semibold text-[#fafafa]">
						{title}
					</p>
					<p className="text-[12px] text-[#737373] mt-1 leading-[1.35] font-medium">
						{blurb}
					</p>
					{headerNote}
				</div>
				{isDone ? (
					<span className="inline-flex items-center gap-1.5 rounded-full border border-[#2261CA55] bg-[#2261CA1A] px-2.5 py-1 text-[12px] font-semibold text-[#4BA0FA] shrink-0 mt-0.5">
						<Check className="size-3.5" />
						{state === "waitlist" ? "Requested" : (doneLabel ?? "Connected")}
					</span>
				) : (
					<Button
						variant="insideOut"
						onClick={onConnect}
						disabled={state === "connecting" || disabled}
						title={
							locked && requiredPlan
								? `Requires the ${PLAN_LABELS[requiredPlan]} plan`
								: undefined
						}
						className={cn(
							"shrink-0 rounded-full h-9 px-4 text-[13px] font-medium text-[#fafafa] gap-1.5",
							disabled && "opacity-50",
						)}
					>
						{state === "connecting" ? (
							"Opening…"
						) : (
							<>
								{ctaLabel}
								{locked && <Lock className="size-3 text-[#8B8B8B]" />}
							</>
						)}
					</Button>
				)}
			</div>

			<ul className="mt-4 space-y-1.5">
				{perks.map((p) => (
					<li
						key={p}
						className="flex items-start gap-2.5 text-[12px] text-[#737373] font-medium leading-[1.5]"
					>
						<span
							aria-hidden
							className="size-1 rounded-full bg-[#525D6E] shrink-0 mt-[7px]"
						/>
						<span>{p}</span>
					</li>
				))}
			</ul>

			{(footerLeft || footerRight) && (
				<div className="mt-auto pt-4 flex items-end justify-between gap-3">
					<div>{footerLeft}</div>
					<div className="pb-1.5">{footerRight}</div>
				</div>
			)}
		</div>
	)
}

function SpaceChip({ name }: { name: string }) {
	return (
		<div
			className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#737373]"
			title={`This source will save into the "${name}" space.`}
		>
			<span className="text-[10px] uppercase tracking-[0.08em] text-[#525D6E]">
				Saves to
			</span>
			<FolderOpen className="size-3 text-[#737373]" />
			<span className="text-[#fafafa]">{name}</span>
		</div>
	)
}

function DriveScopePicker({
	value,
	onChange,
}: {
	value: DriveScope
	onChange: (s: DriveScope) => void
}) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as DriveScope)}>
			<SelectTrigger className="h-7 px-3 rounded-full bg-transparent border border-[rgba(115,115,115,0.18)] text-[#737373] text-[11px] font-medium gap-1 w-auto shadow-none focus:ring-0 hover:text-[#fafafa] hover:border-[rgba(115,115,115,0.3)] transition-colors [&>svg]:size-3 [&>svg]:opacity-80">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="bg-[#14161A] border-[rgba(82,89,102,0.2)] rounded-[12px] min-w-[180px]">
				<SelectItem
					value="selective"
					className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
				>
					Files & folders
				</SelectItem>
				<SelectItem
					value="full"
					className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
				>
					Full Drive
				</SelectItem>
			</SelectContent>
		</Select>
	)
}
