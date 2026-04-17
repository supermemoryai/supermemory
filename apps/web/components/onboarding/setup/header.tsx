"use client"

import { motion } from "motion/react"
import { Logo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useLocalStorageUsername } from "@hooks/use-local-storage-username"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { analytics } from "@/lib/analytics"

export function SetupHeader() {
	const { user } = useAuth()
	const router = useRouter()
	const localStorageUsername = useLocalStorageUsername()
	const { markOrgOnboarded, isLoading: isOrgLoading } = useOrgOnboarding()

	const handleSkip = () => {
		markOrgOnboarded()
		analytics.onboardingCompleted()
		router.push("/")
	}

	const displayName =
		user?.displayUsername || localStorageUsername || user?.name || ""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "My"

	return (
		<motion.div
			className="relative z-20 flex p-6 justify-between items-center"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut" }}
		>
			<nav
				className={cn(
					"flex items-center gap-2 sm:gap-3 min-w-0 z-10! text-sm",
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
					{displayName ? (
						<div className="flex flex-col items-start justify-center ml-2 min-w-0">
							<p className="text-[#8B8B8B] text-[11px] leading-tight">
								{userName}
							</p>
							<p className="text-white font-bold text-xl leading-none -mt-1">
								supermemory
							</p>
						</div>
					) : (
						<span className="ml-2 font-medium text-white/90">supermemory</span>
					)}
				</button>
				<span className="text-white/35 shrink-0" aria-hidden>
					/
				</span>
				<span className="text-white/50 font-medium shrink-0">Setup</span>
			</nav>
			<div className="flex items-center gap-3 z-10">
				{!isOrgLoading && (
					<button
						type="button"
						onClick={handleSkip}
						className={cn(
							"text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer",
							dmSansClassName(),
						)}
					>
						Skip Onboarding
					</button>
				)}
				{user && <UserProfileMenu avatarClassName="border-border" />}
			</div>
		</motion.div>
	)
}
