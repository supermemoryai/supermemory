"use client"

import {
	Home,
	LayoutGrid,
	Plus,
	MoreHorizontal,
	SearchIcon,
	Sun,
	LifeBuoy,
	Settings,
} from "lucide-react"
import { useQueryState } from "nuqs"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { GraphIcon } from "@/components/integration-icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { useViewMode, type ViewMode } from "@/lib/view-mode-context"
import { feedbackParam } from "@/lib/search-params"
import NovaOrb from "@/components/nova/nova-orb"
import { useSettingsModal } from "@/components/settings/settings-modal"

const INTEGRATION_VIEWS: ViewMode[] = [
	"integrations",
	"mcp",
	"plugins",
	"chrome",
	"connections",
	"shortcuts",
	"raycast",
	"import",
]

interface BottomNavProps {
	onAddMemory?: () => void
	onOpenSearch?: () => void
}

export function MobileBottomNav({ onAddMemory, onOpenSearch }: BottomNavProps) {
	const { openSettings } = useSettingsModal()
	const { viewMode, setViewMode } = useViewMode()
	const [, setFeedbackOpen] = useQueryState("feedback", feedbackParam)

	const isHome = viewMode === "dashboard"
	const isMemories = viewMode === "list" || viewMode === "graph"
	const isMore = INTEGRATION_VIEWS.includes(viewMode)

	return (
		<nav
			aria-label="Primary"
			className={cn(
				"fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0A0E14]/85 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden",
				dmSansClassName(),
			)}
		>
			<div className="flex items-center justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				<NavTab
					label="Home"
					icon={Home}
					active={isHome}
					onClick={() => void setViewMode("dashboard")}
				/>
				<NavTab
					label="Memories"
					icon={LayoutGrid}
					active={isMemories}
					onClick={() => void setViewMode("list")}
				/>
				<button
					type="button"
					aria-label="Open chat"
					onClick={() => void setViewMode("chat")}
					className="group relative flex size-11 shrink-0 items-center justify-center rounded-full shadow-[0_0_18px_rgba(75,160,250,0.35)] outline-none transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#4BA0FA]/60 active:scale-95"
				>
					<NovaOrb
						size={40}
						className="pointer-events-none blur-[1px]! transition-transform group-hover:scale-105"
					/>
				</button>
				<NavTab
					label="Add"
					icon={Plus}
					active={false}
					onClick={() => onAddMemory?.()}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<NavTabButton label="More" active={isMore}>
							<MoreHorizontal className="size-6" />
						</NavTabButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="top"
						align="end"
						sideOffset={12}
						className={cn(
							"min-w-[200px] rounded-2xl border border-[#263348]/60 p-1.5 shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
							dmSansClassName(),
						)}
						style={{
							background: "linear-gradient(180deg, #101822 0%, #0A0E14 100%)",
						}}
					>
						<MoreItem icon={SearchIcon} label="Search" onClick={onOpenSearch} />
						<MoreItem
							icon={GraphIcon}
							label="Graph"
							onClick={() => void setViewMode("graph")}
						/>
						<MoreItem
							icon={Sun}
							label="Integrations"
							onClick={() => void setViewMode("integrations")}
						/>
						<DropdownMenuSeparator className="bg-[#263348]/50" />
						<MoreItem
							icon={LifeBuoy}
							label="Feedback"
							onClick={() => setFeedbackOpen(true)}
						/>
						<MoreItem
							icon={Settings}
							label="Settings"
							onClick={() => openSettings()}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</nav>
	)
}

function NavTab({
	label,
	icon: Icon,
	active,
	onClick,
}: {
	label: string
	icon: React.ComponentType<{ className?: string }>
	active: boolean
	onClick: () => void
}) {
	return (
		<NavTabButton label={label} active={active} onClick={onClick}>
			<Icon className="size-6" />
		</NavTabButton>
	)
}

function NavTabButton({
	label,
	active,
	onClick,
	children,
	...props
}: {
	label: string
	active: boolean
	onClick?: () => void
	children: React.ReactNode
} & React.ComponentProps<"button">) {
	return (
		<button
			type="button"
			aria-current={active ? "page" : undefined}
			onClick={onClick}
			className={cn(
				"flex flex-1 flex-col items-center gap-1 rounded-lg py-1 outline-none transition-colors active:scale-95",
				active ? "text-white" : "text-[#737373] hover:text-white",
			)}
			{...props}
		>
			{children}
			<span className="text-[11px] font-medium leading-none">{label}</span>
		</button>
	)
}

function MoreItem({
	icon: Icon,
	label,
	onClick,
}: {
	icon: React.ComponentType<{ className?: string }>
	label: string
	onClick?: () => void
}) {
	return (
		<DropdownMenuItem
			onClick={onClick}
			className="gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-white hover:bg-[#293952]/40"
		>
			<Icon className="size-4 text-[#737373]" />
			{label}
		</DropdownMenuItem>
	)
}
