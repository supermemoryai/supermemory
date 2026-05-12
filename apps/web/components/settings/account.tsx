"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import {
	useAccountMemberships,
	useDeleteUserAccount,
} from "@/hooks/use-account-settings"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useTokenUsage } from "@/hooks/use-token-usage"
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogClose,
} from "@ui/components/dialog"
import { authClient } from "@lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { useCustomer } from "autumn-js/react"
import {
	Check,
	X,
	Trash2,
	LoaderIcon,
	Settings,
	ChevronDown,
	Building2,
} from "lucide-react"
import { useMemo, useState } from "react"
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

function formatOrgRole(role: string): string {
	const r = role.toLowerCase()
	if (r === "owner") return "Owner"
	if (r === "admin") return "Admin"
	if (r === "member") return "Member"
	return role
		? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
		: "Member"
}

export default function Account() {
	const {
		user,
		org,
		organizations: allOrgs,
		setActiveOrg,
		clearActiveOrg,
	} = useAuth()
	const autumn = useCustomer()
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [emailConfirm, setEmailConfirm] = useState("")
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [isClosingAccount, setIsClosingAccount] = useState(false)
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const [orgMenuOpen, setOrgMenuOpen] = useState(false)
	const canSwitchOrg = (allOrgs?.length ?? 0) > 1
	const { data: memberships, isPending: membershipsPending } =
		useAccountMemberships()

	const sortedMemberships = useMemo(() => {
		if (!memberships?.length) return []
		return [...memberships].sort((a, b) => a.name.localeCompare(b.name))
	}, [memberships])

	const ownedOrgs = useMemo(
		() => memberships?.filter((m) => m.role === "owner") ?? [],
		[memberships],
	)

	const hasOwnedOrgWithTeammates = useMemo(
		() => ownedOrgs.some((m) => m.memberCount > 1),
		[ownedOrgs],
	)

	const showMembershipsOverview =
		!membershipsPending &&
		(sortedMemberships.length > 1 || hasOwnedOrgWithTeammates)

	const deleteUserAccount = useDeleteUserAccount()

	const emailMatches = user?.email
		? emailConfirm.trim().toLowerCase() === user.email.trim().toLowerCase()
		: false

	const handleOrgSwitch = async (orgSlug: string, orgId: string) => {
		if (orgId === org?.id) return
		setSwitchingOrgId(orgId)
		try {
			await setActiveOrg(orgSlug)
			window.location.reload()
		} catch (error) {
			console.error("Failed to switch organization:", error)
			setSwitchingOrgId(null)
		}
	}

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

	const planDisplayNames: Record<string, string> = {
		free: "Free",
		pro: "Pro",
		scale: "Scale",
		enterprise: "Enterprise",
	}

	// Handlers
	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/settings#account`,
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

	const handleDeleteAccount = async () => {
		if (!user?.email || !emailMatches || membershipsPending) return
		setIsClosingAccount(true)
		try {
			await deleteUserAccount.mutateAsync({
				confirmation: user.email,
			})
			clearActiveOrg()
			try {
				await authClient.signOut()
			} catch {
				window.location.assign("/login/new")
				return
			}
			setIsDeleteDialogOpen(false)
			setEmailConfirm("")
			window.location.assign("/login/new")
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Something went wrong"
			toast.error(msg)
		} finally {
			setIsClosingAccount(false)
		}
	}

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
								<Popover
									open={orgMenuOpen && canSwitchOrg}
									onOpenChange={(open) => {
										if (canSwitchOrg) setOrgMenuOpen(open)
									}}
								>
									<PopoverTrigger
										disabled={!canSwitchOrg}
										className={cn(
											"flex items-center gap-2 transition-opacity",
											canSwitchOrg
												? "cursor-pointer hover:opacity-90"
												: "cursor-default",
											dmSans125ClassName(),
										)}
									>
										<span
											className={cn(
												dmSans125ClassName(),
												"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
											)}
										>
											{org?.name ?? "Personal"}
										</span>
										{canSwitchOrg && (
											<ChevronDown className="size-4 text-[#737373]" />
										)}
									</PopoverTrigger>
									{canSwitchOrg && (
										<PopoverContent
											align="start"
											className="w-72 bg-[#1B1F24] rounded-[12px] border-white/10 p-1.5 shadow-[0px_4px_16px_rgba(0,0,0,0.4)]"
										>
											{allOrgs?.map((organization) => {
												const isCurrent = organization.id === org?.id
												const isSwitching = switchingOrgId === organization.id
												return (
													<button
														key={organization.id}
														type="button"
														disabled={isCurrent || isSwitching}
														onClick={() =>
															handleOrgSwitch(
																organization.slug,
																organization.id,
															)
														}
														className={cn(
															"w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors",
															isCurrent
																? "bg-white/5"
																: "hover:bg-white/5 cursor-pointer",
															"disabled:opacity-60 disabled:cursor-default",
															dmSans125ClassName(),
														)}
													>
														<Building2 className="size-4 text-[#737373] shrink-0" />
														<div className="flex-1 min-w-0 flex items-center gap-2">
															<p className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] truncate">
																{organization.name}
															</p>
															{isCurrent && (
																<Check className="size-4 text-[#4BA0FA] shrink-0" />
															)}
															{isSwitching && (
																<LoaderIcon className="size-4 text-[#4BA0FA] shrink-0 animate-spin" />
															)}
														</div>
													</button>
												)
											})}
										</PopoverContent>
									)}
								</Popover>
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

								{/* Plan usage (unified) */}
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

								<button
									type="button"
									onClick={() => {
										autumn.openCustomerPortal?.({
											returnUrl: "https://app.supermemory.ai/settings#account",
										})
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

								{/* Plan usage (unified) */}
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
									{/* Inset blue stroke */}
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
								if (!open) {
									setEmailConfirm("")
								}
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
											<div className="flex flex-1 flex-col gap-3 pl-1">
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
														"text-[12px] tracking-[-0.12px] text-[#737373]",
													)}
												>
													This cannot be undone.
												</p>
												{hasOwnedOrgWithTeammates && (
													<p
														className={cn(
															dmSans125ClassName(),
															"text-[13px] font-medium tracking-[-0.13px] text-[#C73B1B] leading-[1.35]",
														)}
													>
														You own at least one organization that still has
														other members. Those organizations will be deleted
														for everyone when you confirm.
													</p>
												)}
												<details className="group rounded-lg border border-white/10 bg-[#14161A]/80 px-3 py-2">
													<summary
														className={cn(
															dmSans125ClassName(),
															"flex cursor-pointer list-none items-center justify-between gap-2 text-[12px] font-normal tracking-[-0.12px] text-[#A3A3A3] [&::-webkit-details-marker]:hidden",
														)}
													>
														What happens next?
														<ChevronDown className="size-3.5 shrink-0 text-[#737373] group-open:rotate-180" />
													</summary>
													<div
														className={cn(
															dmSans125ClassName(),
															"mt-2 space-y-2 border-t border-white/10 pt-2 text-[12px] tracking-[-0.12px] text-[#737373] leading-snug",
														)}
													>
														<p>
															Your account is locked immediately; data removal
															runs in the background.
														</p>
														<ul className="list-disc space-y-1.5 pl-4 marker:text-onboarding">
															<li>
																Removes memories, conversations, and settings;
																cancels active subscriptions.
															</li>
															<li>
																Orgs where you&apos;re only a member:
																you&apos;re removed; the org continues.
															</li>
															<li>Orgs you own: deleted for all members.</li>
														</ul>
													</div>
												</details>
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

										{showMembershipsOverview && (
											<div className="flex flex-col gap-2 pl-1">
												<p
													className={cn(
														dmSans125ClassName(),
														"font-semibold text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
													)}
												>
													Your organizations
												</p>
												<div className="flex max-h-[min(220px,40vh)] flex-col gap-1.5 overflow-y-auto pr-1">
													{sortedMemberships.map((m) => (
														<div
															className={cn(
																"flex items-center justify-between gap-3 rounded-[10px]",
																"border border-white/10 bg-[#14161A]/80 px-3 py-2.5",
															)}
															key={m.orgId}
														>
															<div className="min-w-0 flex-1">
																<p
																	className={cn(
																		dmSans125ClassName(),
																		"truncate text-[13px] font-medium tracking-[-0.13px] text-[#FAFAFA]",
																	)}
																>
																	{m.name}
																</p>
																{m.slug ? (
																	<p
																		className={cn(
																			dmSans125ClassName(),
																			"truncate text-[11px] tracking-[-0.11px] text-[#737373]",
																		)}
																	>
																		{m.slug}
																	</p>
																) : null}
															</div>
															<div className="flex shrink-0 flex-col items-end gap-0.5">
																<span
																	className={cn(
																		dmSans125ClassName(),
																		"rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium tracking-[0.02em] text-[#A3A3A3]",
																	)}
																>
																	{formatOrgRole(m.role)}
																</span>
																<span
																	className={cn(
																		dmSans125ClassName(),
																		"tabular-nums text-[10px] tracking-[-0.1px] text-[#737373]",
																	)}
																>
																	{m.memberCount} member
																	{m.memberCount === 1 ? "" : "s"}
																</span>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Confirmation input */}
										<div className="flex flex-col gap-4">
											<p
												className={cn(
													dmSans125ClassName(),
													"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA] pl-2",
												)}
											>
												Type your account email to confirm:
											</p>
											<div
												className={cn(
													"relative bg-[#14161A] border border-[#52596614] rounded-[12px]",
													"shadow-[0px_1px_2px_rgba(0,43,87,0.1)]",
												)}
											>
												<input
													type="text"
													autoComplete="off"
													value={emailConfirm}
													onChange={(e) => setEmailConfirm(e.target.value)}
													placeholder={user?.email ?? "you@example.com"}
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
											onClick={() => void handleDeleteAccount()}
											disabled={
												!emailMatches || isClosingAccount || membershipsPending
											}
											className={cn(
												"relative flex items-center gap-1.5 pl-4 pr-[18px] py-2 rounded-full",
												"bg-[#290F0A] text-[#C73B1B]",
												"font-normal text-[14px] tracking-[-0.14px]",
												"cursor-pointer transition-opacity",
												"disabled:opacity-40 disabled:cursor-not-allowed",
												emailMatches &&
													!isClosingAccount &&
													!membershipsPending &&
													"hover:opacity-90",
												dmSans125ClassName(),
											)}
										>
											{isClosingAccount ? (
												<LoaderIcon className="size-[18px] animate-spin" />
											) : (
												<Trash2 className="size-[18px]" />
											)}
											<span>{isClosingAccount ? "Deleting…" : "Delete"}</span>
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
