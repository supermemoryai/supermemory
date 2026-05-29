"use client"

import { Logo } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { useRouter } from "next/navigation"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { analytics } from "@/lib/analytics"
import { consumePendingConnectUrl } from "@/lib/constants"
import { cn } from "@lib/utils"

export function InitialHeader({
	showUserSupermemory,
	showSkipOnboarding,
	name,
}: {
	showUserSupermemory?: boolean
	showSkipOnboarding?: boolean
	name?: string
}) {
	const router = useRouter()
	const { markOrgOnboarded, isLoading } = useOrgOnboarding()
	const userName = name ? `${name.split(" ")[0]}'s` : "My"

	const handleSkip = () => {
		markOrgOnboarded()
		analytics.onboardingCompleted()
		const pendingPath = consumePendingConnectUrl()
		router.push(pendingPath ?? "/")
	}

	return (
		<div className="flex items-center justify-between p-4 sm:p-6">
			<div className="flex items-center z-10! min-w-0">
				<Logo className="h-6 sm:h-7 shrink-0" />
				{showUserSupermemory ? (
					<div className="flex flex-col items-start justify-center ml-2">
						<p className="text-[#8B8B8B] text-[11px] leading-tight">
							{userName}
						</p>
						<p className="text-white font-bold text-xl leading-none -mt-1">
							supermemory
						</p>
					</div>
				) : (
					<p className="ml-2 truncate text-xl leading-none font-semibold text-white/90">
						supermemory
					</p>
				)}
			</div>
			<div className="flex items-center gap-2 sm:gap-3 z-10! shrink-0">
				{showSkipOnboarding && !isLoading && (
					<button
						type="button"
						onClick={handleSkip}
						className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
					>
						Skip Onboarding
					</button>
				)}
				<Button
					variant="newDefault"
					className={cn(
						"rounded-xl sm:rounded-2xl gap-1 h-9 sm:h-11 px-3 sm:px-4 text-sm sm:text-base",
					)}
					size="lg"
					onClick={() =>
						window.open(
							"https://console.supermemory.ai",
							"_blank",
							"noopener,noreferrer",
						)
					}
				>
					<span className="sm:hidden">API</span>
					<span className="hidden sm:inline">Memory API</span>{" "}
					<span className="text-xs mt-[4px]">↗</span>
				</Button>
			</div>
		</div>
	)
}
