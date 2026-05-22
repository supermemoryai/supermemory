"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import {
	PLAN_DISPLAY_NAMES,
	PLAN_RANK,
	useTokenUsage,
	type PlanType,
} from "@/hooks/use-token-usage"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
	Check,
	LoaderIcon,
	ChevronDown,
	Building2,
	Users,
	UserPlus,
	Mail,
	MoreHorizontal,
	UserMinus,
	ShieldCheck,
	X,
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

type InviteRole = "admin" | "member"

const INVITE_PERMISSION_OPTIONS: Record<
	InviteRole,
	{ title: string; description: string; permissions: string[] }
> = {
	member: {
		title: "Member access",
		description: "Use the organization workspace with standard access.",
		permissions: ["Read organization access", "Use shared memories"],
	},
	admin: {
		title: "Admin access",
		description: "Manage teammates and organization-level team settings.",
		permissions: [
			"Invite and cancel invitations",
			"Change member roles",
			"Remove members",
			"Update organization settings",
		],
	},
}

function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) return error.message
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message
	}
	return fallback
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

function isPendingInvitation(invitation: {
	status?: string
	expiresAt?: Date | string
}) {
	if (invitation.status && invitation.status.toLowerCase() !== "pending") {
		return false
	}
	if (!invitation.expiresAt) return true
	return new Date(invitation.expiresAt).getTime() > Date.now()
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
	const {
		user,
		org,
		organizations: allOrgs,
		setActiveOrg,
		refetchActiveOrg,
	} = useAuth()
	const autumn = useCustomer()
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const [orgMenuOpen, setOrgMenuOpen] = useState(false)
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
	const [inviteEmail, setInviteEmail] = useState("")
	const [inviteRole, setInviteRole] = useState<InviteRole>("member")
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

	const activeMemberRoleQuery = useQuery({
		queryKey: ["organization", org?.id, "active-member-role"],
		queryFn: async () => {
			if (!org?.id) return null
			const result = await authClient.organization.getActiveMemberRole({
				query: { organizationId: org.id },
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to load team role")
			}
			return result.data?.role ?? null
		},
		enabled: !!org?.id,
		retry: false,
	})

	const currentMember = useMemo(
		() => org?.members?.find((member) => member.userId === user?.id) ?? null,
		[org?.members, user?.id],
	)
	const isSingleMemberPersonalOrg =
		(org?.members?.length ?? 0) <= 1 &&
		(!org?.members?.[0]?.userId || org.members[0].userId === user?.id)
	const currentRole = isSingleMemberPersonalOrg
		? "owner"
		: (
				activeMemberRoleQuery.data ??
				currentMember?.role ??
				"member"
			).toLowerCase()
	const canManageTeam = currentRole === "owner" || currentRole === "admin"
	const isOwner = currentRole === "owner"

	const pendingInvitations = useMemo(
		() => (org?.invitations ?? []).filter(isPendingInvitation),
		[org?.invitations],
	)

	const inviteMemberMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) throw new Error("No active organization")
			const email = inviteEmail.trim().toLowerCase()
			if (!email) throw new Error("Enter an email address")
			const result = await authClient.organization.inviteMember({
				email,
				role: inviteRole,
				organizationId: org.id,
				resend: true,
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to invite teammate")
			}
			return result.data
		},
		onSuccess: async (invitation) => {
			setInviteEmail("")
			setInviteRole("member")
			setInviteDialogOpen(false)
			await refetchActiveOrg()
			toast.success("Invitation sent", {
				description: invitation?.email
					? `${invitation.email} can now join ${org?.name ?? "your organization"}.`
					: undefined,
			})
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to invite teammate"))
		},
	})

	const updateMemberRoleMutation = useMutation({
		mutationFn: async ({
			memberId,
			role,
		}: {
			memberId: string
			role: InviteRole
		}) => {
			if (!org?.id) throw new Error("No active organization")
			const result = await authClient.organization.updateMemberRole({
				memberId,
				role,
				organizationId: org.id,
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to update role")
			}
			return result.data
		},
		onSuccess: async () => {
			await refetchActiveOrg()
			toast.success("Role updated")
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to update role"))
		},
	})

	const removeMemberMutation = useMutation({
		mutationFn: async (memberIdOrEmail: string) => {
			if (!org?.id) throw new Error("No active organization")
			const result = await authClient.organization.removeMember({
				memberIdOrEmail,
				organizationId: org.id,
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to remove member")
			}
			return result.data
		},
		onSuccess: async () => {
			await refetchActiveOrg()
			toast.success("Member removed")
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to remove member"))
		},
	})

	const cancelInvitationMutation = useMutation({
		mutationFn: async (invitationId: string) => {
			const result = await authClient.organization.cancelInvitation({
				invitationId,
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to cancel invitation")
			}
			return result.data
		},
		onSuccess: async () => {
			await refetchActiveOrg()
			toast.success("Invitation canceled")
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to cancel invitation"))
		},
	})

	const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!canManageTeam || inviteMemberMutation.isPending) return
		inviteMemberMutation.mutate()
	}

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
				<div className="flex flex-wrap items-center justify-between gap-3 px-2">
					<div className="flex flex-col gap-1">
						<SectionTitle>Team members</SectionTitle>
						<p
							className={cn(
								dmSans125ClassName(),
								"text-[13px] tracking-[-0.13px] text-[#737373] px-2",
							)}
						>
							Invite people into {org?.name ?? "your organization"} and manage
							their access.
						</p>
					</div>
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
					<div className="flex flex-col gap-5">
						{canManageTeam ? (
							<div className="flex flex-col gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 md:flex-row md:items-center md:justify-between">
								<div className="flex min-w-0 items-center gap-3">
									<div className="size-9 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
										<UserPlus className="size-4 text-[#737373]" />
									</div>
									<div className="min-w-0">
										<p
											className={cn(
												dmSans125ClassName(),
												"text-[14px] font-medium tracking-[-0.14px] text-[#FAFAFA]",
											)}
										>
											Invite teammate
										</p>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-[12px] tracking-[-0.12px] text-[#737373]",
											)}
										>
											Choose role and permission preset before sending.
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setInviteDialogOpen(true)}
									disabled={!org?.id}
									className={cn(
										dmSans125ClassName(),
										"inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#4BA0FA] px-4 text-[14px] font-semibold text-[#00171A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45",
									)}
								>
									<UserPlus className="size-4" />
									Invite member
								</button>
							</div>
						) : (
							<div className="flex items-center gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3">
								<div className="size-9 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
									<Users className="size-4 text-[#737373]" />
								</div>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] tracking-[-0.13px] text-[#737373]",
									)}
								>
									Only organization owners and admins can invite teammates or
									change roles.
								</p>
							</div>
						)}

						{pendingInvitations.length > 0 && (
							<div className="flex flex-col gap-2">
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[11px] uppercase tracking-[0.12em] text-[#737373] font-mono",
									)}
								>
									Pending invitations
								</p>
								<ul className="flex flex-col rounded-[12px] border border-white/[0.05] overflow-hidden">
									{pendingInvitations.map((invitation) => (
										<li
											key={invitation.id}
											className="flex items-center gap-3 px-3 py-2.5 border-t border-white/[0.04] first:border-t-0 bg-white/[0.015]"
										>
											<div className="size-9 rounded-full bg-[#0D121A] flex items-center justify-center shrink-0">
												<Mail className="size-4 text-[#737373]" />
											</div>
											<div className="min-w-0 flex-1">
												<p
													className={cn(
														dmSans125ClassName(),
														"truncate text-[14px] font-medium tracking-[-0.14px] text-[#FAFAFA]",
													)}
												>
													{invitation.email}
												</p>
												<p
													className={cn(
														dmSans125ClassName(),
														"text-[12px] tracking-[-0.12px] text-[#737373]",
													)}
												>
													Invited as {formatRole(invitation.role)}
												</p>
											</div>
											{canManageTeam && (
												<div className="flex shrink-0 items-center gap-1">
													<button
														type="button"
														disabled={cancelInvitationMutation.isPending}
														onClick={() =>
															cancelInvitationMutation.mutate(invitation.id)
														}
														className="flex size-8 items-center justify-center rounded-[8px] text-[#8A5247] hover:bg-[#1A0F0C]/60 hover:text-[#C73B1B] disabled:opacity-50"
														aria-label={`Cancel invitation for ${invitation.email}`}
														title="Cancel invitation"
													>
														<X className="size-4" />
													</button>
												</div>
											)}
										</li>
									))}
								</ul>
							</div>
						)}

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
										return (a.user?.name ?? "").localeCompare(
											b.user?.name ?? "",
										)
									})
									.map((m, idx) => {
										const isYou = m.userId === user?.id
										const memberRole = m.role.toLowerCase()
										const name = m.user?.name ?? m.user?.email ?? "Unknown"
										const canEditMember =
											canManageTeam && !isYou && memberRole !== "owner"
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
												{canEditMember ? (
													<Select
														value={memberRole}
														onValueChange={(value) => {
															if (value === memberRole) return
															updateMemberRoleMutation.mutate({
																memberId: m.id,
																role: value as InviteRole,
															})
														}}
													>
														<SelectTrigger className="h-8 w-[112px] rounded-[8px] border-white/[0.08] bg-[#0D0F14] text-[#FAFAFA]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="member">Member</SelectItem>
															<SelectItem value="admin">Admin</SelectItem>
														</SelectContent>
													</Select>
												) : (
													<RolePill role={m.role} />
												)}
												{canEditMember && (
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<button
																type="button"
																className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[#737373] hover:bg-white/[0.05] hover:text-[#FAFAFA]"
																aria-label={`Team actions for ${name}`}
															>
																<MoreHorizontal className="size-4" />
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end" className="w-44">
															<DropdownMenuItem
																className="text-[#C73B1B] focus:text-[#C73B1B]"
																onSelect={() =>
																	removeMemberMutation.mutate(m.id)
																}
																disabled={
																	removeMemberMutation.isPending || !isOwner
																}
															>
																<UserMinus className="size-4" />
																Remove member
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
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
										Invite teammates to start collaborating.
									</span>
								</div>
							</div>
						)}
					</div>
				</SettingsCard>
			</section>

			<Dialog
				open={inviteDialogOpen}
				onOpenChange={(open) => {
					setInviteDialogOpen(open)
					if (!open && !inviteMemberMutation.isPending) {
						setInviteEmail("")
						setInviteRole("member")
					}
				}}
			>
				<DialogContent className="sm:max-w-lg bg-[#14161A] border-white/10 text-[#FAFAFA]">
					<DialogHeader>
						<DialogTitle
							className={cn(
								dmSans125ClassName(),
								"text-[20px] font-semibold tracking-[-0.2px]",
							)}
						>
							Invite teammate
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleInviteSubmit} className="flex flex-col gap-5">
						<div className="flex flex-col gap-2">
							<label
								htmlFor="team-invite-email"
								className={cn(
									dmSans125ClassName(),
									"text-[13px] font-medium text-[#A3A3A3]",
								)}
							>
								Email address
							</label>
							<div className="relative min-w-0">
								<Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
								<input
									id="team-invite-email"
									type="email"
									value={inviteEmail}
									onChange={(event) => setInviteEmail(event.target.value)}
									placeholder="teammate@company.com"
									autoComplete="email"
									className={cn(
										dmSans125ClassName(),
										"h-10 w-full rounded-[10px] border border-white/[0.08] bg-[#0D0F14] pl-9 pr-3 text-[14px] text-[#FAFAFA] placeholder:text-[#525D6E] outline-none transition-colors focus:border-[#4BA0FA]/50",
									)}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[13px] font-medium text-[#A3A3A3]",
								)}
							>
								Role
							</p>
							<div className="grid grid-cols-2 gap-2">
								{(["member", "admin"] as const).map((role) => {
									const selected = inviteRole === role
									return (
										<button
											key={role}
											type="button"
											onClick={() => setInviteRole(role)}
											className={cn(
												dmSans125ClassName(),
												"rounded-[10px] border px-3 py-2 text-left transition-colors",
												selected
													? "border-[#4BA0FA]/60 bg-[#4BA0FA]/10 text-[#FAFAFA]"
													: "border-white/[0.08] bg-[#0D0F14] text-[#A3A3A3] hover:bg-white/[0.04]",
											)}
										>
											<span className="block text-[14px] font-semibold">
												{formatRole(role)}
											</span>
											<span className="block text-[12px] text-[#737373]">
												{INVITE_PERMISSION_OPTIONS[role].description}
											</span>
										</button>
									)
								})}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[13px] font-medium text-[#A3A3A3]",
								)}
							>
								Permissions
							</p>
							<div className="grid grid-cols-1 gap-2">
								{(["member", "admin"] as const).map((role) => {
									const option = INVITE_PERMISSION_OPTIONS[role]
									const selected = inviteRole === role
									return (
										<button
											key={role}
											type="button"
											onClick={() => setInviteRole(role)}
											className={cn(
												"flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors",
												selected
													? "border-[#4BA0FA]/60 bg-[#4BA0FA]/10"
													: "border-white/[0.08] bg-[#0D0F14] hover:bg-white/[0.04]",
											)}
										>
											<div
												className={cn(
													"mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
													selected
														? "bg-[#4BA0FA]/15 text-[#4BA0FA]"
														: "bg-white/[0.04] text-[#737373]",
												)}
											>
												<ShieldCheck className="size-4" />
											</div>
											<div className="min-w-0 flex-1">
												<p
													className={cn(
														dmSans125ClassName(),
														"text-[14px] font-semibold tracking-[-0.14px] text-[#FAFAFA]",
													)}
												>
													{option.title}
												</p>
												<ul className="mt-1 flex flex-col gap-0.5">
													{option.permissions.map((permission) => (
														<li
															key={permission}
															className={cn(
																dmSans125ClassName(),
																"text-[12px] tracking-[-0.12px] text-[#737373]",
															)}
														>
															{permission}
														</li>
													))}
												</ul>
											</div>
											<span
												className={cn(
													"mt-1 size-3 rounded-full border",
													selected
														? "border-[#4BA0FA] bg-[#4BA0FA]"
														: "border-white/20",
												)}
												aria-hidden
											/>
										</button>
									)
								})}
							</div>
						</div>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setInviteDialogOpen(false)}
								className={cn(
									dmSans125ClassName(),
									"h-10 rounded-[10px] border border-white/[0.08] px-4 text-[14px] font-medium text-[#A3A3A3] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA]",
								)}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={
									!inviteEmail.trim() ||
									!org?.id ||
									inviteMemberMutation.isPending
								}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#4BA0FA] px-4 text-[14px] font-semibold text-[#00171A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45",
								)}
							>
								{inviteMemberMutation.isPending ? (
									<LoaderIcon className="size-4 animate-spin" />
								) : (
									<UserPlus className="size-4" />
								)}
								Send invite
							</button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
