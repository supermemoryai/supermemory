"use client"
import { Logo } from "@ui/assets/Logo"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useAuth } from "@lib/auth-context"
import { motion } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { useState, useEffect, useRef } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import Account from "@/components/settings/account"
import Integrations from "@/components/settings/integrations"
import ConnectionsMCP from "@/components/settings/connections-mcp"
import Support from "@/components/settings/support"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@hooks/use-mobile"
import { useLocalStorageUsername } from "@hooks/use-local-storage-username"
import { analytics } from "@/lib/analytics"
import { LogOut, RotateCcw, Trash2, Sun, LoaderIcon } from "lucide-react"
import { authClient } from "@lib/auth"
import { Dialog, DialogContent, DialogClose } from "@ui/components/dialog"
import { useResetOrganization } from "@/hooks/use-reset-organization"
import { useDeleteUserAccount } from "@/hooks/use-account-settings"

const TABS = ["account", "integrations", "connections", "support"] as const
type SettingsTab = (typeof TABS)[number]

type NavItem = {
	id: SettingsTab
	label: string
	description: string
	icon: React.ReactNode
}

type DangerItem = {
	id: "logout" | "reset" | "delete"
	label: string
	description: string
	icon: React.ReactNode
	color: "neutral" | "amber" | "red"
}

const NAV_ITEMS: NavItem[] = [
	{
		id: "account",
		label: "Account & Billing",
		description: "Manage your profile, plan, usage and payments",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		),
	},
	{
		id: "integrations",
		label: "Integrations",
		description: "Save, sync and search memories across tools",
		icon: <Sun className="size-5" />,
	},
	{
		id: "connections",
		label: "Connections & MCP",
		description: "Sync with Google Drive, Notion, OneDrive and MCP client",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
			</svg>
		),
	},
	{
		id: "support",
		label: "Support & Help",
		description: "Find answers or share feedback. We're here to help.",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
				<path d="M12 17h.01" />
			</svg>
		),
	},
]

const DANGER_ITEMS: DangerItem[] = [
	{
		id: "logout",
		label: "Log out",
		description: "Sign out of your account on this device",
		icon: <LogOut className="size-5" />,
		color: "neutral",
	},
	{
		id: "reset",
		label: "Reset data",
		description: "Erase all memories, connections and spaces",
		icon: <RotateCcw className="size-5" />,
		color: "amber",
	},
	{
		id: "delete",
		label: "Delete account",
		description: "Permanently delete your account and all data",
		icon: <Trash2 className="size-5" />,
		color: "red",
	},
]

const DANGER_COLORS: Record<
	DangerItem["color"],
	{ idle: string; hover: string; icon: string }
> = {
	neutral: {
		idle: "text-white/50",
		hover: "hover:text-white",
		icon: "text-white/40",
	},
	amber: {
		idle: "text-[#7A6030]",
		hover: "hover:text-[#C7991B]",
		icon: "text-[#7A6030]",
	},
	red: {
		idle: "text-[#6B2A2A]",
		hover: "hover:text-[#C73B1B]",
		icon: "text-[#6B2A2A]",
	},
}

function parseHashToTab(hash: string): SettingsTab {
	const cleaned = hash.replace("#", "").toLowerCase()
	return TABS.includes(cleaned as SettingsTab)
		? (cleaned as SettingsTab)
		: "account"
}

export function UserSupermemory({ name }: { name: string }) {
	return (
		<motion.div
			className="absolute inset-0 top-[-40px] flex items-center justify-center z-10"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
		>
			<Logo className="h-7 text-white" />
			<div className="flex flex-col items-start justify-center ml-4 space-y-1">
				<p className="text-white text-[15px] font-medium leading-none">
					{name.split(" ")[0]}'s
				</p>
				<p className="text-white font-bold text-xl leading-none -mt-2">
					supermemory
				</p>
			</div>
		</motion.div>
	)
}

export default function SettingsPage() {
	const { user, org } = useAuth()
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

		// If no hash or invalid hash, push #account
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
		user?.displayUsername || localStorageUsername || user?.name || ""
	const headerPossessive = headerDisplayName
		? `${headerDisplayName.split(" ")[0]}'s`
		: ""

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			<header className="relative z-20 flex justify-between items-center gap-3 px-4 md:px-6 py-3 shrink-0">
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
						{headerDisplayName ? (
							<div className="flex flex-col items-start justify-center ml-2 min-w-0">
								<p className="text-[#8B8B8B] text-[11px] leading-tight">
									{headerPossessive}
								</p>
								<p className="text-white font-bold text-xl leading-none -mt-1">
									supermemory
								</p>
							</div>
						) : (
							<span className="ml-2 font-medium text-white/90">
								supermemory
							</span>
						)}
					</button>
					<span className="text-white/35 shrink-0" aria-hidden>
						/
					</span>
					<span className="text-white/50 font-medium shrink-0">Settings</span>
				</nav>
				<UserProfileMenu />
			</header>
			<main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
				<div className="flex flex-col md:flex-row md:justify-center gap-4 md:gap-8 lg:gap-12 px-4 md:px-6 pt-4 pb-6 md:h-full">
					<div className="md:w-auto md:max-w-[380px] shrink-0">
						{!isMobile && (
							<motion.div
								animate={{
									scale: 1,
									padding: 48,
									paddingTop: 0,
								}}
								transition={{
									duration: 0.8,
									ease: "easeOut",
									delay: 0.2,
								}}
								className="relative flex items-center justify-center"
							>
								<NovaOrb size={175} className="blur-[3px]!" />
								<UserSupermemory name={user?.name ?? ""} />
							</motion.div>
						)}
						<nav
							className={cn(
								"flex gap-2",
								isMobile
									? "flex-row overflow-x-auto pb-2 scrollbar-thin"
									: "flex-col",
								dmSansClassName(),
							)}
						>
							{NAV_ITEMS.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => {
										window.location.hash = item.id
										setActiveTab(item.id)
										analytics.settingsTabChanged({ tab: item.id })
									}}
									className={cn(
										"rounded-xl transition-colors flex items-start gap-3 shrink-0",
										isMobile ? "px-3 py-2 text-sm" : "text-left p-4",
										activeTab === item.id
											? "bg-[#14161A] text-white shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
											: "text-white/60 hover:text-white hover:bg-[#14161A] hover:shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
									)}
								>
									<span className={cn("shrink-0", !isMobile && "mt-0.5")}>
										{item.icon}
									</span>
									{isMobile ? (
										<span className="font-medium whitespace-nowrap">
											{item.label}
										</span>
									) : (
										<div className="flex flex-col gap-0.5">
											<span className="font-medium">{item.label}</span>
											<span className="text-sm text-white/50">
												{item.description}
											</span>
										</div>
									)}
								</button>
							))}

							{/* Divider */}
							{!isMobile && <div className="my-1 h-px bg-[#0F1621]" />}

							{DANGER_ITEMS.map((item) => {
								const colors = DANGER_COLORS[item.color]
								const handleClick = () => {
									if (item.id === "logout") handleLogout()
									else if (item.id === "reset") setIsResetDialogOpen(true)
									else if (item.id === "delete") setIsDeleteDialogOpen(true)
								}
								return (
									<button
										key={item.id}
										type="button"
										onClick={handleClick}
										className={cn(
											"rounded-xl transition-colors flex items-start gap-3 shrink-0 group",
											isMobile ? "px-3 py-2 text-sm" : "text-left p-4",
											"hover:bg-[#14161A] hover:shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
											colors.idle,
											colors.hover,
										)}
									>
										<span
											className={cn(
												"shrink-0",
												!isMobile && "mt-0.5",
												colors.icon,
												`group-hover:${colors.hover.replace("hover:", "")}`,
											)}
										>
											{item.icon}
										</span>
										{isMobile ? (
											<span className="font-medium whitespace-nowrap">
												{item.label}
											</span>
										) : (
											<div className="flex flex-col gap-0.5">
												<span className="font-medium">{item.label}</span>
												<span className="text-sm opacity-60">
													{item.description}
												</span>
											</div>
										)}
									</button>
								)
							})}
						</nav>
					</div>
					<div className="flex-1 flex flex-col gap-4 md:overflow-y-auto md:max-w-2xl [scrollbar-gutter:stable] md:pr-[17px]">
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
							{activeTab === "integrations" && <Integrations />}
							{activeTab === "connections" && <ConnectionsMCP />}
							{activeTab === "support" && <Support />}
						</ErrorBoundary>
					</div>
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
