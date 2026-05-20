"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { PLAN_DISPLAY_NAMES, useTokenUsage } from "@/hooks/use-token-usage"
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogClose,
} from "@ui/components/dialog"
import { useCustomer } from "autumn-js/react"
import { Check, X, LoaderIcon, Settings } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA] px-2",
			)}
		>
			{children}
		</p>
	)
}

function SettingsCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			{children}
		</div>
	)
}

function PlanComparisonCard({
	name,
	price,
	period,
	description,
	credits,
	features,
	highlight,
}: {
	name: string
	price: string
	period: string
	description: string
	credits: string
	features: string[]
	highlight: boolean
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col gap-3 p-4 rounded-[10px] overflow-hidden",
				highlight
					? "bg-[#1B1F24] border border-[#4BA0FA]/30 shadow-[0px_2.842px_14.211px_rgba(0,0,0,0.25)]"
					: "border border-white/10",
			)}
		>
			<div className="flex items-center justify-between">
				<p
					className={cn(
						dmSans125ClassName(),
						"font-mono uppercase tracking-[0.12em] text-[10px]",
						highlight ? "text-[#4BA0FA]" : "text-[#737373]",
					)}
				>
					{name}
				</p>
				{highlight && (
					<span className="bg-[#4BA0FA] text-[#00171A] text-[10px] font-bold tracking-[0.36px] px-1.5 py-0.5 rounded-[3px]">
						RECOMMENDED
					</span>
				)}
			</div>

			<div className="flex items-baseline gap-1">
				<span
					className={cn(
						dmSans125ClassName(),
						"font-bold text-[28px] leading-none text-[#FAFAFA] tabular-nums",
					)}
				>
					{price}
				</span>
				{period && (
					<span
						className={cn(dmSans125ClassName(), "text-[12px] text-[#737373]")}
					>
						{period}
					</span>
				)}
			</div>

			<p
				className={cn(
					dmSans125ClassName(),
					"text-[12px] tracking-[-0.12px] text-[#A3A3A3] leading-snug",
				)}
			>
				{description}
			</p>

			<div
				className={cn(
					"flex items-center gap-2 rounded-lg px-3 py-2",
					highlight ? "bg-[#4BA0FA]/10" : "bg-white/5",
				)}
			>
				<div className="min-w-0">
					<p
						className={cn(
							dmSans125ClassName(),
							"font-semibold text-[12px] tabular-nums leading-none",
							highlight ? "text-[#4BA0FA]" : "text-[#A3A3A3]",
						)}
					>
						{credits}
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 text-[10px] leading-none",
							highlight ? "text-[#4BA0FA]/70" : "text-[#737373]",
						)}
					>
						of usage included
					</p>
				</div>
			</div>

			<ul className="flex flex-col gap-2">
				{features.map((text) => (
					<li
						key={text}
						className={cn(
							dmSans125ClassName(),
							"flex items-start gap-2 text-[12px] tracking-[-0.12px] leading-snug text-[#A3A3A3]",
						)}
					>
						<Check
							className={cn(
								"mt-0.5 size-3 shrink-0",
								highlight ? "text-[#4BA0FA]" : "text-[#737373]",
							)}
						/>
						<span>{text}</span>
					</li>
				))}
			</ul>
		</div>
	)
}

export default function Billing() {
	const autumn = useCustomer()
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

	const {
		usdIncluded,
		usdSpent,
		planUsagePct,
		currentPlan,
		hasPaidPlan,
		isLoading: isCheckingStatus,
		daysRemaining,
	} = useTokenUsage(autumn)

	const formatUsd = (n: number) =>
		n.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})

	const planDisplayNames = PLAN_DISPLAY_NAMES

	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/settings#billing`,
			})
			if (result?.paymentUrl) {
				window.open(result.paymentUrl, "_self")
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

	return (
		<div className="flex flex-col gap-8 w-full">
			<section id="billing-subscription" className="flex flex-col gap-4">
				<SectionTitle>Billing &amp; Subscription</SectionTitle>
				<SettingsCard>
					<div className="flex flex-col gap-6">
						{hasPaidPlan ? (
							<>
								<div className="flex flex-col gap-1.5">
									<div className="flex items-center gap-4">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
											)}
										>
											{planDisplayNames[currentPlan]} plan
										</p>
										<span className="bg-[#4BA0FA] text-[#00171A] text-[12px] font-bold tracking-[0.36px] px-1 py-[3px] rounded-[3px] h-[18px] flex items-center justify-center">
											ACTIVE
										</span>
									</div>
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
										)}
									>
										Expanded memory with connections and more
									</p>
								</div>

								<div className="flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											Plan usage
										</p>
										<span
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#4BA0FA] tabular-nums",
											)}
										>
											{planUsagePct < 1 && planUsagePct > 0
												? "< 1"
												: Math.round(planUsagePct)}
											% used
										</span>
									</div>
									<div className="h-3 w-full rounded-[40px] bg-[#2E353D] p-px overflow-hidden">
										<div
											className="h-full rounded-[40px]"
											style={{
												width: `${planUsagePct}%`,
												background:
													planUsagePct > 80
														? "#ef4444"
														: "linear-gradient(to right, #4BA0FA 80%, #002757 100%)",
											}}
											title={`$${formatUsd(usdSpent)} of $${formatUsd(usdIncluded)} used`}
										/>
									</div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-sm tracking-[-0.14px] text-[#737373] tabular-nums",
										)}
									>
										{daysRemaining !== null
											? `Resets in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
											: ""}
									</p>
								</div>

								<div className="flex flex-col sm:flex-row gap-3">
									<button
										type="button"
										onClick={() => {
											autumn.openCustomerPortal?.({
												returnUrl:
													"https://app.supermemory.ai/settings#billing",
											})
										}}
										className={cn(
											"relative flex-1 h-11 rounded-full flex items-center justify-center gap-2",
											"bg-[#0D121A] border border-[rgba(115,115,115,0.2)]",
											"text-[#FAFAFA] font-medium text-[14px] tracking-[-0.14px]",
											"cursor-pointer transition-opacity hover:opacity-90",
											dmSans125ClassName(),
										)}
									>
										<Settings className="size-4" />
										Manage billing
										<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]" />
									</button>
									{cancellablePlanId && (
										<Dialog
											open={isCancelDialogOpen}
											onOpenChange={setIsCancelDialogOpen}
										>
											<DialogTrigger asChild>
												<button
													type="button"
													className={cn(
														"relative flex-1 h-11 rounded-full flex items-center justify-center gap-2",
														"bg-[#290F0A] text-[#C73B1B]",
														"font-medium text-[14px] tracking-[-0.14px]",
														"cursor-pointer transition-opacity hover:opacity-90",
														dmSans125ClassName(),
													)}
												>
													Cancel subscription
													<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.4)]" />
												</button>
											</DialogTrigger>
											<DialogContent
												showCloseButton={false}
												className={cn(
													"bg-[#1B1F24] rounded-[22px] p-4",
													"shadow-[0px_2.842px_14.211px_rgba(0,0,0,0.25)]",
													"min-w-xl",
												)}
											>
												<div className="flex flex-col gap-4">
													<div className="flex items-start gap-4">
														<div className="flex flex-1 flex-col gap-3 pl-1">
															<p
																className={cn(
																	dmSans125ClassName(),
																	"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
																)}
															>
																Cancel {planDisplayNames[currentPlan]}{" "}
																subscription?
															</p>
															<p
																className={cn(
																	dmSans125ClassName(),
																	"text-[13px] tracking-[-0.13px] text-[#A3A3A3] leading-snug",
																)}
															>
																You&apos;ll keep Pro features until the end of
																your current billing period
																{daysRemaining !== null
																	? ` (${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining)`
																	: ""}
																. After that, your account will switch to the
																Free plan.
															</p>
														</div>
														<DialogClose asChild>
															<button
																type="button"
																className={cn(
																	"relative size-7 rounded-full bg-[#0D121A] border border-[#73737333]",
																	"flex items-center justify-center shrink-0",
																	"cursor-pointer transition-opacity hover:opacity-80",
																)}
															>
																<X className="size-4 text-[#737373]" />
																<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1.313px_1.313px_3.938px_rgba(0,0,0,0.7)]" />
															</button>
														</DialogClose>
													</div>

													<div className="flex items-center justify-end gap-5">
														<DialogClose asChild>
															<button
																type="button"
																className={cn(
																	dmSans125ClassName(),
																	"font-medium text-[14px] tracking-[-0.14px] text-[#737373]",
																	"cursor-pointer transition-opacity hover:opacity-80",
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
																"relative flex items-center gap-1.5 px-4 py-2 rounded-full",
																"bg-[#290F0A] text-[#C73B1B]",
																"font-normal text-[14px] tracking-[-0.14px]",
																"cursor-pointer transition-opacity",
																"disabled:opacity-40 disabled:cursor-not-allowed",
																!isCancelling && "hover:opacity-90",
																dmSans125ClassName(),
															)}
														>
															{isCancelling && (
																<LoaderIcon className="size-[18px] animate-spin" />
															)}
															<span>
																{isCancelling
																	? "Cancelling…"
																	: "Cancel subscription"}
															</span>
															<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.4)]" />
														</button>
													</div>
												</div>
												<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.1)]" />
											</DialogContent>
										</Dialog>
									)}
								</div>
							</>
						) : (
							<>
								<div className="flex flex-col gap-1.5">
									<p
										className={cn(
											dmSans125ClassName(),
											"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
										)}
									>
										Free Plan
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
										)}
									>
										You are on basic plan
									</p>
								</div>

								<div className="flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											Plan usage
										</p>
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#737373] tabular-nums",
											)}
										>
											{planUsagePct < 1 && planUsagePct > 0
												? "< 1"
												: Math.round(planUsagePct)}
											% used
										</p>
									</div>
									<div className="h-3 w-full rounded-[40px] bg-[#2E353D] p-px overflow-hidden">
										<div
											className="h-full rounded-[40px] transition-all"
											style={{
												width: `${planUsagePct}%`,
												background: planUsagePct > 80 ? "#ef4444" : "#0054AD",
											}}
											title={`$${formatUsd(usdSpent)} of $${formatUsd(usdIncluded)} used`}
										/>
									</div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-sm tracking-[-0.14px] text-[#737373] tabular-nums",
										)}
									>
										{daysRemaining !== null
											? `Resets in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
											: ""}
									</p>
								</div>

								<button
									type="button"
									onClick={handleUpgrade}
									disabled={isUpgrading || isCheckingStatus || autumn.isLoading}
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
									{isUpgrading || isCheckingStatus || autumn.isLoading ? (
										<>
											<LoaderIcon className="size-4 animate-spin mr-2" />
											Upgrading…
										</>
									) : (
										"Upgrade to Pro - $19/month"
									)}
									<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</button>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<PlanComparisonCard
										name="Free"
										price="$0"
										period=""
										description="Try the API with no commitment"
										credits="$5"
										features={[
											"Pay-as-you-go after $5 runs out",
											"Full search & memory API access",
											"Email support",
										]}
										highlight={false}
									/>
									<PlanComparisonCard
										name="Pro"
										price="$19"
										period="/mo"
										description="For developers building with AI memory"
										credits="$20"
										features={[
											"Auto top-up when balance runs low",
											"All plugins (Claude Code, Cursor, Hermes…)",
											"Priority support",
										]}
										highlight={true}
									/>
								</div>
							</>
						)}
					</div>
				</SettingsCard>
			</section>
		</div>
	)
}
