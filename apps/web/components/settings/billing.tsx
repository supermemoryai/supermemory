"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { PLAN_DISPLAY_NAMES, useTokenUsage } from "@/hooks/use-token-usage"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTrigger,
} from "@ui/components/dialog"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCustomer } from "autumn-js/react"
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Coins,
	ExternalLink,
	LoaderIcon,
	Plus,
	ReceiptText,
	Settings,
	X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const API_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const CREDIT_FEATURE_ID = "usd_credits"
const TOP_UP_PLAN_ID = "credits_topup"
const TOP_UP_AMOUNTS = [10, 25, 50, 100] as const
const PLAN_CARD_ACTION_CLASS =
	"inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"

type BillingInvoice = {
	planIds?: string[]
	stripeId: string
	status: string
	total: number
	currency: string
	createdAt: number
	hostedInvoiceUrl?: string | null
}

type AutoTopupConfig = {
	featureId: string
	enabled: boolean
	threshold: number
	quantity: number
	purchaseLimit: {
		interval: "hour" | "day" | "week" | "month"
		intervalCount: number
		limit: number
	} | null
}

type AutoTopupsResponse =
	| {
			ok: true
			hasPaymentMethod: boolean
			autoTopup: AutoTopupConfig | null
	  }
	| { ok: false; reason: string; message?: string }

type PlanCardDefinition = {
	id: "free" | "pro" | "scale" | "enterprise"
	name: string
	price: string
	period: string
	credits: string
	productId: "api_free" | "api_pro" | "api_scale" | "api_enterprise"
	description: string
	includesFrom?: string
	features: string[]
	isContactSales?: boolean
}

const PLAN_CARDS: PlanCardDefinition[] = [
	{
		id: "free",
		name: "Free",
		price: "$0",
		period: "",
		credits: "$5",
		productId: "api_free",
		description: "Try supermemory with no commitment",
		features: [
			"Pay-as-you-go after $5 runs out",
			"Full search and memory access",
			"Email support",
		],
	},
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
]

const ADVANCED_PLAN_CARDS: PlanCardDefinition[] = [
	{
		id: "scale",
		name: "Scale",
		price: "$399",
		period: "/mo",
		credits: "$600",
		productId: "api_scale",
		description: "For teams and production workloads",
		includesFrom: "Pro",
		features: [
			"Auto top-up & spend caps",
			"Gmail, S3 & Web Crawler connectors",
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

const PLAN_RANK: Record<PlanCardDefinition["id"], number> = {
	free: 0,
	pro: 1,
	scale: 2,
	enterprise: 3,
}

function SectionTitle({
	children,
	aside,
}: {
	children: React.ReactNode
	aside?: React.ReactNode
}) {
	return (
		<div className="flex items-center justify-between gap-3 px-2">
			<p
				className={cn(
					dmSans125ClassName(),
					"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
				)}
			>
				{children}
			</p>
			{aside}
		</div>
	)
}

function SettingsCard({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-[14px] bg-[#14161A] p-5",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				className,
			)}
		>
			{children}
		</div>
	)
}

function PlanCard({
	action,
	plan,
}: {
	action: React.ReactNode
	plan: PlanCardDefinition
}) {
	return (
		<div
			className={cn(
				"relative flex min-h-[416px] flex-col overflow-hidden rounded-[14px] border p-5",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				"border-white/[0.08] bg-[#14161A]",
			)}
		>
			<p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#737373]">
				{plan.name}
			</p>

			<div className="mt-3 flex items-baseline gap-1">
				<span
					className={cn(
						dmSans125ClassName(),
						"text-[34px] font-bold leading-none tracking-[-0.34px] text-[#FAFAFA] tabular-nums",
					)}
				>
					{plan.price}
				</span>
				{plan.period ? (
					<span className="text-[13px] text-[#737373]">{plan.period}</span>
				) : null}
			</div>

			<p
				className={cn(
					dmSans125ClassName(),
					"mt-2 text-[13px] leading-snug text-[#A3A3A3]",
				)}
			>
				{plan.description}
			</p>

			{plan.isContactSales ? null : (
				<div className="mt-5 flex items-center gap-2 rounded-[8px] bg-white/[0.04] px-3 py-2.5 text-[#A3A3A3]">
					<Coins className="size-3.5 shrink-0 text-[#737373]" />
					<div className="min-w-0">
						<p className="text-[12px] font-semibold leading-none text-[#C8D0DA] tabular-nums">
							{plan.credits}
						</p>
						<p className="mt-0.5 text-[10px] leading-none text-[#737373]">
							of usage included
						</p>
					</div>
				</div>
			)}

			{plan.includesFrom ? (
				<div className="mt-5 flex items-center gap-3">
					<div className="h-px flex-1 bg-white/[0.08]" />
					<span className="whitespace-nowrap text-[10px] text-[#737373]">
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
						className="flex items-start gap-2 text-[13px] leading-snug text-[#C8D0DA]"
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

function Pill({
	children,
	tone = "muted",
}: {
	children: React.ReactNode
	tone?: "active" | "muted" | "warning"
}) {
	return (
		<span
			className={cn(
				"inline-flex h-[18px] shrink-0 items-center rounded-[3px] px-1.5 text-[10px] font-bold uppercase tracking-[0.36px]",
				tone === "active" && "bg-[#4BA0FA] text-[#00171A]",
				tone === "muted" && "bg-[#2E353D] text-[#A3A3A3]",
				tone === "warning" && "bg-[#290F0A] text-[#C73B1B]",
			)}
		>
			{children}
		</span>
	)
}

function FieldSelect({
	value,
	values,
	prefix,
	onChange,
	disabled,
}: {
	value: number
	values: readonly number[]
	prefix?: string
	onChange: (value: number) => void
	disabled?: boolean
}) {
	const cols = values.length <= 3 ? "grid-cols-3" : "grid-cols-4"
	return (
		<div
			className={cn(
				"grid gap-1 rounded-[10px] border border-white/10 bg-[#0D121A] p-1",
				cols,
			)}
		>
			{values.map((item) => (
				<button
					key={item}
					type="button"
					disabled={disabled}
					onClick={() => onChange(item)}
					className={cn(
						dmSans125ClassName(),
						"h-8 rounded-[7px] text-[13px] font-semibold tabular-nums transition-colors",
						item === value
							? "bg-[#1C2B3E] text-[#FAFAFA]"
							: "text-[#737373] hover:bg-white/[0.04] hover:text-[#A3A3A3]",
						disabled && "cursor-not-allowed opacity-50",
					)}
				>
					{prefix}
					{item}
				</button>
			))}
		</div>
	)
}

function formatUsd(value: number) {
	return value.toLocaleString(undefined, {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

function formatInvoiceAmount(total: number, currency: string) {
	const normalizedTotal =
		Number.isInteger(total) && total > 100 ? total / 100 : total
	return normalizedTotal.toLocaleString(undefined, {
		style: "currency",
		currency: currency?.toUpperCase() || "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(timestamp))
}

function normalizeTimestamp(timestamp: number) {
	return timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp
}

function getStatusTone(status: string): "active" | "muted" | "warning" {
	const normalized = status.toLowerCase()
	if (normalized === "paid" || normalized === "succeeded") return "active"
	if (normalized === "open" || normalized === "draft") return "muted"
	return "warning"
}

function getInvoiceProductLabel(productId: string | undefined): string {
	if (!productId) return "Billing invoice"
	if (productId === TOP_UP_PLAN_ID || productId === "api_topup")
		return "Credits top-up"
	const planMap: Record<string, string> = {
		api_free: "Free",
		api_pro: "Pro",
		api_scale: "Scale",
		api_enterprise: "Enterprise",
		memory_free: "Free",
		memory_starter: "Pro",
		memory_growth: "Scale",
		memory_enterprise: "Enterprise",
	}
	if (planMap[productId]) return planMap[productId]
	return productId
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ")
}

export default function Billing() {
	const queryClient = useQueryClient()
	const { user, org } = useAuth()
	const autumn = useCustomer({ expand: ["payment_method"] })
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
	const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false)
	const [isPlanCarouselActive, setIsPlanCarouselActive] = useState(false)
	const [planPage, setPlanPage] = useState<0 | 1>(0)
	const [topUpAmount, setTopUpAmount] = useState<number>(25)
	const [customTopUpAmount, setCustomTopUpAmount] = useState("")
	const [topUpPendingAmount, setTopUpPendingAmount] = useState<number | null>(
		null,
	)
	const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false)
	const [autoTopUpThreshold, setAutoTopUpThreshold] = useState<number>(5)
	const [autoTopUpAmount, setAutoTopUpAmount] = useState<number>(25)
	const [isSavingAutoTopUp, setIsSavingAutoTopUp] = useState(false)

	const currentMember = org?.members?.find(
		(m: { userId: string }) => m.userId === user?.id,
	)
	const userRole = (currentMember?.role ?? "member") as string
	const isAdmin = userRole === "owner" || userRole === "admin"

	const {
		usdIncluded,
		usdSpent,
		planUsagePct,
		currentPlan,
		hasPaidPlan,
		isLoading: isCheckingStatus,
		daysRemaining,
	} = useTokenUsage(autumn)

	const balance = autumn.data?.balances?.[CREDIT_FEATURE_ID]
	const creditRemaining =
		balance?.remaining ?? Math.max(usdIncluded - usdSpent, 0)

	// --- Invoices via dedicated billing API (matches console) ---
	const invoicesQuery = useQuery({
		queryKey: ["billing", org?.id ?? "", "invoices"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE}/v3/auth/billing/invoices`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
			if (!res.ok) return []
			const data = (await res.json()) as { invoices?: BillingInvoice[] }
			return data.invoices ?? []
		},
		enabled: Boolean(org?.id),
		staleTime: 60_000,
	})
	const invoices = useMemo(() => {
		return [...(invoicesQuery.data ?? [])].sort(
			(a, b) => b.createdAt - a.createdAt,
		)
	}, [invoicesQuery.data])

	// --- Auto top-ups via dedicated billing API (matches console) ---
	const autoTopupsQuery = useQuery({
		queryKey: ["billing", org?.id ?? "", "auto-topups"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE}/v3/auth/billing/auto-topups`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
			if (!res.ok) return null
			return (await res.json()) as AutoTopupsResponse
		},
		enabled: Boolean(org?.id),
		staleTime: 20_000,
	})

	const autoTopupData =
		autoTopupsQuery.data &&
		"ok" in autoTopupsQuery.data &&
		autoTopupsQuery.data.ok
			? autoTopupsQuery.data
			: null
	const hasPaymentMethod = Boolean(autoTopupData?.hasPaymentMethod)
	const activeAutoTopUp = autoTopupData?.autoTopup ?? null
	const selectedTopUpAmount = customTopUpAmount
		? Number.parseFloat(customTopUpAmount) || 0
		: topUpAmount

	useEffect(() => {
		if (!autoTopupData) return
		if (!activeAutoTopUp) {
			setAutoTopUpEnabled(false)
			return
		}
		setAutoTopUpEnabled(activeAutoTopUp.enabled)
		setAutoTopUpThreshold(activeAutoTopUp.threshold)
		setAutoTopUpAmount(activeAutoTopUp.quantity)
	}, [activeAutoTopUp, autoTopupData])

	useEffect(() => {
		if (!hasPaymentMethod && !activeAutoTopUp?.enabled) {
			setAutoTopUpEnabled(false)
		}
	}, [activeAutoTopUp?.enabled, hasPaymentMethod])

	const planDisplayNames = PLAN_DISPLAY_NAMES

	const handleUpgrade = async (planId: "api_pro" | "api_scale") => {
		setIsUpgrading(true)
		try {
			const result = await autumn.attach({
				planId,
				successUrl: `${window.location.origin}/settings#billing`,
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
			setIsUpgrading(false)
		}
	}

	const cancellablePlanId =
		currentPlan === "pro" || currentPlan === "scale"
			? (`api_${currentPlan}` as const)
			: null

	const handleCancelSubscription = async () => {
		if (!cancellablePlanId) return
		setIsCancelling(true)
		try {
			await autumn.updateSubscription({
				planId: cancellablePlanId,
				cancelAction: "cancel_end_of_cycle",
			})
			autumn.refetch?.()
			setIsCancelDialogOpen(false)
			toast.success(
				`Subscription cancelled. ${planDisplayNames[currentPlan]} features remain active until the end of your billing period.`,
			)
		} catch (error) {
			console.error(error)
			toast.error("Failed to cancel subscription. Please try again.")
		} finally {
			setIsCancelling(false)
		}
	}

	const handleTopUp = async (amount: number) => {
		if (!isAdmin) {
			toast.error("Only owners/admins can purchase credits.")
			return
		}
		if (!hasPaidPlan) {
			toast.error("Upgrade to a paid plan before purchasing credits.")
			return
		}
		setTopUpPendingAmount(amount)
		try {
			const result = await autumn.attach({
				planId: TOP_UP_PLAN_ID,
				featureQuantities: [{ featureId: CREDIT_FEATURE_ID, quantity: amount }],
				successUrl: `${window.location.origin}/settings#billing`,
				metadata: {
					source: "nova_billing_topup",
					amount: String(amount),
				},
			})
			if ((result as { paymentUrl?: string })?.paymentUrl) {
				window.location.href = (result as { paymentUrl: string }).paymentUrl
				return
			}
			autumn.refetch?.()
			toast.success(`${formatUsd(amount)} credit top-up added.`)
		} catch (error) {
			console.error(error)
			toast.error("Failed to start top-up checkout. Please try again.")
		} finally {
			setTopUpPendingAmount(null)
		}
	}

	const handleAutoReloadToggle = (next: boolean) => {
		if (next && !hasPaymentMethod) {
			toast.error(
				"Add a payment method under Manage Billing before enabling auto reload.",
			)
			return
		}
		setAutoTopUpEnabled(next)
	}

	const handleSaveAutoTopUp = async () => {
		if (!isAdmin) {
			toast.error("Only owners/admins can change auto top-up settings.")
			return
		}
		if (autoTopUpEnabled && !hasPaymentMethod) {
			toast.error(
				"Add a payment method under Manage Billing before enabling auto top-up.",
			)
			return
		}
		setIsSavingAutoTopUp(true)
		try {
			const response = await fetch(`${API_BASE}/v3/auth/billing/auto-topups`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-App-Source": "nova",
				},
				body: JSON.stringify({
					enabled: autoTopUpEnabled,
					threshold: autoTopUpThreshold,
					quantity: autoTopUpAmount,
					purchaseLimit: {
						interval: "month" as const,
						intervalCount: 1,
						limit: 10,
					},
				}),
			})

			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(body.message ?? "Failed to update auto top-up")
			}

			await queryClient.invalidateQueries({
				queryKey: ["billing", org?.id ?? "", "auto-topups"],
			})
			await queryClient.invalidateQueries({ queryKey: ["autumn"] })
			autumn.refetch?.()
			toast.success(
				autoTopUpEnabled
					? "Auto top-up settings saved."
					: "Auto top-up disabled.",
			)
		} catch (error) {
			console.error(error)
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to update auto top-up.",
			)
		} finally {
			setIsSavingAutoTopUp(false)
		}
	}

	const handleManageBilling = () => {
		autumn.openCustomerPortal?.({
			returnUrl: `${window.location.origin}/settings#billing`,
		})
	}

	const getPlanCardAction = (plan: PlanCardDefinition) => {
		const disabled = isUpgrading || isCheckingStatus || autumn.isLoading
		const isCurrentPlan = plan.id === currentPlan
		const isIncludedPlan = PLAN_RANK[currentPlan] > PLAN_RANK[plan.id]

		if (plan.id === "free") {
			return (
				<button
					type="button"
					disabled
					className={cn(
						dmSans125ClassName(),
						PLAN_CARD_ACTION_CLASS,
						"border border-white/[0.04] bg-white/[0.02] text-[#737373]",
					)}
				>
					{hasPaidPlan ? "Included with current plan" : "Your current plan"}
				</button>
			)
		}

		if (isCurrentPlan) {
			return (
				<button
					type="button"
					disabled
					className={cn(
						dmSans125ClassName(),
						PLAN_CARD_ACTION_CLASS,
						"border border-white/[0.04] bg-white/[0.02] text-[#737373]",
					)}
				>
					Your current plan
				</button>
			)
		}

		if (isIncludedPlan) {
			return (
				<button
					type="button"
					disabled
					className={cn(
						dmSans125ClassName(),
						PLAN_CARD_ACTION_CLASS,
						"border border-white/[0.04] bg-white/[0.02] text-[#737373]",
					)}
				>
					Included with {planDisplayNames[currentPlan]}
				</button>
			)
		}

		if (plan.isContactSales) {
			return (
				<a
					href="mailto:support@supermemory.com?subject=Enterprise%20plan"
					className={cn(
						dmSans125ClassName(),
						PLAN_CARD_ACTION_CLASS,
						"border border-white/[0.08] bg-transparent text-[#FAFAFA] hover:bg-white/[0.04]",
					)}
				>
					Contact sales
				</a>
			)
		}

		const checkoutPlanId =
			plan.productId === "api_pro" || plan.productId === "api_scale"
				? plan.productId
				: null
		if (!checkoutPlanId) return null

		return (
			<button
				type="button"
				onClick={() => handleUpgrade(checkoutPlanId)}
				disabled={disabled}
				className={cn(
					dmSans125ClassName(),
					PLAN_CARD_ACTION_CLASS,
					"bg-[#0054AD] text-[#FAFAFA] hover:bg-[#0B65C9]",
				)}
			>
				{disabled ? <LoaderIcon className="size-4 animate-spin" /> : null}
				Upgrade to {plan.name}
			</button>
		)
	}

	return (
		<div className="flex w-full flex-col gap-7">
			<section id="billing-subscription" className="flex flex-col gap-4">
				<SectionTitle>Billing &amp; Subscription</SectionTitle>
				<SettingsCard>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<div className="flex items-center gap-3">
									<p
										className={cn(
											dmSans125ClassName(),
											"font-semibold text-[18px] tracking-[-0.18px] text-[#FAFAFA]",
										)}
									>
										{hasPaidPlan
											? `${planDisplayNames[currentPlan]} plan`
											: "Free plan"}
									</p>
									<Pill tone={hasPaidPlan ? "active" : "muted"}>
										{hasPaidPlan ? "Active" : "Free"}
									</Pill>
								</div>
								<p
									className={cn(
										dmSans125ClassName(),
										"mt-1 text-[13px] leading-relaxed text-[#A3A3A3]",
									)}
								>
									{hasPaidPlan
										? "Expanded memory, connections, and usage for this workspace."
										: "Upgrade when you need more workspace usage and integrations."}
								</p>
							</div>

							<div className="flex shrink-0 items-center gap-2">
								<button
									type="button"
									onClick={handleManageBilling}
									className={cn(
										dmSans125ClassName(),
										"inline-flex h-9 items-center gap-2 rounded-[9px] border border-white/10 bg-[#0D121A] px-3 text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#121A24]",
									)}
								>
									<Settings className="size-3.5 text-[#737373]" />
									Manage
								</button>
								{cancellablePlanId ? (
									<Dialog
										open={isCancelDialogOpen}
										onOpenChange={setIsCancelDialogOpen}
									>
										<DialogTrigger asChild>
											<button
												type="button"
												className={cn(
													dmSans125ClassName(),
													"inline-flex h-9 items-center rounded-[9px] bg-[#290F0A] px-3 text-[13px] font-medium text-[#C73B1B] transition-opacity hover:opacity-90",
												)}
											>
												Cancel
											</button>
										</DialogTrigger>
										<DialogContent
											showCloseButton={false}
											className="w-[min(420px,calc(100vw-32px))] rounded-[18px] border border-white/10 bg-[#14161A] p-5 shadow-[0px_16px_60px_rgba(0,0,0,0.55)]"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<p
														className={cn(
															dmSans125ClassName(),
															"text-[17px] font-semibold tracking-[-0.17px] text-[#FAFAFA]",
														)}
													>
														Cancel {planDisplayNames[currentPlan]}?
													</p>
													<p
														className={cn(
															dmSans125ClassName(),
															"mt-2 text-[13px] leading-relaxed text-[#A3A3A3]",
														)}
													>
														You keep paid features until the current billing
														period ends
														{daysRemaining !== null
															? ` (${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining)`
															: ""}
														.
													</p>
												</div>
												<DialogClose asChild>
													<button
														type="button"
														className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0D121A] text-[#737373] transition-colors hover:text-[#FAFAFA]"
													>
														<X className="size-4" />
													</button>
												</DialogClose>
											</div>
											<div className="mt-5 flex items-center justify-end gap-3">
												<DialogClose asChild>
													<button
														type="button"
														className={cn(
															dmSans125ClassName(),
															"h-9 px-3 text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-[#FAFAFA]",
														)}
													>
														Keep plan
													</button>
												</DialogClose>
												<button
													type="button"
													onClick={() => void handleCancelSubscription()}
													disabled={isCancelling}
													className={cn(
														dmSans125ClassName(),
														"inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#290F0A] px-3 text-[13px] font-medium text-[#C73B1B] transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
													)}
												>
													{isCancelling ? (
														<LoaderIcon className="size-3.5 animate-spin" />
													) : null}
													Cancel subscription
												</button>
											</div>
										</DialogContent>
									</Dialog>
								) : null}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-3">
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] font-medium text-[#A3A3A3]",
									)}
								>
									Plan usage
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] font-semibold tabular-nums text-[#FAFAFA]",
									)}
								>
									{planUsagePct < 1 && planUsagePct > 0
										? "< 1"
										: Math.round(planUsagePct)}
									% used
								</p>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-[#2E353D]">
								<div
									className="h-full rounded-full bg-[#4BA0FA] transition-all"
									style={{
										width: `${planUsagePct}%`,
										background:
											planUsagePct > 80
												? "#C73B1B"
												: "linear-gradient(90deg, #2368D2 0%, #4BA0FA 100%)",
									}}
								/>
							</div>
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[12px] text-[#737373]",
								)}
							>
								{daysRemaining !== null
									? `Resets in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
									: "Usage resets with your billing cycle"}
							</p>
						</div>
					</div>
				</SettingsCard>
			</section>

			<section id="billing-plans" className="flex flex-col gap-4">
				<SectionTitle
					aside={
						isPlanCarouselActive ? (
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => setPlanPage(0)}
									disabled={planPage === 0}
									className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-[#A3A3A3] transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
									aria-label="Show Free and Pro plans"
								>
									<ChevronLeft className="size-4" />
								</button>
								<button
									type="button"
									onClick={() => setPlanPage(1)}
									disabled={planPage === 1}
									className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-[#A3A3A3] transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
									aria-label="Show Scale and Enterprise plans"
								>
									<ChevronRight className="size-4" />
								</button>
							</div>
						) : undefined
					}
				>
					Plans
				</SectionTitle>
				<div className="overflow-hidden">
					<div
						className="flex gap-4 transition-transform duration-300 ease-out"
						style={{
							transform:
								planPage === 1 ? "translateX(calc(-100% - 1rem))" : "none",
						}}
					>
						<div className="grid w-full shrink-0 gap-4 md:grid-cols-2">
							{PLAN_CARDS.map((plan) => (
								<PlanCard
									action={getPlanCardAction(plan)}
									key={plan.id}
									plan={plan}
								/>
							))}
						</div>
						<div className="grid w-full shrink-0 gap-4 md:grid-cols-2">
							{ADVANCED_PLAN_CARDS.map((plan) => (
								<PlanCard
									action={getPlanCardAction(plan)}
									key={plan.id}
									plan={plan}
								/>
							))}
						</div>
					</div>
				</div>
				{isPlanCarouselActive ? null : (
					<div className="flex justify-end px-2 pt-1">
						<button
							type="button"
							onClick={() => {
								setIsPlanCarouselActive(true)
								setPlanPage(1)
							}}
							className={cn(
								dmSans125ClassName(),
								"inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-[#A3A3A3] transition-colors hover:text-[#FAFAFA]",
							)}
						>
							<span className="underline underline-offset-4">Other plans</span>
							<span className="translate-x-1 text-[15px]" aria-hidden="true">
								&rarr;
							</span>
						</button>
					</div>
				)}
			</section>

			<section className="flex flex-col gap-4">
				<SectionTitle>Credits</SectionTitle>

				<SettingsCard>
					<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]">
								Usage this period
							</p>
							<div className="mt-4 flex items-baseline gap-1 text-[13px] text-[#A3A3A3]">
								<span className="font-semibold text-[#FAFAFA]">
									{planUsagePct < 1 && planUsagePct > 0
										? "< 1"
										: Math.round(planUsagePct)}
									%
								</span>
								<span>of monthly usage</span>
								<span className="text-[#737373]">
									{daysRemaining !== null
										? `· resets in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
										: "· resets with your billing cycle"}
								</span>
							</div>
							<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#2E353D]">
								<div
									className="h-full rounded-full bg-[#4BA0FA]"
									style={{ width: `${planUsagePct}%` }}
								/>
							</div>
							<p className="mt-3 text-[12px] text-[#737373]">
								{planUsagePct > 0
									? `${formatUsd(usdSpent)} used this period`
									: "No usage yet this period"}
							</p>
						</div>

						<div className="flex shrink-0 flex-col gap-2 sm:min-w-[170px]">
							<Dialog
								open={isCreditsDialogOpen}
								onOpenChange={setIsCreditsDialogOpen}
							>
								<DialogTrigger asChild>
									<button
										type="button"
										className={cn(
											dmSans125ClassName(),
											"inline-flex h-9 items-center justify-center gap-2 rounded-[9px] bg-[#0054AD] px-3 text-[13px] font-semibold text-[#FAFAFA] transition-colors hover:bg-[#0B65C9]",
										)}
									>
										<Plus className="size-3.5" />
										Buy credits
									</button>
								</DialogTrigger>
								<DialogContent
									showCloseButton={false}
									className="w-[min(560px,calc(100vw-32px))] rounded-[18px] border border-[#1C2B3E] bg-[#0B0D12] p-6 shadow-[0px_18px_70px_rgba(0,0,0,0.72)]"
								>
									<div className="flex items-start justify-between gap-4">
										<div>
											<p
												className={cn(
													dmSans125ClassName(),
													"text-[22px] font-semibold tracking-[-0.22px] text-[#FAFAFA]",
												)}
											>
												Buy Credits
											</p>
											<p
												className={cn(
													dmSans125ClassName(),
													"mt-2 text-[15px] text-[#A3A3A3]",
												)}
											>
												Add USD to your balance for metered usage.
											</p>
										</div>
										<DialogClose asChild>
											<button
												type="button"
												className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0D121A] text-[#737373] transition-colors hover:text-[#FAFAFA]"
											>
												<X className="size-5" />
											</button>
										</DialogClose>
									</div>

									<div className="mt-8 flex flex-col gap-5">
										<div className="flex flex-col gap-3">
											<p
												className={cn(
													dmSans125ClassName(),
													"text-[16px] font-semibold text-[#FAFAFA]",
												)}
											>
												Choose an amount
											</p>
											<FieldSelect
												value={topUpAmount}
												values={TOP_UP_AMOUNTS}
												prefix="$"
												onChange={(value) => {
													setTopUpAmount(value)
													setCustomTopUpAmount("")
												}}
												disabled={topUpPendingAmount !== null}
											/>
											<div className="flex flex-col gap-2">
												<label
													htmlFor="custom-topup-amount"
													className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]"
												>
													Custom amount (USD)
												</label>
												<input
													id="custom-topup-amount"
													inputMode="decimal"
													min={1}
													onChange={(event) =>
														setCustomTopUpAmount(event.target.value)
													}
													placeholder="e.g. 75"
													type="number"
													value={customTopUpAmount}
													className="h-11 rounded-[10px] border border-white/10 bg-[#080B10] px-3 text-[14px] text-[#FAFAFA] outline-none placeholder:text-[#737373] focus:border-[#0054AD]"
												/>
											</div>
										</div>

										<div className="h-px bg-white/[0.06]" />

										<div className="flex flex-col gap-4">
											<div className="flex items-center justify-between">
												<p className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]">
													Auto reload
												</p>
												<span className="text-[12px] text-[#737373]">
													{autoTopUpEnabled ? "on" : "off"}
												</span>
											</div>

											<div className="flex items-center justify-between gap-4">
												<p
													className={cn(
														dmSans125ClassName(),
														"text-[16px] text-[#FAFAFA]",
													)}
												>
													Auto reload is{" "}
													{autoTopUpEnabled ? "enabled" : "disabled"}
												</p>
												<button
													type="button"
													disabled={
														isSavingAutoTopUp ||
														!isAdmin ||
														(!hasPaymentMethod && !activeAutoTopUp?.enabled)
													}
													onClick={() =>
														handleAutoReloadToggle(!autoTopUpEnabled)
													}
													className={cn(
														dmSans125ClassName(),
														"inline-flex h-9 min-w-[96px] items-center justify-center rounded-[9px] border border-white/10 bg-[#0D121A] px-3 text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#121A24] disabled:cursor-not-allowed disabled:opacity-45",
													)}
												>
													{autoTopUpEnabled ? "Disable" : "Enable"}
												</button>
											</div>

											{!hasPaymentMethod && !activeAutoTopUp?.enabled ? (
												<p className="text-[13px] text-[#737373]">
													Save a card in Manage Billing to enable automatic
													reloads.
												</p>
											) : null}

											<div
												className={cn(
													"grid gap-3 rounded-[10px] border border-white/[0.06] bg-[#0D121A] p-3 transition-[filter,opacity] sm:grid-cols-2",
													!autoTopUpEnabled &&
														"pointer-events-none select-none opacity-45 blur-[3px]",
												)}
											>
												<div className="flex flex-col gap-2">
													<label
														htmlFor="auto-topup-threshold"
														className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]"
													>
														Threshold (USD)
													</label>
													<input
														id="auto-topup-threshold"
														disabled={!autoTopUpEnabled || isSavingAutoTopUp}
														inputMode="decimal"
														min={0}
														onChange={(event) => {
															const value = Number.parseFloat(
																event.target.value,
															)
															setAutoTopUpThreshold(
																Number.isFinite(value) ? value : 0,
															)
														}}
														type="number"
														value={
															Number.isFinite(autoTopUpThreshold)
																? autoTopUpThreshold
																: ""
														}
														className="h-10 rounded-[8px] border border-white/10 bg-[#080B10] px-3 text-[13px] text-[#FAFAFA] outline-none focus:border-[#0054AD] disabled:opacity-60"
													/>
												</div>
												<div className="flex flex-col gap-2">
													<label
														htmlFor="auto-topup-amount"
														className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]"
													>
														Reload amount (USD)
													</label>
													<input
														id="auto-topup-amount"
														disabled={!autoTopUpEnabled || isSavingAutoTopUp}
														inputMode="decimal"
														min={0.01}
														onChange={(event) => {
															const value = Number.parseFloat(
																event.target.value,
															)
															setAutoTopUpAmount(
																Number.isFinite(value) ? value : 0,
															)
														}}
														type="number"
														value={
															Number.isFinite(autoTopUpAmount)
																? autoTopUpAmount
																: ""
														}
														className="h-10 rounded-[8px] border border-white/10 bg-[#080B10] px-3 text-[13px] text-[#FAFAFA] outline-none focus:border-[#0054AD] disabled:opacity-60"
													/>
												</div>
												<div className="sm:col-span-2">
													<button
														type="button"
														onClick={() => void handleSaveAutoTopUp()}
														disabled={isSavingAutoTopUp || !isAdmin}
														className={cn(
															dmSans125ClassName(),
															"inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-[#080B10] text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#121A24] disabled:cursor-not-allowed disabled:opacity-60",
														)}
													>
														{isSavingAutoTopUp ? (
															<LoaderIcon className="size-3.5 animate-spin" />
														) : null}
														Save threshold &amp; reload amount
													</button>
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={() => void handleTopUp(selectedTopUpAmount)}
											disabled={
												topUpPendingAmount !== null ||
												!isAdmin ||
												selectedTopUpAmount <= 0
											}
											className={cn(
												dmSans125ClassName(),
												"inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0054AD] text-[14px] font-bold text-[#FAFAFA] transition-colors hover:bg-[#0B65C9] disabled:cursor-not-allowed disabled:opacity-60",
											)}
										>
											{topUpPendingAmount !== null ? (
												<LoaderIcon className="size-4 animate-spin" />
											) : null}
											Buy {formatUsd(selectedTopUpAmount)} in credits
										</button>

										{!isAdmin ? (
											<p className="text-center text-[11px] text-[#737373]">
												Only owners/admins can purchase credits.
											</p>
										) : null}
									</div>
								</DialogContent>
							</Dialog>
							<button
								type="button"
								onClick={() => setIsCreditsDialogOpen(true)}
								disabled={!isAdmin}
								className="inline-flex h-8 items-center justify-center gap-2 rounded-[8px] text-[12px] font-medium text-[#A3A3A3] transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span
									className="size-1.5 rounded-full"
									style={{
										backgroundColor: autoTopUpEnabled ? "#4BA0FA" : "#737373",
									}}
								/>
								Auto reload: {autoTopUpEnabled ? "on" : "off"}
							</button>
						</div>
					</div>
				</SettingsCard>

				{hasPaidPlan ? (
					<SettingsCard className="border border-dashed border-white/10 bg-[#14161A]/70">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex min-w-0 items-start gap-3">
								<Coins className="mt-1 size-4 shrink-0 text-[#4BA0FA]" />
								<div className="min-w-0">
									<p className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#737373]">
										Top-up credits{" "}
										<span className="font-normal normal-case tracking-normal text-[#A3A3A3]">
											(optional)
										</span>
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"mt-2 text-[14px] font-semibold text-[#FAFAFA]",
										)}
									>
										{creditRemaining > 0
											? `${formatUsd(creditRemaining)} available`
											: "No top-up credits yet"}
									</p>
									<p className="mt-2 text-[12px] leading-snug text-[#737373]">
										Optional add-on that{" "}
										<span className="font-semibold text-[#A3A3A3]">
											rolls over
										</span>{" "}
										month-to-month, separate from your monthly usage above.
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsCreditsDialogOpen(true)}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[9px] border border-white/10 bg-[#0D121A] px-3 text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#121A24]",
								)}
							>
								<Plus className="size-3.5" />
								{creditRemaining > 0 ? "Add more" : "Add credits"}
							</button>
						</div>
					</SettingsCard>
				) : null}
			</section>

			<section className="flex flex-col gap-4">
				<SectionTitle>Invoice history</SectionTitle>
				<SettingsCard className="p-0">
					{invoicesQuery.isLoading ? (
						<div className="flex h-28 items-center justify-center gap-3 text-[#737373]">
							<LoaderIcon className="size-4 animate-spin" />
							<span className={cn(dmSans125ClassName(), "text-[13px]")}>
								Loading invoices
							</span>
						</div>
					) : invoices.length === 0 ? (
						<div className="flex h-28 flex-col items-center justify-center gap-2 px-5 text-center">
							<ReceiptText className="size-5 text-[#737373]" />
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[13px] text-[#A3A3A3]",
								)}
							>
								No invoices yet
							</p>
						</div>
					) : (
						<div className="divide-y divide-white/[0.06]">
							{invoices.map((invoice) => {
								const date = formatDate(normalizeTimestamp(invoice.createdAt))
								const label = invoice.planIds?.length
									? invoice.planIds
											.map((id) => getInvoiceProductLabel(id))
											.join(", ")
									: "Billing invoice"
								return (
									<div
										key={invoice.stripeId}
										className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1.2fr)_110px_90px_auto]"
									>
										<div className="min-w-0">
											<p
												className={cn(
													dmSans125ClassName(),
													"truncate text-[13px] font-medium text-[#FAFAFA]",
												)}
											>
												{label}
											</p>
											<p className="mt-0.5 truncate text-[12px] text-[#737373]">
												{invoice.stripeId}
											</p>
										</div>
										<p className="hidden self-center text-[13px] text-[#A3A3A3] sm:block">
											{date}
										</p>
										<p className="self-center text-right text-[13px] font-semibold tabular-nums text-[#FAFAFA] sm:text-left">
											{formatInvoiceAmount(invoice.total, invoice.currency)}
										</p>
										<div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
											<Pill tone={getStatusTone(invoice.status)}>
												{invoice.status}
											</Pill>
											{invoice.hostedInvoiceUrl ? (
												<a
													href={invoice.hostedInvoiceUrl}
													target="_blank"
													rel="noreferrer"
													className="inline-flex size-7 items-center justify-center rounded-[8px] border border-white/10 bg-[#0D121A] text-[#737373] transition-colors hover:text-[#FAFAFA]"
													aria-label={`Open invoice ${invoice.stripeId}`}
												>
													<ExternalLink className="size-3.5" />
												</a>
											) : null}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</SettingsCard>
			</section>
		</div>
	)
}
