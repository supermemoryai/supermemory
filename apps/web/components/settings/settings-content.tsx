"use client"

import { Logo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import NovaOrb from "@/components/nova/nova-orb"
import { useEffect, useRef, useState } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import Account from "@/components/settings/account"
import Billing from "@/components/settings/billing"
import Integrations from "@/components/settings/integrations"
import ConnectionsMCP from "@/components/settings/connections-mcp"
import Support from "@/components/settings/support"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useIsMobile } from "@hooks/use-mobile"
import { useLocalStorageUsername } from "@hooks/use-local-storage-username"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import {
	LogOut,
	RotateCcw,
	Trash2,
	Sun,
	LoaderIcon,
	User as UserIcon,
	Zap,
	HelpCircle,
	CreditCard,
	ShieldAlert,
	ChevronRight,
	ArrowUpRight,
	Building2,
	X,
} from "lucide-react"
import { authClient } from "@lib/auth"
import {
	Dialog,
	DialogContent,
	DialogClose,
	DialogTitle,
} from "@ui/components/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { useResetOrganization } from "@/hooks/use-reset-organization"
import { useDeleteUserAccount } from "@/hooks/use-account-settings"
import { useDeleteOrganization } from "@/hooks/use-delete-organization"
import { SettingsOrgSwitcher } from "@/components/settings/settings-org-switcher"

export const TABS = [
	"account",
	"billing",
	"integrations",
	"connections",
	"support",
] as const
export type SettingsTab = (typeof TABS)[number]

type NavItem = {
	id: SettingsTab
	label: string
	description: string
	icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
	{
		id: "account",
		label: "Account",
		description: "Your profile and organization",
		icon: <UserIcon className="size-[18px]" />,
	},
	{
		id: "billing",
		label: "Billing",
		description: "Plan, usage and payments",
		icon: <CreditCard className="size-[18px]" />,
	},
	{
		id: "integrations",
		label: "Integrations",
		description: "Save, sync and search across tools",
		icon: <Sun className="size-[18px]" />,
	},
	{
		id: "connections",
		label: "Connections & MCP",
		description: "Drive, Notion, OneDrive, MCP",
		icon: <Zap className="size-[18px]" />,
	},
	{
		id: "support",
		label: "Support & Help",
		description: "Get help or share feedback",
		icon: <HelpCircle className="size-[18px]" />,
	},
]

const MODAL_SURFACE_SHADOW =
	"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset"

const INSET_SHADOW = "inset 1.313px 1.313px 3.938px rgba(0,0,0,0.7)"

export function parseHashToTab(hash: string): SettingsTab {
	const cleaned = hash.replace("#", "").toLowerCase()
	return TABS.includes(cleaned as SettingsTab)
		? (cleaned as SettingsTab)
		: "account"
}

function IdentityCard({ displayName }: { displayName: string }) {
	const firstName = displayName?.split(" ")[0] || ""

	return (
		<div className="relative flex items-center justify-center h-[140px]">
			<NovaOrb size={150} className="blur-[3px]!" />
			<div className="absolute inset-0 flex items-center justify-center z-10">
				<Logo className="h-7 shrink-0 text-white" />
				<div
					className={cn(
						"flex flex-col items-start justify-center ml-3.5",
						dmSansClassName(),
					)}
				>
					<p className="text-white text-[14px] font-medium leading-none">
						{firstName ? `${firstName}'s` : "Your"}
					</p>
					<p className="text-white font-bold text-[20px] leading-none mt-1">
						supermemory
					</p>
				</div>
			</div>
		</div>
	)
}

export function SettingsContent({
	activeTab,
	onTabChange,
	dialogPortalContainer,
	className,
	showIdentity = true,
}: {
	activeTab: SettingsTab
	onTabChange: (tab: SettingsTab) => void
	dialogPortalContainer?: HTMLElement | null
	className?: string
	showIdentity?: boolean
}) {
	const { user, org, organizations, setActiveOrg, clearActiveOrg } = useAuth()

	const isCompanyBrain = useHasCompanyBrain()
	// Company Brain orgs manage tools in the Configure view; hide the generic tabs.
	const navItems = isCompanyBrain
		? NAV_ITEMS.filter(
				(item) => item.id !== "integrations" && item.id !== "connections",
			)
		: NAV_ITEMS
	const router = useRouter()
	const isMobile = useIsMobile()
	const localStorageUsername = useLocalStorageUsername()

	const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
	const [resetConfirmation, setResetConfirmation] = useState("")
	const resetOrganization = useResetOrganization()

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("")
	const deleteUserAccount = useDeleteUserAccount()

	const [isDeleteOrgDialogOpen, setIsDeleteOrgDialogOpen] = useState(false)
	const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("")
	const deleteOrgInputRef = useRef<HTMLInputElement>(null)
	const deleteOrgDialogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	)
	const deleteOrganization = useDeleteOrganization()
	const activeOrgId = org?.id
	const previousOrgIdRef = useRef(activeOrgId)

	// Only owners can delete the organization.
	const activeMemberRoleQuery = useQuery({
		queryKey: ["organization", org?.id, "active-member-role"],
		queryFn: async () => {
			const result = await authClient.organization.getActiveMember()
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to load team role")
			}
			return result.data?.role ?? null
		},
		enabled: !!org?.id,
		staleTime: 60_000,
	})
	const isOwner = (activeMemberRoleQuery.data ?? "").toLowerCase() === "owner"

	const [dangerMenuOpen, setDangerMenuOpen] = useState(false)

	useEffect(() => {
		if (previousOrgIdRef.current === activeOrgId) return
		previousOrgIdRef.current = activeOrgId
		setDangerMenuOpen(false)
		setIsDeleteOrgDialogOpen(false)
		setDeleteOrgConfirm("")
	}, [activeOrgId])

	useEffect(() => {
		if (!isDeleteOrgDialogOpen) return

		document.body.style.pointerEvents = ""
		const focusTimer = setTimeout(() => {
			deleteOrgInputRef.current?.focus()
		}, 0)

		return () => clearTimeout(focusTimer)
	}, [isDeleteOrgDialogOpen])

	useEffect(() => {
		return () => {
			if (deleteOrgDialogTimerRef.current) {
				clearTimeout(deleteOrgDialogTimerRef.current)
			}
		}
	}, [])

	const openDeleteOrganizationDialog = () => {
		setDangerMenuOpen(false)
		setDeleteOrgConfirm("")
		if (deleteOrgDialogTimerRef.current) {
			clearTimeout(deleteOrgDialogTimerRef.current)
		}
		deleteOrgDialogTimerRef.current = setTimeout(() => {
			document.body.style.pointerEvents = ""
			setIsDeleteOrgDialogOpen(true)
			deleteOrgDialogTimerRef.current = null
		}, 120)
	}

	const displayName =
		user?.displayUsername ||
		localStorageUsername ||
		user?.name ||
		user?.email?.split("@")[0] ||
		""

	const handleLogout = async () => {
		await authClient.signOut()
		router.push("/login")
	}

	const handleIntegrations = () => {
		void router.push("/integrations")
	}

	const handleDeleteAccount = async () => {
		if (deleteEmailConfirm !== user?.email) return
		deleteUserAccount.mutate(
			{ confirmation: deleteEmailConfirm },
			{
				onSuccess: () => {
					setIsDeleteDialogOpen(false)
					setDeleteEmailConfirm("")
					router.push("/login")
				},
			},
		)
	}

	const handleDeleteOrganization = async () => {
		if (!org || deleteOrgConfirm !== org.name) return
		deleteOrganization.mutate(org.id, {
			onSuccess: async () => {
				setIsDeleteOrgDialogOpen(false)
				setDeleteOrgConfirm("")
				const remaining = (organizations ?? []).filter((o) => o.id !== org.id)
				if (remaining[0]) {
					await setActiveOrg(remaining[0].slug)
					window.location.href = "/"
				} else {
					await clearActiveOrg()
					window.location.href = "/onboarding"
				}
			},
		})
	}

	return (
		<>
			<div
				className={cn("flex flex-col md:flex-row gap-4 md:gap-5", className)}
			>
				{/* Left rail */}
				<aside className="md:flex md:h-full md:min-h-0 md:w-[248px] md:flex-col shrink-0">
					{showIdentity && !isMobile && (
						<div className="mb-4">
							<IdentityCard displayName={displayName} />
						</div>
					)}

					<div className="mb-3">
						<SettingsOrgSwitcher />
					</div>

					<nav
						className={cn(
							"flex",
							isMobile
								? "flex-row gap-2 overflow-x-auto pb-2 scrollbar-thin"
								: "min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
							dmSansClassName(),
						)}
					>
						{navItems.map((item) => {
							const isExternal = item.id === "integrations"
							const isActive = !isExternal && activeTab === item.id
							return (
								<button
									key={item.id}
									type="button"
									onClick={() =>
										isExternal ? handleIntegrations() : onTabChange(item.id)
									}
									className={cn(
										"relative rounded-xl transition-colors flex items-center gap-3 shrink-0 group",
										isMobile
											? "px-3 py-2 text-sm border border-white/[0.06]"
											: "text-left px-3 py-2",
										isActive
											? "bg-[#14161A] text-white shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
											: "text-white/60 hover:text-white hover:bg-white/[0.025]",
									)}
								>
									{!isMobile && (
										<span
											aria-hidden
											className={cn(
												"absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all",
												isActive
													? "h-5 bg-[#4BA0FA]"
													: "h-0 bg-transparent group-hover:h-3 group-hover:bg-white/20",
											)}
										/>
									)}
									<span
										className={cn(
											"shrink-0 transition-colors",
											isActive ? "text-white" : "text-white/45",
										)}
									>
										{item.icon}
									</span>
									<span className="font-medium text-[14px] whitespace-nowrap">
										{item.label}
									</span>
									{isExternal && (
										<ArrowUpRight className="ml-auto size-4 shrink-0 text-white/30 transition-colors group-hover:text-white/60" />
									)}
								</button>
							)
						})}

						{!isMobile && <div className="flex-1" />}

						<button
							type="button"
							onClick={handleLogout}
							className={cn(
								"group rounded-xl transition-colors flex items-center gap-3 shrink-0 cursor-pointer text-white/60 hover:text-white hover:bg-white/[0.025]",
								isMobile
									? "px-3 py-2 text-sm border border-white/[0.06]"
									: "text-left px-3 py-2",
							)}
						>
							<LogOut className="size-[18px] shrink-0 text-white/45" />
							<span className="font-medium text-[14px] whitespace-nowrap">
								Log out
							</span>
						</button>

						<Popover open={dangerMenuOpen} onOpenChange={setDangerMenuOpen}>
							<PopoverTrigger asChild>
								<button
									type="button"
									className={cn(
										"group rounded-xl transition-colors flex items-center gap-3 shrink-0 cursor-pointer",
										isMobile
											? "px-3 py-2 text-sm border border-[#3A211C]"
											: "text-left px-3 py-2.5 mt-1",
										dangerMenuOpen
											? "bg-[#1A0F0C] text-[#C73B1B]"
											: "text-[#8A5247] hover:text-[#C73B1B] hover:bg-[#1A0F0C]/60",
									)}
								>
									<ShieldAlert className="size-[18px] shrink-0" />
									<span className="font-medium text-[14px] whitespace-nowrap">
										Danger zone
									</span>
									<ChevronRight
										className={cn(
											"size-4 ml-auto shrink-0 transition-transform opacity-60",
											dangerMenuOpen ? "-rotate-90" : "rotate-0",
										)}
									/>
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								side="top"
								sideOffset={8}
								className={cn(
									"w-[var(--radix-popover-trigger-width)] min-w-[248px] p-1.5 bg-[#14161A] border-white/10 rounded-[14px]",
									"shadow-[0px_8px_28px_rgba(0,0,0,0.5)]",
									dmSansClassName(),
								)}
							>
								<button
									type="button"
									onClick={() => {
										setDangerMenuOpen(false)
										setIsResetDialogOpen(true)
									}}
									className="w-full flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[#A37A2E] hover:text-[#C7991B] hover:bg-[#1A1200]/60 transition-colors cursor-pointer"
								>
									<RotateCcw className="size-[16px] shrink-0" />
									<span className="font-medium text-[13.5px]">Reset data</span>
								</button>

								{isOwner && (
									<>
										<div className="my-1 h-px bg-white/[0.06]" />

										<button
											type="button"
											onClick={openDeleteOrganizationDialog}
											className="w-full flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[#C73B1B] hover:bg-[#290F0A]/60 transition-colors cursor-pointer"
										>
											<Building2 className="size-[16px] shrink-0" />
											<span className="font-semibold text-[13.5px]">
												Delete organization
											</span>
										</button>
									</>
								)}

								<div className="my-1 h-px bg-white/[0.06]" />

								<button
									type="button"
									onClick={() => {
										setDangerMenuOpen(false)
										setIsDeleteDialogOpen(true)
									}}
									className="w-full flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[#C73B1B] hover:bg-[#290F0A]/60 transition-colors cursor-pointer"
								>
									<Trash2 className="size-[16px] shrink-0" />
									<span className="font-semibold text-[13.5px]">
										Delete account
									</span>
								</button>
							</PopoverContent>
						</Popover>
					</nav>
				</aside>

				{/* Content */}
				<section className="flex-1 min-w-0 flex flex-col md:overflow-y-auto md:max-w-4xl [scrollbar-gutter:stable] md:pr-2">
					<ErrorBoundary
						key={activeTab}
						fallback={
							<p className="text-muted-foreground p-4">
								Something went wrong loading this section.{" "}
								<button
									type="button"
									className="underline cursor-pointer"
									onClick={() => window.location.reload()}
								>
									Reload
								</button>
							</p>
						}
					>
						{activeTab === "account" && (
							<Account dialogPortalContainer={dialogPortalContainer} />
						)}
						{activeTab === "billing" && <Billing />}
						{activeTab === "integrations" && <Integrations />}
						{activeTab === "connections" && <ConnectionsMCP />}
						{activeTab === "support" && <Support />}
					</ErrorBoundary>
				</section>
			</div>

			{/* Reset data dialog */}
			{(() => {
				const confirmText = org?.name || user?.name || ""
				return (
					<Dialog
						open={isResetDialogOpen}
						onOpenChange={(open) => {
							setIsResetDialogOpen(open)
							if (!open) setResetConfirmation("")
						}}
					>
						<DialogContent className="sm:max-w-md">
							<div
								className={cn("flex flex-col gap-5 p-1", dmSans125ClassName())}
							>
								<div className="flex flex-col gap-1.5">
									<h2 className="text-[18px] font-semibold text-[#FAFAFA]">
										Reset all data?
									</h2>
									<p className="text-sm text-[#8B8B8B]">
										This permanently removes:
									</p>
									<ul className="text-sm text-[#8B8B8B] list-disc pl-5 space-y-0.5 mt-1">
										<li>All documents and memories</li>
										<li>All connections (Google Drive, Notion, etc.)</li>
										<li>All custom spaces (default space stays)</li>
										<li>Organization settings and filters</li>
									</ul>
									<p className="text-sm text-[#8B8B8B] mt-1">
										Your account and billing plan stay intact.{" "}
										<strong className="text-[#FAFAFA]">
											This cannot be undone.
										</strong>
									</p>
								</div>
								<div className="flex flex-col gap-2">
									<p className="text-sm text-[#8B8B8B]">
										Type{" "}
										<strong className="text-[#FAFAFA]">
											{confirmText || "your name"}
										</strong>{" "}
										to confirm:
									</p>
									<input
										type="text"
										value={resetConfirmation}
										onChange={(e) => setResetConfirmation(e.target.value)}
										placeholder={confirmText || "Your name"}
										autoComplete="off"
										className="w-full rounded-xl border border-[#2A2D35] bg-[#0D0F14] px-4 py-2.5 text-sm text-white placeholder:text-[#525D6E] focus:outline-none focus:border-[#C7991B]/50 transition-colors"
									/>
								</div>
								<div className="flex gap-3 justify-end">
									<DialogClose asChild>
										<button
											type="button"
											className="px-4 py-2 rounded-full border border-[#2A2D35] text-sm text-[#8B8B8B] hover:text-white hover:border-[#3A3D45] transition-colors cursor-pointer"
										>
											Cancel
										</button>
									</DialogClose>
									<button
										type="button"
										disabled={
											!confirmText ||
											resetConfirmation !== confirmText ||
											resetOrganization.isPending
										}
										title={
											!confirmText || resetConfirmation !== confirmText
												? `Type "${confirmText || "your name"}" exactly to enable`
												: undefined
										}
										onClick={() =>
											resetOrganization.mutate(
												{ confirmation: confirmText },
												{
													onSuccess: () => {
														setIsResetDialogOpen(false)
														setResetConfirmation("")
													},
												},
											)
										}
										className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-opacity bg-[#1A1200] text-[#C7991B] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
									>
										{resetOrganization.isPending ? (
											<LoaderIcon className="size-[15px] animate-spin" />
										) : (
											<RotateCcw className="size-[15px]" />
										)}
										{resetOrganization.isPending
											? "Resetting…"
											: "Reset organization"}
									</button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				)
			})()}

			{/* Delete account dialog */}
			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open)
					if (!open) setDeleteEmailConfirm("")
				}}
			>
				<DialogContent className="sm:max-w-md">
					<div className={cn("flex flex-col gap-5 p-1", dmSans125ClassName())}>
						<div className="flex flex-col gap-1.5">
							<h2 className="text-[18px] font-semibold text-[#FAFAFA]">
								Delete your account?
							</h2>
							<p className="text-sm text-[#8B8B8B]">
								Permanently deletes all your data and cancels any active
								subscriptions.{" "}
								<strong className="text-[#FAFAFA]">
									This cannot be undone.
								</strong>
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<p className="text-sm text-[#8B8B8B]">
								Type your email{" "}
								<strong className="text-[#FAFAFA]">{user?.email}</strong> to
								confirm:
							</p>
							<input
								type="email"
								value={deleteEmailConfirm}
								onChange={(e) => setDeleteEmailConfirm(e.target.value)}
								placeholder={user?.email ?? "your@email.com"}
								className="w-full rounded-xl border border-[#2A2D35] bg-[#0D0F14] px-4 py-2.5 text-sm text-white placeholder:text-[#525D6E] focus:outline-none focus:border-[#C73B1B]/50 transition-colors"
							/>
						</div>
						<div className="flex gap-3 justify-end">
							<DialogClose asChild>
								<button
									type="button"
									className="px-4 py-2 rounded-full border border-[#2A2D35] text-sm text-[#8B8B8B] hover:text-white hover:border-[#3A3D45] transition-colors cursor-pointer"
								>
									Cancel
								</button>
							</DialogClose>
							<button
								type="button"
								disabled={
									deleteEmailConfirm !== user?.email ||
									deleteUserAccount.isPending
								}
								title={
									deleteEmailConfirm !== user?.email
										? `Type ${user?.email ?? "your email"} exactly to confirm`
										: undefined
								}
								onClick={handleDeleteAccount}
								className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-opacity bg-[#290F0A] text-[#C73B1B] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
							>
								{deleteUserAccount.isPending ? (
									<LoaderIcon className="size-[15px] animate-spin" />
								) : (
									<Trash2 className="size-[15px]" />
								)}
								{deleteUserAccount.isPending ? "Deleting…" : "Delete account"}
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete organization dialog */}
			<Dialog
				key={activeOrgId ?? "delete-organization"}
				open={isDeleteOrgDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteOrgDialogOpen(open)
					if (!open) setDeleteOrgConfirm("")
				}}
			>
				<DialogContent
					className={cn(
						dmSans125ClassName(),
						"sm:max-w-[560px] border border-white/[0.12] bg-[#1B1F24] p-0 px-4 pt-4 pb-5 gap-0 rounded-[22px] overflow-hidden text-[#FAFAFA]",
					)}
					portalContainer={dialogPortalContainer}
					showCloseButton={false}
					style={{ boxShadow: MODAL_SURFACE_SHADOW }}
					onOpenAutoFocus={(event) => {
						event.preventDefault()
						deleteOrgInputRef.current?.focus()
					}}
				>
					<div className="flex shrink-0 items-center gap-3">
						<div className="min-w-0 flex-1">
							<DialogTitle className="text-[18px] font-semibold leading-tight text-[#FAFAFA]">
								Delete this organization?
							</DialogTitle>
							<p className="mt-0.5 truncate text-[13px] text-[#A1A1AA]">
								This action permanently removes the selected workspace.
							</p>
						</div>
						<DialogClose asChild>
							<button
								type="button"
								aria-label="Close"
								className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none"
								style={{ boxShadow: INSET_SHADOW }}
							>
								<X className="size-5 text-[#737373]" />
							</button>
						</DialogClose>
					</div>

					<div className="mt-4 flex flex-col gap-4 rounded-[14px] bg-[#14161A] p-4 sm:p-5 shadow-[inset_1.313px_1.313px_3.938px_rgba(0,0,0,0.7)]">
						<p className="text-[13.5px] leading-relaxed text-[#A1A1AA]">
							Permanently deletes{" "}
							<strong className="font-semibold text-[#FAFAFA]">
								{org?.name || "this organization"}
							</strong>{" "}
							and all of its documents, spaces, connections, and members.{" "}
							<strong className="font-semibold text-[#FAFAFA]">
								This cannot be undone.
							</strong>
						</p>
						<label className="flex flex-col gap-2">
							<span className="text-[13px] text-[#A1A1AA]">
								Type{" "}
								<strong className="font-semibold text-[#FAFAFA]">
									{org?.name}
								</strong>{" "}
								to confirm
							</span>
							<input
								ref={deleteOrgInputRef}
								type="text"
								value={deleteOrgConfirm}
								onChange={(e) => setDeleteOrgConfirm(e.target.value)}
								placeholder={org?.name ?? "Organization name"}
								autoComplete="off"
								className="h-11 w-full rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-4 text-[14px] text-white placeholder:text-[#525D6E] transition-colors focus:border-[#C73B1B]/55 focus:outline-none focus:ring-2 focus:ring-[#C73B1B]/15"
								style={{ boxShadow: INSET_SHADOW }}
							/>
						</label>
					</div>

					<div className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2">
						<DialogClose asChild>
							<button
								type="button"
								className={cn(
									"px-3 py-2 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#FAFAFA]",
									dmSansClassName(),
								)}
							>
								Cancel
							</button>
						</DialogClose>
						<button
							type="button"
							disabled={
								!org?.name ||
								deleteOrgConfirm !== org.name ||
								deleteOrganization.isPending
							}
							title={
								!org?.name || deleteOrgConfirm !== org.name
									? `Type "${org?.name ?? "the organization name"}" exactly to confirm`
									: undefined
							}
							onClick={handleDeleteOrganization}
							className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0D121A] px-5 text-[14px] font-semibold text-[#FAFAFA] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
							style={{ boxShadow: INSET_SHADOW }}
						>
							{deleteOrganization.isPending ? (
								<LoaderIcon className="size-4 animate-spin text-[#C73B1B]" />
							) : null}
							{deleteOrganization.isPending
								? "Deleting..."
								: "Delete organization"}
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
