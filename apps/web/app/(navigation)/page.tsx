"use client"

import { useOnboardingStorage } from "@hooks/use-onboarding-storage"
import { useOrgOnboarding } from "@hooks/use-org-onboarding"
import { useAuth } from "@lib/auth-context"
import { ChevronsDown, LoaderIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { InstallPrompt } from "@/components/install-prompt"
import { ChromeExtensionButton } from "@/components/chrome-extension-button"
import { ChatInput } from "@/components/chat-input"
import { BackgroundPlus } from "@ui/components/grid-plus"
import { Memories } from "@/components/memories"
import { useFeatureFlagEnabled } from "posthog-js/react"

export default function Page() {
	const { user, session } = useAuth()
	const router = useRouter()
	const flagEnabled = useFeatureFlagEnabled("nova-alpha-access")

	// TODO: remove this flow after the feature flag is removed
	// Old app: localStorage-backed onboarding
	const {
		shouldShowOnboarding: shouldShowOldOnboarding,
		isLoading: oldOnboardingLoading,
	} = useOnboardingStorage()

	// New app: DB-backed onboarding (org.metadata.isOnboarded)
	const {
		shouldShowOnboarding: shouldShowNewOnboarding,
		isLoading: newOnboardingLoading,
	} = useOrgOnboarding()

	// Select the appropriate onboarding state based on feature flag
	const isOnboardingLoading = useMemo(() => {
		if (flagEnabled) {
			return newOnboardingLoading
		}
		return oldOnboardingLoading
	}, [flagEnabled, newOnboardingLoading, oldOnboardingLoading])

	const shouldShowOnboarding = useMemo(() => {
		if (flagEnabled) {
			return shouldShowNewOnboarding()
		}
		return shouldShowOldOnboarding()
	}, [flagEnabled, shouldShowNewOnboarding, shouldShowOldOnboarding])

	useEffect(() => {
		const url = new URL(window.location.href)
		const authenticateChromeExtension = url.searchParams.get(
			"extension-auth-success",
		)

		if (authenticateChromeExtension) {
			const sessionToken = session?.token
			const userData = {
				email: user?.email,
				name: user?.name,
				userId: user?.id,
			}

			if (sessionToken && userData?.email) {
				const encodedToken = encodeURIComponent(sessionToken)
				window.postMessage(
					{ token: encodedToken, userData },
					window.location.origin,
				)
				url.searchParams.delete("extension-auth-success")
				window.history.replaceState({}, "", url.toString())
			}
		}
	}, [user, session])

	useEffect(() => {
		if (user && !isOnboardingLoading && shouldShowOnboarding) {
			if (flagEnabled) {
				router.push("/new/onboarding?step=input&flow=welcome")
			} else {
				router.push("/onboarding")
			}
		}
	}, [user, shouldShowOnboarding, isOnboardingLoading, router, flagEnabled])

	if (!user || isOnboardingLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0f1419]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-white/60">Loading...</p>
				</div>
			</div>
		)
	}

	if (shouldShowOnboarding) {
		return null
	}

	return (
		<div>
			<div className="flex flex-col h-[80vh] rounded-lg overflow-hidden relative">
				<BackgroundPlus />
				<div className="p-4 flex-1 flex items-center justify-center">
					<ChatInput />
				</div>

				<div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-2 opacity-75">
					<ChevronsDown className="size-4" />
					<p>Scroll down to see memories</p>
				</div>
			</div>
			<Memories />

			<InstallPrompt />
			<ChromeExtensionButton />
		</div>
	)
}
