"use client"
import { Logo } from "@ui/assets/Logo"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useAuth } from "@lib/auth-context"
import NovaOrb from "@/components/nova/nova-orb"
import { useState, useEffect, useRef, useMemo } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import Account from "@/components/settings/account"
import Billing from "@/components/settings/billing"
import Integrations from "@/components/settings/integrations"
import ConnectionsMCP from "@/components/settings/connections-mcp"
import Support from "@/components/settings/support"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@hooks/use-mobile"
import { useLocalStorageUsername } from "@hooks/use-local-storage-username"
import { analytics } from "@/lib/analytics"
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
	ChevronsUpDown,
	Check,
	Building2,
} from "lucide-react"
import { authClient } from "@lib/auth"
import { Dialog, DialogContent, DialogClose } from "@ui/components/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { useResetOrganization } from "@/hooks/use-reset-organization"
import { useDeleteUserAccount } from "@/hooks/use-account-settings"
import { useCustomer } from "autumn-js/react"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import {
	PLAN_DISPLAY_NAMES,
	useTokenUsage,
	type PlanType,
} from "@/hooks/use-token-usage"

const TABS = [
	"account",
	"billing",
	"integrations",
	"connections",
	"support",
] as const
type SettingsTab = (typeof TABS)[number]

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

function parseHashToTab(hash: string): SettingsTab {
	const cleaned = hash.replace("#", "").toLowerCase()
	return TABS.includes(cleaned as SettingsTab)
		? (cleaned as SettingsTab)
		: "account"
}

const ORG_PLAN_BADGE_STYLES: Record<PlanType, string> = {
	free: "bg-[#2E353D] font-mono font-medium tracking-[0.12em] text-[#A3A3A3]",
	pro: "bg-[#4BA0FA] font-bold tracking-[0.36px] text-[#00171A]",
	scale: "bg-[#0054AD] font-bold tracking-[0.36px] text-[#FAFAFA]",
	enterprise: "bg-[#FAFAFA] font-bold tracking-[0.36px] text-[#0D121A]",
}

function OrgPlanBadge({ plan }: { plan: PlanType }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"inline-flex h-[18px] min-w-[42px] shrink-0 items-center justify-center rounded-[3px] px-1.5 text-[10px] uppercase",
				ORG_PLAN_BADGE_STYLES[plan],
			)}
		>
			{PLAN_DISPLAY_NAMES[plan]}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-white/30 uppercase">
			{children}
		</div>
	)
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

export default function SettingsPage() {
	const { user, org, organizations, setActiveOrg } = useAuth()
	const [activeTab, setActiveTab] = useState<SettingsTab>("account")
	const hasInitialized = useRef(false)
	const router = useRouter()
	const isMobile = useIsMobile()
	const localStorageUsername = useLocalStorageUsername()

	const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
	const [resetConfirmation, setResetConfirmation] = useState("")
	const resetOrganization = useResetOrganization()

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("")
	const deleteUserAccount = useDeleteUserAccount()

	const [dangerMenuOpen, setDangerMenuOpen] = useState(false)
	const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false)
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const canSwitchOrg = (organizations?.length ?? 0) > 1

	const autumn = useCustomer()
	const { currentPlan } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()
	const planByOrgId = useMemo(() => {
		const map = new Map<string, PlanType>()
		for (const summary of orgSummaries ?? []) {
			map.set(summary.orgId, summary.plan)
		}
		return map
	}, [orgSummaries])
	const activeOrgPlan = org?.id
		? resolveOrgPlan(org.id, true, currentPlan, planByOrgId)
		: currentPlan

	const handleOrgSwitch = async (orgSlug: string, orgId: string) => {
		if (orgId === org?.id) {
			setOrgSwitcherOpen(false)
			return
		}
		setSwitchingOrgId(orgId)
		try {
			await setActiveOrg(orgSlug)
			window.location.reload()
		} catch (error) {
			console.error("Failed to switch organization:", error)
			setSwitchingOrgId(null)
		}
	}

	const handleLogout = async () => {
		await authClient.signOut()
		router.push("/login")
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

	useEffect(() => {
		if (hasInitialized.current) return
		hasInitialized.current = true

		const hash = window.location.hash
		const tab = parseHashToTab(hash)
		setActiveTab(tab)
		analytics.settingsTabChanged({ tab })

		if (!hash || !TABS.includes(hash.replace("#", "") as SettingsTab)) {
			window.history.pushState(null, "", "#account")
		}
	}, [])

	useEffect(() => {
		const handleHashChange = () => {
			const tab = parseHashToTab(window.location.hash)
			setActiveTab(tab)
			analytics.settingsTabChanged({ tab })
		}

		window.addEventListener("hashchange", handleHashChange)
		return () => window.removeEventListener("hashchange", handleHashChange)
	}, [])

	const headerDisplayName =
		user?.displayUsername ||
		localStorageUsername ||
		user?.name ||
		user?.email?.split("@")[0] ||
		""

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-[#08090C]">
			<header className="relative z-20 flex justify-between items-center gap-3 px-4 md:px-8 py-3 shrink-0">
				<nav
					className={cn(
						"flex items-center gap-2 sm:gap-3 min-w-0 text-sm",
						dmSansClassName(),
					)}
					aria-label="Breadcrumb"
				>
					<button
						type="button"
						onClick={() => router.push("/")}
						className={cn(
							"flex items-center min-w-0 rounded-lg py-1 pr-2 -ml-1 pl-1",
							"hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors cursor-pointer text-left",
						)}
					>
						<Logo className="h-7 shrink-0" />
						<span className="ml-2 font-semibold text-white/90 tracking-tight">
							supermemory
						</span>
					</button>
					<span className="text-white/30 shrink-0" aria-hidden>
						/
					</span>
					<span className="text-white/55 font-medium shrink-0">Settings</span>
				</nav>
				<div className="flex items-center gap-2 sm:gap-3 shrink-0">
					{!isMobile && (
						<Popover
							open={orgSwitcherOpen && canSwitchOrg}
							onOpenChange={(open) => {
								if (canSwitchOrg) setOrgSwitcherOpen(open)
							}}
						>
							<PopoverTrigger asChild>
								<button
									type="button"
									disabled={!canSwitchOrg}
									className={cn(
										"group flex items-center gap-2 rounded-full pl-1.5 pr-2.5 py-1.5 transition-colors",
										"bg-white/[0.03] border border-white/[0.06]",
										canSwitchOrg
											? "cursor-pointer hover:bg-white/[0.06]"
											: "cursor-default",
										dmSansClassName(),
									)}
								>
									<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/55">
										<Building2 className="size-[13px]" />
									</span>
									<span className="max-w-[160px] text-left text-[13px] font-medium text-white truncate leading-none">
										{org?.name ?? "Personal"}
									</span>
									<OrgPlanBadge plan={activeOrgPlan} />
									{canSwitchOrg && (
										<ChevronsUpDown className="size-3.5 shrink-0 text-white/40" />
									)}
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								side="bottom"
								sideOffset={8}
								className={cn(
									"w-[260px] max-h-80 overflow-y-auto p-1.5",
									"bg-[#14161A] border-white/10 rounded-[14px]",
									"shadow-[0px_8px_28px_rgba(0,0,0,0.5)]",
									dmSansClassName(),
								)}
							>
								{[...(organizations ?? [])]
									.sort((a, b) => a.name.localeCompare(b.name))
									.map((organization) => {
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
													"w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors",
													isCurrent
														? "bg-white/5"
														: "hover:bg-white/5 cursor-pointer",
													"disabled:cursor-default",
												)}
											>
												<Building2 className="size-4 shrink-0 text-white/40" />
												<span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
													{organization.name}
												</span>
												{isSwitching ? (
													<LoaderIcon className="size-4 shrink-0 animate-spin text-[#4BA0FA]" />
												) : isCurrent ? (
													<Check className="size-4 shrink-0 text-[#4BA0FA]" />
												) : null}
												<OrgPlanBadge plan={plan} />
											</button>
										)
									})}
							</PopoverContent>
						</Popover>
					)}
					<UserProfileMenu />
				</div>
			</header>

			<main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
				<div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-10 px-4 md:px-8 pt-5 md:pt-7 pb-6 md:h-full md:w-full md:max-w-[1240px] md:mx-auto">
					{/* Left rail */}
					<aside className="md:flex md:h-full md:min-h-0 md:w-[280px] md:flex-col shrink-0">
						{!isMobile && (
							<div className="mb-4">
								<IdentityCard displayName={headerDisplayName} />
							</div>
						)}

						<nav
							className={cn(
								"flex",
								isMobile
									? "flex-row gap-2 overflow-x-auto pb-2 scrollbar-thin"
									: "min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
								dmSansClassName(),
							)}
						>

						{!isMobile && <SectionLabel>Organisation</SectionLabel>}

							{NAV_ITEMS.map((item) => {
								const isActive = activeTab === item.id
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => {
											window.location.hash = item.id
											setActiveTab(item.id)
											analytics.settingsTabChanged({ tab: item.id })
										}}
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
							{activeTab === "account" && <Account />}
							{activeTab === "billing" && <Billing />}
							{activeTab === "integrations" && <Integrations />}
							{activeTab === "connections" && <ConnectionsMCP />}
							{activeTab === "support" && <Support />}
						</ErrorBoundary>
					</section>
				</div>
			</main>

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
		</div>
	)
}
