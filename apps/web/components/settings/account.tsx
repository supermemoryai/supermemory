"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { Popover, PopoverContent } from "@ui/components/popover"
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
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
	LoaderIcon,
	ChevronDown,
	Users,
	UserPlus,
	Mail,
	MoreHorizontal,
	UserMinus,
	X,
	Pencil,
	Tag,
	Plus,
} from "lucide-react"
import { useQueryState } from "nuqs"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useContainerTags } from "@/hooks/use-container-tags"
import { PopoverAnchor } from "@ui/components/popover"
import { OrgContext } from "@/components/settings/org-context"
import { OrgPlanBadge } from "@/components/org-plan-badge"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { useCustomer } from "autumn-js/react"
import { FileText, Layers, Plug, Search } from "lucide-react"
import { $fetch } from "@lib/api"

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
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

const ROLE_LABELS: Record<string, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
}

type InviteRole = "admin" | "member"

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

export default function Account() {
	const { user, org, refetchActiveOrg, refetchOrganizations } = useAuth()
	const autumn = useCustomer()
	const { currentPlan, searchesUsed } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()
	const orgSummary = orgSummaries?.find((s) => s.orgId === org?.id)
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
	const [inviteEmail, setInviteEmail] = useState("")
	const [inviteRole, setInviteRole] = useState<InviteRole>("member")
	const [inviteAccessType, setInviteAccessType] = useState<
		"full" | "restricted"
	>("full")
	const [inviteAssignments, setInviteAssignments] = useState<
		{ containerTag: string; permission: "read" | "write" }[]
	>([])
	const [tagQuery, setTagQuery] = useState("")
	const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
	const [isEditingOrgName, setIsEditingOrgName] = useState(false)
	const [orgNameDraft, setOrgNameDraft] = useState("")
	const tagInputRef = useRef<HTMLInputElement>(null)
	const tagAnchorRef = useRef<HTMLDivElement>(null)
	const { allProjects: allContainerTags } = useContainerTags()

	const selectedTagSet = new Set(inviteAssignments.map((a) => a.containerTag))
	const filteredTags = useMemo(() => {
		const available = (allContainerTags ?? [])
			.map((t) => t.containerTag)
			.filter((t) => !selectedTagSet.has(t))
		if (!tagQuery) return available
		return available.filter((t) =>
			t.toLowerCase().includes(tagQuery.toLowerCase()),
		)
	}, [allContainerTags, selectedTagSet, tagQuery])

	const showAccessType = inviteRole === "member"
	const showTagPicker =
		inviteRole === "member" && inviteAccessType === "restricted"

	useEffect(() => {
		setOrgNameDraft(org?.name ?? "")
		setIsEditingOrgName(false)
	}, [org?.name])

	// Deep link: ?invite=1 (e.g. from the dashboard) opens the invite dialog.
	// Consumed below, once the role is known and only for admins/owners.
	const [inviteParam, setInviteParam] = useQueryState("invite")

	const activeMemberRoleQuery = useQuery({
		queryKey: ["organization", org?.id, "active-member-role"],
		queryFn: async () => {
			if (!org?.id) return null
			const result = await authClient.organization.getActiveMember({
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
	// Only treat as a personal single-member org when members are actually loaded —
	// otherwise default to least privilege (member), never owner.
	const membersLoaded = Array.isArray(org?.members)
	const isSingleMemberPersonalOrg =
		membersLoaded &&
		(org?.members?.length ?? 0) <= 1 &&
		(!org?.members?.[0]?.userId || org.members[0].userId === user?.id)
	const currentRole = (
		activeMemberRoleQuery.data ??
		currentMember?.role ??
		(isSingleMemberPersonalOrg ? "owner" : "member")
	).toLowerCase()
	const canManageTeam = currentRole === "owner" || currentRole === "admin"
	const isOwner = currentRole === "owner"

	// Consume ?invite=1 only after the role resolves, and only for managers.
	useEffect(() => {
		if (inviteParam !== "1" || activeMemberRoleQuery.isLoading) return
		if (canManageTeam) setInviteDialogOpen(true)
		setInviteParam(null)
	}, [
		inviteParam,
		activeMemberRoleQuery.isLoading,
		canManageTeam,
		setInviteParam,
	])

	const pendingInvitations = useMemo(
		() => (org?.invitations ?? []).filter(isPendingInvitation),
		[org?.invitations],
	)

	const showTeamCard =
		!canManageTeam ||
		pendingInvitations.length > 0 ||
		(org?.members?.length ?? 0) > 1

	const resetInviteForm = () => {
		setInviteEmail("")
		setInviteRole("member")
		setInviteAccessType("full")
		setInviteAssignments([])
		setTagQuery("")
	}

	const inviteMemberMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) throw new Error("No active organization")
			const email = inviteEmail.trim().toLowerCase()
			if (!email) throw new Error("Enter an email address")
			const isRestricted =
				inviteRole === "member" && inviteAccessType === "restricted"
			const result = await authClient.organization.inviteMember({
				email,
				role: inviteRole,
				organizationId: org.id,
				resend: true,
				...(isRestricted && inviteAssignments.length > 0
					? {
							data: {
								accessType: "restricted",
								containerTags: inviteAssignments,
							},
						}
					: {}),
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to invite teammate")
			}
			return result.data
		},
		onSuccess: async (invitation) => {
			resetInviteForm()
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

	const updateOrgNameMutation = useMutation({
		mutationFn: async (name: string) => {
			if (!org?.id) throw new Error("No active organization")
			const trimmed = name.trim()
			if (!trimmed) throw new Error("Enter an organization name")
			const result = await authClient.organization.update({
				organizationId: org.id,
				data: { name: trimmed },
			})
			if (result.error) {
				throw new Error(
					result.error.message ?? "Failed to update organization name",
				)
			}
			return trimmed
		},
		onSuccess: async (name) => {
			setOrgNameDraft(name)
			setIsEditingOrgName(false)
			await Promise.all([refetchActiveOrg(), refetchOrganizations()])
			toast.success("Organization name updated")
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to update organization name"))
		},
	})

	const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!canManageTeam || inviteMemberMutation.isPending) return
		inviteMemberMutation.mutate()
	}

	const handleOrgNameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!canManageTeam || updateOrgNameMutation.isPending) return
		const trimmed = orgNameDraft.trim()
		if (!trimmed || trimmed === org?.name) {
			setOrgNameDraft(org?.name ?? "")
			setIsEditingOrgName(false)
			return
		}
		updateOrgNameMutation.mutate(trimmed)
	}

	const memberSince = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: "—"

	return (
		<div className="flex flex-col gap-5 w-full">
			<section id="profile-details">
				<SettingsCard>
					<div className="flex flex-col gap-5">
						{/* Identity */}
						<div className="flex items-start gap-3">
							<div className="relative size-11 rounded-full bg-linear-to-b from-[#0D121A] to-black overflow-hidden shrink-0">
								<Avatar className="size-full">
									<AvatarImage
										src={user?.image ?? ""}
										alt={user?.name ?? "User"}
										className="object-cover"
									/>
									<AvatarFallback className="bg-transparent text-white text-base">
										{user?.name?.charAt(0) ?? "U"}
									</AvatarFallback>
								</Avatar>
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
								<p
									className={cn(
										dmSans125ClassName(),
										"truncate font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
									)}
								>
									{user?.name ?? "—"}
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"truncate text-[13px] tracking-[-0.13px] text-[#737373]",
									)}
								>
									{user?.email ?? "—"}
								</p>
							</div>
							<div className="shrink-0">
								<OrgPlanBadge plan={currentPlan} />
							</div>
						</div>

						{/* Fields */}
						<div className="flex items-start justify-between gap-4">
							<div className="flex min-w-0 flex-col gap-1">
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] tracking-[-0.12px] text-[#737373]",
									)}
								>
									Organization
								</span>
								{isEditingOrgName ? (
									<form
										onSubmit={handleOrgNameSubmit}
										className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[320px]"
									>
										<input
											value={orgNameDraft}
											onChange={(event) => setOrgNameDraft(event.target.value)}
											disabled={updateOrgNameMutation.isPending}
											maxLength={80}
											className={cn(
												dmSans125ClassName(),
												"h-8 min-w-0 flex-1 rounded-[9px] border border-white/10 bg-black/30 px-2.5 text-[13px] font-medium tracking-[-0.13px] text-[#FAFAFA] outline-none transition-colors placeholder:text-[#525252] focus:border-[#4BA0FA]/60",
											)}
											placeholder="Organization name"
										/>
										<button
											type="submit"
											disabled={
												updateOrgNameMutation.isPending ||
												!orgNameDraft.trim() ||
												orgNameDraft.trim() === org?.name
											}
											className={cn(
												dmSans125ClassName(),
												"inline-flex h-7 items-center justify-center gap-1 rounded-full border border-transparent bg-[#0D121A] px-2.5 text-[11px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50",
											)}
										>
											{updateOrgNameMutation.isPending ? (
												<LoaderIcon className="size-3 animate-spin" />
											) : null}
											Save
										</button>
										<button
											type="button"
											disabled={updateOrgNameMutation.isPending}
											aria-label="Cancel organization name edit"
											title="Cancel"
											onClick={() => {
												setOrgNameDraft(org?.name ?? "")
												setIsEditingOrgName(false)
											}}
											className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#737373] shadow-inside-out transition-colors hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50"
										>
											<X className="size-3.5" />
										</button>
									</form>
								) : (
									<div className="flex min-w-0 items-center gap-1.5">
										<span
											className={cn(
												dmSans125ClassName(),
												"truncate font-medium text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
											)}
										>
											{org?.name ?? "Personal"}
										</span>
										<span
											className={cn(
												dmSans125ClassName(),
												"inline-flex h-[18px] shrink-0 items-center justify-center rounded-[3px] bg-[#2E353D] px-1.5 text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-[#A3A3A3]",
											)}
										>
											{currentRole}
										</span>
										{canManageTeam ? (
											<button
												type="button"
												aria-label="Edit organization name"
												title="Edit organization name"
												onClick={() => {
													setOrgNameDraft(org?.name ?? "")
													setIsEditingOrgName(true)
												}}
												className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-white/5 hover:text-[#FAFAFA]"
											>
												<Pencil className="size-3" />
											</button>
										) : null}
									</div>
								)}
							</div>
							<div className="flex shrink-0 flex-col items-end gap-1 text-right">
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] tracking-[-0.12px] text-[#737373]",
									)}
								>
									Member since
								</span>
								<span
									className={cn(
										dmSans125ClassName(),
										"font-medium text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
									)}
								>
									{memberSince}
								</span>
							</div>
						</div>
					</div>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-3 px-1">
				<SectionTitle>Overview</SectionTitle>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{
							label: "Memories",
							value: orgSummary?.documentCount,
							icon: FileText,
						},
						{
							label: "Spaces",
							value: orgSummary?.containerTagCount,
							icon: Layers,
						},
						{
							label: "Connections",
							value: orgSummary?.activeConnectors,
							icon: Plug,
						},
						{ label: "Searches", value: searchesUsed, icon: Search },
					].map(({ label, value, icon: Icon }) => (
						<div
							key={label}
							className="flex flex-col gap-3 rounded-[14px] bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
						>
							<span className="flex size-8 items-center justify-center rounded-[10px] bg-[#0D121A] text-[#737373] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]">
								<Icon className="size-4" />
							</span>
							<div className="flex flex-col gap-0.5">
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[24px] font-semibold leading-none tracking-[-0.5px] text-[#FAFAFA] tabular-nums",
									)}
								>
									{typeof value === "number" ? value.toLocaleString() : "—"}
								</span>
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] tracking-[-0.12px] text-[#737373]",
									)}
								>
									{label}
								</span>
							</div>
						</div>
					))}
				</div>
			</section>

			{canManageTeam && <OrgContext />}

			<DigestPreferences />

			<section id="team-members" className="flex flex-col gap-4 px-1">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-col gap-1">
						<div className="flex items-baseline gap-1.5">
							<SectionTitle>Team members</SectionTitle>
							{(org?.members?.length ?? 0) > 0 && (
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] tabular-nums text-[#737373]",
									)}
								>
									{org?.members?.length}
								</span>
							)}
						</div>
						<p
							className={cn(
								dmSans125ClassName(),
								"text-[13px] tracking-[-0.13px] text-[#737373]",
							)}
						>
							Invite people into {org?.name ?? "your organization"} and manage
							their access.
						</p>
					</div>
					<div className="flex items-center gap-3">
						{canManageTeam && (
							<button
								type="button"
								onClick={() => setInviteDialogOpen(true)}
								disabled={!org?.id}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#14161A] px-4 text-[13px] font-semibold text-[#FAFAFA] shadow-inside-out transition-colors hover:bg-[#121820] disabled:cursor-not-allowed disabled:opacity-45",
								)}
							>
								<UserPlus className="size-3.5" />
								Invite member
							</button>
						)}
					</div>
				</div>
				{showTeamCard && (
					<div className="rounded-[14px] bg-[#14161A] p-2 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
						<div className="flex flex-col gap-2">
							{!canManageTeam && (
								<div className="flex items-center gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
									<div className="size-8 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
										<Users className="size-4 text-[#737373]" />
									</div>
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[12.5px] tracking-[-0.12px] text-[#737373]",
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

							{org?.members && org.members.length > 0 && (
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
										.map((m) => {
											const isYou = m.userId === user?.id
											const memberRole = m.role.toLowerCase()
											const name = m.user?.name ?? m.user?.email ?? "Unknown"
											const canEditMember =
												canManageTeam && !isYou && memberRole !== "owner"
											return (
												<li
													key={m.id}
													className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-white/[0.02]"
												>
													<Avatar className="size-8 shrink-0 bg-[#0D121A]">
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
							)}
						</div>
					</div>
				)}
			</section>

			<Dialog
				open={inviteDialogOpen}
				onOpenChange={(open) => {
					setInviteDialogOpen(open)
					if (!open && !inviteMemberMutation.isPending) {
						resetInviteForm()
					}
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-[480px] border-none bg-[#1B1F24] p-0 gap-0 rounded-[22px] overflow-hidden"
				>
					<div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
						<div className="flex flex-col gap-1">
							<DialogTitle
								className={cn(
									dmSans125ClassName(),
									"text-[18px] font-semibold tracking-[-0.18px] text-[#FAFAFA]",
								)}
							>
								Invite teammate
							</DialogTitle>
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[13px] tracking-[-0.13px] text-[#737373]",
								)}
							>
								Send an invitation to join your organization.
							</p>
						</div>
						<DialogPrimitive.Close
							className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] bg-[#0D121A] transition-opacity hover:opacity-100 focus:outline-hidden"
							style={{
								boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
							}}
						>
							<X className="size-4" stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<form onSubmit={handleInviteSubmit} className="flex flex-col">
						<div className="flex flex-col gap-5 px-6">
							{/* Email */}
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="team-invite-email"
									className={cn(
										dmSans125ClassName(),
										"text-[13px] font-medium text-[#FAFAFA]",
									)}
								>
									Email
								</label>
								<div className="relative min-w-0">
									<Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#525D6E]" />
									<input
										id="team-invite-email"
										type="email"
										value={inviteEmail}
										onChange={(event) => setInviteEmail(event.target.value)}
										placeholder="colleague@company.com"
										autoComplete="email"
										className={cn(
											dmSans125ClassName(),
											"h-10 w-full rounded-[10px] border border-white/[0.06] bg-white/[0.02] pl-9 pr-3 text-[14px] text-[#FAFAFA] placeholder:text-[#525D6E] outline-none transition-colors focus:border-[#2261CA33]",
										)}
									/>
								</div>
							</div>

							{/* Role */}
							<div className="flex flex-col gap-1.5">
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] font-medium text-[#FAFAFA]",
									)}
								>
									Role
								</p>
								<Select
									value={inviteRole}
									onValueChange={(value) => {
										const role = value as InviteRole
										setInviteRole(role)
										if (role === "admin") {
											setInviteAccessType("full")
											setInviteAssignments([])
										}
									}}
								>
									<SelectTrigger className="h-9 w-full rounded-[10px] border-white/[0.08] bg-[#0D0F14] text-[#FAFAFA]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="member">Member</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Access type (only for Member) */}
							{showAccessType && (
								<div className="flex flex-col gap-1.5">
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[13px] font-medium text-[#FAFAFA]",
										)}
									>
										Access
									</p>
									<div className="grid grid-cols-2 gap-2">
										{(["full", "restricted"] as const).map((type) => {
											const selected = inviteAccessType === type
											return (
												<button
													key={type}
													type="button"
													onClick={() => {
														setInviteAccessType(type)
														if (type === "full") setInviteAssignments([])
													}}
													className={cn(
														dmSans125ClassName(),
														"flex items-center justify-center h-9 rounded-[10px] border text-[13px] font-medium transition-colors cursor-pointer",
														selected
															? "border-white/10 bg-[#14161A] text-[#FAFAFA] shadow-inside-out"
															: "border-[#161F2C] bg-[#0D121A] text-[#737373] hover:bg-[#14161A] hover:text-[#FAFAFA]",
													)}
												>
													{type === "full" ? "Full Access" : "Restricted"}
												</button>
											)
										})}
									</div>
								</div>
							)}

							{/* Container tag picker (only for Restricted) */}
							{showTagPicker && (
								<div className="flex flex-col gap-2">
									<p
										className={cn(
											dmSans125ClassName(),
											"text-[13px] font-medium text-[#FAFAFA]",
										)}
									>
										Spaces
									</p>

									<Popover
										open={
											tagDropdownOpen &&
											(filteredTags.length > 0 ||
												(tagQuery.trim().length > 0 &&
													!selectedTagSet.has(tagQuery.trim())))
										}
										onOpenChange={setTagDropdownOpen}
									>
										<PopoverAnchor asChild>
											<div
												ref={tagAnchorRef}
												className={cn(
													"relative flex items-center w-full h-10",
													"rounded-[10px] border border-white/[0.06] bg-white/[0.02]",
													"transition-colors focus-within:border-[#2261CA33]",
												)}
											>
												<input
													ref={tagInputRef}
													type="text"
													value={tagQuery}
													onChange={(e) => {
														setTagQuery(e.target.value)
														if (!tagDropdownOpen) setTagDropdownOpen(true)
													}}
													onClick={() => setTagDropdownOpen(true)}
													onFocus={() => setTagDropdownOpen(true)}
													placeholder="Search or create spaces..."
													className={cn(
														dmSans125ClassName(),
														"h-full w-full bg-transparent pl-3 pr-8 text-[13px] text-[#FAFAFA] placeholder:text-[#525D6E] outline-none",
													)}
												/>
												<ChevronDown
													className={cn(
														"absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-[#525D6E] pointer-events-none transition-transform",
														tagDropdownOpen && "rotate-180",
													)}
												/>
											</div>
										</PopoverAnchor>
										<PopoverContent
											align="start"
											sideOffset={4}
											className="w-[var(--radix-popover-trigger-width)] p-1 max-h-[200px] overflow-y-auto bg-[#1B1F24] border border-white/[0.08] rounded-[10px] shadow-[0px_4px_16px_rgba(0,0,0,0.4)]"
											onOpenAutoFocus={(e) => e.preventDefault()}
											onPointerDownOutside={(e) => {
												if (tagAnchorRef.current?.contains(e.target as Node)) {
													e.preventDefault()
												}
											}}
										>
											{filteredTags.map((tag) => (
												<button
													key={tag}
													type="button"
													onClick={() => {
														if (!selectedTagSet.has(tag)) {
															setInviteAssignments([
																...inviteAssignments,
																{ containerTag: tag, permission: "read" },
															])
														}
														setTagQuery("")
														setTagDropdownOpen(false)
													}}
													onMouseDown={(e) => e.preventDefault()}
													className={cn(
														dmSans125ClassName(),
														"flex items-center gap-2 w-full h-8 px-3 text-[13px] text-[#FAFAFA] rounded-[8px] cursor-pointer hover:bg-white/[0.06]",
													)}
												>
													<Tag className="size-3.5 text-[#525D6E]" />
													{tag}
												</button>
											))}
											{tagQuery.trim().length > 0 &&
												!selectedTagSet.has(tagQuery.trim()) &&
												!(allContainerTags ?? []).some(
													(t) =>
														t.containerTag.toLowerCase() ===
														tagQuery.trim().toLowerCase(),
												) && (
													<button
														type="button"
														onClick={() => {
															const sanitized = tagQuery.trim()
															if (!selectedTagSet.has(sanitized)) {
																setInviteAssignments([
																	...inviteAssignments,
																	{
																		containerTag: sanitized,
																		permission: "read",
																	},
																])
															}
															setTagQuery("")
															setTagDropdownOpen(false)
														}}
														onMouseDown={(e) => e.preventDefault()}
														className={cn(
															dmSans125ClassName(),
															"flex items-center gap-2 w-full h-8 px-3 text-[13px] text-[#8FC8FF] rounded-[8px] cursor-pointer hover:bg-white/[0.06]",
														)}
													>
														<Plus className="size-3.5" />
														Create &ldquo;{tagQuery.trim()}&rdquo;
													</button>
												)}
										</PopoverContent>
									</Popover>

									{/* Selected tags */}
									{inviteAssignments.length > 0 && (
										<div className="flex flex-col rounded-[10px] border border-white/[0.06] overflow-hidden">
											{inviteAssignments.map((a) => (
												<div
													key={a.containerTag}
													className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0 bg-white/[0.015]"
												>
													<button
														type="button"
														onClick={() =>
															setInviteAssignments(
																inviteAssignments.filter(
																	(t) => t.containerTag !== a.containerTag,
																),
															)
														}
														className="text-[#525D6E] hover:text-[#C73B1B] transition-colors shrink-0"
													>
														<X className="size-3.5" />
													</button>
													<span
														className={cn(
															dmSans125ClassName(),
															"text-[13px] text-[#FAFAFA] truncate min-w-0 flex-1",
														)}
													>
														{a.containerTag}
													</span>
													<div className="grid grid-cols-2 gap-1 shrink-0">
														{(["read", "write"] as const).map((perm) => {
															const active = a.permission === perm
															return (
																<button
																	key={perm}
																	type="button"
																	onClick={() =>
																		setInviteAssignments(
																			inviteAssignments.map((t) =>
																				t.containerTag === a.containerTag
																					? { ...t, permission: perm }
																					: t,
																			),
																		)
																	}
																	className={cn(
																		dmSans125ClassName(),
																		"h-7 px-3 rounded-[8px] border text-[12px] font-medium transition-colors cursor-pointer capitalize",
																		active
																			? "border-white/10 bg-[#14161A] text-[#FAFAFA] shadow-inside-out"
																			: "border-[#161F2C] bg-[#0D121A] text-[#737373] hover:bg-[#14161A] hover:text-[#FAFAFA]",
																	)}
																>
																	{perm}
																</button>
															)
														})}
													</div>
												</div>
											))}
										</div>
									)}

									{inviteAssignments.length === 0 && (
										<p
											className={cn(
												dmSans125ClassName(),
												"text-[12px] text-[#525D6E]",
											)}
										>
											Select at least one space
										</p>
									)}
								</div>
							)}
						</div>

						<div className="flex justify-end gap-2 px-6 py-4 mt-5">
							<button
								type="button"
								onClick={() => setInviteDialogOpen(false)}
								className={cn(
									dmSans125ClassName(),
									"h-9 rounded-full px-4 text-[13px] font-medium text-[#737373] transition-colors hover:bg-white/[0.04] hover:text-white",
								)}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={
									!inviteEmail.trim() ||
									!org?.id ||
									inviteMemberMutation.isPending ||
									(showTagPicker && inviteAssignments.length === 0)
								}
								title={
									showTagPicker && inviteAssignments.length === 0
										? "Select at least one space for restricted access"
										: !inviteEmail.trim()
											? "Enter an email address to send an invite"
											: undefined
								}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#14161A] px-4 text-[13px] font-semibold text-[#FAFAFA] shadow-inside-out transition-colors hover:bg-[#121820] disabled:cursor-not-allowed disabled:opacity-45",
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

function DigestPreferences() {
	const { data, isLoading } = useQuery({
		queryKey: ["digest-preferences"],
		queryFn: async () => {
			const res = await $fetch("@get/digests/preferences")
			if (res.error) throw new Error("Failed")
			return res.data as { digestOptOut: boolean }
		},
	})

	const mutation = useMutation({
		mutationFn: async (digestOptOut: boolean) => {
			const res = await $fetch("@post/digests/preferences", {
				body: { digestOptOut },
			})
			if (res.error) throw new Error("Failed")
			return res.data as { digestOptOut: boolean }
		},
		onError: () => toast.error("Failed to update preference"),
	})

	const optOut = mutation.data?.digestOptOut ?? data?.digestOptOut ?? false

	return (
		<section className="flex flex-col gap-3 px-1">
			<SectionTitle>Notifications</SectionTitle>
			<SettingsCard>
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col gap-0.5">
						<p
							className={cn(
								dmSans125ClassName(),
								"text-[13px] font-medium text-[#FAFAFA]",
							)}
						>
							Weekly digest
						</p>
						<p
							className={cn(dmSans125ClassName(), "text-[12px] text-[#6B6B6B]")}
						>
							Personalized weekly recap of your memories, delivered every Monday
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={!optOut}
						disabled={isLoading || mutation.isPending}
						onClick={() => mutation.mutate(!optOut)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
							!optOut ? "bg-[#2563FF]" : "bg-white/10",
						)}
					>
						<span
							className={cn(
								"pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
								!optOut ? "translate-x-4" : "translate-x-0",
							)}
						/>
					</button>
				</div>
			</SettingsCard>
		</section>
	)
}
