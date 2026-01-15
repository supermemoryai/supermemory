"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useMemoriesUsage } from "@/hooks/use-memories-usage"
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogClose,
} from "@ui/components/dialog"
import { useCustomer } from "autumn-js/react"
import { Check, X, Trash2, LoaderIcon, Settings } from "lucide-react"
import { useState } from "react"

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

function PlanFeatureRow({
	icon,
	text,
	variant = "muted",
}: {
	icon: "check" | "x"
	text: string
	variant?: "muted" | "highlight"
}) {
	return (
		<div className="flex items-center gap-2">
			{icon === "check" ? (
				<Check
					className={cn(
						"size-4 shrink-0",
						variant === "highlight" ? "text-[#4BA0FA]" : "text-[#737373]",
					)}
				/>
			) : (
				<X className="size-4 shrink-0 text-[#737373]" />
			)}
			<span
				className={cn(
					dmSans125ClassName(),
					"text-[14px] tracking-[-0.14px]",
					variant === "highlight" ? "text-white" : "text-[#737373]",
				)}
			>
				{text}
			</span>
		</div>
	)
}

export default function Account() {
	const { user, org } = useAuth()
	const autumn = useCustomer()
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [deleteConfirmText, setDeleteConfirmText] = useState("")
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

	const {
		memoriesUsed,
		memoriesLimit,
		hasProProduct,
		isLoading: isCheckingStatus,
		usagePercent,
	} = useMemoriesUsage(autumn)

	// Handlers
	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/new/settings#account",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
			setIsUpgrading(false)
		}
	}

	const handleDeleteAccount = () => {
		if (deleteConfirmText !== "DELETE") return
		// TODO: Implement account deletion API call
		console.log("Delete account requested")
		setIsDeleteDialogOpen(false)
		setDeleteConfirmText("")
	}

	const isDeleteEnabled = deleteConfirmText === "DELETE"

	// Format member since date
	const memberSince = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: "—"

	return (
		<div className="flex flex-col gap-8 pt-4 w-full ">
			<section id="profile-details" className="flex flex-col gap-4">
				<SectionTitle>Profile Details</SectionTitle>
				<SettingsCard>
					<div className="flex flex-col gap-6">
						{/* Avatar + Name/Email */}
						<div className="flex items-center gap-4">
							<div className="relative size-16 rounded-full bg-linear-to-b from-[#0D121A] to-black overflow-hidden shrink-0">
								<Avatar className="size-full">
									<AvatarImage
										src={user?.image ?? ""}
										alt={user?.name ?? "User"}
										className="object-cover"
									/>
									<AvatarFallback className="bg-transparent text-white text-xl">
										{user?.name?.charAt(0) ?? "U"}
									</AvatarFallback>
								</Avatar>
							</div>
							<div className="flex flex-col gap-1.5">
								<p
									className={cn(
										dmSans125ClassName(),
										"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
									)}
								>
									{user?.name ?? "—"}
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
									)}
								>
									{user?.email ?? "—"}
								</p>
							</div>
						</div>

						{/* Organization + Member since */}
						<div className="flex gap-4">
							<div className="flex-1 flex flex-col gap-2">
								<p
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
									)}
								>
									Organization
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
									)}
								>
									{org?.name ?? "Personal"}
								</p>
							</div>
							<div className="flex-1 flex flex-col gap-2">
								<p
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
									)}
								>
									Member since
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
									)}
								>
									{memberSince}
								</p>
							</div>
						</div>
					</div>
				</SettingsCard>
			</section>

			<section id="billing-subscription" className="flex flex-col gap-4">
				<SectionTitle>Billing &amp; Subscription</SectionTitle>
				<SettingsCard>
					<div className="flex flex-col gap-6">
						{hasProProduct ? (
							<>
								<div className="flex flex-col gap-1.5">
									<div className="flex items-center gap-4">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
											)}
										>
											Pro plan
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

								<div id="progress-bar" className="flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											Unlimited Memories
										</p>
										<div className="flex items-center">
											<span
												className={cn(
													dmSans125ClassName(),
													"font-medium text-[16px] tracking-[-0.16px] text-[#4BA0FA]",
												)}
											>
												{memoriesUsed}/
											</span>
											<span className="text-[#4BA0FA] text-[20px] leading-none ml-0.5">
												∞
											</span>
										</div>
									</div>
									<div
										id="progress-bar-fill"
										className="h-3 w-full rounded-[40px] bg-[#2E353D] blur-[1px] p-px overflow-hidden"
									>
										<div
											className="h-full w-full rounded-[40px]"
											style={{
												background:
													"linear-gradient(to right, #4BA0FA 80.517%, #002757 100%)",
											}}
										/>
									</div>
								</div>

								<button
									type="button"
									onClick={() => {
										autumn.openBillingPortal?.()
									}}
									className={cn(
										"relative w-full h-11 rounded-full flex items-center justify-center gap-2",
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

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Free plan card */}
									<div className="flex flex-col gap-4 p-4 rounded-[10px] border border-white/10 overflow-hidden">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											Free plan
										</p>
										<div className="flex flex-col gap-2">
											<PlanFeatureRow icon="x" text="Limited 200 memories" />
											<PlanFeatureRow icon="x" text="No connections" />
											<PlanFeatureRow icon="check" text="Basic search" />
											<PlanFeatureRow icon="check" text="Basic support" />
										</div>
									</div>

									{/* Pro plan card - highlighted */}
									<div
										className={cn(
											"flex flex-col gap-4 p-4 rounded-[10px]",
											"bg-[#1B1F24]",
											"shadow-[0px_2.842px_14.211px_rgba(0,0,0,0.25)]",
											"relative overflow-hidden",
										)}
									>
										{/* Header with ACTIVE badge */}
										<div className="flex items-center justify-between">
											<p
												className={cn(
													dmSans125ClassName(),
													"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
												)}
											>
												Pro plan
											</p>
											<span className="bg-[#4BA0FA] text-[#00171A] text-[12px] font-bold tracking-[0.36px] px-1 py-[3px] rounded-[3px] h-[18px] flex items-center justify-center">
												ACTIVE
											</span>
										</div>
										<div className="flex flex-col gap-2">
											<PlanFeatureRow
												icon="check"
												text="Unlimited memories"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="10 connections"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="Advanced search"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="Priority support"
												variant="highlight"
											/>
										</div>
										{/* Inset highlight */}
										<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.1)]" />
									</div>
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
											Memories
										</p>
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
											)}
										>
											{memoriesUsed}/{memoriesLimit}
										</p>
									</div>
									{/* Progress bar */}
									<div className="h-3 w-full rounded-[40px] bg-[#2E353D] p-px">
										<div
											className="h-full rounded-[40px] bg-[#0054AD] transition-all"
											style={{ width: `${usagePercent}%` }}
										/>
									</div>
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
											Upgrading...
										</>
									) : (
										"Upgrade to Pro - $9/month"
									)}
									{/* Inset blue stroke */}
									<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</button>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Free plan card */}
									<div className="flex flex-col gap-4 p-4 rounded-[10px] border border-white/10">
										<p
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											Free plan
										</p>
										<div className="flex flex-col gap-2">
											<PlanFeatureRow icon="x" text="Limited 200 memories" />
											<PlanFeatureRow icon="x" text="No connections" />
											<PlanFeatureRow icon="check" text="Basic search" />
											<PlanFeatureRow icon="check" text="Basic support" />
										</div>
									</div>

									{/* Pro plan card */}
									<div
										className={cn(
											"flex flex-col gap-4 p-4 rounded-[10px]",
											"bg-[#1B1F24] border border-white/10",
											"shadow-[0px_2.842px_14.211px_rgba(0,0,0,0.25)]",
											"relative overflow-hidden",
										)}
									>
										{/* Header with badge */}
										<div className="flex items-center justify-between">
											<p
												className={cn(
													dmSans125ClassName(),
													"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
												)}
											>
												Pro plan
											</p>
											<span className="bg-[#4BA0FA] text-[#00171A] text-[12px] font-bold tracking-[0.36px] px-1 py-0.5 rounded-[3px]">
												RECOMMENDED
											</span>
										</div>
										<div className="flex flex-col gap-2">
											<PlanFeatureRow
												icon="check"
												text="Unlimited memories"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="10 connections"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="Advanced search"
												variant="highlight"
											/>
											<PlanFeatureRow
												icon="check"
												text="Priority support"
												variant="highlight"
											/>
										</div>
										{/* Inset highlight */}
										<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.1)]" />
									</div>
								</div>
							</>
						)}
					</div>
				</SettingsCard>
			</section>

			<section id="delete-account" className="flex flex-col gap-4">
				<SectionTitle>Delete Account</SectionTitle>
				<SettingsCard>
					<div className="flex items-center justify-between gap-4">
						<p
							className={cn(
								dmSans125ClassName(),
								"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA] max-w-[350px]",
							)}
						>
							Permanently delete all your data and cancel any active
							subscriptions
						</p>
						<Dialog
							open={isDeleteDialogOpen}
							onOpenChange={(open) => {
								setIsDeleteDialogOpen(open)
								if (!open) setDeleteConfirmText("")
							}}
						>
							<DialogTrigger asChild>
								<button
									type="button"
									className={cn(
										"relative flex items-center gap-1.5 px-4 py-2 rounded-full",
										"bg-[#290F0A] text-[#C73B1B]",
										"font-normal text-[14px] tracking-[-0.14px]",
										"cursor-pointer transition-opacity hover:opacity-90",
										"shrink-0",
										dmSans125ClassName(),
									)}
								>
									<Trash2 className="size-[18px]" />
									<span>Delete</span>
									{/* Inset shadow */}
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
									{/* Header */}
									<div className="flex flex-col gap-6">
										<div className="flex items-start gap-4">
											<div className="flex-1 flex flex-col gap-1 pl-1">
												<p
													className={cn(
														dmSans125ClassName(),
														"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
													)}
												>
													Delete account?
												</p>
												<p
													className={cn(
														dmSans125ClassName(),
														"font-medium text-[16px] tracking-[-0.16px] text-[#737373] leading-[1.35]",
													)}
												>
													This will permanently delete your memories,
													conversations, settings and cancel any active
													subscriptions.
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

										{/* Confirmation input */}
										<div className="flex flex-col gap-4">
											<p
												className={cn(
													dmSans125ClassName(),
													"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA] pl-2",
												)}
											>
												Type <span className="text-[#C73B1B]">DELETE</span> to
												confirm:
											</p>
											<div
												className={cn(
													"relative bg-[#14161A] border border-[#52596614] rounded-[12px]",
													"shadow-[0px_1px_2px_rgba(0,43,87,0.1)]",
												)}
											>
												<input
													type="text"
													value={deleteConfirmText}
													onChange={(e) => setDeleteConfirmText(e.target.value)}
													placeholder="DELETE"
													className={cn(
														"w-full px-4 py-3 bg-transparent",
														"text-[#FAFAFA] placeholder:text-[#737373]",
														"text-[14px] tracking-[-0.14px]",
														"outline-none",
														dmSans125ClassName(),
													)}
												/>
												<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_0px_1px_rgba(43,49,67,0.08),inset_0px_1px_1px_rgba(0,0,0,0.08),inset_0px_2px_4px_rgba(0,0,0,0.02)]" />
											</div>
										</div>
									</div>

									{/* Footer */}
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
												Cancel
											</button>
										</DialogClose>
										<button
											type="button"
											onClick={handleDeleteAccount}
											disabled={!isDeleteEnabled}
											className={cn(
												"relative flex items-center gap-1.5 pl-4 pr-[18px] py-2 rounded-full",
												"bg-[#290F0A] text-[#C73B1B]",
												"font-normal text-[14px] tracking-[-0.14px]",
												"cursor-pointer transition-opacity",
												"disabled:opacity-40 disabled:cursor-not-allowed",
												isDeleteEnabled && "hover:opacity-90",
												dmSans125ClassName(),
											)}
										>
											<Trash2 className="size-[18px]" />
											<span>Delete</span>
											<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.4)]" />
										</button>
									</div>
								</div>
								{/* Modal inset highlight */}
								<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.1)]" />
							</DialogContent>
						</Dialog>
					</div>
				</SettingsCard>
			</section>
		</div>
	)
}
