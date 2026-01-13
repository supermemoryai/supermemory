"use client"
import { Logo } from "@ui/assets/Logo"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useAuth } from "@lib/auth-context"
import { motion } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { useState, useEffect, useRef } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import Account from "@/components/new/settings/account"
import Integrations from "@/components/new/settings/integrations"
import ConnectionsMCP from "@/components/new/settings/connections-mcp"
import Support from "@/components/new/settings/support"
import { useRouter } from "next/navigation"

const TABS = ["account", "integrations", "connections", "support"] as const
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
				<circle cx="12" cy="12" r="3" />
				<path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
			</svg>
		),
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
	const { user } = useAuth()
	const [activeTab, setActiveTab] = useState<SettingsTab>("account")
	const hasInitialized = useRef(false)
	const router = useRouter()

	useEffect(() => {
		if (hasInitialized.current) return
		hasInitialized.current = true

		const hash = window.location.hash
		const tab = parseHashToTab(hash)
		setActiveTab(tab)

		// If no hash or invalid hash, push #account
		if (!hash || !TABS.includes(hash.replace("#", "") as SettingsTab)) {
			window.history.pushState(null, "", "#account")
		}
	}, [])

	useEffect(() => {
		const handleHashChange = () => {
			const tab = parseHashToTab(window.location.hash)
			setActiveTab(tab)
		}

		window.addEventListener("hashchange", handleHashChange)
		return () => window.removeEventListener("hashchange", handleHashChange)
	}, [])
	return (
		<div className="h-screen flex flex-col overflow-hidden">
			<header className="flex justify-between items-center px-6 py-3 shrink-0">
				<button type="button" onClick={() => router.push("/new")} className="cursor-pointer">
					<Logo className="h-7" />
				</button>
				<div className="flex items-center gap-2">
					{user && (
						<Avatar className="border border-border h-8 w-8 md:h-10 md:w-10">
							<AvatarImage src={user?.image ?? ""} />
							<AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
						</Avatar>
					)}
				</div>
			</header>
			<main className="max-w-2xl mx-auto space-x-12 flex justify-center pt-4 flex-1 min-h-0">
				<div className="min-w-xs">
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
					<nav className={cn("flex flex-col gap-2", dmSansClassName())}>
						{NAV_ITEMS.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									window.location.hash = item.id
									setActiveTab(item.id)
								}}
								className={`text-left p-4 rounded-xl transition-colors flex items-start gap-3 ${
									activeTab === item.id
										? "bg-[#14161A] text-white shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
										: "text-white/60 hover:text-white hover:bg-[#14161A] hover:shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
								}`}
							>
								<span className="mt-0.5 shrink-0">{item.icon}</span>
								<div className="flex flex-col gap-0.5">
									<span className="font-medium">{item.label}</span>
									<span className="text-sm text-white/50">
										{item.description}
									</span>
								</div>
							</button>
						))}
					</nav>
				</div>
				<div className="flex flex-col gap-4 overflow-y-auto min-w-2xl [scrollbar-gutter:stable] pr-[17px]">
					{activeTab === "account" && <Account />}
					{activeTab === "integrations" && <Integrations />}
					{activeTab === "connections" && <ConnectionsMCP />}
					{activeTab === "support" && <Support />}
				</div>
			</main>
		</div>
	)
}
