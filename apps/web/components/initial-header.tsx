"use client"

import { Logo } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { useRouter } from "next/navigation"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { analytics } from "@/lib/analytics"

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
		router.push("/")
	}

	return (
		<div className="flex p-6 justify-between items-center">
			<div className="flex items-center z-10!">
				<Logo className="h-7" />
				{showUserSupermemory && (
					<div className="flex flex-col items-start justify-center ml-2">
						<p className="text-[#8B8B8B] text-[11px] leading-tight">
							{userName}
						</p>
						<p className="text-white font-bold text-xl leading-none -mt-1">
							supermemory
						</p>
					</div>
				)}
			</div>
			<div className="flex items-center gap-3 z-10!">
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
					className="rounded-2xl text-base gap-1 h-11!"
					size="lg"
				>
					Memory API <span className="text-xs mt-[4px]">↗</span>
				</Button>
			</div>
		</div>
	)
}
