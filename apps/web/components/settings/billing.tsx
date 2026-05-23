"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { calculateUsagePercent } from "@/lib/billing-utils"
import { PLAN_DISPLAY_NAMES, useTokenUsage } from "@/hooks/use-token-usage"
import { cn } from "@lib/utils"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTrigger,
} from "@ui/components/dialog"
import { useQueryClient } from "@tanstack/react-query"
import { useCustomer, useListPlans } from "autumn-js/react"
import {
	Check,
	CreditCard,
	ExternalLink,
	LoaderIcon,
	ReceiptText,
	Settings,
	X,
	Zap,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const API_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const CREDIT_FEATURE_ID = "usd_credits"
const FALLBACK_TOP_UP_PLAN_ID = "api_topup"
const TOP_UP_AMOUNTS = [10, 25, 50] as const
const AUTO_TOP_UP_THRESHOLDS = [2, 5, 10] as const
const AUTO_TOP_UP_AMOUNTS = [10, 25, 50] as const

type BillingInvoice = {
	planIds?: string[]
	stripeId: string
	status: string
	total: number
	currency: string
	createdAt: number
	hostedInvoiceUrl?: string | null
}

type BillingAutoTopup = {
	featureId: string
	enabled: boolean
	threshold: number
	quantity: number
	invoiceMode?: boolean
	purchaseLimit?: {
		interval: "hour" | "day" | "week" | "month"
		intervalCount?: number
		limit: number
	}
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
	return (
		<div className="grid grid-cols-3 gap-1 rounded-[10px] border border-white/10 bg-[#0D121A] p-1">
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

function findTopUpPlanId(
	plans: Array<{
		id: string
		name?: string
		description?: string | null
		addOn?: boolean
	}>,
) {
	const knownPlan = [
		"api_topup",
		"api_top_up",
		"api_credit_topup",
		"api_credits_topup",
		"api_usage_topup",
	].find((id) => plans.some((plan) => plan.id === id))

	if (knownPlan) return knownPlan

	const discovered = plans.find((plan) => {
		const label = `${plan.id} ${plan.name ?? ""} ${plan.description ?? ""}`
		return plan.addOn && /top.?up|credit|usage/i.test(label)
	})

	return discovered?.id ?? FALLBACK_TOP_UP_PLAN_ID
}

export default function Billing() {
	const queryClient = useQueryClient()
	const autumn = useCustomer({ expand: ["invoices", "payment_method"] })
	const plansQuery = useListPlans({
		queryOptions: { staleTime: 5 * 60 * 1000 },
	})
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
	const [topUpAmount, setTopUpAmount] = useState<number>(25)
	const [topUpPendingAmount, setTopUpPendingAmount] = useState<number | null>(
		null,
	)
	const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false)
	const [autoTopUpThreshold, setAutoTopUpThreshold] = useState<number>(5)
	const [autoTopUpAmount, setAutoTopUpAmount] = useState<number>(25)
	const [isSavingAutoTopUp, setIsSavingAutoTopUp] = useState(false)

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
	const creditGranted = balance?.granted ?? usdIncluded
	const creditUsagePct = creditGranted
		? calculateUsagePercent(creditGranted - creditRemaining, creditGranted)
		: planUsagePct

	const invoices = useMemo(() => {
		return ([...(autumn.data?.invoices ?? [])] as BillingInvoice[])
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, 8)
	}, [autumn.data?.invoices])

	const topUpPlanId = useMemo(
		() => findTopUpPlanId(plansQuery.data ?? []),
		[plansQuery.data],
	)

	const activeAutoTopUp = useMemo(() => {
		const autoTopups = (autumn.data?.billingControls?.autoTopups ??
			[]) as BillingAutoTopup[]
		return autoTopups.find(
			(item: BillingAutoTopup) => item.featureId === CREDIT_FEATURE_ID,
		)
	}, [autumn.data?.billingControls?.autoTopups])

	useEffect(() => {
		if (!activeAutoTopUp) return
		setAutoTopUpEnabled(activeAutoTopUp.enabled)
		setAutoTopUpThreshold(activeAutoTopUp.threshold)
		setAutoTopUpAmount(activeAutoTopUp.quantity)
	}, [activeAutoTopUp])

	const planDisplayNames = PLAN_DISPLAY_NAMES

	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/settings#billing`,
			})
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
		setTopUpPendingAmount(amount)
		try {
			await autumn.attach({
				planId: topUpPlanId,
				featureQuantities: [{ featureId: CREDIT_FEATURE_ID, quantity: amount }],
				successUrl: `${window.location.origin}/settings#billing`,
				metadata: {
					source: "nova_billing_topup",
					amount: String(amount),
				},
			})
			autumn.refetch?.()
			toast.success(`${formatUsd(amount)} credit top-up added.`)
		} catch (error) {
			console.error(error)
			toast.error("Failed to start top-up checkout. Please try again.")
		} finally {
			setTopUpPendingAmount(null)
		}
	}

	const handleSaveAutoTopUp = async () => {
		setIsSavingAutoTopUp(true)
		const existingAutoTopups = (autumn.data?.billingControls?.autoTopups ??
			[]) as BillingAutoTopup[]
		const nextAutoTopups = [
			...existingAutoTopups.filter(
				(item: BillingAutoTopup) => item.featureId !== CREDIT_FEATURE_ID,
			),
			{
				featureId: CREDIT_FEATURE_ID,
				enabled: autoTopUpEnabled,
				threshold: autoTopUpThreshold,
				quantity: autoTopUpAmount,
				purchaseLimit: {
					interval: "month",
					intervalCount: 1,
					limit: 10,
				},
			},
		]

		try {
			const response = await fetch(`${API_BASE}/api/autumn/updateCustomer`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-App-Source": "nova",
				},
				body: JSON.stringify({
					billingControls: {
						...autumn.data?.billingControls,
						autoTopups: nextAutoTopups,
					},
				}),
			})

			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(body.message ?? "Failed to update auto top-up")
			}

			await queryClient.invalidateQueries({ queryKey: ["autumn"] })
			autumn.refetch?.()
			toast.success(
				autoTopUpEnabled ? "Auto top-up updated." : "Auto top-up disabled.",
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

						{!hasPaidPlan ? (
							<button
								type="button"
								onClick={handleUpgrade}
								disabled={isUpgrading || isCheckingStatus || autumn.isLoading}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0054AD] text-[14px] font-semibold text-[#FAFAFA] transition-colors hover:bg-[#0B65C9] disabled:cursor-not-allowed disabled:opacity-60",
								)}
							>
								{isUpgrading || isCheckingStatus || autumn.isLoading ? (
									<LoaderIcon className="size-4 animate-spin" />
								) : null}
								Upgrade to Pro - $19/month
							</button>
						) : null}
					</div>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-4">
				<SectionTitle
					aside={
						activeAutoTopUp?.enabled ? (
							<Pill tone="active">Auto top-up on</Pill>
						) : (
							<Pill>Auto top-up off</Pill>
						)
					}
				>
					Credits
				</SectionTitle>
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<SettingsCard>
						<div className="flex h-full flex-col gap-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[13px] font-medium text-[#A3A3A3]",
										)}
									>
										Available balance
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"mt-1 text-[28px] font-bold leading-none tracking-[-0.3px] text-[#FAFAFA]",
										)}
									>
										{formatUsd(creditRemaining)}
									</p>
								</div>
								<div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0D121A] text-[#4BA0FA]">
									<CreditCard className="size-4" />
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between text-[12px]">
									<span className="text-[#737373]">Credits used</span>
									<span className="font-medium tabular-nums text-[#A3A3A3]">
										{Math.round(creditUsagePct)}%
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-[#2E353D]">
									<div
										className="h-full rounded-full bg-[#4BA0FA]"
										style={{ width: `${creditUsagePct}%` }}
									/>
								</div>
							</div>

							<div className="mt-auto flex flex-col gap-3">
								<FieldSelect
									value={topUpAmount}
									values={TOP_UP_AMOUNTS}
									prefix="$"
									onChange={setTopUpAmount}
									disabled={topUpPendingAmount !== null}
								/>
								<button
									type="button"
									onClick={() => void handleTopUp(topUpAmount)}
									disabled={topUpPendingAmount !== null}
									className={cn(
										dmSans125ClassName(),
										"inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0D121A] text-[14px] font-semibold text-[#FAFAFA] transition-colors hover:bg-[#121A24] disabled:cursor-not-allowed disabled:opacity-60",
									)}
								>
									{topUpPendingAmount !== null ? (
										<LoaderIcon className="size-4 animate-spin" />
									) : (
										<Zap className="size-4 text-[#4BA0FA]" />
									)}
									Add {formatUsd(topUpAmount)}
								</button>
							</div>
						</div>
					</SettingsCard>

					<SettingsCard>
						<div className="flex flex-col gap-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[15px] font-semibold tracking-[-0.15px] text-[#FAFAFA]",
										)}
									>
										Auto top-up
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"mt-1 text-[13px] leading-relaxed text-[#A3A3A3]",
										)}
									>
										Add credits automatically when the workspace balance gets
										low.
									</p>
								</div>
								<button
									type="button"
									onClick={() => setAutoTopUpEnabled((enabled) => !enabled)}
									className={cn(
										"relative h-6 w-11 rounded-full border transition-colors",
										autoTopUpEnabled
											? "border-[#4BA0FA]/40 bg-[#0E2C4E]"
											: "border-white/10 bg-[#0D121A]",
									)}
									aria-pressed={autoTopUpEnabled}
								>
									<span
										className={cn(
											"absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-transform",
											autoTopUpEnabled
												? "translate-x-[22px] bg-[#4BA0FA]"
												: "translate-x-1 bg-[#737373]",
										)}
									/>
								</button>
							</div>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="flex flex-col gap-2">
									<p className="text-[12px] font-medium text-[#737373]">
										Trigger below
									</p>
									<FieldSelect
										value={autoTopUpThreshold}
										values={AUTO_TOP_UP_THRESHOLDS}
										prefix="$"
										onChange={setAutoTopUpThreshold}
										disabled={!autoTopUpEnabled || isSavingAutoTopUp}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<p className="text-[12px] font-medium text-[#737373]">
										Add each time
									</p>
									<FieldSelect
										value={autoTopUpAmount}
										values={AUTO_TOP_UP_AMOUNTS}
										prefix="$"
										onChange={setAutoTopUpAmount}
										disabled={!autoTopUpEnabled || isSavingAutoTopUp}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-3 rounded-[10px] border border-white/[0.06] bg-[#0D121A] p-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-2">
									<Check className="mt-0.5 size-3.5 shrink-0 text-[#4BA0FA]" />
									<p className="text-[12px] leading-relaxed text-[#A3A3A3]">
										Limit: up to 10 automatic top-ups per month.
									</p>
								</div>
								<button
									type="button"
									onClick={() => void handleSaveAutoTopUp()}
									disabled={isSavingAutoTopUp}
									className={cn(
										dmSans125ClassName(),
										"inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#1C2B3E] px-3 text-[13px] font-semibold text-[#FAFAFA] transition-colors hover:bg-[#24384F] disabled:cursor-not-allowed disabled:opacity-60",
									)}
								>
									{isSavingAutoTopUp ? (
										<LoaderIcon className="size-3.5 animate-spin" />
									) : null}
									Save
								</button>
							</div>
						</div>
					</SettingsCard>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<SectionTitle>Invoice history</SectionTitle>
				<SettingsCard className="p-0">
					{autumn.isLoading ? (
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
												{invoice.planIds?.length
													? invoice.planIds.join(", ")
													: "Billing invoice"}
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
