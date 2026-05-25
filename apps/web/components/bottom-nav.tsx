"use client"

import {
	Home,
	LayoutGrid,
	Plus,
	MessageCircleIcon,
	MoreHorizontal,
	SearchIcon,
	Sun,
	LifeBuoy,
	Settings,
} from "lucide-react"
import { useRouter } from "next/navigation"
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
	const router = useRouter()
	const { viewMode, setViewMode } = useViewMode()
	const [, setFeedbackOpen] = useQueryState("feedback", feedbackParam)

	const isHome = viewMode === "dashboard"
	const isMemories = viewMode === "list" || viewMode === "graph"
	const isChat = viewMode === "chat"
	const isMore = INTEGRATION_VIEWS.includes(viewMode)

	return (
		<nav
			aria-label="Primary"
			className={cn(
				"fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:hidden",
				dmSansClassName(),
			)}
		>
			<div className="flex w-full items-center justify-around rounded-full border border-[#161F2C] bg-muted/95 px-2.5 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-xl">
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
					aria-label="Add memory"
					onClick={onAddMemory}
					className="flex size-11 shrink-0 items-center justify-center self-center rounded-full text-white outline-none transition-colors hover:bg-white/5"
				>
					<Plus className="size-7" strokeWidth={2.25} />
				</button>
				<NavTab
					label="Chat"
					icon={MessageCircleIcon}
					active={isChat}
					onClick={() => void setViewMode("chat")}
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
							onClick={() => router.push("/settings")}
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
				"flex shrink-0 flex-col items-center gap-1 rounded-full px-3 py-1.5 outline-none transition-colors",
				active ? "text-white" : "text-[#737373] hover:text-white",
			)}
			{...props}
		>
			{children}
			<span className="text-[10px] font-medium leading-none">{label}</span>
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
