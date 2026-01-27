"use client"

import { NewOnboardingModal } from "./new-onboarding-modal"

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NewOnboardingModal />
			{children}
		</>
	)
}
