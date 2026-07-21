"use client"

import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { useIsMobile } from "@hooks/use-mobile"
import { useQuery } from "@tanstack/react-query"
import {
	Building2,
	Code2,
	ExternalLink,
	Home,
	LifeBuoy,
	LayoutGrid,
	MenuIcon,
	SearchIcon,
	Settings,
	Settings2,
	UserPlus,
	ChevronRight,
	Sun,
} from "lucide-react"
import Link from "next/link"
import { useQueryState } from "nuqs"
import { useCallback } from "react"
import { DomainLogo } from "@/components/onboarding-brain/step-about"
import { FeedbackModal } from "@/components/feedback-modal"
import { OrgPlanBadge, resolveOrgPlan } from "@/components/org-plan-badge"
import { SlackMark } from "@/components/brain-connector-icons"
import { GraphIcon } from "@/components/integration-icons"
import { SpaceSelector } from "@/components/space-selector"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { getBrainWorkspaceDomain } from "@/lib/billing-utils"
import { dmSansClassName } from "@/lib/fonts"
import { useViewMode } from "@/lib/view-mode-context"
import { feedbackParam } from "@/lib/search-params"
import { useSettingsModal } from "@/components/settings/settings-modal"
import { useProject } from "@/stores"
import { useCustomer } from "autumn-js/react"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type SlackStatus = { connected: boolean; teamName: string | null }

interface CompanyBrainHeaderProps {
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

const menuItemClass =
	"gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white cursor-pointer"

const circleNavClass = (active: boolean) =>
	cn(
		"flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
		active
			? "border-[#2261CA33] bg-[#00173C] text-white"
			: "border-[#161F2C] bg-muted text-muted-foreground hover:bg-white/5",
		dmSansClassName(),
	)

const tabClass = (active: boolean) =>
	cn(
		"inline-flex h-[calc(100%-1px)] min-h-0 cursor-pointer snap-start items-center justify-center gap-1 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors sm:gap-1.5 sm:px-3 sm:text-sm",
		active
			? "border-[#2261CA33] bg-[#00173C] text-white"
			: "text-foreground hover:bg-white/5",
		dmSansClassName(),
	)

function useSlackStatus() {
	return useQuery({
		queryKey: ["brain-slack-status"],
		queryFn: async (): Promise<SlackStatus> => {
			const res = await fetch(`${BACKEND}/brain/slack/status`, {
				credentials: "include",
			})
			if (!res.ok) return { connected: false, teamName: null }
			return (await res.json()) as SlackStatus
		},
		staleTime: 30_000,
	})
}

export function CompanyBrainHeader({ onOpenSearch }: CompanyBrainHeaderProps) {
	const { user, org, organizations, setActiveOrg } = useAuth()
	const autumn = useCustomer()
	const { currentPlan } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()
	const { viewMode, setViewMode } = useViewMode()
	const { selectedProjects, setSelectedProjects } = useProject()
	const { openSettings } = useSettingsModal()
	const isMobile = useIsMobile()
	const [feedbackOpen, setFeedbackOpen] = useQueryState(
		"feedback",
		feedbackParam,
	)
	const [, setInvite] = useQueryState("invite")
	const { data: slackStatus } = useSlackStatus()

	const planByOrgId = new Map(
		(orgSummaries ?? []).map((s) => [s.orgId, s.plan] as const),
	)

	const orgLabel = org?.name.replace(/\s*organizations?\s*$/i, "").trim()
	const brandLabel = orgLabel || "Workspace"
	const domain = getBrainWorkspaceDomain(
		org?.metadata as Record<string, unknown> | string | null | undefined,
	)
	const hasOrgs = (organizations?.length ?? 0) > 0

	const memberRole = org?.members
		?.find((m) => m.userId === user?.id)
		?.role?.toLowerCase()
	const canInvite = memberRole === "owner" || memberRole === "admin"

	const isOverview = viewMode === "dashboard"
	const isGraph = viewMode === "graph"
	const isMemories = viewMode === "list"
	const isConfigure = viewMode === "configure"
	const slackConnected = slackStatus?.connected ?? false

	const selectOrg = useCallback(
		(slug: string, isActive: boolean) => {
			if (isActive) return
			void setActiveOrg(slug).then(() => window.location.reload())
		},
		[setActiveOrg],
	)

	const goOverview = useCallback(() => {
		void setViewMode("dashboard")
	}, [setViewMode])

	const goGraph = useCallback(() => {
		void setViewMode("graph")
	}, [setViewMode])

	const goMemories = useCallback(() => {
		void setViewMode("list")
	}, [setViewMode])

	const goConfigure = useCallback(() => {
		void setViewMode("configure")
	}, [setViewMode])

	const goIntegrations = useCallback(() => {
		void setViewMode("integrations")
	}, [setViewMode])

	const handleInvite = useCallback(() => {
		setInvite("1")
		openSettings("account")
	}, [openSettings, setInvite])

	const handleFeedback = useCallback(() => {
		void setFeedbackOpen(true)
	}, [setFeedbackOpen])

	return (
		<div className="relative z-10 flex shrink-0 items-center justify-between gap-1 px-2 py-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-2 md:p-3">
			<div className="z-10! flex min-w-0 flex-1 shrink items-center justify-start gap-1.5 md:justify-self-start md:gap-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="relative flex min-w-0 max-w-[31vw] shrink cursor-pointer items-center rounded-lg px-1 py-1 transition-colors hover:bg-white/5 outline-none focus-visible:outline-none min-[380px]:max-w-[9rem] sm:max-w-[min(52vw,240px)] md:-ml-2 md:max-w-[min(52vw,240px)] md:shrink-0 md:px-1.5 before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] md:before:-inset-x-2 md:before:-inset-y-2.5"
						>
							<div
								className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[rgba(82,89,102,0.2)] bg-[#14161A] sm:size-8"
								style={{
									boxShadow:
										"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08)",
								}}
							>
								{domain ? (
									<DomainLogo domain={domain} />
								) : (
									<Building2 className="size-4 text-[#737373]" />
								)}
							</div>
							<div className="ml-1.5 min-w-0 flex flex-col items-start justify-center max-[340px]:hidden sm:ml-2">
								<p className="max-w-full truncate text-[10px] leading-tight text-[#6B6B6B] sm:text-[11px]">
									Company Brain
								</p>
								<p className="-mt-0.5 max-w-full truncate text-sm leading-none font-semibold text-white/90 sm:text-[15px]">
									{brandLabel}
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
						<DropdownMenuItem asChild className={menuItemClass}>
							<Link href="/">
								<Home className="size-4 text-[#737373]" />
								Home
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={goConfigure} className={menuItemClass}>
							<Settings2 className="size-4 text-[#737373]" />
							Configure
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={goIntegrations}
							className={menuItemClass}
						>
							<Sun className="size-4 text-[#737373]" />
							Integrations
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => openSettings()}
							className={menuItemClass}
						>
							<Settings className="size-4 text-[#737373]" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator className="mx-1 my-1.5 bg-white/[0.06]" />
						<DropdownMenuItem asChild className={menuItemClass}>
							<a
								href="https://console.supermemory.ai"
								target="_blank"
								rel="noreferrer"
							>
								<Code2 className="size-4 text-[#737373]" />
								Developer console
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem asChild className={menuItemClass}>
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
							enableDelete={false}
							enableEdit={false}
						/>
					</>
				)}
			</div>

			{!isMobile && (
				<div className="z-10! flex min-w-0 max-w-full items-center justify-center gap-1.5 overflow-hidden px-1 md:justify-self-center">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label="Overview"
								aria-current={isOverview ? "page" : undefined}
								onClick={goOverview}
								className={circleNavClass(isOverview)}
							>
								<Home className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className={dmSansClassName()}>
							Overview
						</TooltipContent>
					</Tooltip>
					<div
						role="tablist"
						aria-label="Content"
						aria-orientation="horizontal"
						className="text-muted-foreground z-10! inline-flex h-10 w-fit min-w-0 max-w-full items-center justify-center gap-0.5 overflow-x-auto snap-x snap-mandatory scroll-fade-x rounded-full border border-[#161F2C] bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						<button
							type="button"
							role="tab"
							aria-selected={isGraph}
							onClick={goGraph}
							className={tabClass(isGraph)}
						>
							<GraphIcon className="size-3.5 shrink-0 sm:size-4" />
							Graph
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={isMemories}
							onClick={goMemories}
							className={tabClass(isMemories)}
						>
							<LayoutGrid className="size-3.5 shrink-0 sm:size-4" />
							Memories
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={isConfigure}
							onClick={goConfigure}
							className={tabClass(isConfigure)}
						>
							<Settings2 className="size-3.5 shrink-0 sm:size-4" />
							Configure
						</button>
					</div>
					<SlackNavButton
						connected={slackConnected}
						teamName={slackStatus?.teamName ?? null}
						active={isConfigure && slackConnected}
						onManage={goConfigure}
					/>
				</div>
			)}

			<div className="z-10! flex min-w-0 shrink-0 items-center gap-1.5 md:justify-self-end">
				{isMobile ? (
					<>
						<SpaceSelector
							selectedProjects={selectedProjects}
							onValueChange={setSelectedProjects}
							enableDelete={false}
							compact
							triggerClassName="max-w-[34vw] shrink min-[380px]:max-w-[9rem]"
						/>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="headers"
									aria-label="Open navigation menu"
									className="size-9! min-h-9 min-w-9 rounded-full px-0! text-base"
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
									onClick={goOverview}
									className={menuItemClass}
								>
									<Home className="size-4 text-[#737373]" />
									Overview
								</DropdownMenuItem>
								<DropdownMenuItem onClick={goGraph} className={menuItemClass}>
									<GraphIcon className="size-4 text-[#737373]" />
									Graph
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={goMemories}
									className={menuItemClass}
								>
									<LayoutGrid className="size-4 text-[#737373]" />
									Memories
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={goConfigure}
									className={menuItemClass}
								>
									<Settings2 className="size-4 text-[#737373]" />
									Configure
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={goIntegrations}
									className={menuItemClass}
								>
									<Sun className="size-4 text-[#737373]" />
									Integrations
								</DropdownMenuItem>
								{slackConnected ? (
									<DropdownMenuItem
										onClick={goConfigure}
										className={menuItemClass}
									>
										<SlackMark className="size-4" />
										Slack connected
									</DropdownMenuItem>
								) : (
									<DropdownMenuItem asChild className={menuItemClass}>
										<a href={`${BACKEND}/brain/slack/oauth/install`}>
											<SlackMark className="size-4" />
											Add to Slack
										</a>
									</DropdownMenuItem>
								)}
								<DropdownMenuSeparator className="bg-[#2E3033]" />
								{canInvite && (
									<DropdownMenuItem
										onClick={handleInvite}
										className={menuItemClass}
									>
										<UserPlus className="size-4 text-[#737373]" />
										Invite teammates
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={onOpenSearch}
									className={menuItemClass}
								>
									<SearchIcon className="size-4 text-[#737373]" />
									Search
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-[#2E3033]" />
								<DropdownMenuItem
									onClick={handleFeedback}
									className={menuItemClass}
								>
									<LifeBuoy className="size-4 text-[#737373]" />
									Feedback
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => openSettings()}
									className={menuItemClass}
								>
									<Settings className="size-4 text-[#737373]" />
									Settings
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<>
						{canInvite && (
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
										onClick={handleInvite}
										aria-label="Invite teammates"
									>
										<UserPlus className="size-3.5 shrink-0 lg:size-4" />
										<span className="max-lg:sr-only">Invite</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" className={dmSansClassName()}>
									Invite teammates
								</TooltipContent>
							</Tooltip>
						)}
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

function SlackNavButton({
	connected,
	teamName,
	active,
	onManage,
}: {
	connected: boolean
	teamName: string | null
	active: boolean
	onManage: () => void
}) {
	const label = connected
		? `Slack${teamName ? ` · ${teamName}` : ""}`
		: "Add to Slack"

	if (!connected) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<a
						href={`${BACKEND}/brain/slack/oauth/install`}
						aria-label="Add to Slack"
						className={circleNavClass(false)}
					>
						<SlackMark className="size-4" />
					</a>
				</TooltipTrigger>
				<TooltipContent side="bottom" className={dmSansClassName()}>
					Add to Slack
				</TooltipContent>
			</Tooltip>
		)
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					onClick={onManage}
					className={cn(circleNavClass(active), "relative")}
				>
					<SlackMark className="size-4" />
					<span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#2EB67D] ring-2 ring-[#00173C]" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className={dmSansClassName()}>
				{label}
			</TooltipContent>
		</Tooltip>
	)
}
