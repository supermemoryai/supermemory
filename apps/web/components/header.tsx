"use client"

import { Logo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import {
	Plus,
	SearchIcon,
	Settings,
	Home,
	Code2,
	Sun,
	ExternalLink,
	MenuIcon,
	MessageCircleIcon,
	LifeBuoy,
	LayoutGrid,
	ChevronRight,
} from "lucide-react"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { GraphIcon, IntegrationsIcon } from "@/components/integration-icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { useProject } from "@/stores"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SpaceSelector } from "./space-selector"
import { useIsMobile } from "@hooks/use-mobile"
import { useLocalStorageUsername } from "@hooks/use-local-storage-username"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { FeedbackModal } from "./feedback-modal"
import { useViewMode } from "@/lib/view-mode-context"
import { useQueryState } from "nuqs"
import { feedbackParam } from "@/lib/search-params"
import { useCustomer } from "autumn-js/react"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { OrgPlanBadge, resolveOrgPlan } from "@/components/org-plan-badge"

interface HeaderProps {
	onAddMemory?: () => void
	onOpenSearch?: () => void
}

const brainItemClass = (active: boolean) =>
	cn(
		"gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors",
		"hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white",
		active ? "bg-white/[0.06] text-white" : "text-white/85",
	)

const brainTileClass = (active: boolean) =>
	cn(
		"flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold",
		active
			? "border-[#2261CA66] bg-[#0B2A57] text-[#7EB0FF]"
			: "border-white/[0.08] bg-white/[0.04] text-white/70",
	)

export function Header({ onAddMemory, onOpenSearch }: HeaderProps) {
	const { user, isRestoring, org, organizations, setActiveOrg } = useAuth()
	const autumn = useCustomer()
	const { currentPlan } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()
	const planByOrgId = new Map(
		(orgSummaries ?? []).map((s) => [s.orgId, s.plan] as const),
	)
	const { selectedProjects, setSelectedProjects } = useProject()
	const router = useRouter()
	const isMobile = useIsMobile()
	const [feedbackOpen, setFeedbackOpen] = useQueryState(
		"feedback",
		feedbackParam,
	)
	const { viewMode, setViewMode } = useViewMode()

	const handleFeedback = () => setFeedbackOpen(true)

	const localStorageUsername = useLocalStorageUsername()
	const displayName =
		user?.displayUsername ||
		(isRestoring ? localStorageUsername : "") ||
		user?.name ||
		user?.email?.split("@")[0] ||
		""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "My"
	const orgLabel = org?.name.replace(/\s*organizations?\s*$/i, "").trim()
	const topLabel = orgLabel || userName
	const hasOrgs = (organizations?.length ?? 0) > 0

	const selectOrg = (slug: string, isActive: boolean) => {
		if (isActive) return
		void setActiveOrg(slug).then(() => window.location.reload())
	}
	return (
		<div className="relative z-10 flex shrink-0 items-center justify-between gap-1.5 p-2.5 md:gap-2 md:p-3">
			<div className="z-10! flex min-w-0 shrink items-center justify-center gap-1.5 md:gap-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="relative flex shrink-0 cursor-pointer items-center rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5 outline-none focus-visible:outline-none md:-ml-2 before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']"
						>
							<Logo className="h-6" />
							<div className="ml-1.5 flex flex-col items-start justify-center sm:ml-2">
								<p className="max-w-[16ch] truncate text-[10px] leading-tight text-[#6B6B6B] sm:text-[11px]">
									{topLabel}
								</p>
								<p className="-mt-0.5 text-sm leading-none font-medium text-white/90 sm:text-lg">
									supermemory
								</p>
							</div>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						alignOffset={12}
						className={cn(
							"min-w-[244px] p-1.5 rounded-xl border border-white/[0.08] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
							dmSansClassName(),
						)}
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
					>
						{hasOrgs && (
							<>
								<p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B6675]">
									Switch brain
								</p>
								<div className="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto overscroll-contain">
									{organizations?.map((o) => {
										const active = org?.id === o.id
										const plan = resolveOrgPlan(
											o.id,
											active,
											currentPlan,
											planByOrgId,
										)
										return (
											<DropdownMenuItem
												key={o.id}
												onClick={() => selectOrg(o.slug, active)}
												className={cn(brainItemClass(active))}
											>
												<span className={cn(brainTileClass(active))}>
													{o.name?.trim().charAt(0).toUpperCase() || "?"}
												</span>
												<span className="flex-1 truncate">{o.name}</span>
												<OrgPlanBadge plan={plan} />
											</DropdownMenuItem>
										)
									})}
								</div>
								<DropdownMenuSeparator className="mx-1 my-1.5 bg-white/[0.06]" />
							</>
						)}
						<DropdownMenuItem
							asChild
							className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
						>
							<Link href="/">
								<Home className="size-4 text-[#737373]" />
								Home
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							asChild
							className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
						>
							<a
								href="https://console.supermemory.ai"
								target="_blank"
								rel="noreferrer"
							>
								<Code2 className="size-4 text-[#737373]" />
								Developer console
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem
							asChild
							className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
						>
							<a href="https://supermemory.ai" target="_blank" rel="noreferrer">
								<ExternalLink className="size-4 text-[#737373]" />
								supermemory.ai
							</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				{!isMobile && (
					<>
						<ChevronRight
							className="size-4 shrink-0 text-[#3F4853]"
							aria-hidden
						/>
						<SpaceSelector
							selectedProjects={selectedProjects}
							onValueChange={setSelectedProjects}
							enableDelete
						/>
					</>
				)}
			</div>
			{!isMobile && (
				<div className="z-10! flex min-w-0 max-w-full flex-1 items-center justify-center gap-1.5 overflow-hidden px-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label="Home"
								aria-current={viewMode === "dashboard" ? "page" : undefined}
								onClick={() => void setViewMode("dashboard")}
								className={cn(
									"flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
									viewMode === "dashboard"
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "border-[#161F2C] bg-muted text-muted-foreground hover:bg-white/5",
									dmSansClassName(),
								)}
							>
								<Home className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className={dmSansClassName()}>
							Home
						</TooltipContent>
					</Tooltip>
					<div
						role="tablist"
						aria-label="Content"
						aria-orientation="horizontal"
						className="text-muted-foreground z-10! inline-flex h-10 w-fit min-w-0 max-w-full items-center justify-center gap-0.5 overflow-x-auto snap-x snap-mandatory scroll-fade-x rounded-full border border-[#161F2C] bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						{(
							[
								{
									mode: "integrations" as const,
									label: "Integrations",
									icon: IntegrationsIcon,
								},
								{ mode: "graph" as const, label: "Graph", icon: GraphIcon },
								{
									mode: "list" as const,
									label: "Memories",
									icon: LayoutGrid,
								},
							] as const
						).map(({ mode, label, icon: Icon }) => (
							<button
								key={mode}
								type="button"
								role="tab"
								aria-selected={
									mode === "integrations"
										? [
												"integrations",
												"mcp",
												"plugins",
												"chrome",
												"connections",
												"shortcuts",
												"raycast",
												"import",
											].includes(viewMode)
										: viewMode === mode
								}
								onClick={() => void setViewMode(mode)}
								className={cn(
									"inline-flex h-[calc(100%-1px)] min-h-0 cursor-pointer snap-start items-center justify-center gap-1 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors sm:gap-1.5 sm:px-3 sm:text-sm",
									(
										mode === "integrations"
											? [
													"integrations",
													"mcp",
													"plugins",
													"chrome",
													"connections",
													"shortcuts",
													"raycast",
													"import",
												].includes(viewMode)
											: viewMode === mode
									)
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "text-foreground hover:bg-white/5",
									dmSansClassName(),
								)}
							>
								<Icon className="size-3.5 shrink-0 sm:size-4" />
								{label}
							</button>
						))}
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label="Chat"
								aria-current={viewMode === "chat" ? "page" : undefined}
								onClick={() => void setViewMode("chat")}
								className={cn(
									"flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
									viewMode === "chat"
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "border-[#161F2C] bg-muted text-muted-foreground hover:bg-white/5",
									dmSansClassName(),
								)}
							>
								<MessageCircleIcon className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className={dmSansClassName()}>
							Chat
						</TooltipContent>
					</Tooltip>
				</div>
			)}
			<div className="z-10! flex shrink-0 items-center gap-1.5">
				{isMobile ? (
					<>
						<SpaceSelector
							selectedProjects={selectedProjects}
							onValueChange={setSelectedProjects}
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
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<Plus className="size-4 text-[#737373]" />
									Add memory
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void setViewMode("dashboard")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<Home className="size-4 text-[#737373]" />
									Home
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setViewMode("integrations")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<Sun className="size-4 text-[#737373]" />
									Integrations
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void setViewMode("graph")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<GraphIcon className="size-4 text-[#737373]" />
									Graph
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => onOpenSearch?.()}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<SearchIcon className="size-4 text-[#737373]" />
									Search
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void setViewMode("list")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<LayoutGrid className="size-4 text-[#737373]" />
									Memories
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void setViewMode("chat")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<MessageCircleIcon className="size-4 text-[#737373]" />
									Chat with Nova
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-[#2E3033]" />
								<DropdownMenuItem
									onClick={handleFeedback}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<LifeBuoy className="size-4 text-[#737373]" />
									Feedback
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => router.push("/settings")}
									className="gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"
								>
									<Settings className="size-4 text-[#737373]" />
									Settings
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="headers"
									className={cn(
										"rounded-full! h-9! min-h-9 shrink-0",
										"max-lg:w-9 max-lg:min-w-9 max-lg:justify-center max-lg:gap-0 max-lg:px-0",
										"lg:min-w-0 lg:gap-1.5 lg:px-3 lg:font-medium",
										dmSansClassName(),
									)}
									onClick={onAddMemory}
									aria-label="Add memory"
								>
									<Plus className="size-3.5 shrink-0 lg:size-4" />
									<span className="max-lg:sr-only">Add memory</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className={dmSansClassName()}>
								Add memory (C)
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="headers"
									className={cn(
										"size-9! min-h-9 min-w-9 shrink-0 rounded-full! border-[#161F2C]/90 px-0! text-muted-foreground hover:text-foreground",
										dmSansClassName(),
									)}
									onClick={onOpenSearch}
									aria-label="Search"
								>
									<SearchIcon className="size-4 shrink-0" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className={dmSansClassName()}>
								Search (⌘K)
							</TooltipContent>
						</Tooltip>
					</>
				)}
				<UserProfileMenu onOpenFeedback={handleFeedback} />
			</div>
			<FeedbackModal
				isOpen={feedbackOpen}
				onClose={() => setFeedbackOpen(false)}
			/>
		</div>
	)
}

export function PublicHeader() {
	return (
		<div className="relative z-10 flex shrink-0 items-center justify-between gap-2 p-2.5 md:p-3">
			<Link
				href="/"
				className="flex items-center gap-2 hover:opacity-90 transition-opacity"
			>
				<Logo className="h-6 md:h-7" />
				<div className="hidden sm:flex flex-col items-start">
					<p className="text-[10px] leading-tight text-[#6B6B6B]">Your AI</p>
					<p className="-mt-0.5 text-base leading-none font-medium text-white/90">
						supermemory
					</p>
				</div>
			</Link>

			<div className="flex items-center gap-2">
				<p
					className={cn(
						"hidden md:block text-[13px] text-[#4B5563]",
						dmSansClassName(),
					)}
				>
					Connect your tools, search everything.
				</p>
				<Link href="/login">
					<button
						type="button"
						className={cn(
							"text-[13px] font-medium text-[#8B8B8B] hover:text-white transition-colors px-3 h-8 cursor-pointer",
							dmSansClassName(),
						)}
					>
						Sign in
					</button>
				</Link>
				<Link href="/login">
					<button
						type="button"
						className={cn(
							"flex items-center gap-1.5 text-[13px] font-medium text-white",
							"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 rounded-full px-4 h-8 transition-colors cursor-pointer",
							dmSansClassName(),
						)}
					>
						Get started free
					</button>
				</Link>
			</div>
		</div>
	)
}
