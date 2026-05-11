"use client"

import { useCustomer } from "autumn-js/react"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useAuth } from "@lib/auth-context"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { authClient } from "@lib/auth"
import { useRouter } from "next/navigation"
import { LogOut, Settings, RotateCcw, HelpCircle, LifeBuoy } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { useTokenUsage } from "@/hooks/use-token-usage"

export function UserProfileMenu({
	className,
	avatarClassName,
	onOpenFeedback,
}: {
	className?: string
	avatarClassName?: string
	onOpenFeedback?: () => void
}) {
	const { user } = useAuth()
	const router = useRouter()
	const { resetOrgOnboarded } = useOrgOnboarding()
	const autumn = useCustomer()
	const { currentPlan, isLoading: planLoading } = useTokenUsage(autumn)

	const planBadgeLabel =
		currentPlan === "pro" ? "PRO" : currentPlan === "scale" ? "SCALE" : null

	const handleTryOnboarding = () => {
		resetOrgOnboarded()
		router.push("/onboarding")
	}

	const handleSignOut = () => {
		void (async () => {
			try {
				await authClient.signOut()
			} catch {
				// still navigate if the request fails (offline, etc.)
			}
			router.push("/login/new")
		})()
	}

	if (!user) return null

	const initials = (() => {
		if (user.name) {
			const parts = user.name.trim().split(/\s+/)
			return parts.length >= 2
				? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
				: parts[0].slice(0, 2).toUpperCase()
		}
		if (user.email) return user.email.slice(0, 2).toUpperCase()
		return "SM"
	})()

	const avatarColor = (() => {
		const palette = [
			"#0e2244", // navy blue
			"#1a1a3e", // deep indigo
			"#1e1030", // dark violet
			"#0d2e2e", // dark teal
			"#2a1020", // dark rose
			"#1a2a10", // deep forest
			"#2e1a0a", // dark amber
			"#0a1e2e", // ocean
		]
		const seed = user.email ?? user.name ?? ""
		let hash = 0
		for (let i = 0; i < seed.length; i++)
			hash = seed.charCodeAt(i) + ((hash << 5) - hash)
		return palette[((hash % palette.length) + palette.length) % palette.length]
	})()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={
						planBadgeLabel
							? `Account menu, ${planBadgeLabel} plan`
							: "Account menu"
					}
					className={cn(
						"relative inline-flex shrink-0 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
						className,
					)}
				>
					<Avatar
						className={cn("size-9 border border-[#161F2C]", avatarClassName)}
					>
						<AvatarImage src={user.image ?? ""} />
						<AvatarFallback
							className="text-xs font-medium text-white"
							style={{ background: avatarColor }}
						>
							{initials}
						</AvatarFallback>
					</Avatar>
					{!planLoading && planBadgeLabel ? (
						<span
							id="user-plan-badge"
							className={cn(
								"pointer-events-none absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 rounded border px-1 py-px text-center text-[8px] font-bold uppercase leading-tight tracking-wide",
								"border-[#2261CA33] bg-[#00173C] text-[#6BB0FF]",
							)}
						>
							{planBadgeLabel}
						</span>
					) : null}
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
					<p className="text-white text-sm font-medium truncate">{user.name}</p>
					<p className="text-[#737373] text-xs truncate">{user.email}</p>
				</div>
				<DropdownMenuSeparator className="bg-[#2E3033]" />
				<DropdownMenuItem
					onClick={() => router.push("/settings")}
					className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
				>
					<Settings className="size-4 text-[#737373]" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={handleTryOnboarding}
					className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
				>
					<RotateCcw className="size-4 text-[#737373]" />
					Try onboarding
				</DropdownMenuItem>
				{onOpenFeedback ? (
					<DropdownMenuItem
						onClick={onOpenFeedback}
						className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
					>
						<LifeBuoy className="size-4 text-[#737373]" />
						Feedback
					</DropdownMenuItem>
				) : null}
				<DropdownMenuSeparator className="bg-[#2E3033]" />
				<DropdownMenuItem
					asChild
					className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
				>
					<a href="mailto:support@supermemory.com">
						<HelpCircle className="size-4 text-[#737373]" />
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
							className="size-4 text-[#737373]"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
						</svg>
						Discord
					</a>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-[#2E3033]" />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="px-3 py-2.5 rounded-md hover:bg-[#293952]/40 cursor-pointer text-white text-sm font-medium gap-2"
				>
					<LogOut className="size-4 text-[#737373]" />
					Logout
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
