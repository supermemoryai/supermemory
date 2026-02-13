"use client"

import { Logo } from "@ui/assets/Logo"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useAuth } from "@lib/auth-context"
import {
	LayoutGridIcon,
	Plus,
	SearchIcon,
	LogOut,
	Settings,
	Home,
	Code2,
	Sun,
	ExternalLink,
	HelpCircle,
	MenuIcon,
	MessageCircleIcon,
	RotateCcw,
} from "lucide-react"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs"
import { GraphIcon } from "@/components/new/integration-icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { authClient } from "@lib/auth"
import { useProject } from "@/stores"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SpaceSelector } from "./space-selector"
import { useIsMobile } from "@hooks/use-mobile"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { FeedbackModal } from "./feedback-modal"
import { useViewMode } from "@/lib/view-mode-context"
import { useQueryState } from "nuqs"
import { feedbackParam } from "@/lib/search-params"

interface HeaderProps {
	onAddMemory?: () => void
	onOpenChat?: () => void
	onOpenSearch?: () => void
}

export function Header({ onAddMemory, onOpenChat, onOpenSearch }: HeaderProps) {
	const { user } = useAuth()
	const { selectedProjects, setSelectedProjects } = useProject()
	const router = useRouter()
	const isMobile = useIsMobile()
	const { resetOrgOnboarded } = useOrgOnboarding()
	const [feedbackOpen, setFeedbackOpen] = useQueryState(
		"feedback",
		feedbackParam,
	)
	const isFeedbackOpen = feedbackOpen ?? false
	const { viewMode, setViewMode } = useViewMode()

	const handleTryOnboarding = () => {
		resetOrgOnboarded()
		router.push("/onboarding?step=input&flow=welcome")
	}

	const handleFeedback = () => setFeedbackOpen(true)

	const displayName =
		user?.displayUsername ||
		(typeof window !== "undefined" && localStorage.getItem("username")) ||
		(typeof window !== "undefined" && localStorage.getItem("userName")) ||
		""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "My"
	return (
		<div className="flex p-3 md:p-4 justify-between items-center gap-2">
			<div className="flex items-center justify-center gap-2 md:gap-4 z-10! min-w-0">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex items-center rounded-lg px-2 py-1.5 -ml-2 cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors shrink-0"
						>
							<Logo className="h-7" />
							{!isMobile && userName && (
								<div className="flex flex-col items-start justify-center ml-2">
									<p className="text-[#8B8B8B] text-[11px] leading-tight">
										{userName}
									</p>
									<p className="text-white font-bold text-xl leading-none -mt-1">
										supermemory
									</p>
								</div>
							)}
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className={cn(
							"min-w-[200px] p-1.5 rounded-xl border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
							dmSansClassName(),
						)}
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
					>
						<DropdownMenuItem
							asChild
							className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
						>
							<Link href="/">
								<Home className="h-4 w-4 text-[#737373]" />
								Home
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							asChild
							className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
						>
							<a
								href="https://console.supermemory.ai"
								target="_blank"
								rel="noreferrer"
							>
								<Code2 className="h-4 w-4 text-[#737373]" />
								Developer console
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem
							asChild
							className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
						>
							<a href="https://supermemory.ai" target="_blank" rel="noreferrer">
								<ExternalLink className="h-4 w-4 text-[#737373]" />
								supermemory.ai
							</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="self-stretch w-px bg-[#FFFFFF33] hidden md:block" />
				{!isMobile && (
					<SpaceSelector
						selectedProjects={selectedProjects}
						onValueChange={setSelectedProjects}
						showChevron
						enableDelete
					/>
				)}
			</div>
			{!isMobile && (
				<Tabs
					value={viewMode === "list" ? "grid" : viewMode}
					onValueChange={(v) =>
						setViewMode(v === "grid" ? "list" : (v as "graph" | "integrations"))
					}
				>
					<TabsList className="rounded-full border border-[#161F2C] h-11! z-10!">
						<TabsTrigger
							value="grid"
							className={cn(
								"rounded-full data-[state=active]:bg-[#00173C]! dark:data-[state=active]:border-[#2261CA33]! px-4 py-4 cursor-pointer",
								dmSansClassName(),
							)}
						>
							<LayoutGridIcon className="size-4" />
							Grid
						</TabsTrigger>
						<TabsTrigger
							value="graph"
							className={cn(
								"rounded-full dark:data-[state=active]:bg-[#00173C]! dark:data-[state=active]:border-[#2261CA33]! px-4 py-4 cursor-pointer",
								dmSansClassName(),
							)}
						>
							<GraphIcon className="size-4" />
							Graph
						</TabsTrigger>
						<TabsTrigger
							value="integrations"
							className={cn(
								"rounded-full dark:data-[state=active]:bg-[#00173C]! dark:data-[state=active]:border-[#2261CA33]! px-4 py-4 cursor-pointer",
								dmSansClassName(),
							)}
						>
							<Sun className="size-4" />
							Integrations
						</TabsTrigger>
					</TabsList>
				</Tabs>
			)}
			<div className="flex items-center gap-2 z-10!">
				{isMobile ? (
					<>
						<SpaceSelector
							selectedProjects={selectedProjects}
							onValueChange={setSelectedProjects}
							showChevron
							enableDelete
							compact
						/>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="headers"
									className="rounded-full text-base gap-2 h-10!"
								>
									<MenuIcon className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className={cn(
									"min-w-[200px] p-1.5 rounded-xl border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
									dmSansClassName(),
								)}
								style={{
									background:
										"linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
								}}
							>
								<DropdownMenuItem
									onClick={onAddMemory}
									className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
								>
									<Plus className="h-4 w-4 text-[#737373]" />
									Add memory
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setViewMode("integrations")}
									className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
								>
									<Sun className="h-4 w-4 text-[#737373]" />
									Integrations
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={onOpenChat}
									className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
								>
									<MessageCircleIcon className="h-4 w-4 text-[#737373]" />
									Chat with Nova
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-[#2E3033]" />
								<DropdownMenuItem
									onClick={handleFeedback}
									className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
								>
									<MessageCircleIcon className="h-4 w-4 text-[#737373]" />
									Feedback
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => router.push("/settings")}
									className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
								>
									<Settings className="h-4 w-4 text-[#737373]" />
									Settings
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<>
						<Button
							variant="headers"
							className="rounded-full text-base gap-2 h-10!"
							onClick={onAddMemory}
						>
							<div className="flex items-center gap-2">
								<Plus className="size-4" />
								Add memory
							</div>
							<span
								className={cn(
									"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm size-4 text-[10px] flex items-center justify-center",
									dmSansClassName(),
								)}
							>
								C
							</span>
						</Button>
						<Button
							variant="headers"
							className="rounded-full text-base gap-2 h-10!"
							onClick={onOpenSearch}
						>
							<SearchIcon className="size-4" />
							<span className="bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm text-[10px] flex items-center justify-center gap-0.5 px-1">
								<svg
									className="size-[7.5px]"
									viewBox="0 0 9 9"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Command Key</title>
									<path
										d="M6.66663 0.416626C6.33511 0.416626 6.01716 0.548322 5.78274 0.782743C5.54832 1.01716 5.41663 1.33511 5.41663 1.66663V6.66663C5.41663 6.99815 5.54832 7.31609 5.78274 7.55051C6.01716 7.78493 6.33511 7.91663 6.66663 7.91663C6.99815 7.91663 7.31609 7.78493 7.55051 7.55051C7.78493 7.31609 7.91663 6.99815 7.91663 6.66663C7.91663 6.33511 7.78493 6.01716 7.55051 5.78274C7.31609 5.54832 6.99815 5.41663 6.66663 5.41663H1.66663C1.33511 5.41663 1.01716 5.54832 0.782743 5.78274C0.548322 6.01716 0.416626 6.33511 0.416626 6.66663C0.416626 6.99815 0.548322 7.31609 0.782743 7.55051C1.01716 7.78493 1.33511 7.91663 1.66663 7.91663C1.99815 7.91663 2.31609 7.78493 2.55051 7.55051C2.78493 7.31609 2.91663 6.99815 2.91663 6.66663V1.66663C2.91663 1.33511 2.78493 1.01716 2.55051 0.782743C2.31609 0.548322 1.99815 0.416626 1.66663 0.416626C1.33511 0.416626 1.01716 0.548322 0.782743 0.782743C0.548322 1.01716 0.416626 1.33511 0.416626 1.66663C0.416626 1.99815 0.548322 2.31609 0.782743 2.55051C1.01716 2.78493 1.33511 2.91663 1.66663 2.91663H6.66663C6.99815 2.91663 7.31609 2.78493 7.55051 2.55051C7.78493 2.31609 7.91663 1.99815 7.91663 1.66663C7.91663 1.33511 7.78493 1.01716 7.55051 0.782743C7.31609 0.548322 6.99815 0.416626 6.66663 0.416626Z"
										stroke="#737373"
										strokeWidth="0.833333"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span className={cn(dmSansClassName())}>K</span>
							</span>
						</Button>
						<Button
							variant="headers"
							className="rounded-full text-base gap-2 h-10!"
							onClick={handleFeedback}
						>
							<div className="flex items-center gap-2">
								<MessageCircleIcon className="size-4" />
								Feedback
							</div>
						</Button>
					</>
				)}
				{user && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-transform hover:scale-105"
							>
								<Avatar className="border border-[#2E3033] h-8 w-8 md:h-10 md:w-10">
									<AvatarImage src={user?.image ?? ""} />
									<AvatarFallback className="bg-[#0D121A] text-white">
										{user?.name?.charAt(0)}
									</AvatarFallback>
								</Avatar>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className={cn(
								"min-w-[220px] p-1.5 rounded-xl border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
								dmSansClassName(),
							)}
							style={{
								background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
							}}
						>
							<div id="user-info" className="px-3 py-2.5">
								<p className="text-white text-sm font-medium truncate">
									{user?.name}
								</p>
								<p className="text-[#737373] text-xs truncate">{user?.email}</p>
							</div>
							<DropdownMenuSeparator className="bg-[#2E3033]" />
							<DropdownMenuItem
								onClick={() => router.push("/settings")}
								className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
							>
								<Settings className="h-4 w-4 text-[#737373]" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={handleTryOnboarding}
								className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
							>
								<RotateCcw className="h-4 w-4 text-[#737373]" />
								Restart Onboarding
							</DropdownMenuItem>
							<DropdownMenuSeparator className="bg-[#2E3033]" />
							<DropdownMenuItem
								asChild
								className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
							>
								<a href="mailto:support@supermemory.com">
									<HelpCircle className="h-4 w-4 text-[#737373]" />
									Help & Support
								</a>
							</DropdownMenuItem>
							<DropdownMenuItem
								asChild
								className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
							>
								<a
									href="https://supermemory.link/discord"
									target="_blank"
									rel="noreferrer"
								>
									<svg
										className="h-4 w-4 text-[#737373]"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>Discord</title>
										<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
									</svg>
									Discord
								</a>
							</DropdownMenuItem>
							<DropdownMenuSeparator className="bg-[#2E3033]" />
							<DropdownMenuItem
								onClick={() => {
									authClient.signOut()
									router.push("/login/new")
								}}
								className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
							>
								<LogOut className="h-4 w-4 text-[#737373]" />
								Logout
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
			<FeedbackModal
				isOpen={isFeedbackOpen}
				onClose={() => setFeedbackOpen(false)}
			/>
		</div>
	)
}
