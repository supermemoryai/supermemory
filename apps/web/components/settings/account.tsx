"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import {
	PLAN_DISPLAY_NAMES,
	PLAN_RANK,
	useTokenUsage,
	type PlanType,
} from "@/hooks/use-token-usage"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { useCustomer } from "autumn-js/react"
import { Check, LoaderIcon, ChevronDown, Building2, Users } from "lucide-react"
import { useMemo, useState } from "react"

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

/** Matches ACTIVE / RECOMMENDED pills in billing settings. */
const orgPlanBadgeBase = cn(
	dmSans125ClassName(),
	"inline-flex h-[18px] min-w-[42px] shrink-0 items-center justify-center rounded-[3px] px-1.5 text-[10px] uppercase",
)

const ORG_PLAN_BADGE_STYLES: Record<PlanType, string> = {
	free: "bg-[#2E353D] font-mono font-medium tracking-[0.12em] text-[#A3A3A3]",
	pro: "bg-[#4BA0FA] font-bold tracking-[0.36px] text-[#00171A]",
	scale: "bg-[#0054AD] font-bold tracking-[0.36px] text-[#FAFAFA]",
	enterprise: "bg-[#FAFAFA] font-bold tracking-[0.36px] text-[#0D121A]",
}

function OrgPlanBadge({ plan }: { plan: PlanType }) {
	return (
		<span className={cn(orgPlanBadgeBase, ORG_PLAN_BADGE_STYLES[plan])}>
			{PLAN_DISPLAY_NAMES[plan]}
		</span>
	)
}

const ROLE_LABELS: Record<string, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
}

function formatRole(role: string): string {
	const r = role?.toLowerCase() ?? ""
	if (ROLE_LABELS[r]) return ROLE_LABELS[r]
	return r ? r.charAt(0).toUpperCase() + r.slice(1) : "Member"
}

function RolePill({ role }: { role: string }) {
	const r = role?.toLowerCase() ?? ""
	const isOwner = r === "owner"
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-[0.02em]",
				isOwner
					? "bg-[#4BA0FA]/10 text-[#4BA0FA]"
					: "bg-white/5 text-[#A3A3A3]",
			)}
		>
			{formatRole(role)}
		</span>
	)
}

function resolveOrgPlan(
	orgId: string,
	isCurrent: boolean,
	currentPlan: PlanType,
	planByOrgId: Map<string, PlanType>,
): PlanType {
	const fromSummary = planByOrgId.get(orgId)
	if (fromSummary) return fromSummary
	if (isCurrent) return currentPlan
	return "free"
}

export default function Account() {
	const { user, org, organizations: allOrgs, setActiveOrg } = useAuth()
	const autumn = useCustomer()
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const [orgMenuOpen, setOrgMenuOpen] = useState(false)
	const canSwitchOrg = (allOrgs?.length ?? 0) > 1
	const { data: orgSummaries } = useOrgSummaries()

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

	const { currentPlan } = useTokenUsage(autumn)

	const planByOrgId = useMemo(() => {
		const map = new Map<string, PlanType>()
		for (const summary of orgSummaries ?? []) {
			map.set(summary.orgId, summary.plan)
		}
		return map
	}, [orgSummaries])

	const sortedOrgsForMenu = useMemo(() => {
		if (!allOrgs?.length) return []
		return [...allOrgs].sort((a, b) => {
			const planA = resolveOrgPlan(
				a.id,
				a.id === org?.id,
				currentPlan,
				planByOrgId,
			)
			const planB = resolveOrgPlan(
				b.id,
				b.id === org?.id,
				currentPlan,
				planByOrgId,
			)
			const rankDiff = PLAN_RANK[planB] - PLAN_RANK[planA]
			if (rankDiff !== 0) return rankDiff
			return a.name.localeCompare(b.name)
		})
	}, [allOrgs, org?.id, currentPlan, planByOrgId])

	const memberSince = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: "—"

	return (
		<div className="flex flex-col gap-8 w-full">
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
											className="w-80 max-h-80 overflow-y-auto bg-[#1B1F24] rounded-[12px] border-white/10 p-1.5 shadow-[0px_4px_16px_rgba(0,0,0,0.4)]"
										>
											{sortedOrgsForMenu.map((organization) => {
												const isCurrent = organization.id === org?.id
												const isSwitching = switchingOrgId === organization.id
												const plan = resolveOrgPlan(
													organization.id,
													isCurrent,
													currentPlan,
													planByOrgId,
												)
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
														<p className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.14px] text-[#FAFAFA]">
															{organization.name}
														</p>
														{isSwitching ? (
															<LoaderIcon className="size-4 shrink-0 animate-spin text-[#4BA0FA]" />
														) : isCurrent ? (
															<Check className="size-4 shrink-0 text-[#4BA0FA]" />
														) : (
															<span className="size-4 shrink-0" aria-hidden />
														)}
														<OrgPlanBadge plan={plan} />
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

			<section id="team-members" className="flex flex-col gap-4">
				<div className="flex items-center justify-between px-2">
					<SectionTitle>Team members</SectionTitle>
					{(org?.members?.length ?? 0) > 0 && (
						<span
							className={cn(
								dmSans125ClassName(),
								"text-[13px] tracking-[-0.13px] text-[#737373] tabular-nums pr-1",
							)}
						>
							{org?.members?.length}{" "}
							{org?.members?.length === 1 ? "member" : "members"}
						</span>
					)}
				</div>
				<SettingsCard>
					{org?.members && org.members.length > 0 ? (
						<ul className="flex flex-col">
							{[...org.members]
								.sort((a, b) => {
									const rolePriority = (r: string) =>
										r === "owner" ? 0 : r === "admin" ? 1 : 2
									const diff =
										rolePriority(a.role.toLowerCase()) -
										rolePriority(b.role.toLowerCase())
									if (diff !== 0) return diff
									return (a.user?.name ?? "").localeCompare(b.user?.name ?? "")
								})
								.map((m, idx) => {
									const isYou = m.userId === user?.id
									const name = m.user?.name ?? m.user?.email ?? "Unknown"
									return (
										<li
											key={m.id}
											className={cn(
												"flex items-center gap-3 py-2.5",
												idx > 0 && "border-t border-white/[0.04]",
											)}
										>
											<Avatar className="size-9 shrink-0 bg-[#0D121A]">
												<AvatarImage
													src={m.user?.image ?? ""}
													alt={name}
													className="object-cover"
												/>
												<AvatarFallback className="bg-transparent text-white text-[13px] font-medium">
													{(name.charAt(0) || "U").toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0 flex flex-col gap-0.5">
												<div className="flex items-center gap-2 min-w-0">
													<span
														className={cn(
															dmSans125ClassName(),
															"font-medium text-[14px] tracking-[-0.14px] text-[#FAFAFA] truncate",
														)}
													>
														{name}
													</span>
													{isYou && (
														<span
															className={cn(
																dmSans125ClassName(),
																"text-[10.5px] uppercase tracking-[0.1em] text-[#737373] font-mono",
															)}
														>
															You
														</span>
													)}
												</div>
												{m.user?.email && (
													<span
														className={cn(
															dmSans125ClassName(),
															"text-[12px] tracking-[-0.12px] text-[#737373] truncate",
														)}
													>
														{m.user.email}
													</span>
												)}
											</div>
											<RolePill role={m.role} />
										</li>
									)
								})}
						</ul>
					) : (
						<div className="flex items-center gap-3 py-2">
							<div className="size-9 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
								<Users className="size-4 text-[#737373]" />
							</div>
							<div className="flex flex-col">
								<span
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
									)}
								>
									Just you for now
								</span>
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] tracking-[-0.12px] text-[#737373]",
									)}
								>
									Invite teammates from your organization settings.
								</span>
							</div>
						</div>
					)}
				</SettingsCard>
			</section>
		</div>
	)
}
